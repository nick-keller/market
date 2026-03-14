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
