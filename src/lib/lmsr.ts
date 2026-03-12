/**
 * Logarithmic Market Scoring Rule (LMSR) implementation.
 *
 * State is represented by outcome quantities (qYes, qNo) and
 * a liquidity parameter b that controls price sensitivity.
 */

export type Outcome = 'YES' | 'NO'

function cost(qYes: number, qNo: number, b: number): number {
  const maxQ = Math.max(qYes, qNo)
  return b * (maxQ / b + Math.log(Math.exp((qYes - maxQ) / b) + Math.exp((qNo - maxQ) / b)))
}

export function priceYes(qYes: number, qNo: number, b: number): number {
  const diff = (qYes - qNo) / b
  return 1 / (1 + Math.exp(-diff))
}

export function priceNo(qYes: number, qNo: number, b: number): number {
  return 1 - priceYes(qYes, qNo, b)
}

/**
 * Cost to buy (positive) or sell (negative) `shares` of `outcome`.
 * Returns the amount the trader must pay (positive = pay, negative = receive).
 */
export function costForShares(
  qYes: number,
  qNo: number,
  b: number,
  outcome: Outcome,
  shares: number,
): number {
  const newQYes = outcome === 'YES' ? qYes + shares : qYes
  const newQNo = outcome === 'NO' ? qNo + shares : qNo
  return cost(newQYes, newQNo, b) - cost(qYes, qNo, b)
}
