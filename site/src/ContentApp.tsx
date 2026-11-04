import { SiteFooter } from "@/components/SiteFooter"
import { RouteScroll } from "@/components/RouteScroll"
import { TitleSync } from "@/components/TitleSync"
import { SiteNav } from "@/components/SiteNav"
import { ContentModeProvider } from "@/contentMode"
import Home from "@/pages/Home"
import AgentSetup from "@/pages/AgentSetup"
import UseCases from "@/pages/UseCases"
import Compare from "@/pages/Compare"
import ExactCache from "@/pages/compare/ExactCache"
import WordOverlap from "@/pages/compare/WordOverlap"
import AlwaysCall from "@/pages/compare/AlwaysCall"
import GPTCache from "@/pages/compare/GPTCache"
import LiteLLMCache from "@/pages/compare/LiteLLMCache"
import RedisSemanticCache from "@/pages/compare/RedisSemanticCache"
import GatewayCaches from "@/pages/compare/GatewayCaches"
import SemanticCaching from "@/pages/guides/SemanticCaching"
import PromptVsResponse from "@/pages/guides/PromptVsResponse"
import Integrations from "@/pages/Integrations"
import Benchmark from "@/pages/Benchmark"
import { Route, Routes } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"

export function ContentApp() {
  return (
    <ContentModeProvider>
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
      <SiteFooter />
      {/* Inside the shared tree so server and client useId values match. */}
      <Analytics />
    </ContentModeProvider>
  )
}
