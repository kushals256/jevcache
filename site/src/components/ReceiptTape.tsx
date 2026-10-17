const LINES = [
  { k: "CHARGE", v: "explain mutexes", tone: "text-muted" },
  { k: "CHARGE", v: "please explain mutexes", tone: "text-muted" },
  { k: "NOTE", v: "same intent · two bills", tone: "text-hit" },
  { k: "CHARGE", v: "agent rephrase × N", tone: "text-muted" },
  { k: "HOLD", v: '"what\'s the latest" · stored yesterday · should refuse', tone: "text-amber" },
]

export function ReceiptTape() {
  return (
    <div className="relative mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-panel/80 shadow-[inset_0_1px_0_rgba(238,243,251,0.06)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted">receipt</p>
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-amber">unpaid twice</p>
      </div>
      <div
        aria-hidden
        className="mx-5 mt-4 h-2.5 bg-[radial-gradient(circle,transparent_5px,rgba(238,243,251,0.12)_6px)] bg-[length:14px_10px] bg-repeat-x"
      />
      <ul className="space-y-3 px-5 py-5 font-mono text-[13px]">
        {LINES.map((line) => (
          <li key={line.v} className="flex gap-3">
            <span className={`w-14 shrink-0 ${line.tone}`}>{line.k}</span>
            <span className="min-w-0 text-bone/90">{line.v}</span>
          </li>
        ))}
      </ul>
      <div className="border-t border-dashed border-line px-5 py-3 font-mono text-[0.7rem] text-muted">
        TOTAL · 2× model calls · 0 cache hits
      </div>
    </div>
  )
}
