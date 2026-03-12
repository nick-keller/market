import { z } from 'zod/v4'
import { createTRPCRouter, publicProcedure, authedProcedure } from '../init'
import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client'

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
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(['OPEN', 'CLOSED', 'RESOLVED']).optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input }) => {
      const where: Prisma.MarketWhereInput = {}
      if (input.status) where.status = input.status
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

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
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

      return {
        ...market,
        positions: market.positions.map((p) => ({
          ...p,
          investedAmount: investedByUser.get(p.userId) ?? 0,
        })),
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

      if (market.creatorId !== ctx.user.id) {
        throw new Error('Only the creator can resolve this market')
      }
      if (market.status !== 'OPEN') {
        throw new Error('Market is not open')
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
