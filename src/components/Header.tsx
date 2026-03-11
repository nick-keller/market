import { Link } from '@tanstack/react-router'
import BetterAuthHeader from '../integrations/better-auth/header-user.tsx'
import ThemeToggle from './ThemeToggle'
import { Button } from '@/components/ui/button'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-5xl items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <Button variant="outline" size="sm" asChild>
          <Link to="/" className="no-underline">
            Stoik Market
          </Link>
        </Button>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <BetterAuthHeader />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
