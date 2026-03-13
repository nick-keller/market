import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, TrendingUp, Award, Trophy, BarChart3, ScrollText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useTRPC } from '#/integrations/trpc/react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const STORAGE_KEY = 'stoik-notifications-last-seen'

type Filter = 'all' | 'markets' | 'transactions' | 'trades'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'markets', label: 'Markets' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'trades', label: 'Trades' },
]

function getLastSeen(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? Number(v) : 0
  } catch {
    return 0
  }
}

function saveLastSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {}
}

export default function NotificationMenu() {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [lastSeen, setLastSeen] = useState(getLastSeen)

  const { data: notifications } = useQuery({
    ...trpc.notifications.list.queryOptions(),
    refetchInterval: 60_000,
  })

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      saveLastSeen()
      setLastSeen(Date.now())
    }
  }, [])

  const filtered = useMemo(() => {
    if (!notifications) return []
    if (filter === 'all') return notifications
    return notifications.filter((n) => {
      if (filter === 'markets') return n.kind === 'market'
      if (filter === 'transactions') return n.kind === 'transaction'
      if (filter === 'trades') return n.kind === 'trade'
      return true
    })
  }, [notifications, filter])

  const hasUnread = notifications?.some((n) => new Date(n.date).getTime() > lastSeen) ?? false

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="size-4" />
          {hasUnread && (
            <span className="absolute top-1 right-1 size-2 rounded-full bg-red-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
        </div>

        <div className="flex gap-1 border-b px-3 py-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
          )}
          {filtered.map((n) => {
            const isNew = new Date(n.date).getTime() > lastSeen
            return (
              <NotificationItem key={`${n.kind}-${n.id}`} item={n} isNew={isNew} />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationItem({ item, isNew }: { item: any; isNew: boolean }) {
  const time = formatDistanceToNow(new Date(item.date), { addSuffix: true })

  if (item.kind === 'transaction') {
    const icon = item.type === 'REWARD' ? Award : Trophy
    const Icon = icon
    return (
      <div className="relative flex gap-3 border-b px-4 py-3 last:border-b-0">
        {isNew && <span className="absolute top-3 right-3 size-2 rounded-full bg-red-500" />}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug">{item.message}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{time}</p>
        </div>
      </div>
    )
  }

  if (item.kind === 'market') {
    return (
      <Link
        to="/markets/$marketId"
        params={{ marketId: item.id }}
        className="relative flex gap-3 border-b px-4 py-3 no-underline transition-colors hover:bg-accent/50 last:border-b-0"
      >
        {isNew && <span className="absolute top-3 right-3 size-2 rounded-full bg-red-500" />}
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
          <ScrollText className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">{item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            New market by {item.creatorName ?? 'Unknown'} · {time}
          </p>
        </div>
      </Link>
    )
  }

  if (item.kind === 'trade') {
    const isSell = Number(item.shares) < 0
    return (
      <Link
        to="/markets/$marketId"
        params={{ marketId: item.marketId! }}
        className="relative flex gap-3 border-b px-4 py-3 no-underline transition-colors hover:bg-accent/50 last:border-b-0"
      >
        {isNew && <span className="absolute top-3 right-3 size-2 rounded-full bg-red-500" />}
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isSell ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
        }`}>
          {isSell ? <BarChart3 className="size-4" /> : <TrendingUp className="size-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-snug">
            <span className="font-medium">{item.userName ?? 'Someone'}</span>
            {' '}{isSell ? 'sold' : 'bought'}{' '}
            {Math.abs(item.shares).toFixed(1)} {item.outcome} shares
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.marketTitle ?? 'Unknown market'} · {time}
          </p>
        </div>
      </Link>
    )
  }

  return null
}
