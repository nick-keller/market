import { Link } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PriceBar from './PriceBar'
import { priceYes } from '#/lib/lmsr'

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
  }
}

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
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
    <Link to="/markets/$marketId" params={{ marketId: market.id }} className="no-underline">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
              {market.title}
            </h3>
            <Badge variant={statusVariant[market.status] ?? 'secondary'} className="shrink-0 text-[10px]">
              {market.status}
            </Badge>
          </div>

          <PriceBar yesPrice={yesP} size="sm" />

          <div className="mt-auto flex items-center justify-end text-xs text-muted-foreground">
            <span>Total invested: {(market.totalInvested ?? (state ? Number(state.volume) : 0)).toFixed(2)}</span>
          </div>

          {market.closeTime && (
            <p className="text-[11px] text-muted-foreground">
              Closes {new Date(market.closeTime).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
