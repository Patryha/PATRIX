import type { Metadata, Viewport } from "next"
import { Inter, Manrope } from "next/font/google"
import { Suspense } from "react"
import { ConsentManager } from "@/components/consent/consent-manager"
import { Footer } from "@/components/layout/footer"
import { Header } from "@/components/layout/header"
import { ThemeStyle } from "@/components/layout/theme-style"
import { trackingConfig } from "@/lib/consent"
import "./globals.css"

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" })
const manrope = Manrope({ subsets: ["latin", "latin-ext"], variable: "--font-manrope", display: "swap" })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:8000"),
  title: { default: "PATRIX: Niemiecka jakość na co dzień", template: "%s | PATRIX" },
  description: "Oryginalne produkty z Niemiec: chemia gospodarcza, kosmetyki, słodycze, napoje i produkty dla domu.",
  applicationName: "PATRIX",
  openGraph: { siteName: "PATRIX", locale: "pl_PL", type: "website" },
  // Do czasu publikacji sklep nie powinien być indeksowany (zmienna ustawiana przy starcie produkcyjnym).
  robots: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true" ? undefined : { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1A29" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <ThemeStyle />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Przejdź do treści
        </a>
        <Header />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        {/* usePathname w banerze wymaga granicy Suspense przy Cache Components */}
        <Suspense fallback={null}>
          <ConsentManager config={trackingConfig} />
        </Suspense>
      </body>
    </html>
  )
}
