import { Route, Routes } from "react-router-dom"
import { SiteFooter } from "@/components/SiteFooter"
import { SiteNav } from "@/components/SiteNav"
import AlwaysCall from "@/pages/compare/AlwaysCall"
import ExactCache from "@/pages/compare/ExactCache"
import WordOverlap from "@/pages/compare/WordOverlap"
import AgentSetup from "@/pages/AgentSetup"
import Compare from "@/pages/Compare"
import Home from "@/pages/Home"
import UseCases from "@/pages/UseCases"

export default function App() {
  return (
    <>
      <div className="grain" aria-hidden />
      <SiteNav />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/agent-setup" element={<AgentSetup />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/compare/exact-cache" element={<ExactCache />} />
        <Route path="/compare/word-overlap" element={<WordOverlap />} />
        <Route path="/compare/always-call" element={<AlwaysCall />} />
      </Routes>
      <SiteFooter />
    </>
  )
}
