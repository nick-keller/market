import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { costForShares, priceYes, priceNo } from '#/lib/lmsr'
import type { Outcome } from '#/lib/lmsr'

interface TradePanelProps {
  qYes: number
  qNo: number
  liquidityB: number
  userBalance: number
  userYesShares: number
  userNoShares: number
  marketStatus: string
  onBuy: (outcome: Outcome, shares: number) => void
  onSell: (outcome: Outcome, shares: number) => void
  isPending: boolean
}

export default function TradePanel({
  qYes,
  qNo,
  liquidityB,
  userBalance,
  userYesShares,
  userNoShares,
  marketStatus,
  onBuy,
  onSell,
  isPending,
}: TradePanelProps) {
  const [outcome, setOutcome] = useState<Outcome>('YES')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')

  const shares = Number(amount) || 0
  const currentShares = outcome === 'YES' ? userYesShares : userNoShares

  const preview = useMemo(() => {
    if (shares <= 0) return null
    if (mode === 'buy') {
      const cost = costForShares(qYes, qNo, liquidityB, outcome, shares)
      const avgPrice = cost / shares
      const newQYes = outcome === 'YES' ? qYes + shares : qYes
      const newQNo = outcome === 'NO' ? qNo + shares : qNo
      return {
        cost,
        avgPrice,
        newYesPrice: priceYes(newQYes, newQNo, liquidityB),
        newNoPrice: priceNo(newQYes, newQNo, liquidityB),
        canExecute: cost <= userBalance && cost > 0,
      }
    } else {
      if (shares > currentShares) return { canExecute: false, cost: 0, avgPrice: 0, newYesPrice: 0, newNoPrice: 0 }
      const refund = -costForShares(qYes, qNo, liquidityB, outcome, -shares)
      const avgPrice = refund / shares
      const newQYes = outcome === 'YES' ? qYes - shares : qYes
      const newQNo = outcome === 'NO' ? qNo - shares : qNo
      return {
        cost: refund,
        avgPrice,
        newYesPrice: priceYes(newQYes, newQNo, liquidityB),
        newNoPrice: priceNo(newQYes, newQNo, liquidityB),
        canExecute: shares <= currentShares,
      }
    }
  }, [shares, outcome, mode, qYes, qNo, liquidityB, userBalance, currentShares])

  const isDisabled = marketStatus !== 'OPEN'

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Trade</h3>
          <span className="text-xs text-muted-foreground">
            Balance: {userBalance.toFixed(2)}
          </span>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'buy' | 'sell')}>
          <TabsList className="w-full">
            <TabsTrigger value="buy" className="flex-1">Buy</TabsTrigger>
            <TabsTrigger value="sell" className="flex-1">Sell</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={outcome === 'YES' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOutcome('YES')}
            className={outcome === 'YES' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            Yes {Math.round(priceYes(qYes, qNo, liquidityB) * 100)}¢
          </Button>
          <Button
            variant={outcome === 'NO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOutcome('NO')}
            className={outcome === 'NO' ? 'bg-rose-500 hover:bg-rose-600' : ''}
          >
            No {Math.round(priceNo(qYes, qNo, liquidityB) * 100)}¢
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Shares</Label>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isDisabled}
          />
          {mode === 'sell' && (
            <p className="text-xs text-muted-foreground">
              You hold {currentShares.toFixed(2)} {outcome} shares
            </p>
          )}
        </div>

        {preview && shares > 0 && (
          <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {mode === 'buy' ? 'Cost' : 'You receive'}
              </span>
              <span className="font-medium">{preview.cost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg price</span>
              <span className="font-medium">{(preview.avgPrice * 100).toFixed(1)}¢</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Yes price</span>
              <span className="font-medium">{(preview.newYesPrice * 100).toFixed(1)}¢</span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={isDisabled || isPending || !preview?.canExecute || shares <= 0}
          onClick={() => {
            if (mode === 'buy') {
              onBuy(outcome, shares)
            } else {
              onSell(outcome, shares)
            }
            setAmount('')
          }}
        >
          {isDisabled
            ? 'Market Closed'
            : isPending
              ? 'Processing...'
              : mode === 'buy'
                ? `Buy ${outcome} Shares`
                : `Sell ${outcome} Shares`}
        </Button>
      </CardContent>
    </Card>
  )
}
