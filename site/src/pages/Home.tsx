import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { BorderBeamButton } from "@/components/ui/border-beam-button"
import CodeBlock from "@/components/ui/code-block"
import {
  HeroDitheringActions,
  HeroDitheringBadges,
  HeroDitheringContainer,
  HeroDitheringContent,
  HeroDitheringDescription,
  HeroDitheringHeading,
  HeroDitheringMobileVisual,
  HeroDitheringRoot,
  HeroDitheringVisual,
} from "@/components/ui/hero-dithering"
import { KineticClaim } from "@/components/KineticClaim"
import { LatencyRace } from "@/components/LatencyRace"
import { MetalButton } from "@/components/ui/metal-button"
import { ReceiptTape } from "@/components/ReceiptTape"
import ScrollProgress from "@/components/ui/scroll-progress"
import { StartBand } from "@/components/StartBand"
import {
  TerminalAnimationCommandBar,
  TerminalAnimationContainer,
  TerminalAnimationContent,
  TerminalAnimationOutput,
  TerminalAnimationRoot,
  TerminalAnimationTabList,
  TerminalAnimationTabTrigger,
  TerminalAnimationWindow,
  type TabContent,
} from "@/components/ui/terminal-animation"
import { TraceTheater } from "@/components/TraceTheater"
import { BASE_URL_SNIPPET, INSTALL } from "@/content/agentPrompt"
import { useStats } from "@/hooks/useStats"
import { cn } from "@/lib/utils"

const FAQ = [
  {
    q: "Does it work with OpenRouter / any OpenAI-compatible API?",
    a: "Yes. Point the proxy at your upstream baseURL. Your SDK talks to MorrowCache. Upstream can be OpenAI, OpenRouter, or local OpenAI-compat.",
  },
  {
    q: "Do I need TypeSafe Jev?",
    a: "Jev is the default same-intent judge (needs OpenRouter). Or set ADJUDICATOR=kev|laya|laya-mlx|systemone for local System One — no OpenRouter for admits.",
  },
  {
    q: "What if the adjudicator fails?",
    a: "Fail-open. The real model still runs. Prefer a miss over a wrong hit.",
  },
  {
    q: "Can wrong hits happen?",
    a: "Yes. Tune thresholds, respect freshness, and read the headers. Streaming and tools bypass.",
  },
  {
    q: "Where do the numbers come from?",
    a: "Stars and npm are live with fallbacks. Latency pair is one recorded run. Jaccard FPR is offline n=103.",
  },
]

const terminalTabs: TabContent[] = [
  {
    label: "install",
    command: INSTALL,
    lines: [
      { text: "Downloading @kushalicious/jevcache…", delay: 280 },
      { text: "Proxy listening on :8080", delay: 420, color: "text-hit" },
      { text: "Point your SDK baseURL at the proxy.", delay: 320 },
    ],
  },
  {
    label: "hit",
    command: "curl $BASE/v1/chat/completions …",
    lines: [
      { text: "X-Jevcache-Status: HIT", delay: 300, color: "text-hit" },
      { text: "X-Jevcache-Latency: 423ms", delay: 220 },
      { text: "intent=0.94 · skipped upstream model", delay: 280, color: "text-amber" },
    ],
  },
]

const sections = [
  { id: "top", label: "Top" },
  { id: "start", label: "Start" },
  { id: "problem", label: "Why" },
  { id: "how", label: "How" },
  { id: "benchmark", label: "Bench" },
  { id: "wire", label: "Wire" },
  { id: "faq", label: "FAQ" },
]

const TILES = [
  {
    id: "exact",
    title: "Exact key",
    body: "Byte-identical requests reuse the stored completion immediately.",
    still: "same bytes → HIT",
    play: "request ≡ stored · skipped the model",
    wide: true,
  },
  {
    id: "admit",
    title: "Same-intent admit",
    body: "Paraphrases go through the adjudicator. High confidence → HIT.",
    still: "wording changes · fingerprint stays",
    play: "0.94 · freshness ok · HIT",
    wide: false,
  },
  {
    id: "refuse",
    title: "Freshness refuse",
    body: "If the answer may be stale, MorrowCache fails open and calls the model.",
    still: '"what\'s the latest" · stored yesterday',
    play: "refuse · MISS · prefer a miss",
    wide: false,
  },
] as const

