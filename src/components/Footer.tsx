import { Link, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/lib/auth-client'
import { Button } from '@/components/ui/button'
import ThemeToggle from './ThemeToggle'

export default function Footer() {
  const year = new Date().getFullYear()
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  return (
    <footer className="mt-20 border-t px-4 pb-14 pt-10 text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; {year} Stoik Market. All rights reserved.
          {session?.user && (
            <>
              {' · '}
              <Link
                to="/settings/change-password"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Change password
              </Link>
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          {session?.user && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={async () => {
                await authClient.signOut()
                navigate({ to: '/auth/sign-in' })
              }}
            >
              Sign out
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </footer>
  )
}
