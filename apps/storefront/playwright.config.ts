import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8000"
// W środowiskach z preinstalowanym Chromium (np. kontenery CI) można wskazać jego ścieżkę.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure", locale: "pl-PL", launchOptions: { executablePath } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
})