export default function Home() {
  const { stars, downloads } = useStats()
  const [copied, setCopied] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [pastHero, setPastHero] = useState(false)
  const [hot, setHot] = useState<string | null>(null)

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.72)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="relative z-10">
      <span className="sr-only" aria-live="polite">
        {copied ? "Install command copied" : ""}
      </span>
      <ScrollProgress
        sections={sections}
        className={cn(
          "!fixed !bottom-[max(1.25rem,env(safe-area-inset-bottom))] !left-1/2 !top-auto z-50 !flex !-translate-x-1/2 !translate-y-0 transition-opacity",
          pastHero ? "opacity-80" : "pointer-events-none opacity-0",
        )}
      />

      <section
        id="top"
        className="section-anchor relative overflow-hidden px-6 pt-[clamp(2rem,5vh,3.5rem)] lg:px-8"
      >
        <HeroDitheringRoot className="!min-h-0" srTitle="MorrowCache" title="MorrowCache" subtitle={<KineticClaim />} description="OpenAI-compatible proxy. Reuses answers for exact repeats and same-intent paraphrases. Fails open when it shouldn’t." showCta showBadges techStack={[{ name: "MIT", version: "License" }, { name: "Node", version: "≥ 22.5" }, { name: "Fail-open", version: "by design" }]} desktopShaderProps={{ colorBack: "#08101f", colorFront: "#6ba3ff", shape: "swirl", type: "4x4", size: 2, speed: 0.85, scale: 0.58 }} mobileShaderProps={{ colorBack: "#08101f00", colorFront: "#6ba3ff", speed: 0.7, scale: 0.5 }} renderCta={() => (
          <div className="flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <MetalButton type="button" variant="outline" preset="chromatic" theme="dark" strength={1} size="lg" metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90" className="min-h-11 rounded-full px-7 font-medium" onClick={copyInstall}>
              {copied ? "Copied" : "Copy install"}
            </MetalButton>
            <BorderBeamButton asChild theme="dark" colorVariant="ocean" beamSize="sm" strength={0.7} className="min-h-11 rounded-full border-line-strong bg-transparent px-5 text-bone hover:bg-panel">
              <a href="https://github.com/kushals256/jevcache" target="_blank" rel="noopener noreferrer">View on GitHub</a>
            </BorderBeamButton>
          </div>
        )}>
          <HeroDitheringContainer>
            <HeroDitheringContent>
              <p className="fig text-center md:text-left">FIG 01 · Trace</p>
              <HeroDitheringHeading headingClassName="!font-pixel-circle !tracking-[0.02em] text-bone" />
              <HeroDitheringDescription descriptionClassName="!text-body" />
              <HeroDitheringActions />
              <div className="flex justify-center md:justify-start">
                <HeroDitheringBadges />
              </div>
            </HeroDitheringContent>
            <HeroDitheringVisual>
              <div className="pointer-events-auto absolute bottom-6 left-6 right-6 z-20 hidden md:block">
                <TraceTheater />
              </div>
            </HeroDitheringVisual>
          </HeroDitheringContainer>
          <HeroDitheringMobileVisual />
        </HeroDitheringRoot>

        <div className="relative z-20 mx-auto mt-6 max-w-md md:hidden">
          <TraceTheater />
        </div>

        <dl className="relative z-20 mx-auto mt-8 flex max-w-[1200px] flex-wrap justify-center gap-x-8 gap-y-2 pb-8 text-center md:justify-start">
          {[
            { value: stars, label: "stars", decimals: 0 },
            { value: downloads, label: "npm / mo", decimals: 0 },
            { value: 55, label: "tests", decimals: 0 },
            { value: 6.7, label: "recorded hit", decimals: 1, suffix: "×" },
          ].map((m) => (
            <div key={m.label}>
              <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted">{m.label}</dt>
              <dd className="text-sm font-medium text-bone">
                <AnimatedCounter value={m.value} decimals={m.decimals} suffix={m.suffix} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <StartBand />

      <section id="problem" className="section-anchor px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <p className="fig">FIG 03 · Bill</p>
          <h2 className="display mt-3 max-w-xl text-bone">You pay for the same answer twice.</h2>
          <div className="mt-10">
            <ReceiptTape />
          </div>
        </div>
      </section>

      <section id="how" className="section-anchor px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-[1200px]">
          <p className="fig">FIG 04 · Machine</p>
          <h2 className="display mt-3 max-w-2xl text-bone">
            Exact when it can. Admit when it should. Refuse when freshness matters.
          </h2>
          <div className="mt-10 grid gap-3 lg:grid-cols-2">
            {TILES.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onMouseEnter={() => setHot(tile.id)}
                onMouseLeave={() => setHot(null)}
                onFocus={() => setHot(tile.id)}
                onBlur={() => setHot(null)}
                className={cn(
                  "rounded-xl border border-line bg-panel p-6 text-left transition hover:border-line-strong",
                  tile.wide && "lg:col-span-2",
                )}
              >
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-bone">{tile.title}</h3>
                <p className="mt-2 max-w-xl text-sm text-body">{tile.body}</p>
                <p className="mt-4 font-mono text-xs text-hit">{hot === tile.id ? tile.play : tile.still}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="benchmark" className="section-anchor px-6 py-24 lg:px-8">
        <div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <p className="fig">FIG 05 · Race</p>
            <h2 className="display mt-3 text-bone">Including where we lose.</h2>
            <ul className="mt-6 space-y-3 text-sm text-body">
              <li>Recorded demo: 2817ms miss → 423ms hit at intent 0.94.</li>
              <li>Offline word-overlap Jaccard@0.35, n=103, false-positive rate 0.49.</li>
              <li>Streaming and tool-call side effects bypass the cache by design.</li>
            </ul>
          </div>
          <LatencyRace />
        </div>
      </section>

      <section id="wire" className="section-anchor px-6 py-24 lg:px-8">
        <div className="mx-auto grid max-w-[1200px] items-stretch gap-6 lg:grid-cols-2">
          <div className="flex flex-col">
            <p className="fig">FIG 06 · Wire</p>
            <h2 className="display mt-3 text-bone">Point baseURL. Watch the hit.</h2>
            <p className="mt-3 text-sm text-body">
              Prefer the{" "}
              <a href="/#start" className="text-hit no-underline hover:underline">
                Start
              </a>{" "}
              band above — or paste the full prompt on{" "}
              <Link to="/agent-setup" className="text-hit no-underline hover:underline">
                Agent setup
              </Link>
              .
            </p>
            <div className="mt-6 flex flex-1 flex-col gap-4">
              <CodeBlock code={INSTALL} language="bash" accent="#6ba3ff" mode="dark" filename="install" />
              <CodeBlock code={BASE_URL_SNIPPET} language="ts" accent="#93c5fd" mode="dark" filename="client.ts" />
            </div>
          </div>
          <div className="flex flex-col justify-end [&_.text-amber]:text-[#f0a45c] [&_.text-hit]:text-[#6ba3ff]">
            <TerminalAnimationRoot tabs={terminalTabs} defaultActiveTab={0}>
              <TerminalAnimationContainer>
                <TerminalAnimationWindow className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-line bg-panel">
                  <TerminalAnimationContent className="min-h-[200px] flex-1 p-4">
                    <TerminalAnimationCommandBar className="font-mono text-sm text-bone" />
                    <TerminalAnimationOutput className="mt-3 space-y-1 font-mono text-sm text-muted" />
                  </TerminalAnimationContent>
                  <TerminalAnimationTabList className="flex gap-2 border-t border-line p-3">
                    {terminalTabs.map((tab, index) => (
                      <TerminalAnimationTabTrigger key={tab.label} index={index} className="rounded-full px-3 py-1 text-xs text-muted data-[state=active]:bg-bone data-[state=active]:text-ink">
                        {tab.label}
                      </TerminalAnimationTabTrigger>
                    ))}
                  </TerminalAnimationTabList>
                </TerminalAnimationWindow>
              </TerminalAnimationContainer>
            </TerminalAnimationRoot>
          </div>
        </div>
      </section>

      <section id="faq" className="section-anchor px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="fig">FAQ</p>
          <h2 className="display mt-3 text-bone">Straight answers</h2>
          <div className="mt-8 space-y-2">
            {FAQ.map((item, i) => {
              const open = openFaq === i
              return (
                <div key={item.q} className={cn("rounded-xl border bg-panel px-4", open ? "border-hit/40" : "border-line")}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left font-medium text-bone" aria-expanded={open} onClick={() => setOpenFaq(open ? null : i)}>
                    <span>{item.q}</span>
                    <span className="font-mono text-muted" aria-hidden>{open ? "−" : "+"}</span>
                  </button>
                  {open && <p className="pb-3 text-sm text-body">{item.a}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center lg:px-8">
        <h2 className="display text-bone">
          Ship the miss. Keep the <span className="text-hit">hit</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body">
          Install the proxy, point baseURL, watch X-Jevcache-Status.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <MetalButton type="button" variant="outline" preset="chromatic" theme="dark" strength={1} size="lg" metalFxClassName="!bg-bone !text-ink hover:!bg-bone/90" className="min-h-11 rounded-full px-7 font-medium" onClick={copyInstall}>
            {copied ? "Copied" : "Copy install"}
          </MetalButton>
          <BorderBeamButton asChild theme="dark" colorVariant="ocean" beamSize="sm" className="min-h-11 rounded-full border-line bg-transparent px-5 text-bone hover:bg-panel">
            <a href="https://github.com/kushals256/jevcache" target="_blank" rel="noopener noreferrer">GitHub</a>
          </BorderBeamButton>
        </div>
      </section>
    </main>
  )
}
