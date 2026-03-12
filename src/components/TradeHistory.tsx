import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Trade {
  id: string
  outcome: string
  shares: number | string
  cost: number | string
  createdAt: string | Date
  user?: { id: string; name: string } | null
  market?: { id: string; title: string; status?: string } | null
}

interface TradeHistoryProps {
  trades: Trade[]
  showUser?: boolean
  showMarket?: boolean
}

export default function TradeHistory({
  trades,
  showUser = false,
  showMarket = false,
}: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No trades yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showUser && <TableHead>User</TableHead>}
          {showMarket && <TableHead>Market</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((trade) => {
          const shareNum = Number(trade.shares)
          const isSell = shareNum < 0
          return (
            <TableRow key={trade.id}>
              {showUser && trade.user && (
                <TableCell>
                  <Link
                    to="/users/$userId"
                    params={{ userId: trade.user.id }}
                    className="font-medium hover:underline"
                  >
                    {trade.user.name}
                  </Link>
                </TableCell>
              )}
              {showMarket && trade.market && (
                <TableCell>
                  <Link
                    to="/markets/$marketId"
                    params={{ marketId: trade.market.id }}
                    className="font-medium hover:underline"
                  >
                    <span className="line-clamp-1">{trade.market.title}</span>
                  </Link>
                </TableCell>
              )}
              <TableCell>
                <Badge variant={isSell ? 'destructive' : 'default'} className="text-[10px]">
                  {isSell ? 'SELL' : 'BUY'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    trade.outcome === 'YES'
                      ? 'border-emerald-500 text-emerald-600'
                      : 'border-rose-400 text-rose-500'
                  }
                >
                  {trade.outcome}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {Math.abs(shareNum).toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {Math.abs(Number(trade.cost)).toFixed(4)}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {new Date(trade.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
