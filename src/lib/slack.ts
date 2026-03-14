import { prisma } from '#/db'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function postToSlack(text: string) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error('[Slack] Failed to send notification:', err)
  }
}

// ── New User Joined ───────────────────────────────────────────

const NEW_USER_MESSAGES = [
  (name: string) => `🎰 *${name}* just walked into the casino. Fresh meat!`,
  (name: string) => `📈 *${name}* has entered the arena. May the odds be ever in their favor.`,
  (name: string) => `🆕 Welcome *${name}*! Another brave soul ready to lose—er, _invest_ their tokens.`,
  (name: string) => `👋 *${name}* just signed up. The market trembles with anticipation.`,
  (name: string) => `🚀 *${name}* has joined StoikMarket. Time to separate the signal from the noise.`,
  (name: string) => `🎯 *${name}* just showed up. Someone get them a drink and a trading tutorial.`,
  (name: string) => `💰 *${name}* entered the chat with 1,000 tokens and a dream.`,
  (name: string) => `🐣 *${name}* is here! Another oracle joins the prediction game.`,
]

export function notifyNewUser(name: string) {
  const msg = pick(NEW_USER_MESSAGES)(name)
  postToSlack(msg)
}

// ── Market Opened ─────────────────────────────────────────────

const MARKET_OPENED_MESSAGES = [
  (title: string, creator: string) =>
    `🔔 New market is live! *"${title}"* by ${creator} — place your bets!`,
  (title: string, creator: string) =>
    `📊 *"${title}"* just opened for trading! ${creator} wants to know what you think.`,
  (title: string, creator: string) =>
    `🏁 The market *"${title}"* (by ${creator}) is officially open. Let the speculation begin!`,
  (title: string, creator: string) =>
    `⚡ Hot off the press: *"${title}"* by ${creator} is now open. YES or NO?`,
  (title: string, creator: string) =>
    `🎲 *"${title}"* is live! ${creator} created it — now it's your turn to put tokens where your mouth is.`,
  (title: string, creator: string) =>
    `🔥 New market alert! *"${title}"* by ${creator}. Time to flex those prediction muscles.`,
]

export function notifyMarketOpened(title: string, creatorName: string) {
  const msg = pick(MARKET_OPENED_MESSAGES)(title, creatorName)
  postToSlack(msg)
}

// ── Market Resolved ───────────────────────────────────────────

const MARKET_RESOLVED_MESSAGES = [
  (title: string, outcome: string) =>
    `🏆 *"${title}"* has been resolved: *${outcome}*! Winners, collect your tokens. Losers, there's always next time.`,
  (title: string, outcome: string) =>
    `📢 The verdict is in! *"${title}"* resolved as *${outcome}*. Some are popping champagne, others are crying.`,
  (title: string, outcome: string) =>
    `⚖️ *"${title}"* → *${outcome}*. The oracle has spoken. Payouts are in!`,
  (title: string, outcome: string) =>
    `🎬 And that's a wrap! *"${title}"* resolved *${outcome}*. Check your balance 👀`,
  (title: string, outcome: string) =>
    `💸 *"${title}"* is done: *${outcome}*. Some of you saw it coming. The rest... well, we appreciate your donation.`,
  (title: string, outcome: string) =>
    `🔮 Turns out the answer to *"${title}"* was *${outcome}*. Did you call it?`,
]

export function notifyMarketResolved(title: string, outcome: string) {
  const msg = pick(MARKET_RESOLVED_MESSAGES)(title, outcome)
  postToSlack(msg)
}

// ── Weekly Allowance ─────────────────────────────────────────

const WEEKLY_ALLOWANCE_MESSAGES = [
  (count: number, tokens: number) =>
    `💸 Weekly allowance dropped! *${count} users* just received a total of *${tokens} tokens*. Time to put them to work — go take some positions!`,
  (count: number, tokens: number) =>
    `🎁 It's Monday, it's payday! *${tokens} tokens* distributed to *${count}* traders. Markets are waiting — what are you betting on this week?`,
  (count: number, tokens: number) =>
    `🏦 The StoikMarket Central Bank has spoken: *${tokens} tokens* airdropped to *${count} users*. Don't just sit on them — go predict something!`,
  (count: number, tokens: number) =>
    `💰 Fresh tokens alert! *${count} users* got their weekly cut (*${tokens} tokens* total). The markets are open and your tokens are burning a hole in your pocket.`,
  (count: number, tokens: number) =>
    `📬 Monday delivery: *${tokens} tokens* spread across *${count}* accounts. New week, new predictions — what's it going to be?`,
  (count: number, tokens: number) =>
    `🌅 Good morning traders! *${count} of you* just got topped up with *${tokens} tokens* total. May your predictions be bold and your returns be legendary.`,
]

