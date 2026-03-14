import { prisma } from '#/db'
import { ACHIEVEMENTS_MAP, getAchievementLabel } from './achievements'
import type { AchievementDefinition } from './achievements'
import { priceYes, priceNo } from './lmsr'

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

// ── Helper: count distinct trading weeks ────────────────────────

async function countActiveWeeks(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: number }]>`
    SELECT COUNT(DISTINCT DATE_TRUNC('week', created_at))::int as count
    FROM trades
    WHERE user_id = ${userId}
  `
  return Number(result[0]?.count ?? 0)
}

// ── Helper: count markets where user was first trader ───────────

async function countFirstTrades(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: number }]>`
    WITH first_traders AS (
      SELECT DISTINCT ON (market_id) market_id, user_id
      FROM trades
      WHERE user_id IS NOT NULL
      ORDER BY market_id, created_at ASC
    )
    SELECT COUNT(*)::int as count FROM first_traders WHERE user_id = ${userId}
  `
  return Number(result[0]?.count ?? 0)
}

// ── Helper: count markets where user is biggest buyer ───────────

async function countWhaleMarkets(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: number }]>`
    WITH buy_totals AS (
      SELECT market_id, user_id, SUM(cost) as total_bought
      FROM trades
      WHERE user_id IS NOT NULL AND shares > 0
      GROUP BY market_id, user_id
    ),
    market_leaders AS (
      SELECT market_id, user_id,
        RANK() OVER (PARTITION BY market_id ORDER BY total_bought DESC) as rnk
      FROM buy_totals
    )
    SELECT COUNT(*)::int as count
    FROM market_leaders
    WHERE user_id = ${userId} AND rnk = 1
  `
  return Number(result[0]?.count ?? 0)
}

// ── Helper: count markets where user first bought winning side ──

async function countTrendsetterWins(userId: string): Promise<number> {
  const result = await prisma.$queryRaw<[{ count: number }]>`
    WITH first_winning_buys AS (
      SELECT DISTINCT ON (t.market_id) t.market_id, t.user_id
      FROM trades t
      JOIN markets m ON m.id = t.market_id
      WHERE m.status = 'RESOLVED'
        AND t.outcome = m.winning_outcome
        AND t.shares > 0
        AND t.user_id IS NOT NULL
      ORDER BY t.market_id, t.created_at ASC
    )
    SELECT COUNT(*)::int as count
    FROM first_winning_buys
    WHERE user_id = ${userId}
  `
  return Number(result[0]?.count ?? 0)
}

// ── Helper: current win or lose streak ──────────────────────────

async function calculateStreak(
  userId: string,
  type: 'win' | 'lose',
): Promise<number> {
  const results = await prisma.userMarketResult.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { pnl: true },
  })
  let streak = 0
  for (const r of results) {
    const pnl = Number(r.pnl)
    if (type === 'win' && pnl > 0) streak++
    else if (type === 'lose' && pnl < 0) streak++
    else break
  }
  return streak
}

// ── Helper: count wins where user bought winning side below a price threshold

async function countContrarianWins(
  userId: string,
  maxPrice: number,
): Promise<number> {
  const wins = await prisma.userMarketResult.findMany({
    where: { userId, pnl: { gt: 0 } },
    select: {
      marketId: true,
      market: {
        select: {
          winningOutcome: true,
          state: { select: { liquidityB: true } },
        },
      },
    },
  })
  let count = 0
  for (const win of wins) {
    if (!win.market.winningOutcome || !win.market.state) continue
    const b = Number(win.market.state.liquidityB)
    const wo = win.market.winningOutcome
    const firstBuy = await prisma.trade.findFirst({
      where: { userId, marketId: win.marketId, outcome: wo, shares: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
      select: { qYesBefore: true, qNoBefore: true },
    })
    if (firstBuy?.qYesBefore == null || firstBuy.qNoBefore == null) continue
    const price =
      wo === 'YES'
        ? priceYes(Number(firstBuy.qYesBefore), Number(firstBuy.qNoBefore), b)
        : priceNo(Number(firstBuy.qYesBefore), Number(firstBuy.qNoBefore), b)
    if (price < maxPrice) count++
  }
  return count
}

// ── Context-specific checkers ────────────────────────────────

export async function checkAfterMarketCreate(userId: string) {
  try {
    const def = ACHIEVEMENTS_MAP.get('create_markets')!
    const count = await prisma.market.count({ where: { creatorId: userId } })
    await checkTiered(userId, def, count)

    const totalAchievements = await prisma.userAchievement.count({ where: { userId } })
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('achievement_hunter')!, totalAchievements)
  } catch {
    // Achievement checks are non-critical
  }
}

