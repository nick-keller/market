import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  fetchOptions: {
    onError: async (ctx) => {
      if (ctx.response.status === 429) {
        const retryAfter = ctx.response.headers.get('X-Retry-After')
        const message = retryAfter
          ? `Too many attempts. Please try again in ${retryAfter} seconds.`
          : 'Too many attempts. Please try again later.'
        throw new Error(message)
      }
    },
  },
})
