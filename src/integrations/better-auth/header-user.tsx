import { authClient } from '#/lib/auth-client'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function BetterAuthHeader() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()

  if (isPending || !session?.user) {
    return <div className="size-8 animate-pulse rounded-full bg-muted" />
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback className="bg-accent text-xs font-semibold text-primary">
          {session.user.name?.charAt(0).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          await authClient.signOut()
          navigate({ to: '/auth/sign-in' })
        }}
      >
        Sign out
      </Button>
    </div>
  )
}
