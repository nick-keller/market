import { createTRPCRouter } from './init'
import { marketRouter } from './routers/market'
import { notificationRouter } from './routers/notification'
import { tradeRouter } from './routers/trade'
import { userRouter } from './routers/user'

export const trpcRouter = createTRPCRouter({
  markets: marketRouter,
  notifications: notificationRouter,
  trade: tradeRouter,
  user: userRouter,
})

export type TRPCRouter = typeof trpcRouter