export async function checkAfterBuy(
  userId: string,
  marketId: string,
  marketCreatorId: string | null,
  opts: { tradeCost: number; shares: number },
) {
  try {
    // ── Existing checks ───────────────────────────────────────

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

    // ── New: high_roller ──────────────────────────────────────

    await checkTiered(userId, ACHIEVEMENTS_MAP.get('high_roller')!, opts.tradeCost)

    // ── New: penny_pincher ────────────────────────────────────

    if (opts.shares === 1) {
      await checkSingle(userId, ACHIEVEMENTS_MAP.get('penny_pincher')!)
    }

    // ── New: all_in ───────────────────────────────────────────

    const balance = await prisma.balance.findUnique({ where: { userId } })
    const currentBalance = Number(balance?.balance ?? 0)
    const balanceBeforeTrade = currentBalance + opts.tradeCost
    if (balanceBeforeTrade >= 10 && opts.tradeCost >= 0.9 * balanceBeforeTrade) {
      await checkSingle(userId, ACHIEVEMENTS_MAP.get('all_in')!)
    }

    // ── New: first_trader ─────────────────────────────────────

    const firstTrade = await prisma.trade.findFirst({
      where: { marketId },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    })
    if (firstTrade?.userId === userId) {
      const ftCount = await countFirstTrades(userId)
      await checkTiered(userId, ACHIEVEMENTS_MAP.get('first_trader')!, ftCount)
    }

    // ── New: diversified ──────────────────────────────────────

    const openPositions = await prisma.position.count({
      where: {
        userId,
        market: { status: 'OPEN' },
        OR: [{ yesShares: { gt: 0 } }, { noShares: { gt: 0 } }],
      },
    })
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('diversified')!, openPositions)

    // ── New: flip_flopper ─────────────────────────────────────

    const buyTrades = await prisma.trade.findMany({
      where: { userId, marketId, shares: { gt: 0 } },
      select: { outcome: true },
    })
    const yesBuys = buyTrades.filter((t) => t.outcome === 'YES').length
    const noBuys = buyTrades.filter((t) => t.outcome === 'NO').length
    if (yesBuys >= 1 && noBuys >= 1 && buyTrades.length >= 3) {
      await checkSingle(userId, ACHIEVEMENTS_MAP.get('flip_flopper')!)
    }

    // ── New: active_weeks ─────────────────────────────────────

    const weekCount = await countActiveWeeks(userId)
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('active_weeks')!, weekCount)

    // ── New: popular_creator & market_positions (creator) ─────

    if (marketCreatorId) {
      const totalCreatorTrades = await prisma.trade.count({
        where: { market: { creatorId: marketCreatorId } },
      })
      await checkTiered(
        marketCreatorId,
        ACHIEVEMENTS_MAP.get('popular_creator')!,
        totalCreatorTrades,
      )

      const creatorTotal = await prisma.userAchievement.count({
        where: { userId: marketCreatorId },
      })
      await checkTiered(
        marketCreatorId,
        ACHIEVEMENTS_MAP.get('achievement_hunter')!,
        creatorTotal,
      )
    }

    // ── New: whale ────────────────────────────────────────────

    const whaleCount = await countWhaleMarkets(userId)
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('whale')!, whaleCount)

    // ── New: achievement_hunter ───────────────────────────────

    const totalAchievements = await prisma.userAchievement.count({
      where: { userId },
    })
    await checkTiered(
      userId,
      ACHIEVEMENTS_MAP.get('achievement_hunter')!,
      totalAchievements,
    )
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

    // ── New: active_weeks ─────────────────────────────────────

    const weekCount = await countActiveWeeks(userId)
    await checkTiered(userId, ACHIEVEMENTS_MAP.get('active_weeks')!, weekCount)

    // ── New: token_hoarder (selling returns tokens) ───────────

    const balance = await prisma.balance.findUnique({ where: { userId } })
    if (balance) {
      await checkTiered(
        userId,
        ACHIEVEMENTS_MAP.get('token_hoarder')!,
        Number(balance.balance),
      )
    }

    // ── New: achievement_hunter ───────────────────────────────

    const totalAchievements = await prisma.userAchievement.count({
      where: { userId },
    })
    await checkTiered(
      userId,
      ACHIEVEMENTS_MAP.get('achievement_hunter')!,
      totalAchievements,
    )
  } catch {
    // Achievement checks are non-critical
  }
}

