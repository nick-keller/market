import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import MarketCard from '@/components/MarketCard'
import MarketFilters from '@/components/MarketFilters'

export const Route = createFileRoute('/')({
  component: Home,
})

function MarketCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="mt-auto flex justify-end">
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  )
}

function Home() {
  const trpc = useTRPC()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('OPEN')
  const [sort, setSort] = useState('recent')
  const { data: session } = authClient.useSession()
  const { data: me } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  })
  const canViewPending = me?.roles?.includes('VALIDATE_MARKETS') ?? false

  const { data, isPending } = useQuery(
    trpc.markets.list.queryOptions({
      search: search || undefined,
      status:
        status !== 'ALL'
          ? (status as 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED')
          : undefined,
      sort: sort as 'recent' | 'oldest' | 'positions' | 'volume' | 'extreme',
      limit: 50,
    }),
  )

  return (
    <main className="mx-auto max-w-6xl px-4 pb-12 pt-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse prediction markets and trade on outcomes.
          </p>
        </div>
        <Button asChild>
          <Link to="/markets/create">Create Market</Link>
        </Button>
      </div>

      <div className="mb-6">
        <MarketFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          sort={sort}
          onSortChange={setSort}
          canViewPending={canViewPending}
        />
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      ) : data!.markets.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No markets found.</p>
          <Button variant="outline" asChild>
            <Link to="/markets/create">Create the first one</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data!.markets.map((market) => (
            <MarketCard key={market.id} market={market as any} />
          ))}
        </div>
      )}
    </main>
  )
}
