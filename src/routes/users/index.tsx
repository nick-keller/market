import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLES } from '#/lib/roles'

export const Route = createFileRoute('/users/')({
  component: UsersPage,
})

function LeaderboardRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <Skeleton className="h-4 w-5" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </TableCell>
      {Array.from({ length: 7 }).map((_, i) => (
        <TableCell key={i} className="text-right">
          <Skeleton className="ml-auto h-4 w-14" />
        </TableCell>
      ))}
    </TableRow>
  )
}

const PODIUM_CATEGORIES = [
  { value: 'totalShares', label: 'Most shares' },
  { value: 'positionCount', label: 'Most positions' },
  { value: 'balance', label: 'More tokens' },
  { value: 'marketsCreated', label: 'Most markets created' },
  { value: 'wins', label: 'Most wins' },
  { value: 'biggestPayout', label: 'Biggest payout' },
  { value: 'biggestPnl', label: 'Biggest PnL' },
] as const

type PodiumCategory = (typeof PODIUM_CATEGORIES)[number]['value']

type LeaderboardUser = {
  id: string
  name: string
  email: string
  image: string | null
} & Record<PodiumCategory, number>

const PODIUM_PLACES = [
  {
    place: 2,
    medal: '🥈',
    height: 'h-20',
    avatarSize: 'h-12 w-12',
    bg: 'bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-500 dark:to-zinc-600',
    text: 'text-zinc-600 dark:text-zinc-300',
    ring: 'ring-zinc-300 dark:ring-zinc-500',
  },
  {
    place: 1,
    medal: '🥇',
    height: 'h-28',
    avatarSize: 'h-16 w-16',
    bg: 'bg-gradient-to-b from-yellow-400 to-amber-500',
    text: 'text-yellow-800 dark:text-yellow-200',
    ring: 'ring-yellow-400',
  },
  {
    place: 3,
    medal: '🥉',
    height: 'h-14',
    avatarSize: 'h-12 w-12',
    bg: 'bg-gradient-to-b from-amber-600 to-amber-700',
    text: 'text-amber-200',
    ring: 'ring-amber-600',
  },
]

const TABLE_COLUMNS: { key: PodiumCategory; label: string; format: (v: number) => string }[] = [
  { key: 'balance', label: 'Balance', format: (v) => v.toFixed(2) },
  { key: 'positionCount', label: 'Positions', format: (v) => v.toString() },
  { key: 'totalShares', label: 'Shares', format: (v) => v.toFixed(2) },
  { key: 'marketsCreated', label: 'Markets', format: (v) => v.toString() },
  { key: 'wins', label: 'Wins', format: (v) => v.toString() },
  { key: 'biggestPayout', label: 'Best Payout', format: (v) => v.toFixed(2) },
  { key: 'biggestPnl', label: 'Best PnL', format: (v) => (v >= 0 ? '+' : '') + v.toFixed(2) },
]

function formatPodiumValue(category: PodiumCategory, value: number): string {
  switch (category) {
    case 'positionCount':
    case 'marketsCreated':
    case 'wins':
      return value.toLocaleString()
    case 'biggestPnl':
      return (value >= 0 ? '+' : '') + value.toFixed(2)
    default:
      return value.toFixed(2)
  }
}

function PodiumSkeleton() {
  return (
    <div className="flex items-end justify-center gap-3 pt-10 sm:gap-6">
      {PODIUM_PLACES.map((config) => (
        <div key={config.place} className="flex flex-col items-center">
          <Skeleton className={cn('rounded-full', config.avatarSize)} />
          <Skeleton className="mt-2 h-4 w-16" />
          <Skeleton className="mt-1 h-3 w-12" />
          <Skeleton className={cn('mt-3 w-24 rounded-t-lg sm:w-28', config.height)} />
        </div>
      ))}
    </div>
  )
}

