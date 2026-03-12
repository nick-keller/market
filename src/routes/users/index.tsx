import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const Route = createFileRoute('/users/')({
  component: UsersPage,
})

function UsersPage() {
  const trpc = useTRPC()

  const { data: users } = useSuspenseQuery(
    trpc.user.list.queryOptions(),
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
    </main>
  )
}
