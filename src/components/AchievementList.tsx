import { ACHIEVEMENTS } from '#/lib/achievements'
import type { AchievementDefinition } from '#/lib/achievements'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  Target,
  TrendingUp,
  ShoppingCart,
  Banknote,
  Medal,
  Users,
  ArrowLeftRight,
  Crown,
  Skull,
  Gem,
  Flame,
  CloudLightning,
  CalendarDays,
  Zap,
  Hourglass,
  Diamond,
  RefreshCcw,
  Wind,
  Repeat,
  Crosshair,
  PieChart,
  Rocket,
  Landmark,
  Coins,
  Bomb,
  Sunrise,
  Sparkles,
  Heart,
  Fish,
  Award,
  CircleCheck,
} from 'lucide-react'

interface UserAchievement {
  achievementId: string
  tier: number
  reward: number
  achievedAt: Date | string
}

const ACHIEVEMENT_ICONS: Record<string, React.ElementType> = {
  create_markets: Target,
  make_trades: TrendingUp,
  buy_shares: ShoppingCart,
  sell_shares: Banknote,
  win_markets: Trophy,
  lose_markets: Medal,
  market_positions: Users,
  buy_both_sides: ArrowLeftRight,
  biggest_profit_winner: Crown,
  biggest_loss_loser: Skull,
  market_profit: Gem,
  win_streak: Flame,
  lose_streak: CloudLightning,
  active_weeks: CalendarDays,
  first_trader: Zap,
  last_trader: Hourglass,
  diamond_hands: Diamond,
  contrarian: RefreshCcw,
  paper_hands: Wind,
  flip_flopper: Repeat,
  sniper: Crosshair,
  diversified: PieChart,
  high_roller: Rocket,
  token_hoarder: Landmark,
  penny_pincher: Coins,
  all_in: Bomb,
  comeback: Sunrise,
  trendsetter: Sparkles,
  popular_creator: Heart,
  whale: Fish,
  achievement_hunter: Award,
  perfect_market: CircleCheck,
}

function AchievementCard({
  def,
  earned,
}: {
  def: AchievementDefinition
  earned: UserAchievement[]
}) {
  const earnedTiers = new Set(earned.map((e) => e.tier))
  const Icon = ACHIEVEMENT_ICONS[def.id] ?? Trophy
  const hasAny = earned.length > 0

  if (def.tiers) {
    const totalTiers = def.tiers.length
    const earnedCount = def.tiers.filter((t) => earnedTiers.has(t.value)).length
    const allEarned = earnedCount === totalTiers

    return (
      <Card
        className={cn(
          'overflow-hidden transition-all pt-0',
          allEarned &&
            'border-amber-400/60 bg-amber-50/30 dark:border-amber-500/40 dark:bg-amber-950/20',
          hasAny && !allEarned && 'border-blue-300/50 dark:border-blue-500/30',
        )}
      >
        <img
          src={`/achievements/${def.id}.png`}
          alt={def.illustration}
          className={cn(
            'w-full aspect-square object-cover bg-foreground/10',
            !hasAny && 'grayscale opacity-50',
          )}
        />
        <CardContent className="p-4">
          <div className="mb-3 flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                allEarned
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                  : hasAny
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{def.name}</h3>
              <p className="text-xs text-muted-foreground">
                {earnedCount}/{totalTiers} tiers
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {def.tiers.map((t) => {
              const isEarned = earnedTiers.has(t.value)
              return (
                <Badge
                  key={t.value}
                  variant={isEarned ? 'default' : 'outline'}
                  className={cn(
                    'text-xs whitespace-normal',
                    isEarned
                      ? 'bg-amber-500 hover:bg-amber-500 text-white dark:bg-amber-600'
                      : 'opacity-50',
                  )}
                >
                  {def.description.replace('{value}', t.value.toString())}
                  {isEarned && (
                    <span className="ml-1 opacity-75">+{t.reward}</span>
                  )}
                </Badge>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  const achievedEntry = earned.find((e) => e.tier === 0)

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all pt-0',
        achievedEntry &&
          'border-amber-400/60 bg-amber-50/30 dark:border-amber-500/40 dark:bg-amber-950/20',
      )}
    >
      <img
        src={`/achievements/${def.id}.png`}
        alt={def.illustration}
        className={cn(
          'w-full aspect-square object-cover bg-foreground/10',
          !achievedEntry && 'grayscale opacity-50',
        )}
      />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              achievedEntry
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{def.name}</h3>
            <p className="text-xs text-muted-foreground">{def.description}</p>
          </div>
          {achievedEntry ? (
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white dark:bg-amber-600 shrink-0">
              +{def.reward}
            </Badge>
          ) : (
            <Badge variant="outline" className="opacity-50 shrink-0">
              +{def.reward}
            </Badge>
          )}
        </div>
        {achievedEntry && (
          <p className="mt-2 text-right text-xs text-muted-foreground">
            Earned{' '}
            {new Date(achievedEntry.achievedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AchievementList({
  achievements,
}: {
  achievements: UserAchievement[]
}) {
  const byId = new Map<string, UserAchievement[]>()
  for (const a of achievements) {
    const arr = byId.get(a.achievementId) ?? []
    arr.push(a)
    byId.set(a.achievementId, arr)
  }

  const totalEarned = achievements.length
  const totalRewards = achievements.reduce((sum, a) => sum + a.reward, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-4 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{totalEarned}</strong>{' '}
          achievements unlocked
        </span>
        <span>
          <strong className="text-foreground">{totalRewards.toFixed(0)}</strong>{' '}
          tokens earned
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((def) => (
          <AchievementCard
            key={def.id}
            def={def}
            earned={byId.get(def.id) ?? []}
          />
        ))}
      </div>
    </div>
  )
}
