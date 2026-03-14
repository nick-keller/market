export interface AchievementTier {
  value: number
  reward: number
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  illustration: string
  tiers?: AchievementTier[]
  reward?: number
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'create_markets',
    name: 'Market Maker',
    description: 'Create {value} markets',
    illustration: 'A god-like figure standing on a mountaintop, arms raised to the sky, conjuring glowing market stalls out of thin air as lightning crackles between their fingertips and a new city of commerce erupts from the earth below.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 20, reward: 100 },
      { value: 50, reward: 250 },
      { value: 100, reward: 500 },
    ],
  },
  {
    id: 'make_trades',
    name: 'Active Trader',
    description: 'Make {value} trades',
    illustration: 'A trader with six arms moving at blinding speed across a massive holographic trading floor, each hand slamming down on a different deal while sparks and contract scrolls fly through the air.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 20, reward: 100 },
      { value: 50, reward: 250 },
      { value: 100, reward: 500 },
    ],
  },
  {
    id: 'buy_shares',
    name: 'Bull Buyer',
    description: 'Buy {value} shares',
    illustration: 'A colossal golden bull charging through Wall Street, its horns impaling stacks of share certificates as traders ride on its back waving flags of victory, skyscrapers trembling in its wake.',
    tiers: [
      { value: 100, reward: 25 },
      { value: 500, reward: 50 },
      { value: 1000, reward: 100 },
      { value: 2000, reward: 200 },
      { value: 5000, reward: 500 },
    ],
  },
  {
    id: 'sell_shares',
    name: 'Profit Taker',
    description: 'Sell {value} shares',
    illustration: 'A suave figure in a tailored suit leaping off a golden parachute made of stock certificates, raining coins down onto a crowd below as fireworks spell out "SOLD" across a neon skyline.',
    tiers: [
      { value: 100, reward: 25 },
      { value: 500, reward: 50 },
      { value: 1000, reward: 100 },
      { value: 2000, reward: 200 },
      { value: 5000, reward: 500 },
    ],
  },
  {
    id: 'win_markets',
    name: 'Winner',
    description: 'Win {value} markets',
    illustration: 'A champion standing atop a pyramid of defeated opponents, holding a blazing trophy overhead while confetti rains from a stadium-sized arena and spotlights converge on them from every direction.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 20, reward: 100 },
      { value: 50, reward: 250 },
      { value: 100, reward: 500 },
    ],
  },
  {
    id: 'lose_markets',
    name: 'Resilient',
    description: 'Lose {value} markets',
    illustration: 'A battered warrior rising from a crater of broken charts and shattered graphs, cracked armor glowing with inner light, defiantly raising a fist against a stormy sky as phoenixes circle overhead.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 20, reward: 100 },
      { value: 50, reward: 250 },
      { value: 100, reward: 500 },
    ],
  },
  {
    id: 'market_positions',
    name: 'Crowd Puller',
    description: 'Have one of your markets attract {value} traders',
    illustration: 'A magnetic ringmaster at the center of a colossal circus tent, pulling hordes of mesmerized traders toward a glowing market booth with gravitational force, the crowd stretching to the horizon.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 20, reward: 100 },
    ],
  },
  {
    id: 'buy_both_sides',
    name: 'Hedger',
    description: 'Buy both Yes and No shares on a market',
    illustration: 'A two-faced Janus figure in a split toga — one half radiant gold, the other deep purple — each hand clutching opposite sides of a coin that crackles with energy, standing on a perfectly balanced cosmic scale.',
    reward: 25,
  },
  {
    id: 'biggest_profit_winner',
    name: 'Top Dog',
    description: 'Have the biggest profit on a winning market',
    illustration: 'A massive wolf wearing a crown of gold coins, standing triumphantly on a mountain of cash with the northern lights forming a dollar sign behind it, lesser wolves bowing in the foreground.',
    reward: 50,
  },
  {
    id: 'biggest_loss_loser',
    name: 'Bag Holder',
    description: 'Have the biggest loss on a market',
    illustration: 'A lone figure trudging through a desert, dragging an impossibly enormous burlap sack overflowing with worthless paper, vultures circling above and a red stock chart plummeting like a meteor trail across the sky.',
    reward: 25,
  },
  {
    id: 'market_profit',
    name: 'Big Winner',
    description: 'Make {value} profit on a single market',
    illustration: 'A figure bursting through a giant vault door, bathed in blinding golden light, with towers of gems and coins erupting behind them like a volcanic explosion of wealth.',
    tiers: [
      { value: 50, reward: 25 },
      { value: 100, reward: 50 },
      { value: 500, reward: 100 },
      { value: 1000, reward: 250 },
      { value: 5000, reward: 500 },
    ],
  },

  // ── Streak & Consistency ──────────────────────────────────────

  {
    id: 'win_streak',
    name: 'Oracle',
    description: 'Win {value} markets in a row',
    illustration: 'An all-seeing mystic levitating above an ancient temple, three glowing eyes open, correctly predicting the future as visions of winning markets swirl around them in a blazing spiral of golden light.',
    tiers: [
      { value: 2, reward: 15 },
      { value: 3, reward: 30 },
      { value: 5, reward: 75 },
      { value: 7, reward: 150 },
      { value: 10, reward: 300 },
    ],
  },
  {
    id: 'lose_streak',
    name: 'Cursed',
    description: 'Lose {value} markets in a row',
    illustration: 'A shadowy figure wrapped in chains of bad luck, walking under a perpetual storm cloud as black cats cross their path and mirrors shatter in sequence, a trail of red candle charts burning behind them.',
    tiers: [
      { value: 3, reward: 15 },
      { value: 5, reward: 30 },
      { value: 7, reward: 75 },
    ],
  },
  {
    id: 'active_weeks',
    name: 'Regular',
    description: 'Trade in {value} distinct weeks',
    illustration: 'An iron-willed samurai meditating at a trading desk through changing seasons — cherry blossoms, summer sun, autumn leaves, and snow — each season swirling around them while a calendar turns its pages in the wind.',
    tiers: [
      { value: 2, reward: 10 },
      { value: 4, reward: 25 },
      { value: 8, reward: 50 },
      { value: 16, reward: 100 },
      { value: 26, reward: 250 },
      { value: 52, reward: 500 },
    ],
  },

  // ── Timing & Speed ────────────────────────────────────────────

  {
    id: 'first_trader',
    name: 'First Mover',
    description: 'Be the first trader on {value} markets',
    illustration: 'A sprinter breaking through a finish-line ribbon at the speed of light, leaving a sonic boom and a trail of afterimages, arriving at a brand-new market before the doors have even fully opened.',
    tiers: [
      { value: 1, reward: 10 },
      { value: 5, reward: 25 },
      { value: 10, reward: 50 },
      { value: 25, reward: 150 },
    ],
  },
  {
    id: 'last_trader',
    name: 'Last Call',
    description: 'Be the last trader before a market resolves',
    illustration: 'A dramatic figure diving through closing vault doors at the last second, arm stretched out to slap down one final trade as a giant clock strikes midnight and the market gates slam shut in a shower of sparks.',
    reward: 25,
  },
  {
    id: 'diamond_hands',
    name: 'Diamond Hands',
    description: 'Hold a winning position from the first day through resolution',
    illustration: 'A stoic titan with fists literally made of glittering diamonds, gripping a stock certificate in a death grip while hurricanes, earthquakes, and market crashes rage around them — unmoved, unshaken, victorious.',
    reward: 50,
  },

  // ── Contrarian & Strategy ─────────────────────────────────────

  {
    id: 'contrarian',
    name: 'Contrarian',
    description: 'Win {value} markets buying the winning side below 25%',
    illustration: 'A lone rebel walking calmly in the opposite direction of a stampeding crowd, smirking as the mob runs off a cliff while a glowing green arrow rises behind the rebel into the stratosphere.',
    tiers: [
      { value: 1, reward: 25 },
      { value: 3, reward: 75 },
      { value: 5, reward: 150 },
      { value: 10, reward: 300 },
    ],
  },
  {
    id: 'paper_hands',
    name: 'Paper Hands',
    description: 'Sell shares that would have won when the market resolved',
    illustration: 'A panicked figure whose hands are literally disintegrating into confetti, watching in horror as the shares they just released float upward and transform into solid gold bars just out of reach.',
    reward: 15,
  },
  {
    id: 'flip_flopper',
    name: 'Flip Flopper',
    description: 'Make 3+ buy trades on both sides of a single market',
    illustration: 'A chaotic acrobat on a spinning coin, frantically flipping between YES and NO platforms like a pinball, leaving a dizzying trail of zigzagging arrows and confused onlookers.',
    reward: 25,
  },
  {
    id: 'sniper',
    name: 'Sniper',
    description: 'Win a market where you bought shares priced below 10%',
    illustration: 'A steely-eyed marksman perched on a skyscraper rooftop, peering through a scope at a tiny glowing target miles away labeled "10%", pulling the trigger as the bullet trails gold all the way to a direct hit.',
    reward: 100,
  },

  // ── Portfolio & Balance ───────────────────────────────────────

  {
    id: 'diversified',
    name: 'Diversified',
    description: 'Hold positions in {value} open markets at once',
    illustration: 'An octopus in a business suit seated at a circular desk, each tentacle simultaneously managing a different glowing market terminal, screens reflecting off its monocle as charts cascade in every direction.',
    tiers: [
      { value: 3, reward: 15 },
      { value: 5, reward: 30 },
      { value: 10, reward: 75 },
      { value: 20, reward: 200 },
    ],
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Spend {value} tokens on a single trade',
    illustration: 'A glamorous high-roller at a neon-lit casino table the size of a football field, pushing an absurd mountain of glowing chips into the center with one confident flick while the crowd gasps and spotlights explode.',
    tiers: [
      { value: 100, reward: 25 },
      { value: 250, reward: 50 },
      { value: 500, reward: 100 },
      { value: 1000, reward: 250 },
      { value: 2500, reward: 500 },
    ],
  },
  {
    id: 'token_hoarder',
    name: 'Hoarder',
    description: 'Accumulate a balance of {value} tokens',
    illustration: 'A dragon curled around an impossibly tall pile of golden tokens inside a cavernous vault, one eye open and glowing, daring anyone to touch even a single coin from the hoard.',
    tiers: [
      { value: 500, reward: 10 },
      { value: 1000, reward: 25 },
      { value: 2500, reward: 50 },
      { value: 5000, reward: 100 },
      { value: 10000, reward: 250 },
    ],
  },
  {
    id: 'penny_pincher',
    name: 'Penny Pincher',
    description: 'Buy exactly 1 share',
    illustration: 'A comically tiny figure using a magnifying glass and tweezers to carefully extract a single microscopic share from an enormous trading floor, sweat pouring down their face as if defusing a bomb.',
    reward: 10,
  },
  {
    id: 'all_in',
    name: 'YOLO',
    description: 'Spend over 90% of your balance on a single trade',
    illustration: 'A daredevil standing on the edge of a cliff made of stacked coins, eyes closed, arms wide open, swan-diving into the abyss with their entire fortune while a massive "YOLO" banner unfurls in flames behind them.',
    reward: 25,
  },
  {
    id: 'comeback',
    name: 'Comeback Kid',
    description: 'Win a market when your balance was below 100 tokens',
    illustration: 'A bruised boxer rising from the canvas at the count of nine, one eye swollen shut, throwing an impossible uppercut that sends the opponent flying through the ropes as the crowd erupts and fireworks ignite.',
    reward: 50,
  },

  // ── Social & Community ────────────────────────────────────────

  {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Be the first to buy the winning side on {value} markets',
    illustration: 'A fashion-forward visionary strutting down a red carpet made of green candlestick charts, wearing sunglasses that reflect the future, as a mob of followers scrambles to copy their every move.',
    tiers: [
      { value: 1, reward: 15 },
      { value: 3, reward: 40 },
      { value: 5, reward: 100 },
      { value: 10, reward: 250 },
    ],
  },
  {
    id: 'popular_creator',
    name: 'Fan Favorite',
    description: 'Have your markets attract {value} total trades',
    illustration: 'A rockstar market creator crowd-surfing over an ocean of adoring traders, each one waving trade receipts like concert tickets, while a giant neon sign with their name blazes above a sold-out arena.',
    tiers: [
      { value: 25, reward: 25 },
      { value: 50, reward: 50 },
      { value: 100, reward: 100 },
      { value: 250, reward: 250 },
      { value: 500, reward: 500 },
    ],
  },
  {
    id: 'whale',
    name: 'Whale',
    description: 'Be the biggest investor on {value} markets',
    illustration: 'A gargantuan cosmic whale breaching from an ocean of liquid gold, sending tidal waves of tokens crashing over tiny market islands while smaller fish scatter in awe.',
    tiers: [
      { value: 1, reward: 15 },
      { value: 3, reward: 40 },
      { value: 5, reward: 100 },
      { value: 10, reward: 250 },
    ],
  },

  // ── Meta ──────────────────────────────────────────────────────

  {
    id: 'achievement_hunter',
    name: 'Completionist',
    description: 'Unlock {value} achievement tiers',
    illustration: 'A legendary collector standing in a grand hall of trophies stretching into infinity, each pedestal holding a glowing achievement badge, the final empty pedestal illuminated by a beam of heavenly light.',
    tiers: [
      { value: 10, reward: 25 },
      { value: 25, reward: 75 },
      { value: 50, reward: 150 },
      { value: 75, reward: 300 },
      { value: 100, reward: 500 },
    ],
  },
  {
    id: 'perfect_market',
    name: 'Unanimous',
    description: 'Create a market where every trader picked the winning side',
    illustration: 'A conductor on a floating podium orchestrating an entire stadium of traders who all raise the same glowing card in perfect unison, creating a single blinding beam of light that shoots into space.',
    reward: 50,
  },
]

export const ACHIEVEMENTS_MAP = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))

export function getAchievementLabel(achievementId: string, tier: number): string {
  const def = ACHIEVEMENTS_MAP.get(achievementId)
  if (!def) return achievementId
  if (def.tiers) {
    return def.description.replace('{value}', tier.toString())
  }
  return def.description
}
