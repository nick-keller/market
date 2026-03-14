import { prisma } from '#/db'
import { ACHIEVEMENTS_MAP, getAchievementLabel } from './achievements'
import type { AchievementDefinition } from './achievements'

async function grantAchievement(
  userId: string,
  achievementId: string,
  tier: number,
  reward: number,
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.userAchievement.create({
        data: { userId, achievementId, tier, reward },
      })
      await tx.balance.upsert({
        where: { userId },
        create: { userId, balance: reward },
        update: { balance: { increment: reward } },
      })
      await tx.transaction.create({
        data: {
          userId,
          amount: reward,
          type: 'REWARD',
          message: `Achievement unlocked: ${getAchievementLabel(achievementId, tier)}! +${reward} tokens`,
        },
      })
    })
    return true
  } catch {
    return false
  }
}

async function checkTiered(
  userId: string,
  def: AchievementDefinition,
  currentValue: number,
) {
  if (!def.tiers) return
  const earned = await prisma.userAchievement.findMany({
    where: { userId, achievementId: def.id },
    select: { tier: true },
  })
  const earnedSet = new Set(earned.map((e) => e.tier))

  for (const t of def.tiers) {
    if (currentValue >= t.value && !earnedSet.has(t.value)) {
      await grantAchievement(userId, def.id, t.value, t.reward)
    }
  }
}

async function checkSingle(
  userId: string,
  def: AchievementDefinition,
): Promise<boolean> {
  if (!def.reward) return false
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId_tier: { userId, achievementId: def.id, tier: 0 } },
  })
  if (existing) return false
  return grantAchievement(userId, def.id, 0, def.reward)
}

// ── Context-specific checkers ────────────────────────────────

export async function checkAfterMarketCreate(userId: string) {
  try {
    const def = ACHIEVEMENTS_MAP.get('create_markets')!
    const count = await prisma.market.count({ where: { creatorId: userId } })
    await checkTiered(userId, def, count)
  } catch {
    // Achievement checks are non-critical
  }
}

export async function checkAfterBuy(
  userId: string,
  marketId: string,
  marketCreatorId: string | null,
) {
  try {
    const tradeCount = await prisma.trade.count({ where: { userId } })
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('make_trades')!, tradeCount)

    const buyAgg = await prisma.trade.aggregate({
      where: { userId, shares: { gt: 0 } },
      _sum: { shares: true },
    })
    const totalBought = Number(buyAgg._sum.shares ?? 0)
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('buy_shares')!, totalBought)

    const position = await prisma.position.findUnique({
      where: { userId_marketId: { userId, marketId } },
    })
    if (
      position &&
      Number(position.yesShares) > 0 &&
      Number(position.noShares) > 0
    ) {
      await checkSingle(userId, ACHIEVEMENTS_MAP.get('buy_both_sides')!)
    }

    if (marketCreatorId) {
      const posCount = await prisma.position.count({
        where: {
          marketId,
          userId: { not: marketCreatorId },
          OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
        },
      })
      await checkTiered(
        marketCreatorId,
        ACHIEVEMENTS_MAP.get('market_positions')!,
        posCount,
      )
    }
  } catch {
    // Achievement checks are non-critical
  }
}

export async function checkAfterSell(userId: string) {
  try {
    const tradeCount = await prisma.trade.count({ where: { userId } })
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('make_trades')!, tradeCount)

    const sellAgg = await prisma.trade.aggregate({
      where: { userId, shares: { lt: 0 } },
      _sum: { shares: true },
    })
    const totalSold = Math.abs(Number(sellAgg._sum.shares ?? 0))
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('sell_shares')!, totalSold)
  } catch {
    // Achievement checks are non-critical
  }
}

export async function checkAfterResolve(marketId: string) {
  try {
    const results = await prisma.userMarketResult.findMany({
      where: { marketId },
    })
    if (results.length === 0) return

    for (const r of results) {
      const pnl = Number(r.pnl)
      if (pnl > 0) {
        const winCount = await prisma.userMarketResult.count({
          where: { userId: r.userId, pnl: { gt: 0 } },
        })
        await checkTiered(
          r.userId,
          ACHIEVEMENTS_MAP.get('win_markets')!,
          winCount,
        )
        await checkTiered(
          r.userId,
          ACHIEVEMENTS_MAP.get('market_profit')!,
          pnl,
        )
      } else if (pnl < 0) {
        const loseCount = await prisma.userMarketResult.count({
          where: { userId: r.userId, pnl: { lt: 0 } },
        })
        await checkTiered(
          r.userId,
          ACHIEVEMENTS_MAP.get('lose_markets')!,
          loseCount,
        )
      }
    }

    const sorted = [...results].sort(
      (a, b) => Number(b.pnl) - Number(a.pnl),
    )
    const topWinner = sorted[0]
    if (Number(topWinner.pnl) > 0) {
      await checkSingle(
        topWinner.userId,
        ACHIEVEMENTS_MAP.get('biggest_profit_winner')!,
      )
    }
    const topLoser = sorted[sorted.length - 1]
    if (Number(topLoser.pnl) < 0) {
      await checkSingle(
        topLoser.userId,
        ACHIEVEMENTS_MAP.get('biggest_loss_loser')!,
      )
    }
  } catch {
    // Achievement checks are non-critical
  }
}
