export interface AchievementTier {
  value: number
  reward: number
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  tiers?: AchievementTier[]
  reward?: number
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'create_markets',
    name: 'Market Maker',
    description: 'Create {value} markets',
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
    reward: 25,
  },
  {
    id: 'biggest_profit_winner',
    name: 'Top Dog',
    description: 'Have the biggest profit on a winning market',
    reward: 50,
  },
  {
    id: 'biggest_loss_loser',
    name: 'Bag Holder',
    description: 'Have the biggest loss on a market',
    reward: 25,
  },
  {
    id: 'market_profit',
    name: 'Big Winner',
    description: 'Make {value} profit on a single market',
    tiers: [
      { value: 50, reward: 25 },
      { value: 100, reward: 50 },
      { value: 500, reward: 100 },
      { value: 1000, reward: 250 },
      { value: 5000, reward: 500 },
    ],
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
