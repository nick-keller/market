import { createTRPCRouter } from './init'
import { marketRouter } from './routers/market'
import { tradeRouter } from './routers/trade'
import { userRouter } from './routers/user'

export const trpcRouter = createTRPCRouter({
  markets: marketRouter,
  trade: tradeRouter,
  user: userRouter,
})

export type TRPCRouter = typeof trpcRouter