function LeaderboardPodium({
  sortedUsers,
  category,
  setCategory,
  isPending,
}: {
  sortedUsers: LeaderboardUser[]
  category: PodiumCategory
  setCategory: (c: PodiumCategory) => void
  isPending: boolean
}) {
  const top3 = sortedUsers.slice(0, 3)

  const podiumEntries =
    top3.length < 3
      ? top3.map((user, i) => ({ user, config: PODIUM_PLACES[i]! }))
      : [
          { user: top3[1]!, config: PODIUM_PLACES[0]! },
          { user: top3[0]!, config: PODIUM_PLACES[1]! },
          { user: top3[2]!, config: PODIUM_PLACES[2]! },
        ]

  return (
    <Card className="mb-6">
      <CardContent className="pb-6 pt-5">
        <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <h2 className="text-lg font-semibold">Top Traders</h2>
          <Select value={category} onValueChange={(v) => setCategory(v as PodiumCategory)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PODIUM_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isPending ? (
          <PodiumSkeleton />
        ) : podiumEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data for this category yet.
          </p>
        ) : (
          <div className="flex items-end justify-center gap-3 pt-4 sm:gap-6">
            {podiumEntries.map(({ user, config }) => (
              <div key={user.id} className="flex flex-col items-center">
                <span className="text-2xl">{config.medal}</span>
                <Link
                  to="/users/$userId"
                  params={{ userId: user.id }}
                  className="group flex flex-col items-center"
                >
                  <Avatar className={cn('ring-2', config.ring, config.avatarSize)}>
                    <AvatarFallback
                      className={cn(
                        'bg-accent font-semibold text-primary',
                        config.place === 1 ? 'text-base' : 'text-sm',
                      )}
                    >
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-1.5 max-w-20 truncate text-sm font-semibold group-hover:underline sm:max-w-28">
                    {user.name}
                  </p>
                </Link>
                <p className="font-mono text-xs text-muted-foreground">
                  {formatPodiumValue(category, user[category])}
                </p>
                <div
                  className={cn(
                    'mt-3 flex w-20 items-center justify-center rounded-t-lg sm:w-28',
                    config.height,
                    config.bg,
                  )}
                >
                  <span className={cn('text-2xl font-bold', config.text)}>
                    {config.place}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function UsersPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data: me } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  })
  const canManageUsers = me?.roles.includes('MANAGE_USERS') ?? false

  const [category, setCategory] = useState<PodiumCategory>('totalShares')

  const { data: allUsers, isPending } = useQuery(
    trpc.user.leaderboardTop.queryOptions(),
  )

  const sortedUsers = useMemo(() => {
    if (!allUsers) return []
    return [...allUsers].sort((a, b) => b[category] - a[category])
  }, [allUsers, category])

  const { data: adminUsers } = useQuery({
    ...trpc.user.adminList.queryOptions(),
    enabled: canManageUsers,
  })

  const updateRolesMutation = useMutation(
    trpc.user.updateRoles.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.user.adminList.queryKey() }),
    }),
  )
  const validateUserMutation = useMutation(
    trpc.user.validateUser.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.user.adminList.queryKey() }),
    }),
  )
  const removeMutation = useMutation(
    trpc.user.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.user.adminList.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpc.user.leaderboardTop.queryKey() })
      },
    }),
  )
  const [generatingResetLinkUserId, setGeneratingResetLinkUserId] = useState<string | null>(null)
  const generateResetLinkMutation = useMutation(
    trpc.user.generateResetPasswordLink.mutationOptions({
      onSettled: () => setGeneratingResetLinkUserId(null),
    }),
  )

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All traders ranked by performance.
        </p>
      </div>

      <LeaderboardPodium
        sortedUsers={sortedUsers}
        category={category}
        setCategory={setCategory}
        isPending={isPending}
      />

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                {TABLE_COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'whitespace-nowrap text-right',
                      category === col.key && 'text-foreground',
                    )}
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <LeaderboardRowSkeleton key={i} />
                ))
              ) : sortedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2 + TABLE_COLUMNS.length} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user, i) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/users/$userId"
                        params={{ userId: user.id }}
                        className="flex items-center gap-3 font-medium hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="leading-tight">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    {TABLE_COLUMNS.map((col) => (
                      <TableCell
                        key={col.key}
                        className={cn(
                          'text-right font-mono text-sm',
                          category === col.key && 'font-semibold',
                          col.key === 'biggestPnl' && user.biggestPnl > 0 && 'text-emerald-600 dark:text-emerald-400',
                          col.key === 'biggestPnl' && user.biggestPnl < 0 && 'text-rose-500 dark:text-rose-400',
                        )}
                      >
                        {col.format(user[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canManageUsers && adminUsers && (
        <Card className="mt-8">
          <CardContent className="p-6">
            <h2 className="mb-4 text-lg font-semibold">User management</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Set roles, validate emails, or remove users. You cannot remove yourself.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email verified</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        to="/users/$userId"
                        params={{ userId: user.id }}
                        className="font-medium hover:underline"
                      >
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="secondary">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.roles.length ? [...user.roles].sort().join(',') : 'none'}
                        onValueChange={(value) => {
                          const roles =
                            value === 'none'
                              ? []
                              : (value.split(',') as ('VALIDATE_MARKETS' | 'MANAGE_USERS' | 'RESOLVE_MARKETS')[])
                          updateRolesMutation.mutate({ userId: user.id, roles })
                        }}
                        disabled={updateRolesMutation.isPending}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No roles</SelectItem>
                          <SelectItem value="MANAGE_USERS,VALIDATE_MARKETS">
                            Validate markets
                          </SelectItem>
                          <SelectItem value="RESOLVE_MARKETS,VALIDATE_MARKETS">
                            Validate + resolve markets
                          </SelectItem>
                          <SelectItem value="MANAGE_USERS,RESOLVE_MARKETS,VALIDATE_MARKETS">
                           Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGeneratingResetLinkUserId(user.id)
                            generateResetLinkMutation.mutate(
                              { userId: user.id },
                              {
                                onSuccess: async ({ link }) => {
                                  await navigator.clipboard.writeText(link)
                                  window.alert('Reset password link copied to clipboard.')
                                },
                                onError: (err) => {
                                  window.alert(err.message ?? 'Failed to generate link')
                                },
                              },
                            )
                          }}
                          disabled={generatingResetLinkUserId === user.id}
                        >
                          {generatingResetLinkUserId === user.id ? 'Generating...' : 'Generate reset link'}
                        </Button>
                        {!user.emailVerified && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => validateUserMutation.mutate({ userId: user.id })}
                            disabled={validateUserMutation.isPending}
                          >
                            Validate email
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (window.confirm(`Remove ${user.name}? This cannot be undone.`)) {
                              removeMutation.mutate({ userId: user.id })
                            }
                          }}
                          disabled={user.id === session?.user.id || removeMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
