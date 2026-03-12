import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { auth } from '#/lib/auth'

interface TRPCContext {
  headers: Headers
  user: { id: string; name: string; email: string } | null
}

export async function createTRPCContext(opts: {
  request: Request
}): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: opts.request.headers })
  return {
    headers: opts.request.headers,
    user: session?.user
      ? { id: session.user.id, name: session.user.name, email: session.user.email }
      : null,
  }
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not signed in' })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})
