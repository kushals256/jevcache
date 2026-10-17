import { createContext, useContext, type ReactNode } from "react"

const ContentModeContext = createContext(false)

export function ContentModeProvider({ children }: { children: ReactNode }) {
  return <ContentModeContext.Provider value={true}>{children}</ContentModeContext.Provider>
}

export function useContentMode() {
  return useContext(ContentModeContext)
}
