import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2 font-pixel-circle text-[1.05rem] tracking-wide text-bone no-underline",
        className,
      )}
    >
      <img src="/logo.svg" alt="" width={28} height={28} className="size-7" />
      <span>MorrowCache</span>
    </Link>
  )
}
