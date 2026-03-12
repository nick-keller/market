import { Link } from '@tanstack/react-router'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Position {
  userId?: string
  marketId?: string
  yesShares: number | string
  noShares: number | string
  investedAmount?: number
  user?: { id: string; name: string; image?: string | null }
  market?: { id: string; title: string; status?: string }
}

interface PositionTableProps {
  positions: Position[]
  showUser?: boolean
  showMarket?: boolean
  showPotentialWin?: boolean
}

export default function PositionTable({
  positions,
  showUser = false,
  showMarket = false,
  showPotentialWin = false,
}: PositionTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No positions yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showUser && <TableHead>User</TableHead>}
          {showMarket && <TableHead>Market</TableHead>}
          <TableHead className="text-right">Yes Shares</TableHead>
          <TableHead className="text-right">No Shares</TableHead>
          <TableHead className="text-right">Invested</TableHead>
          {showPotentialWin && (
            <TableHead className="text-right">Potential Win</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map((pos, i) => {
          const yesShares = Number(pos.yesShares)
          const noShares = Number(pos.noShares)
          const investedAmount = pos.investedAmount ?? 0
          const maxWin = Math.max(yesShares, noShares)
          const potentialWin = maxWin - investedAmount

          return (
            <TableRow key={i}>
              {showUser && pos.user && (
                <TableCell>
                  <Link
                    to="/users/$userId"
                    params={{ userId: pos.user.id }}
                    className="font-medium hover:underline"
                  >
                    {pos.user.name}
                  </Link>
                </TableCell>
              )}
              {showMarket && pos.market && (
                <TableCell>
                  <Link
                    to="/markets/$marketId"
                    params={{ marketId: pos.market.id }}
                    className="font-medium hover:underline"
                  >
                    <span className="line-clamp-1">{pos.market.title}</span>
                  </Link>
                </TableCell>
              )}
              <TableCell className="text-right font-mono text-sm">
                {yesShares.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {noShares.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {investedAmount.toFixed(2)}
              </TableCell>
              {showPotentialWin && (
                <TableCell className="text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {potentialWin >= 0 ? '+' : ''}{potentialWin.toFixed(2)}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
