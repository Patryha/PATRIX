import react from "@vitejs/plugin-react"
import { fileURLToPath } from "node:url"
import { defineConfig, type ViteUserConfig } from "vitest/config"

export default defineConfig({
  // plugin-react jest typowany pod Vite 8, a Vitest 3 pod Vite 7; w runtime są zgodne.
  plugins: [react() as unknown as NonNullable<ViteUserConfig["plugins"]>[number]],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
})
