import { Link } from "react-router-dom"
import { useContentMode } from "@/contentMode"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  const contentMode = useContentMode()
  return (
    <Link
      to="/"
      {...(contentMode ? { reloadDocument: true } : {})}
      className={cn(
        "inline-flex items-center gap-2.5 font-pixel-square text-[1.2rem] font-medium tracking-tight text-bone no-underline",
        className,
      )}
    >
      <svg viewBox="4 6 32 25" fill="none" aria-hidden className="h-7 w-auto shrink-0">
        <path d="M6 28h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
        <path
          d="M11 28V16.5c0-1.5 1-2.7 2.5-3.1L29 10v18"
          stroke="var(--color-hit)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="29" cy="10" r="3" fill="var(--color-hit)" />
      </svg>
      <span>MorrowCache</span>
    </Link>
  )
}
