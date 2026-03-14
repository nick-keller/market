import { createFileRoute } from '@tanstack/react-router'
import { prisma } from '#/db'
import { notifyWeeklyAllowance } from '#/lib/slack'

const CRON_SECRET = process.env.CRON_SECRET

function computeAllowance(currentBalance: number): number {
  return Math.max(0, 200 - 0.05 * currentBalance)
}

async function handler({ request }: { request: Request }) {
  if (CRON_SECRET && request.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const balances = await prisma.balance.findMany({
    include: { user: { select: { id: true, name: true } } },
  })

  let creditedCount = 0
  let totalDistributed = 0

  for (const row of balances) {
    const current = Number(row.balance)
    const allowance = computeAllowance(current)

    if (allowance <= 0) continue

    await prisma.$transaction([
      prisma.balance.update({
        where: { userId: row.userId },
        data: { balance: { increment: allowance } },
      }),
      prisma.transaction.create({
        data: {
          userId: row.userId,
          amount: allowance,
          type: 'REWARD',
          message: `Weekly allowance: +${allowance.toFixed(0)} tokens`,
        },
      }),
    ])

    creditedCount++
    totalDistributed += allowance
  }

  notifyWeeklyAllowance(creditedCount, Math.round(totalDistributed))

  return Response.json({
    credited: creditedCount,
    totalDistributed: Math.round(totalDistributed),
  })
}

export const Route = createFileRoute('/api/cron/weekly-allowance')({
  server: {
    handlers: {
      POST: handler,
    },
  },
})
