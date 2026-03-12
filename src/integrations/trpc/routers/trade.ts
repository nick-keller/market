import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, publicProcedure, authedProcedure } from '../init'
import { prisma } from '#/db'
import { costForShares, priceYes, priceNo } from '#/lib/lmsr'

const INITIAL_BALANCE = 1000

export const tradeRouter = createTRPCRouter({
  buy: authedProcedure
    .input(
      z.object({
        marketId: z.string(),
        outcome: z.enum(['YES', 'NO']),
        shares: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.$transaction(async (tx) => {
        const market = await tx.market.findUniqueOrThrow({
          where: { id: input.marketId },
          include: { state: true },
        })

        if (market.status !== 'OPEN') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Market is not open for trading' })
        }

        const state = market.state!
        const qYes = Number(state.qYes)
        const qNo = Number(state.qNo)
        const b = Number(state.liquidityB)

        const tradeCost = costForShares(qYes, qNo, b, input.outcome, input.shares)
        if (tradeCost <= 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid trade cost' })
        }

        const balance = await tx.balance.upsert({
          where: { userId: ctx.user.id },
          create: { userId: ctx.user.id, balance: INITIAL_BALANCE },
          update: {},
        })

        if (Number(balance.balance) < tradeCost) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient balance. Cost: ${tradeCost.toFixed(2)}, Balance: ${Number(balance.balance).toFixed(2)}`,
          })
        }

        const newQYes = input.outcome === 'YES' ? qYes + input.shares : qYes
        const newQNo = input.outcome === 'NO' ? qNo + input.shares : qNo

        await tx.marketState.update({
          where: { marketId: input.marketId },
          data: {
            qYes: newQYes,
            qNo: newQNo,
            volume: { increment: tradeCost },
          },
        })

        await tx.balance.update({
          where: { userId: ctx.user.id },
          data: { balance: { decrement: tradeCost } },
        })

        const sharesField = input.outcome === 'YES' ? 'yesShares' : 'noShares'
        await tx.position.upsert({
          where: { userId_marketId: { userId: ctx.user.id, marketId: input.marketId } },
          create: {
            userId: ctx.user.id,
            marketId: input.marketId,
            [sharesField]: input.shares,
          },
          update: {
            [sharesField]: { increment: input.shares },
          },
        })

        const trade = await tx.trade.create({
          data: {
            userId: ctx.user.id,
            marketId: input.marketId,
            outcome: input.outcome,
            shares: input.shares,
            cost: tradeCost,
            qYesBefore: qYes,
            qNoBefore: qNo,
            qYesAfter: newQYes,
            qNoAfter: newQNo,
          },
        })

        return {
          trade,
          cost: tradeCost,
          newPriceYes: priceYes(newQYes, newQNo, b),
          newPriceNo: priceNo(newQYes, newQNo, b),
        }
      })
    }),

  sell: authedProcedure
    .input(
      z.object({
        marketId: z.string(),
        outcome: z.enum(['YES', 'NO']),
        shares: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.$transaction(async (tx) => {
        const market = await tx.market.findUniqueOrThrow({
          where: { id: input.marketId },
          include: { state: true },
        })

        if (market.status !== 'OPEN') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Market is not open for trading' })
        }

        const position = await tx.position.findUnique({
          where: { userId_marketId: { userId: ctx.user.id, marketId: input.marketId } },
        })

        const sharesField = input.outcome === 'YES' ? 'yesShares' : 'noShares'
        const currentShares = position ? Number(position[sharesField]) : 0

        if (currentShares < input.shares) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Insufficient shares. Have: ${currentShares}, Selling: ${input.shares}`,
          })
        }

        const state = market.state!
        const qYes = Number(state.qYes)
        const qNo = Number(state.qNo)
        const b = Number(state.liquidityB)

        const refund = -costForShares(qYes, qNo, b, input.outcome, -input.shares)

        const newQYes = input.outcome === 'YES' ? qYes - input.shares : qYes
        const newQNo = input.outcome === 'NO' ? qNo - input.shares : qNo

        await tx.marketState.update({
          where: { marketId: input.marketId },
          data: {
            qYes: newQYes,
            qNo: newQNo,
            volume: { increment: refund },
          },
        })

        await tx.balance.update({
          where: { userId: ctx.user.id },
          data: { balance: { increment: refund } },
        })

        await tx.position.update({
          where: { userId_marketId: { userId: ctx.user.id, marketId: input.marketId } },
          data: {
            [sharesField]: { decrement: input.shares },
          },
        })

        const trade = await tx.trade.create({
          data: {
            userId: ctx.user.id,
            marketId: input.marketId,
            outcome: input.outcome,
            shares: -input.shares,
            cost: -refund,
            qYesBefore: qYes,
            qNoBefore: qNo,
            qYesAfter: newQYes,
            qNoAfter: newQNo,
          },
        })

        return {
          trade,
          refund,
          newPriceYes: priceYes(newQYes, newQNo, b),
          newPriceNo: priceNo(newQYes, newQNo, b),
        }
      })
    }),

  history: publicProcedure
    .input(
      z.object({
        marketId: z.string(),
        limit: z.number().min(1).max(500).default(200),
      }),
    )
    .query(async ({ input }) => {
      const trades = await prisma.trade.findMany({
        where: { marketId: input.marketId },
        orderBy: { createdAt: 'asc' },
        take: input.limit,
        include: { user: { select: { id: true, name: true } } },
      })
      return trades
    }),
})
