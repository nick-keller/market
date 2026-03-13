import { createTRPCRouter, authedProcedure } from '../init'
import { prisma } from '#/db'

export const notificationRouter = createTRPCRouter({
  list: authedProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [transactions, markets, trades] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          userId: ctx.user.id,
          type: { notIn: ['BUY', 'SELL'] },
          createdAt: { gte: sevenDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          type: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.market.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          creator: { select: { id: true, name: true } },
        },
      }),
      prisma.trade.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          outcome: true,
          shares: true,
          cost: true,
          createdAt: true,
          marketId: true,
          user: { select: { id: true, name: true } },
          market: { select: { id: true, title: true } },
        },
      }),
    ])

    type NotificationItem =
      | { kind: 'transaction'; date: Date; id: string; amount: number; type: string; message: string }
      | { kind: 'market'; date: Date; id: string; title: string; status: string; creatorName: string | null }
      | { kind: 'trade'; date: Date; id: string; outcome: string; shares: number; cost: number; marketId: string | null; marketTitle: string | null; userName: string | null }

    const items: NotificationItem[] = [
      ...transactions.map((t) => ({
        kind: 'transaction' as const,
        date: t.createdAt,
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        message: t.message,
      })),
      ...markets.map((m) => ({
        kind: 'market' as const,
        date: m.createdAt,
        id: m.id,
        title: m.title,
        status: m.status,
        creatorName: m.creator?.name ?? null,
      })),
      ...trades.map((t) => ({
        kind: 'trade' as const,
        date: t.createdAt,
        id: t.id,
        outcome: t.outcome,
        shares: Number(t.shares),
        cost: Number(t.cost),
        marketId: t.market?.id ?? null,
        marketTitle: t.market?.title ?? null,
        userName: t.user?.name ?? null,
      })),
    ]

    items.sort((a, b) => b.date.getTime() - a.date.getTime())

    return items
  }),
})
