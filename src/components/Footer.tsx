export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t px-4 pb-14 pt-10 text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; {year} Stoik Market. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
