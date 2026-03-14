import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Coins,
  CalendarCheck,
  Trophy,
  PlusCircle,
  Users,
} from 'lucide-react'

export const Route = createFileRoute('/rules')({
  component: Rules,
})

const EXAMPLES = [
  { balance: 0, allowance: 200 },
  { balance: 500, allowance: 175 },
  { balance: 1000, allowance: 150 },
  { balance: 2000, allowance: 100 },
  { balance: 3000, allowance: 50 },
  { balance: 4000, allowance: 0 },
]

function Rules() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-10">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">How it works</h1>
      <p className="mb-8 text-muted-foreground">
        Everything you need to know about earning and spending tokens on Stoik
        Market.
      </p>

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <Coins className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Starting balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              Every new account receives{' '}
              <strong className="text-foreground">1,000 tokens</strong> to start
              trading right away. Use them to buy shares on any open market.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <CalendarCheck className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Weekly allowance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>
              Every Monday, each account receives a weekly token allowance. The
              amount depends on your current balance — the fewer tokens you have,
              the more you receive:
            </p>
            <div className="rounded-md border bg-muted/40 px-4 py-3 font-mono text-sm">
              allowance = max(0, 200 − 0.05 × balance)
            </div>
            <p className="text-sm text-muted-foreground">
              This means you get up to 200 tokens per week when your balance is
              low, and the allowance tapers off to zero once your balance reaches
              4,000.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Balance</th>
                    <th className="pb-2 font-medium">Allowance</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLES.map((row) => (
                    <tr key={row.balance} className="border-b last:border-0">
                      <td className="py-1.5 pr-4 tabular-nums">
                        {row.balance.toLocaleString()} tokens
                      </td>
                      <td className="py-1.5 tabular-nums">
                        +{row.allowance} tokens
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <Trophy className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              As you trade and participate, you unlock achievements — each one
              comes with a token reward. Some achievements have multiple tiers
              that grant increasingly larger rewards. Check your profile page to
              see which ones you've earned and what's still up for grabs.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <PlusCircle className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Market creation</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              When you create a market and it gets approved, you receive{' '}
              <strong className="text-foreground">50 tokens</strong> as a
              reward for contributing a question to the platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <Users className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-lg">Popular markets</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              When 5 distinct traders hold positions on a market you created, you
              earn an extra{' '}
              <strong className="text-foreground">100 tokens</strong>. The more
              engaging your market, the more you earn!
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
