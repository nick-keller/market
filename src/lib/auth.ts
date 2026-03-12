import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { prisma } from '#/db'

const ALLOWED_EMAIL_DOMAIN = '@stoik.io'

/** Used by admin "Generate reset link" to capture the URL from sendResetPassword callback. */
const adminResetLinksByEmail = new Map<string, string>()
export function takeAdminResetLink(email: string): string | null {
  const url = adminResetLinksByEmail.get(email)
  adminResetLinksByEmail.delete(email)
  return url ?? null
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: 'database',
    customRules: {
      '/sign-in/email': { window: 10, max: 5 },
      '/sign-up/email': { window: 60, max: 3 },
      '/forget-password': { window: 60, max: 3 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      // TODO: integrate an email provider (Resend, SendGrid, etc.)
      console.log(`[Auth] Verify your email ${user.email}: ${url}`)
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    async sendResetPassword({ user, url }) {
      // Capture URL for admin-generated reset links (see getAdminResetLink)
      adminResetLinksByEmail.set(user.email, url)
      // TODO: integrate an email provider (Resend, SendGrid, etc.)
      console.log(`[Auth] Password reset requested for ${user.email}: ${url}`)
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== '/sign-up/email') return
      const email = (ctx.body as { email?: string })?.email ?? ''
      if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
        throw new APIError('FORBIDDEN', {
          message: 'Only @stoik.io email addresses are allowed to sign up',
        })
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const newSession = ctx.context.newSession as
        | { user: { id: string } }
        | undefined
      const userId =
        newSession?.user?.id ??
        (ctx.path === '/get-session' &&
          (ctx.context.returned as { user?: { id: string } } | undefined)?.user
            ?.id)

      if (userId) {
        await prisma.balance.upsert({
          where: { userId },
          create: { userId, balance: 1000 },
          update: {},
        })
      }
    }),
  },
  plugins: [tanstackStartCookies()],
})
