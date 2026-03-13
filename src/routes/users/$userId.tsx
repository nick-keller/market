import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trophy, TrendingDown } from 'lucide-react'
import PositionTable from '@/components/PositionTable'
import TradeHistory from '@/components/TradeHistory'

export const Route = createFileRoute('/users/$userId')({
  component: UserProfile,
})

function ProfileCardSkeleton() {
  return (
    <Card className="mb-8">
      <CardContent className="flex items-center gap-5 p-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-52" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="ml-auto h-3 w-14" />
          <Skeleton className="ml-auto h-7 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function TabContentSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}

function UserProfile() {
  const { userId } = Route.useParams()
  const trpc = useTRPC()

  const { data: profile, isPending: profilePending } = useQuery(
    trpc.user.profile.queryOptions({ userId }),
  )

  const { data: positions, isPending: positionsPending } = useQuery(
    trpc.user.positions.queryOptions({ userId }),
  )

  const { data: tradesData, isPending: tradesPending } = useQuery(
    trpc.user.trades.queryOptions({ userId, limit: 50 }),
  )

  const { data: results, isPending: resultsPending } = useQuery(
    trpc.user.results.queryOptions({ userId }),
  )

  console.log(results)

  const wins = results?.filter((r) => r.netWon) ?? []
  const losses = results?.filter((r) => !r.netWon) ?? []

  return (
    <main className="mx-auto max-w-4xl px-4 pb-12 pt-8">
      {profilePending || !profile ? (
        <ProfileCardSkeleton />
      ) : (
        <Card className="mb-8">
          <CardContent className="flex items-center gap-5 p-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-accent text-xl font-bold text-primary">
                {profile.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Balance
              </p>
              <p className="text-2xl font-bold">{profile.balance.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="positions">
        <TabsList>
          <TabsTrigger value="positions">
            Positions {positions ? `(${positions.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="trades">
            Trade History {tradesData ? `(${tradesData.trades.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="results">
            Results {results ? `(${results.length})` : ''}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="positions" className="mt-4">
          {positionsPending || !positions ? (
            <TabContentSkeleton />
          ) : (
            <Card>
              <CardContent className="p-4">
                <PositionTable
                  positions={positions as any[]}
                  showMarket
                  showPotentialWin
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="trades" className="mt-4">
          {tradesPending || !tradesData ? (
            <TabContentSkeleton />
          ) : (
            <Card>
              <CardContent className="p-4">
                <TradeHistory
                  trades={tradesData.trades as any[]}
                  showMarket
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="results" className="mt-4">
          {resultsPending || !results ? (
            <TabContentSkeleton />
          ) : (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Trophy className="size-4 text-amber-500" />
                    Wins ({wins.length})
                  </h3>
                  {wins.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No wins yet.</p>
                  ) : (
                    <ResultsList results={wins} />
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <TrendingDown className="size-4 text-rose-500" />
                    Losses ({losses.length})
                  </h3>
                  {losses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No losses yet.</p>
                  ) : (
                    <ResultsList results={losses} />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  )
}

interface MarketResult {
  marketId: string
  marketTitle: string
  winningOutcome: string
  payout: number
  totalCost: number
  pnl: number
  netWon: boolean
  resolvedAt: string | Date | null
}

function ResultsList({ results }: { results: MarketResult[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          <TableHead>Outcome</TableHead>
          <TableHead className="text-right">Payout</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">P&L</TableHead>
          <TableHead className="text-right">Resolved</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.marketId}>
            <TableCell>
              <Link
                to="/markets/$marketId"
                params={{ marketId: r.marketId }}
                className="font-medium hover:underline"
              >
                <span className="line-clamp-1">{r.marketTitle}</span>
              </Link>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  r.winningOutcome === 'YES'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-rose-400 text-rose-500'
                }
              >
                {r.winningOutcome}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {r.payout.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm text-muted-foreground">
              {r.totalCost.toFixed(2)}
            </TableCell>
            <TableCell
              className={`text-right font-mono text-sm font-semibold ${
                r.pnl > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : r.pnl < 0
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-muted-foreground'
              }`}
            >
              {r.pnl >= 0 ? '+' : ''}{r.pnl.toFixed(2)}
            </TableCell>
            <TableCell className="text-right text-xs text-muted-foreground">
              {r.resolvedAt
                ? new Date(r.resolvedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
