import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { priceYes } from '#/lib/lmsr'

interface Trade {
  createdAt: string | Date
  qYesAfter: number | string | null
  qNoAfter: number | string | null
}

interface PriceChartProps {
  trades: Trade[]
  liquidityB: number
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function PriceChart({ trades, liquidityB }: PriceChartProps) {
  const data = useMemo(() => {
    if (!trades.length) return []
    return trades
      .filter((t) => t.qYesAfter != null && t.qNoAfter != null)
      .map((t) => {
        const createdAt = new Date(t.createdAt)
        return {
          timestamp: createdAt.getTime(),
          time: formatTime(createdAt.getTime()),
          yes: Math.round(priceYes(Number(t.qYesAfter), Number(t.qNoAfter), liquidityB) * 100),
        }
      })
  }, [trades, liquidityB])

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No trades yet -- price history will appear here.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
        <XAxis
          dataKey="timestamp"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fontSize: 11 }}
          tickFormatter={(ts: number) => formatTime(ts)}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: number) => `${v}¢`}
        />
        <Tooltip
          labelFormatter={(ts: number) => formatTime(ts)}
          formatter={(value) => [`${value}¢`, 'Yes Price']}
          contentStyle={{
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Line
          type="monotone"
          dataKey="yes"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
