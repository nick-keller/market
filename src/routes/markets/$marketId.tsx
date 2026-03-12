import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PriceBar from '@/components/PriceBar'
import PriceChart from '@/components/PriceChart'
import TradePanel from '@/components/TradePanel'
import PositionTable from '@/components/PositionTable'
import ResultsTable from '@/components/ResultsTable'
import TradeHistory from '@/components/TradeHistory'
import { priceYes } from '#/lib/lmsr'
import type { Outcome } from '#/lib/lmsr'

export const Route = createFileRoute('/markets/$marketId')({
  component: MarketDetail,
})

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING: 'secondary',
  OPEN: 'default',
  CLOSED: 'secondary',
  RESOLVED: 'outline',
}

function MarketDetail() {
  const { marketId } = Route.useParams()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const { data: market } = useSuspenseQuery(
    trpc.markets.get.queryOptions({ id: marketId }),
  )

  const { data: trades } = useSuspenseQuery(
    trpc.trade.history.queryOptions({ marketId, limit: 200 }),
  )

  const state = market.state!
  const qYes = Number(state.qYes)
  const qNo = Number(state.qNo)
  const b = Number(state.liquidityB)
  const yesP = priceYes(qYes, qNo, b)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: trpc.markets.get.queryKey({ id: marketId }) })
    queryClient.invalidateQueries({ queryKey: trpc.trade.history.queryKey({ marketId, limit: 200 }) })
    if (userId) {
      queryClient.invalidateQueries({ queryKey: trpc.user.profile.queryKey({ userId }) })
    }
  }

  const openMutation = useMutation(
    trpc.markets.open.mutationOptions({ onSuccess: invalidate }),
  )

  const buyMutation = useMutation(
    trpc.trade.buy.mutationOptions({ onSuccess: invalidate }),
  )

  const sellMutation = useMutation(
    trpc.trade.sell.mutationOptions({ onSuccess: invalidate }),
  )

  const resolveMutation = useMutation(
    trpc.markets.resolve.mutationOptions({ onSuccess: invalidate }),
  )

  const userId = session?.user?.id
  const myPosition = market.positions.find((p) => p.userId === userId)

  const { data: profileData } = useQuery({
    ...trpc.user.profile.queryOptions({ userId: userId! }),
    enabled: !!userId,
  })
  const { data: me } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!userId,
  })
  const userBalance = profileData?.balance ?? 1000
  const canValidateMarkets = me?.roles?.includes('VALIDATE_MARKETS') ?? false
  const canResolveMarkets = me?.roles?.includes('RESOLVE_MARKETS') ?? false

  const handleBuy = (outcome: Outcome, shares: number) => {
    buyMutation.mutate({ marketId, outcome, shares })
  }
  const handleSell = (outcome: Outcome, shares: number) => {
    sellMutation.mutate({ marketId, outcome, shares })
  }

  const isCreator = userId === market.creatorId
  const canOpenMarket = market.status === 'PENDING' && canValidateMarkets
  const canResolve =
    (market.status === 'OPEN' || market.status === 'CLOSED') &&
    (isCreator || canResolveMarkets)

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant={statusVariant[market.status] ?? 'secondary'}>
                {market.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {market.title}
            </h1>
            {market.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {market.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {market.creator && (
                <span>
                  Created by{' '}
                  <Link
                    to="/users/$userId"
                    params={{ userId: market.creator.id }}
                    className="font-medium hover:underline"
                  >
                    {market.creator.name}
                  </Link>
                </span>
              )}
              <span>Vol: {Number(state.volume).toFixed(2)}</span>
              <span>
                Total invested: <span className="font-medium text-foreground">{(market as { totalInvested?: number }).totalInvested?.toFixed(2) ?? Number(state.volume).toFixed(2)}</span>
              </span>
              {market.closeTime && (
                <span>
                  Closes {new Date(market.closeTime).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {canOpenMarket && (
            <Button
              size="sm"
              variant="default"
              onClick={() => openMutation.mutate({ marketId })}
              disabled={openMutation.isPending}
            >
              {openMutation.isPending ? 'Opening...' : 'Open market'}
            </Button>
          )}
          {canResolve && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  resolveMutation.mutate({ marketId, winningOutcome: 'YES' })
                }
                disabled={resolveMutation.isPending}
              >
                Resolve YES
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  resolveMutation.mutate({ marketId, winningOutcome: 'NO' })
                }
                disabled={resolveMutation.isPending}
              >
                Resolve NO
              </Button>
            </div>
          )}

          {market.status === 'RESOLVED' && market.winningOutcome && (
            <Badge
              className={
                market.winningOutcome === 'YES'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-500 text-white'
              }
            >
              Resolved: {market.winningOutcome}
            </Badge>
          )}
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round(yesP * 100)}¢
                </span>
                <span className="text-sm text-muted-foreground">Yes</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm text-muted-foreground">No</span>
                <span className="text-3xl font-bold text-rose-500 dark:text-rose-400">
                  {Math.round((1 - yesP) * 100)}¢
                </span>
              </div>
            </div>
            <PriceBar yesPrice={yesP} size="lg" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="mb-4 text-sm font-semibold">Price History</h2>
              <PriceChart trades={trades as any[]} liquidityB={b} />
            </CardContent>
          </Card>

          {market.status === 'RESOLVED' && market.winningOutcome ? (
            <Tabs defaultValue="results">
              <TabsList>
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="trades">Trade History</TabsTrigger>
              </TabsList>
              <TabsContent value="results" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <ResultsTable
                      trades={trades as any[]}
                      winningOutcome={market.winningOutcome}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trades" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <TradeHistory trades={trades as any[]} showUser />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs defaultValue="positions">
              <TabsList>
                <TabsTrigger value="positions">Positions</TabsTrigger>
                <TabsTrigger value="trades">Recent Trades</TabsTrigger>
              </TabsList>
              <TabsContent value="positions" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <PositionTable
                      positions={market.positions as any[]}
                      showUser
                      showPotentialWin
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="trades" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <TradeHistory trades={trades as any[]} showUser />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div>
          <TradePanel
            qYes={qYes}
            qNo={qNo}
            liquidityB={b}
            userBalance={userBalance}
            userYesShares={myPosition ? Number(myPosition.yesShares) : 0}
            userNoShares={myPosition ? Number(myPosition.noShares) : 0}
            marketStatus={market.status}
            onBuy={handleBuy}
            onSell={handleSell}
            isPending={buyMutation.isPending || sellMutation.isPending}
          />

          {(buyMutation.error || sellMutation.error) && (
            <p className="mt-2 text-sm text-destructive">
              {buyMutation.error?.message || sellMutation.error?.message}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
