const LINES = [
  { k: "CHARGE", v: "explain mutexes" },
  { k: "CHARGE", v: "please explain mutexes" },
  { k: "NOTE", v: "same intent · two bills" },
  { k: "CHARGE", v: "agent rephrase × N" },
  { k: "HOLD", v: '"what\'s the latest" · stored yesterday · should refuse' },
]

export function ReceiptTape() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-line bg-panel px-5 py-6 font-mono text-[13px]">
      <div
        aria-hidden
        className="mb-4 h-3 bg-[radial-gradient(circle,transparent_6px,rgba(238,243,251,0.14)_7px)] bg-[length:16px_12px] bg-repeat-x"
      />
      <ul className="space-y-2.5">
        {LINES.map((line) => (
          <li key={line.v} className="flex gap-3">
            <span className={line.k === "HOLD" ? "text-amber" : "text-muted"}>{line.k}</span>
            <span className="min-w-0 text-bone/90">{line.v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
