import { Check, Copy } from "lucide-react"

function Claude({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.35"
        d="m12.5 12.5 1-9.5m-1 9.5 6-7.5m-6 7.5 8.5-2m-8.5 2L21 14m-8.5-1.5 7 6m-7-6L17 20m-4.5-7.5-1 8.5m1-8.5L7 20m5.5-7.5L5 17m7.5-4.5L3 12m9.5.5-8-6m8 6L7.5 3"
      />
    </svg>
  )
}

function Codex({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8.086.457a6.1 6.1 0 0 1 3.046-.415q2 .23 3.564 1.7a.12.12 0 0 0 .107.029q2.112-.519 4.061.366l.063.03.154.076q2.036 1.055 2.918 3.198a5.6 5.6 0 0 1 .421 2.126 5.7 5.7 0 0 1-.18 1.631.17.17 0 0 0 .04.155 6 6 0 0 1 1.578 2.891q.577 2.852-1.183 5.14l-.182.22a6.06 6.06 0 0 1-2.934 1.851.16.16 0 0 0-.108.102c-.255.736-.511 1.364-.987 1.992-1.199 1.582-2.962 2.462-4.948 2.451q-2.374-.012-4.21-1.736a.14.14 0 0 0-.14-.032c-.518.167-1.04.191-1.604.185a5.9 5.9 0 0 1-2.595-.622 6.06 6.06 0 0 1-2.146-1.781c-.203-.269-.404-.522-.551-.821a8 8 0 0 1-.495-1.283 6.1 6.1 0 0 1-.017-3.064.2.2 0 0 0 .008-.074.1.1 0 0 0-.037-.064 6 6 0 0 1-1.38-2.202 5.2 5.2 0 0 1-.333-1.589 6.9 6.9 0 0 1 .188-2.132q.675-2.226 2.577-3.493.424-.282.802-.438.429-.179.861-.304a.13.13 0 0 0 .087-.087A6 6 0 0 1 5.635 2.31Q6.655 1.04 8.086.457m-.804 7.85a.848.848 0 0 0-1.473.842l1.694 2.965-1.688 2.848a.849.849 0 0 0 1.46.864l1.94-3.272a.85.85 0 0 0 .007-.854zm5.446 6.24a.849.849 0 0 0 0 1.695h4.848a.849.849 0 0 0 0-1.696z"
      />
    </svg>
  )
}

function Cursor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23"
      />
    </svg>
  )
}

export function SetupPromptButton({
  copied,
  onClick,
  label = "Copy setup prompt",
  className = "",
}: {
  copied: boolean
  onClick: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-copied={copied ? "true" : "false"}
      aria-label={copied ? "Copied" : `${label} for Claude, Codex, and Cursor`}
      className={`setup-prompt group ${className}`}
    >
      <span className="prompt-marks" aria-hidden>
        <Claude className="prompt-mark" />
        <Codex className="prompt-mark" />
        <Cursor className="prompt-mark" />
      </span>
      <span className="prompt-label">
        <span className={copied ? "invisible" : undefined}>{label}</span>
        {copied && <span className="absolute inset-0 grid place-items-center">Copied</span>}
      </span>
      <span className={`prompt-chip ${copied ? "prompt-chip-done" : ""}`} aria-hidden>
        {copied ? <Check strokeWidth={2.6} /> : <Copy strokeWidth={2} />}
      </span>
    </button>
  )
}
