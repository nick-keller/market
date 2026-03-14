import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '#/db'
import { notifyWeeklyRecap } from '#/lib/slack'

const CRON_SECRET = process.env.CRON_SECRET

async function handler({ request }: { request: Request }) {
  if (CRON_SECRET && request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const monday = new Date()
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)

  const trades = await prisma.trade.findMany({
    where: { createdAt: { gte: monday } },
    select: { userId: true, cost: true },
  })

  const totalTrades = trades.length
  const totalTokensInvested = trades.reduce(
    (sum, t) => sum + Math.abs(Number(t.cost)),
    0,
  )

  const investorMap = new Map<string, number>()
  for (const t of trades) {
    if (!t.userId) continue
    investorMap.set(t.userId, (investorMap.get(t.userId) ?? 0) + Math.abs(Number(t.cost)))
  }

  const topInvestorIds = [...investorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const topInvestorUsers = await prisma.user.findMany({
    where: { id: { in: topInvestorIds.map(([id]) => id) } },
    select: { id: true, name: true },
  })
  const nameById = new Map(topInvestorUsers.map((u) => [u.id, u.name]))

  const topInvestors = topInvestorIds.map(([id, tokens]) => ({
    name: nameById.get(id) ?? 'Unknown',
    tokens: Math.round(tokens),
  }))

  const weekResults = await prisma.userMarketResult.findMany({
    where: { createdAt: { gte: monday } },
    select: { userId: true, pnl: true },
  })

  const pnlMap = new Map<string, number>()
  for (const r of weekResults) {
    pnlMap.set(r.userId, (pnlMap.get(r.userId) ?? 0) + Number(r.pnl))
  }

  const topWinnerIds = [...pnlMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const topWinnerUsers = await prisma.user.findMany({
    where: { id: { in: topWinnerIds.map(([id]) => id) } },
    select: { id: true, name: true },
  })
  const winnerNameById = new Map(topWinnerUsers.map((u) => [u.id, u.name]))

  const topWinners = topWinnerIds.map(([id, pnl]) => ({
    name: winnerNameById.get(id) ?? 'Unknown',
    pnl: Math.round(pnl),
  }))

  const recap = {
    totalTrades,
    totalTokensInvested: Math.round(totalTokensInvested),
    topInvestors,
    topWinners,
  }

  notifyWeeklyRecap(recap)

  return Response.json(recap)
}

export const Route = createFileRoute('/api/cron/weekly-recap')({
  server: {
    handlers: {
      POST: handler,
    },
  },
})
