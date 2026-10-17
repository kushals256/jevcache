import { cn } from "@/lib/utils"

export type RequestWindowProps = {
  rows: { label: string; text: string }[]
  check: string
  header: string
  tone: "hit" | "miss"
  className?: string
}

/** A small framed product window: two requests and what the cache did with the second one. */
export function RequestWindow({ rows, check, header, tone, className }: RequestWindowProps) {
  const hit = tone === "hit"
  return (
    <div className={cn("rounded-[14px] border border-white/10 p-1.5 transition-colors", className)}>
      <div className="flex h-[14.25rem] flex-col rounded-[10px] border border-white/[0.08] bg-[#121211] p-4">
        {rows.map((r) => (
          <div key={r.label} className="mb-3">
            <p className="text-[11px] text-muted">{r.label}</p>
            <p className="mt-1.5 truncate rounded-md border border-white/[0.06] bg-white/[0.04] px-3 py-2 font-mono text-[12.5px] text-bone">
              {r.text}
            </p>
          </div>
        ))}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.08] pt-3">
          <p className={cn("font-mono text-[11px]", hit ? "text-hit" : "text-muted")}>{check}</p>
          <span
            className={cn(
              "shrink-0 rounded-[3px] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-ink",
              hit ? "bg-hit" : "bg-amber",
            )}
          >
            {header}
          </span>
        </div>
      </div>
    </div>
  )
}
