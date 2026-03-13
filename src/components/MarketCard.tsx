import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PriceBar from './PriceBar'
import { priceYes } from '#/lib/lmsr'
import { BitcoinIcon, CalendarIcon, UserIcon } from 'lucide-react'

interface MarketCardProps {
  market: {
    id: string
    title: string
    status: string
    closeTime: string | Date | null
    createdAt: string | Date
    state: {
      qYes: number | string
      qNo: number | string
      liquidityB: number | string
      volume: number | string
    } | null
    creator: { id: string; name: string } | null
    totalInvested?: number
    _count?: { positions: number }
  }
}

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  PENDING: 'secondary',
  OPEN: 'default',
  CLOSED: 'secondary',
  RESOLVED: 'outline',
}

export default function MarketCard({ market }: MarketCardProps) {
  const state = market.state
  const yesP = state
    ? priceYes(Number(state.qYes), Number(state.qNo), Number(state.liquidityB))
    : 0.5

  return (
    <Link
      to="/markets/$marketId"
      params={{ marketId: market.id }}
      className="no-underline"
    >
      <Card
        className={`h-full transition-shadow hover:shadow-md ${market.status === 'PENDING' ? 'bg-yellow-50 dark:bg-yellow-950/30' : ''}`}
      >
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {market.title}
            </h3>
            <Badge
              variant={statusVariant[market.status] ?? 'secondary'}
              className="shrink-0 text-[10px]"
            >
              {market.status}
            </Badge>
          </div>

          <PriceBar yesPrice={yesP} size="sm" />

          <div className="flex flex-col mt-auto">
            <div className="flex content-between justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BitcoinIcon size={11} />{' '}
                {(
                  market.totalInvested ?? (state ? Number(state.volume) : 0)
                ).toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <CalendarIcon size={11} />{' '}
                {market.closeTime
                  ? new Date(market.closeTime).toLocaleDateString()
                  : '-'}
              </span>
            </div>
            <div className="flex content-between justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserIcon size={11} />{' '}
                {market._count != null ? market._count.positions : 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
