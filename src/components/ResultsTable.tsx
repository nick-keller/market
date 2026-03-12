import { Link } from '@tanstack/react-router'
import { Trophy, TrendingDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Trade {
  userId?: string | null
  outcome: 'YES' | 'NO'
  shares: number | string
  cost: number | string
  user?: { id: string; name: string } | null
}

interface ResultsTableProps {
  trades: Trade[]
  winningOutcome: 'YES' | 'NO'
}

interface UserResult {
  userId: string
  name: string
  yesShares: number
  noShares: number
  totalCost: number
  payout: number
  pnl: number
}

export default function ResultsTable({ trades, winningOutcome }: ResultsTableProps) {
  const byUser = new Map<string, UserResult>()

  for (const trade of trades) {
    const userId = trade.userId ?? trade.user?.id
    if (!userId || !trade.user) continue

    let entry = byUser.get(userId)
    if (!entry) {
      entry = {
        userId,
        name: trade.user.name,
        yesShares: 0,
        noShares: 0,
        totalCost: 0,
        payout: 0,
        pnl: 0,
      }
      byUser.set(userId, entry)
    }

    const shares = Number(trade.shares)
    if (trade.outcome === 'YES') entry.yesShares += shares
    else entry.noShares += shares
    entry.totalCost += Number(trade.cost)
  }

  const results: UserResult[] = []
  for (const entry of byUser.values()) {
    entry.payout = winningOutcome === 'YES' ? entry.yesShares : entry.noShares
    entry.pnl = entry.payout - entry.totalCost
    results.push(entry)
  }

  results.sort((a, b) => b.pnl - a.pnl)

  if (results.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No results to display.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>User</TableHead>
          <TableHead className="text-right">Payout</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">P&amp;L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => {
          const isWinner = r.pnl > 0
          return (
            <TableRow key={r.userId}>
              <TableCell className="pr-0">
                {isWinner ? (
                  <Trophy className="size-4 text-amber-500" />
                ) : (
                  <TrendingDown className="size-4 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell>
                <Link
                  to="/users/$userId"
                  params={{ userId: r.userId }}
                  className="font-medium hover:underline"
                >
                  {r.name}
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {r.payout.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm text-muted-foreground">
                {r.totalCost.toFixed(2)}
              </TableCell>
              <TableCell
                className={`text-right font-mono text-sm font-semibold ${
                  isWinner
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : r.pnl < 0
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-muted-foreground'
                }`}
              >
                {r.pnl >= 0 ? '+' : ''}
                {r.pnl.toFixed(2)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
