import { SiteFooter } from "@/components/SiteFooter"
import { RouteScroll } from "@/components/RouteScroll"
import { SiteNav } from "@/components/SiteNav"
import { ContentModeProvider } from "@/contentMode"
import AgentSetup from "@/pages/AgentSetup"
import UseCases from "@/pages/UseCases"
import Compare from "@/pages/Compare"
import ExactCache from "@/pages/compare/ExactCache"
import WordOverlap from "@/pages/compare/WordOverlap"
import AlwaysCall from "@/pages/compare/AlwaysCall"
import { Route, Routes } from "react-router-dom"

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
      <SiteNav />
      <Routes>
        <Route path="/agent-setup" element={<AgentSetup />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/compare/exact-cache" element={<ExactCache />} />
        <Route path="/compare/word-overlap" element={<WordOverlap />} />
        <Route path="/compare/always-call" element={<AlwaysCall />} />
      </Routes>
      <SiteFooter />
    </ContentModeProvider>
  )
}
