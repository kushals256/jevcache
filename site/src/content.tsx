import { StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { Analytics } from "@vercel/analytics/react"
import { ContentApp } from "./ContentApp"
import "./index.css"

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <BrowserRouter>
      <ContentApp />
      <Analytics />
    </BrowserRouter>
  </StrictMode>,
)
