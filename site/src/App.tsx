import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { SiteFooter } from "@/components/SiteFooter"
import { RouteScroll } from "@/components/RouteScroll"
import { TitleSync } from "@/components/TitleSync"
import { SiteNav } from "@/components/SiteNav"
import Home from "@/pages/Home"

const AgentSetup = lazy(() => import("@/pages/AgentSetup"))
const UseCases = lazy(() => import("@/pages/UseCases"))
const Compare = lazy(() => import("@/pages/Compare"))
const ExactCache = lazy(() => import("@/pages/compare/ExactCache"))
const WordOverlap = lazy(() => import("@/pages/compare/WordOverlap"))
const AlwaysCall = lazy(() => import("@/pages/compare/AlwaysCall"))
const GPTCache = lazy(() => import("@/pages/compare/GPTCache"))
const LiteLLMCache = lazy(() => import("@/pages/compare/LiteLLMCache"))
const RedisSemanticCache = lazy(() => import("@/pages/compare/RedisSemanticCache"))
const GatewayCaches = lazy(() => import("@/pages/compare/GatewayCaches"))
const SemanticCaching = lazy(() => import("@/pages/guides/SemanticCaching"))
const PromptVsResponse = lazy(() => import("@/pages/guides/PromptVsResponse"))
const Integrations = lazy(() => import("@/pages/Integrations"))
const Benchmark = lazy(() => import("@/pages/Benchmark"))

function PageFallback() {
  return (
    <div className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-6" aria-hidden>
      <div className="size-1.5 animate-pulse rounded-full bg-hit/50" />
    </div>
  )
}

export default function App() {
  return (
    <>
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-hit focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="grain" aria-hidden />
      <RouteScroll />
      <TitleSync />
      <SiteNav />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agent-setup" element={<AgentSetup />} />
          <Route path="/use-cases" element={<UseCases />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/compare/exact-cache" element={<ExactCache />} />
          <Route path="/compare/word-overlap" element={<WordOverlap />} />
          <Route path="/compare/always-call" element={<AlwaysCall />} />
          <Route path="/compare/gptcache" element={<GPTCache />} />
          <Route path="/compare/litellm-cache" element={<LiteLLMCache />} />
          <Route path="/compare/redis-semantic-cache" element={<RedisSemanticCache />} />
          <Route path="/compare/gateway-caches" element={<GatewayCaches />} />
          <Route path="/guides/semantic-caching" element={<SemanticCaching />} />
          <Route path="/guides/prompt-caching-vs-response-caching" element={<PromptVsResponse />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/benchmark" element={<Benchmark />} />
        </Routes>
      </Suspense>
      <SiteFooter />
    </>
  )
}
