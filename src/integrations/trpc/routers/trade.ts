import { z } from 'zod/v4'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, authedProcedure } from '../init'
import { prisma } from '#/db'
import { costForShares, priceYes, priceNo } from '#/lib/lmsr'
import { checkAfterBuy, checkAfterSell } from '#/lib/achievement-checker'
import { notifyIfBigPosition } from '#/lib/slack'

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
      const result = await prisma.$transaction(async (tx) => {
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

        const [trade] = await Promise.all([
          tx.trade.create({
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
          }),
          tx.transaction.create({
            data: {
              userId: ctx.user.id,
              amount: tradeCost,
              type: 'BUY',
              message: `You bought ${input.shares} ${input.outcome} shares of ${market.title}`,
            },
          }),
        ])

        if (market.creatorId && !market.authorPositionRewardGranted) {
          const POSITION_REWARD = 100
          const POSITION_THRESHOLD = 5

          const positionCount = await tx.position.count({
            where: {
              marketId: input.marketId,
              OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
            },
          })

          if (positionCount >= POSITION_THRESHOLD) {
            await tx.market.update({
              where: { id: input.marketId },
              data: { authorPositionRewardGranted: true },
            })
            await tx.balance.upsert({
              where: { userId: market.creatorId },
              create: { userId: market.creatorId, balance: POSITION_REWARD },
              update: { balance: { increment: POSITION_REWARD } },
            })
            await tx.transaction.create({
              data: {
                userId: market.creatorId,
                amount: POSITION_REWARD,
                type: 'REWARD',
                message: `${POSITION_THRESHOLD} users are now trading on your market "${market.title}"! Here's ${POSITION_REWARD} tokens`,
              },
            })
          }
        }

        return {
          trade,
          cost: tradeCost,
          newPriceYes: priceYes(newQYes, newQNo, b),
          newPriceNo: priceNo(newQYes, newQNo, b),
          _marketCreatorId: market.creatorId,
          _marketId: input.marketId,
          _marketTitle: market.title,
        }
      })

      checkAfterBuy(ctx.user.id, result._marketId, result._marketCreatorId, {
        tradeCost: result.cost,
        shares: input.shares,
      })
      notifyIfBigPosition(
        ctx.user.name,
        input.outcome,
        result.cost,
        result._marketTitle,
      )

      return {
        trade: result.trade,
        cost: result.cost,
        newPriceYes: result.newPriceYes,
        newPriceNo: result.newPriceNo,
      }
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
      const result = await prisma.$transaction(async (tx) => {
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

        const [trade] = await Promise.all([
          tx.trade.create({
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
          }),
          tx.transaction.create({
            data: {
              userId: ctx.user.id,
              amount: refund,
              type: 'SELL',
              message: `You sold ${input.shares} ${input.outcome} shares of ${market.title}`,
            },
          }),
        ])

        return {
          trade,
          refund,
          newPriceYes: priceYes(newQYes, newQNo, b),
          newPriceNo: priceNo(newQYes, newQNo, b),
          _marketTitle: market.title,
        }
      })

      checkAfterSell(ctx.user.id)
      notifyIfBigPosition(
        ctx.user.name,
        input.outcome,
        result.refund,
        result._marketTitle,
      )

      return {
        trade: result.trade,
        refund: result.refund,
        newPriceYes: result.newPriceYes,
        newPriceNo: result.newPriceNo,
      }
    }),

  history: authedProcedure
    .input(
      z.object({
        marketId: z.string(),
        limit: z.number().min(1).max(500).default(200),
      }),
    )
    .query(async ({ input }) => {
      const trades = await prisma.trade.findMany({
        where: { marketId: input.marketId },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        include: { user: { select: { id: true, name: true } } },
      })
      return trades
    }),
})
