import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, authedProcedure, roleProcedure } from '../init'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'
import { hasRole } from '#/lib/roles'
import { Role } from '#/generated/prisma/enums'

const INITIAL_BALANCE = 1000
const DEFAULT_LIQUIDITY = 100

async function ensureBalance(userId: string) {
  return prisma.balance.upsert({
    where: { userId },
    create: { userId, balance: INITIAL_BALANCE },
    update: {},
  })
}

export const marketRouter = createTRPCRouter({
  list: authedProcedure
    .input(
      z.object({
        status: z.enum(['PENDING', 'OPEN', 'CLOSED', 'RESOLVED']).optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Prisma.MarketWhereInput = {}
      const includePendingInList =
        (input.status === undefined || input.status === 'OPEN') &&
        (hasRole(ctx.user?.roles, Role.VALIDATE_MARKETS) || !!ctx.user?.id)
      const pendingCondition: Prisma.MarketWhereInput = hasRole(
        ctx.user?.roles,
        Role.VALIDATE_MARKETS,
      )
        ? { status: 'PENDING' }
        : { status: 'PENDING', creatorId: ctx.user!.id }

      if (input.status === undefined) {
        // All Status: OPEN, CLOSED, RESOLVED, and optionally pending (all or own)
        where.OR = [
          { status: { in: ['OPEN', 'CLOSED', 'RESOLVED'] } },
          ...(includePendingInList ? [pendingCondition] : []),
        ]
      } else if (input.status === 'OPEN') {
        // Open: OPEN and optionally pending (all or own)
        where.OR = [
          { status: 'OPEN' },
          ...(includePendingInList ? [pendingCondition] : []),
        ]
      } else {
        if (input.status === 'PENDING' && !hasRole(ctx.user?.roles, Role.VALIDATE_MARKETS)) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Only users with the validate markets role can view pending markets',
          })
        }
        where.status = input.status
      }
      if (input.search) {
        where.title = { contains: input.search, mode: 'insensitive' }
      }

      const markets = await prisma.market.findMany({
        where,
        include: { state: true, creator: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })

      let nextCursor: string | undefined
      if (markets.length > input.limit) {
        const next = markets.pop()!
        nextCursor = next.id
      }

      const marketsWithTotals = markets.map((m) => ({
        ...m,
        totalInvested: m.state ? Number(m.state.volume) : 0,
      }))

      return { markets: marketsWithTotals, nextCursor }
    }),

  get: authedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const market = await prisma.market.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          state: true,
          creator: { select: { id: true, name: true, image: true } },
          positions: {
            where: {
              OR: [
                { yesShares: { gt: 0 } },
                { noShares: { gt: 0 } },
              ],
            },
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      })
      if (market.status === 'PENDING') {
        const canView =
          ctx.user &&
          (market.creatorId === ctx.user.id || hasRole(ctx.user.roles, Role.VALIDATE_MARKETS))
        if (!canView) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Pending markets are only visible to the creator or users with the validate markets role',
          })
        }
      }

      const userIds = market.positions.map((p) => p.userId)
      const trades = await prisma.trade.findMany({
        where: { marketId: input.id, userId: { in: userIds } },
        select: { userId: true, cost: true },
      })
      const investedByUser = new Map<string, number>()
      for (const t of trades) {
        investedByUser.set(
          t.userId,
          (investedByUser.get(t.userId) ?? 0) + Number(t.cost),
        )
      }

      const positionsWithInvested = market.positions.map((p) => ({
        ...p,
        investedAmount: investedByUser.get(p.userId) ?? 0,
      }))
      positionsWithInvested.sort(
        (a, b) => (b.investedAmount ?? 0) - (a.investedAmount ?? 0),
      )

      return {
        ...market,
        positions: positionsWithInvested,
        totalInvested: market.state ? Number(market.state.volume) : 0,
      }
    }),

  create: authedProcedure
    .input(
      z.object({
        title: z.string().min(5).max(200),
        description: z.string().max(2000).optional(),
        closeTime: z.string().datetime().optional(),
        liquidityB: z.number().min(1).max(10000).default(DEFAULT_LIQUIDITY),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureBalance(ctx.user.id)

      const market = await prisma.market.create({
        data: {
          title: input.title,
          description: input.description,
          creatorId: ctx.user.id,
          status: 'PENDING',
          closeTime: input.closeTime ? new Date(input.closeTime) : null,
          state: {
            create: {
              qYes: 0,
              qNo: 0,
              liquidityB: input.liquidityB,
              volume: 0,
            },
          },
        },
        include: { state: true },
      })

      return market
    }),

  open: roleProcedure(Role.VALIDATE_MARKETS)
    .input(z.object({ marketId: z.string() }))
    .mutation(async ({ input }) => {
      const market = await prisma.market.findUniqueOrThrow({
        where: { id: input.marketId },
      })
      if (market.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending markets can be opened',
        })
      }
      await prisma.market.update({
        where: { id: input.marketId },
        data: { status: 'OPEN' },
      })
      return { success: true }
    }),

  delete: roleProcedure(Role.VALIDATE_MARKETS)
    .input(z.object({ marketId: z.string() }))
    .mutation(async ({ input }) => {
      const market = await prisma.market.findUniqueOrThrow({
        where: { id: input.marketId },
      })
      if (market.status !== 'PENDING') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only pending markets can be deleted',
        })
      }
      await prisma.$transaction([
        prisma.trade.deleteMany({ where: { marketId: input.marketId } }),
        prisma.position.deleteMany({ where: { marketId: input.marketId } }),
        prisma.marketState.deleteMany({ where: { marketId: input.marketId } }),
        prisma.market.delete({ where: { id: input.marketId } }),
      ])
      return { success: true }
    }),

  resolve: authedProcedure
    .input(
      z.object({
        marketId: z.string(),
        winningOutcome: z.enum(['YES', 'NO']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const market = await prisma.market.findUniqueOrThrow({
        where: { id: input.marketId },
        include: { positions: true },
      })

      const canResolve =
        market.creatorId === ctx.user.id || hasRole(ctx.user.roles, Role.RESOLVE_MARKETS)
      if (!canResolve) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the creator or users with the resolve markets role can resolve this market',
        })
      }
      if (market.status !== 'OPEN' && market.status !== 'CLOSED') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Only open or closed markets can be resolved',
        })
      }

      const winningField =
        input.winningOutcome === 'YES' ? 'yesShares' : 'noShares'

      await prisma.$transaction(async (tx) => {
        await tx.market.update({
          where: { id: input.marketId },
          data: {
            status: 'RESOLVED',
            winningOutcome: input.winningOutcome,
            resolvedAt: new Date(),
          },
        })

        for (const pos of market.positions) {
          const payout = Number(pos[winningField])
          if (payout > 0) {
            await tx.balance.upsert({
              where: { userId: pos.userId },
              create: { userId: pos.userId, balance: payout },
              update: { balance: { increment: payout } },
            })
          }
        }

        await tx.position.updateMany({
          where: { marketId: input.marketId },
          data: { yesShares: 0, noShares: 0 },
        })
      })

      return { success: true }
    }),
})
