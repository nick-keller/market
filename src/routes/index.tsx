import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-8 pt-14">
      <Card className="w-full">
        <CardContent className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mb-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Stoik Market
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Welcome back. Your platform is ready.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
