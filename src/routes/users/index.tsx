import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { authClient } from '#/lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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

function UsersPage() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data: me } = useQuery({
    ...trpc.user.me.queryOptions(),
    enabled: !!session?.user,
  })
  const canManageUsers = me?.roles.includes('MANAGE_USERS') ?? false

  const { data: users } = useSuspenseQuery(
    trpc.user.list.queryOptions(),
  )
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
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() })
      },
    }),
  )

  return (
    <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All traders with their current balance and open positions.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>User</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Positions</TableHead>
                <TableHead className="text-right">Total Shares</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, i) => (
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
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {user.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {user.positionCount}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {user.totalShares.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
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
