import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { ROUTES } from "@/seo/routes"

/** Prerendered pages ship the right <title>; this keeps it right after client-side navigation. */
export function TitleSync() {
  const { pathname } = useLocation()
  useEffect(() => {
    const route = ROUTES.find((r) => r.path === (pathname.replace(/\/$/, "") || "/"))
    if (route) document.title = route.title
  }, [pathname])
  return null
}
