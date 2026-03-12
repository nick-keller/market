import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { trpcRouter } from '#/integrations/trpc/router'
import { createFileRoute } from '@tanstack/react-router'
import { createTRPCContext } from '#/integrations/trpc/init.ts'

function handler({
  request,
  params,
}: {
  request: Request
  params: { _splat?: string }
}) {
  const url = new URL(request.url)
  const pathPrefix = '/api/trpc'
  const procedurePath = params._splat ?? ''
  const pathname = procedurePath ? `${pathPrefix}/${procedurePath}` : pathPrefix
  const resolvedUrl = `${url.origin}${pathname}${url.search}`

  const trpcRequest = new Request(resolvedUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    ...(request.body != null && { duplex: 'half' as const }),
  })

  return fetchRequestHandler({
    req: trpcRequest,
    router: trpcRouter,
    endpoint: '/api/trpc',
    createContext: () => createTRPCContext({ request }),
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