export async function checkAfterResolve(marketId: string) {
  try {
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { state: true },
    })
    if (!market?.winningOutcome || !market.state) return

    const results = await prisma.userMarketResult.findMany({
      where: { marketId },
    })
    if (results.length === 0) return

    const winningOutcome = market.winningOutcome
    const liquidityB = Number(market.state.liquidityB)
    const losingOutcome = winningOutcome === 'YES' ? 'NO' : 'YES'

    // ── Per-user win/loss checks ──────────────────────────────

    for (const r of results) {
      const pnl = Number(r.pnl)

      if (pnl > 0) {
        const winCount = await prisma.userMarketResult.count({
          where: { userId: r.userId, pnl: { gt: 0 } },
        })
        await checkTiered(r.userId, ACHIEVEMENTS_MAP.get('win_markets')!, winCount)
        await checkTiered(r.userId, ACHIEVEMENTS_MAP.get('market_profit')!, pnl)

        // win_streak
        const winStreak = await calculateStreak(r.userId, 'win')
        await checkTiered(r.userId, ACHIEVEMENTS_MAP.get('win_streak')!, winStreak)

        // token_hoarder (winning increases balance)
        const balance = await prisma.balance.findUnique({
          where: { userId: r.userId },
        })
        if (balance) {
          await checkTiered(
            r.userId,
            ACHIEVEMENTS_MAP.get('token_hoarder')!,
            Number(balance.balance),
          )
        }

        // comeback (won while balance was low)
        if (balance) {
          const balanceBeforeWin = Number(balance.balance) - Number(r.payout)
          if (balanceBeforeWin < 100) {
            await checkSingle(r.userId, ACHIEVEMENTS_MAP.get('comeback')!)
          }
        }

        // sniper & contrarian (bought winning side at low price)
        const firstBuy = await prisma.trade.findFirst({
          where: {
            userId: r.userId,
            marketId,
            outcome: winningOutcome,
            shares: { gt: 0 },
          },
          orderBy: { createdAt: 'asc' },
          select: { qYesBefore: true, qNoBefore: true },
        })
        if (firstBuy?.qYesBefore != null && firstBuy.qNoBefore != null) {
          const entryPrice =
            winningOutcome === 'YES'
              ? priceYes(
                  Number(firstBuy.qYesBefore),
                  Number(firstBuy.qNoBefore),
                  liquidityB,
                )
              : priceNo(
                  Number(firstBuy.qYesBefore),
                  Number(firstBuy.qNoBefore),
                  liquidityB,
                )

          if (entryPrice < 0.1) {
            await checkSingle(r.userId, ACHIEVEMENTS_MAP.get('sniper')!)
          }
          if (entryPrice < 0.25) {
            const contrarianCount = await countContrarianWins(r.userId, 0.25)
            await checkTiered(
              r.userId,
              ACHIEVEMENTS_MAP.get('contrarian')!,
              contrarianCount,
            )
          }
        }
      } else if (pnl < 0) {
        const loseCount = await prisma.userMarketResult.count({
          where: { userId: r.userId, pnl: { lt: 0 } },
        })
        await checkTiered(r.userId, ACHIEVEMENTS_MAP.get('lose_markets')!, loseCount)

        // lose_streak
        const loseStreak = await calculateStreak(r.userId, 'lose')
        await checkTiered(
          r.userId,
          ACHIEVEMENTS_MAP.get('lose_streak')!,
          loseStreak,
        )
      }
    }

    // ── Biggest profit / loss ─────────────────────────────────

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

    // ── Last trader ───────────────────────────────────────────

    const lastTrade = await prisma.trade.findFirst({
      where: { marketId },
      orderBy: { createdAt: 'desc' },
      select: { userId: true },
    })
    if (lastTrade?.userId) {
      await checkSingle(lastTrade.userId, ACHIEVEMENTS_MAP.get('last_trader')!)
    }

    // ── Trendsetter (first to buy winning side) ───────────────

    const firstWinningSideBuy = await prisma.trade.findFirst({
      where: { marketId, outcome: winningOutcome, shares: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    })
    if (firstWinningSideBuy?.userId) {
      const tsCount = await countTrendsetterWins(firstWinningSideBuy.userId)
      await checkTiered(
        firstWinningSideBuy.userId,
        ACHIEVEMENTS_MAP.get('trendsetter')!,
        tsCount,
      )
    }

    // ── Diamond hands (held winning position from day 1) ──────

    const marketDurationMs =
      new Date(market.resolvedAt ?? Date.now()).getTime() -
      new Date(market.createdAt).getTime()
    const marketDurationHours = marketDurationMs / (1000 * 60 * 60)

    if (marketDurationHours >= 24) {
      for (const r of results) {
        if (Number(r.pnl) <= 0) continue

        const firstBuyForDH = await prisma.trade.findFirst({
          where: {
            userId: r.userId,
            marketId,
            outcome: winningOutcome,
            shares: { gt: 0 },
          },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        })
        if (!firstBuyForDH) continue

        const hoursSinceCreation =
          (firstBuyForDH.createdAt.getTime() -
            new Date(market.createdAt).getTime()) /
          (1000 * 60 * 60)
        if (hoursSinceCreation > 24) continue

        const hasSold = await prisma.trade.count({
          where: {
            userId: r.userId,
            marketId,
            outcome: winningOutcome,
            shares: { lt: 0 },
          },
        })
        if (hasSold > 0) continue

        await checkSingle(r.userId, ACHIEVEMENTS_MAP.get('diamond_hands')!)
      }
    }

    // ── Paper hands (sold winning shares) ─────────────────────

    const paperHandsUsers = await prisma.trade.findMany({
      where: {
        marketId,
        outcome: winningOutcome,
        shares: { lt: 0 },
        userId: { not: null },
      },
      distinct: ['userId'],
      select: { userId: true },
    })
    for (const ph of paperHandsUsers) {
      if (ph.userId) {
        await checkSingle(ph.userId, ACHIEVEMENTS_MAP.get('paper_hands')!)
      }
    }

    // ── Perfect market (creator: everyone picked winning side) ─

    if (market.creatorId && results.length >= 2) {
      const losingSideBuys = await prisma.trade.count({
        where: {
          marketId,
          outcome: losingOutcome as 'YES' | 'NO',
          shares: { gt: 0 },
        },
      })
      if (losingSideBuys === 0) {
        await checkSingle(
          market.creatorId,
          ACHIEVEMENTS_MAP.get('perfect_market')!,
        )
      }
    }

    // ── Achievement hunter (for all participants) ─────────────

    const participantIds = [...new Set(results.map((r) => r.userId))]
    for (const uid of participantIds) {
      const totalAchievements = await prisma.userAchievement.count({
        where: { userId: uid },
      })
      await checkTiered(
        uid,
        ACHIEVEMENTS_MAP.get('achievement_hunter')!,
        totalAchievements,
      )
    }
  } catch {
    // Achievement checks are non-critical
  }
}
