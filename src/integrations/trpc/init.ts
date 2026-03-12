import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { auth } from '#/lib/auth'
import { prisma } from '#/db'
import type { Role } from '#/generated/prisma/enums'

interface TRPCContext {
  headers: Headers
  user: { id: string; name: string; email: string; roles: Role[] } | null
}

export async function createTRPCContext(opts: {
  request: Request
}): Promise<TRPCContext> {
  const session = await auth.api.getSession({ headers: opts.request.headers })
  if (!session?.user) {
    return { headers: opts.request.headers, user: null }
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, roles: true },
  })
  return {
    headers: opts.request.headers,
    user: dbUser
      ? {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          roles: dbUser.roles ?? [],
        }
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

export function roleProcedure(role: Role) {
  return authedProcedure.use(async ({ ctx, next }) => {
    if (!ctx.user.roles.includes(role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `This action requires the ${role} role`,
      })
    }
    return next({ ctx })
  })
}
