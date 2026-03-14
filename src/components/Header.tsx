import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Menu } from 'lucide-react'
import { authClient } from '#/lib/auth-client'
import { useTRPC } from '#/integrations/trpc/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import NotificationMenu from '@/components/NotificationMenu'

export default function Header() {
  const trpc = useTRPC()
  const { data: session, isPending } = authClient.useSession()
  const userId = session?.user?.id
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const { data: profileData } = useQuery({
    ...trpc.user.profile.queryOptions({ userId: userId! }),
    enabled: !!userId,
  })

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-6xl items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-44 p-1">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setMenuOpen(false)
                navigate({ to: '/' })
              }}
            >
              Markets
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setMenuOpen(false)
                navigate({ to: '/users' })
              }}
            >
              Leaderboard
            </Button>
          </PopoverContent>
        </Popover>

        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="no-underline" activeProps={{ className: 'bg-accent' }}>
              Markets
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/users" className="no-underline" activeProps={{ className: 'bg-accent' }}>
              Leaderboard
            </Link>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {!isPending && session?.user && (
            <>
              {profileData != null && (
                <span className="hidden text-sm font-semibold tabular-nums sm:inline">
                  {profileData.balance.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">tokens</span>
                </span>
              )}
              <NotificationMenu />
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to="/users/$userId"
                  params={{ userId: session.user.id }}
                  className="no-underline"
                >
                  <Avatar className="mr-1.5 h-5 w-5">
                    <AvatarFallback className="bg-accent text-[10px] font-semibold text-primary">
                      {session.user.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{session.user.name}</span>
                </Link>
              </Button>
            </>
          )}
          {!isPending && !session?.user && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth/sign-in" className="no-underline">
                Sign in
              </Link>
            </Button>
          )}
          {isPending && (
            <div className="size-8 animate-pulse rounded-full bg-muted" />
          )}
        </div>
      </nav>
    </header>
  )
}
