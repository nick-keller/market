import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'
import { Button } from '@/components/ui/button'
import MarketCard from '@/components/MarketCard'
import MarketFilters from '@/components/MarketFilters'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const trpc = useTRPC()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('OPEN')
  const { data: session } = authClient.useSession()
  const { data: me } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  })
  const canViewPending = me?.roles?.includes('VALIDATE_MARKETS') ?? false

  const { data } = useSuspenseQuery(
    trpc.markets.list.queryOptions({
      search: search || undefined,
      status:
        status !== 'ALL'
          ? (status as 'PENDING' | 'OPEN' | 'CLOSED' | 'RESOLVED')
          : undefined,
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
          canViewPending={canViewPending}
        />
      </div>

      {data.markets.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No markets found.</p>
          <Button variant="outline" asChild>
            <Link to="/markets/create">Create the first one</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.markets.map((market) => (
            <MarketCard key={market.id} market={market as any} />
          ))}
        </div>
      )}
    </main>
  )
}
