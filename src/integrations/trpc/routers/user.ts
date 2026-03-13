import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, authedProcedure, roleProcedure } from '../init'
import { prisma } from '#/db'
import { Role } from '#/generated/prisma/enums'
import { auth, takeAdminResetLink } from '#/lib/auth'

export const userRouter = createTRPCRouter({
  me: authedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    name: ctx.user.name,
    email: ctx.user.email,
    roles: ctx.user.roles,
  })),

  profile: authedProcedure
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

  positions: authedProcedure
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

  trades: authedProcedure
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

  results: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const rows = await prisma.userMarketResult.findMany({
        where: { userId: input.userId },
        include: {
          market: {
            select: {
              id: true,
              title: true,
              winningOutcome: true,
              resolvedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return rows.map((r) => ({
        marketId: r.market.id,
        marketTitle: r.market.title,
        winningOutcome: r.market.winningOutcome!,
        payout: Number(r.payout),
        totalCost: Number(r.totalCost),
        pnl: Number(r.pnl),
        netWon: Number(r.pnl) > 0,
        resolvedAt: r.market.resolvedAt,
      }))
    }),

  stats: authedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const [positions, marketsCount, results] = await Promise.all([
        prisma.position.findMany({
          where: {
            userId: input.userId,
            OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
          },
          select: { yesShares: true, noShares: true },
        }),
        prisma.market.count({
          where: { creatorId: input.userId },
        }),
        prisma.userMarketResult.findMany({
          where: { userId: input.userId },
          select: { payout: true, pnl: true },
        }),
      ])

      let totalShares = 0
      for (const p of positions) {
        totalShares += Number(p.yesShares) + Number(p.noShares)
      }

      let wins = 0
      let biggestPayout = 0
      let biggestPnl = 0
      for (const r of results) {
        const pnl = Number(r.pnl)
        const payout = Number(r.payout)
        if (pnl > 0) wins++
        if (payout > biggestPayout) biggestPayout = payout
        if (pnl > biggestPnl) biggestPnl = pnl
      }

      return {
        positionCount: positions.length,
        totalShares,
        marketsCreated: marketsCount,
        wins,
        biggestPayout,
        biggestPnl,
      }
    }),

  leaderboardTop: authedProcedure.query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        balance: { select: { balance: true } },
        positions: {
          where: {
            OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
          },
          select: { yesShares: true, noShares: true },
        },
        _count: {
          select: { markets: true },
        },
        userMarketResults: {
          select: { payout: true, pnl: true },
        },
      },
    })

    return users.map((u) => {
      let totalShares = 0
      for (const p of u.positions) {
        totalShares += Number(p.yesShares) + Number(p.noShares)
      }

      let wins = 0
      let biggestPayout = 0
      let biggestPnl = 0
      for (const r of u.userMarketResults) {
        const pnl = Number(r.pnl)
        const payout = Number(r.payout)
        if (pnl > 0) wins++
        if (payout > biggestPayout) biggestPayout = payout
        if (pnl > biggestPnl) biggestPnl = pnl
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        balance: u.balance ? Number(u.balance.balance) : 0,
        positionCount: u.positions.length,
        totalShares,
        marketsCreated: u._count.markets,
        wins,
        biggestPayout,
        biggestPnl,
      }
    })
  }),

  list: authedProcedure.query(async () => {
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

    const list = users.map((u) => {
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
    list.sort((a, b) => {
      const sharesDiff = b.totalShares - a.totalShares
      if (sharesDiff !== 0) return sharesDiff
      return b.balance - a.balance
    })
    return list
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

  generateResetPasswordLink: roleProcedure(Role.MANAGE_USERS)
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true },
      })
      if (!user?.email) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        })
      }
      const host = ctx.headers.get('host') ?? 'localhost'
      const proto = ctx.headers.get('x-forwarded-proto') ?? 'http'
      const redirectTo = `${proto}://${host}/auth/reset-password`
      await auth.api.requestPasswordReset({
        body: { email: user.email, redirectTo },
        headers: ctx.headers,
      })
      const link = takeAdminResetLink(user.email)
      if (!link) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate reset link',
        })
      }
      return { link }
    }),
})
