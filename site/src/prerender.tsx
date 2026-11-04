import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { ContentApp } from "./ContentApp"

export function renderRoute(url: string) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <ContentApp />
      </StaticRouter>
    </StrictMode>,
  )
}

export { ROUTES, SITE_URL, SITE_NAME, NPM_PACKAGE, NPM_URL, GITHUB_URL, VERSION } from "./seo/routes"
export { HOME_FAQ } from "./content/faq"