export function notifyWeeklyAllowance(userCount: number, totalTokens: number) {
  if (userCount === 0) return
  const msg = pick(WEEKLY_ALLOWANCE_MESSAGES)(userCount, totalTokens)
  postToSlack(msg)
}

// ── Weekly Recap ─────────────────────────────────────────────

interface WeeklyRecapData {
  totalTrades: number
  totalTokensInvested: number
  topInvestors: { name: string; tokens: number }[]
  topWinners: { name: string; pnl: number }[]
}

function formatMedal(index: number): string {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`
}

function formatRecapMessage(data: WeeklyRecapData): string {
  const lines: string[] = [
    `📊 *Weekly Recap — It's Friday, here's how the week went!*`,
    ``,
    `• *${data.totalTrades}* trades made`,
    `• *${data.totalTokensInvested}* tokens invested`,
  ]

  if (data.topInvestors.length > 0) {
    lines.push(``, `*Top Investors:*`)
    data.topInvestors.forEach((inv, i) => {
      lines.push(`${formatMedal(i)} ${inv.name} — ${inv.tokens} tokens`)
    })
  }

  if (data.topWinners.length > 0) {
    lines.push(``, `*Top Winners:*`)
    data.topWinners.forEach((w, i) => {
      lines.push(`${formatMedal(i)} ${w.name} — ${w.pnl > 0 ? '+' : ''}${w.pnl} PnL`)
    })
  }

  lines.push(``, `See you next week — or better yet, go make a prediction now! 🎯`)

  return lines.join('\n')
}

export function notifyWeeklyRecap(data: WeeklyRecapData) {
  const msg = formatRecapMessage(data)
  postToSlack(msg)
}

// ── Big Position (trade above p80) ────────────────────────────

const BIG_POSITION_MESSAGES = [
  (name: string, outcome: string, cost: string, title: string) =>
    `🐋 Whale alert! *${name}* just dropped *${cost} tokens* on *${outcome}* in *"${title}"*!`,
  (name: string, outcome: string, cost: string, title: string) =>
    `💎 *${name}* is going BIG — *${cost} tokens* on *${outcome}* for *"${title}"*. Diamond hands or delusion?`,
  (name: string, outcome: string, cost: string, title: string) =>
    `🚨 Big bet incoming! *${name}* threw *${cost} tokens* at *${outcome}* on *"${title}"*. They know something, or they don't.`,
  (name: string, outcome: string, cost: string, title: string) =>
    `👀 *${name}* just went all-in vibes: *${cost} tokens* on *${outcome}* in *"${title}"*. Brave or foolish?`,
  (name: string, outcome: string, cost: string, title: string) =>
    `📣 Someone's feeling confident! *${name}* bet *${cost} tokens* on *${outcome}* for *"${title}"*.`,
  (name: string, outcome: string, cost: string, title: string) =>
    `🐋 *${name}* making waves: *${cost} tokens* on *${outcome}* in *"${title}"*. The rest of you might want to pay attention.`,
]

export async function notifyIfBigPosition(
  userName: string,
  outcome: string,
  cost: number,
  marketTitle: string,
) {
  if (!SLACK_WEBHOOK_URL) return
  try {
    const recentTrades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { cost: true },
    })

    if (recentTrades.length < 5) return

    const costs = recentTrades.map((t) => Math.abs(Number(t.cost))).sort((a, b) => a - b)
    const p80Index = Math.floor(costs.length * 0.8)
    const p80 = costs[p80Index]

    if (Math.abs(cost) > p80) {
      const msg = pick(BIG_POSITION_MESSAGES)(
        userName,
        outcome,
        Math.abs(cost).toFixed(0),
        marketTitle,
      )
      postToSlack(msg)
    }
  } catch (err) {
    console.error('[Slack] Failed to check big position:', err)
  }
}
