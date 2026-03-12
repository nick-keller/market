interface PriceBarProps {
  yesPrice: number
  size?: 'sm' | 'md' | 'lg'
}

export default function PriceBar({ yesPrice, size = 'md' }: PriceBarProps) {
  const yesPercent = Math.round(yesPrice * 100)
  const noPercent = 100 - yesPercent
  const height = size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'

  return (
    <div className="flex flex-col gap-1">
      <div className={`flex w-full overflow-hidden rounded-full ${height}`}>
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${yesPercent}%` }}
        />
        <div
          className="bg-rose-400 transition-all duration-300"
          style={{ width: `${noPercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          Yes {yesPercent}¢
        </span>
        <span className="font-medium text-rose-600 dark:text-rose-400">
          No {noPercent}¢
        </span>
      </div>
    </div>
  )
}
