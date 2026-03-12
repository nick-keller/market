import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'

export const Route = createFileRoute('/markets/create')({
  component: CreateMarket,
})

function CreateMarket() {
  const navigate = useNavigate()
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [liquidityB, setLiquidityB] = useState('100')

  const createMutation = useMutation(
    trpc.markets.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [['market', 'list']] })
        navigate({ to: '/markets/$marketId', params: { marketId: data.id } })
      },
    }),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      title,
      description: description || undefined,
      closeTime: closeDate ? new Date(closeDate).toISOString() : undefined,
      liquidityB: Number(liquidityB),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-12 pt-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Create Market</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Question</Label>
              <Input
                id="title"
                placeholder="Will X happen by Y date?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={5}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                A clear yes/no question for the market to resolve.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add context, resolution criteria, sources..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="closeDate">Close Date (optional)</Label>
              <Input
                id="closeDate"
                type="datetime-local"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="liquidity">
                Liquidity Parameter (b)
              </Label>
              <Input
                id="liquidity"
                type="number"
                min={1}
                max={10000}
                value={liquidityB}
                onChange={(e) => setLiquidityB(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Higher values make prices less sensitive to trades. Default: 100.
              </p>
            </div>

            {createMutation.error && (
              <p className="text-sm text-destructive">
                {createMutation.error.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={createMutation.isPending || title.length < 5}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Market'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
