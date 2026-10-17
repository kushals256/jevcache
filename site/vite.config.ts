import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const root = path.dirname(fileURLToPath(import.meta.url))
const contentBuild = process.env.CONTENT_BUILD === "1"

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(root, "./src"),
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    modulePreload: { polyfill: false },
    manifest: true,
    outDir: isSsrBuild ? "dist-ssr" : contentBuild ? "dist-content" : "dist",
    emptyOutDir: true,
    rollupOptions: isSsrBuild
      ? undefined
      : {
          input: contentBuild
            ? { content: path.resolve(root, "src/content.tsx") }
            : path.resolve(root, "index.html"),
          output: {
            manualChunks(id) {
              if (!id.includes("node_modules")) return
              if (id.includes("motion")) return "motion"
              if (id.includes("prism-react-renderer")) return "prism"
              if (id.includes("border-beam")) return "border-beam"
              if (
                id.includes("react-dom") ||
                id.includes("react-router") ||
                id.includes("/react/") ||
                id.endsWith("/react/index.js")
              ) {
                return "react-vendor"
              }
            },
          },
        },
  },
}))
