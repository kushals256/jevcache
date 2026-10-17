import { StrictMode } from "react"
import { hydrateRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { ContentApp } from "./ContentApp"
import "./index.css"

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <BrowserRouter>
      <ContentApp />
    </BrowserRouter>
  </StrictMode>,
)
