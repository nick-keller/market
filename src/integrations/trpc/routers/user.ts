import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, publicProcedure, authedProcedure, roleProcedure } from '../init'
import { prisma } from '#/db'
import { Role } from '#/generated/prisma/enums'

export const userRouter = createTRPCRouter({
  me: authedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    roles: ctx.user.roles,
  })),

  profile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      })
      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      const balance = await prisma.balance.findUnique({
        where: { userId: input.userId },
      })

      return { ...user, balance: balance ? Number(balance.balance) : 0 }
    }),

  positions: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const positions = await prisma.position.findMany({
        where: {
          userId: input.userId,
          OR: [
            { yesShares: { gt: 0 } },
            { noShares: { gt: 0 } },
          ],
        },
        include: {
          market: {
            include: {
              state: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      const marketIds = positions.map((p) => p.marketId)
      const trades = await prisma.trade.findMany({
        where: { userId: input.userId, marketId: { in: marketIds } },
        select: { marketId: true, cost: true },
      })
      const investedByMarket = new Map<string, number>()
      for (const t of trades) {
        investedByMarket.set(
          t.marketId,
          (investedByMarket.get(t.marketId) ?? 0) + Number(t.cost),
        )
      }

      return positions.map((p) => ({
        ...p,
        investedAmount: investedByMarket.get(p.marketId) ?? 0,
      }))
    }),

  trades: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const trades = await prisma.trade.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        include: {
          market: { select: { id: true, title: true, status: true } },
        },
      })

      let nextCursor: string | undefined
      if (trades.length > input.limit) {
        const next = trades.pop()!
        nextCursor = next.id
      }

      return { trades, nextCursor }
    }),

  results: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      // Use trade history: positions are zeroed when a market resolves, so we must
      // derive shares from trades to know who won.
      const trades = await prisma.trade.findMany({
        where: { userId: input.userId },
        include: {
          market: {
            select: {
              id: true,
              title: true,
              status: true,
              winningOutcome: true,
              resolvedAt: true,
            },
          },
        },
      })

      const marketIds = [...new Set(trades.map((t) => t.marketId).filter(Boolean))] as string[]
      if (marketIds.length === 0) return []

      const resolvedMarkets = await prisma.market.findMany({
        where: {
          id: { in: marketIds },
          status: 'RESOLVED',
          winningOutcome: { not: null },
        },
        select: {
          id: true,
          title: true,
          winningOutcome: true,
          resolvedAt: true,
        },
      })

      if (resolvedMarkets.length === 0) return []

      const marketById = new Map(resolvedMarkets.map((m) => [m.id, m]))

      type Agg = { yesShares: number; noShares: number; totalCost: number }
      const byMarket = new Map<string, Agg>()
      for (const t of trades) {
        if (!t.marketId || !marketById.has(t.marketId)) continue
        let agg = byMarket.get(t.marketId)
        if (!agg) {
          agg = { yesShares: 0, noShares: 0, totalCost: 0 }
          byMarket.set(t.marketId, agg)
        }
        const shares = Number(t.shares)
        if (t.outcome === 'YES') agg.yesShares += shares
        else agg.noShares += shares
        agg.totalCost += Number(t.cost)
      }

      return Array.from(byMarket.entries())
        .map(([marketId, agg]) => {
          const market = marketById.get(marketId)!
          const winningOutcome = market.winningOutcome!
          const winningShares =
            winningOutcome === 'YES' ? agg.yesShares : agg.noShares
          const losingShares =
            winningOutcome === 'YES' ? agg.noShares : agg.yesShares
          const payout = winningShares
          const totalCost = agg.totalCost
          const pnl = payout - totalCost
          const netWon = winningShares > losingShares
          return {
            marketId: market.id,
            marketTitle: market.title,
            winningOutcome,
            payout,
            totalCost,
            pnl,
            netWon,
            resolvedAt: market.resolvedAt,
          }
        })
        .sort((a, b) => {
          const dateA = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0
          const dateB = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0
          return dateB - dateA
        })
    }),

  list: publicProcedure.query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        balance: { select: { balance: true } },
        positions: {
          where: {
            OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
          },
          select: { yesShares: true, noShares: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return users.map((u) => {
      let totalPositionValue = 0
      for (const p of u.positions) {
        totalPositionValue += Number(p.yesShares) + Number(p.noShares)
      }
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt,
        balance: u.balance ? Number(u.balance.balance) : 0,
        positionCount: u.positions.length,
        totalShares: totalPositionValue,
      }
    })
  }),

  adminList: roleProcedure(Role.MANAGE_USERS).query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        roles: true,
        createdAt: true,
        balance: { select: { balance: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      roles: u.roles ?? [],
      createdAt: u.createdAt,
      balance: u.balance ? Number(u.balance.balance) : 0,
    }))
  }),

  updateRoles: roleProcedure(Role.MANAGE_USERS)
    .input(
      z.object({
        userId: z.string(),
        roles: z.array(z.enum(['VALIDATE_MARKETS', 'MANAGE_USERS', 'RESOLVE_MARKETS'])),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.user.update({
        where: { id: input.userId },
        data: { roles: input.roles },
      })
      return { success: true }
    }),

  validateUser: roleProcedure(Role.MANAGE_USERS)
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.user.update({
        where: { id: input.userId },
        data: { emailVerified: true },
      })
      return { success: true }
    }),

  remove: roleProcedure(Role.MANAGE_USERS)
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself',
        })
      }
      await prisma.user.delete({ where: { id: input.userId } })
      return { success: true }
    }),
})
