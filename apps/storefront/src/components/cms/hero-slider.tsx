"use client"

import Image from "next/image"
import { useEffect, useState, useSyncExternalStore } from "react"
import { buttonClasses } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/ui/icons"
import type { HeroSlider as Props } from "@/lib/cms/types"
import { canOptimize } from "@/lib/cms/images"
import { cn } from "@/lib/cn"
import { CmsLink } from "./cms-link"

const INTERVAL_MS = 7000

const REDUCED = "(prefers-reduced-motion: reduce)"
function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}
/** Preferencja ograniczenia ruchu; na serwerze zakładamy „tak” (bez autoodtwarzania przed hydratacją). */
const useReducedMotion = () => useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED).matches, () => true)

/**
 * Slider promocyjny. Autoodtwarzanie tylko gdy włączone w panelu i użytkownik nie prosi o ograniczenie ruchu;
 * zawsze z przyciskiem pauzy (WCAG 2.2.2), zatrzymuje się po najechaniu i przy fokusie.
 */
export function HeroSlider({ section, headingLevel = 1 }: { section: Props; headingLevel?: 1 | 2 }) {
  const slides = section.slides
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()
  const [userPaused, setUserPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const many = slides.length > 1
  const playing = section.autoplay && !reduced && !userPaused

  useEffect(() => {
    if (!many || !playing || hovered) {
      return
    }
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [many, playing, hovered, slides.length])

  const go = (delta: number) => setIndex((i) => (i + delta + slides.length) % slides.length)
  const Heading = headingLevel === 1 ? "h1" : "h2"

  return (
    <section
      aria-roledescription={many ? "karuzela" : undefined}
      aria-label="Wyróżnione"
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
    >
      {slides.map((slide, i) => {
        const brand = slide.theme !== "light"
        // Pierwszy slajd jest nagłówkiem strony; kolejne to h2, żeby na stronie był jeden h1.
        const Title = i === 0 ? Heading : "h2"
        return (
          <div
            key={i}
            role={many ? "group" : undefined}
            aria-roledescription={many ? "slajd" : undefined}
            aria-label={many ? `${i + 1} z ${slides.length}` : undefined}
            hidden={i !== index}
            className={cn("relative overflow-hidden", brand ? "bg-hero text-hero-foreground" : "bg-surface-muted text-foreground")}
          >
            {brand ? (
              <>
                <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-accent opacity-25 blur-3xl" />
                <div aria-hidden className="pointer-events-none absolute -bottom-32 left-1/3 size-80 rounded-full bg-highlight opacity-15 blur-3xl" />
              </>
            ) : null}
            <div className="relative mx-auto grid max-w-[1280px] items-center gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] md:px-8 md:py-20">
              <div className="flex flex-col gap-5">
                {slide.eyebrow ? (
                  <p className={cn("w-fit rounded-full px-3 py-1 text-sm font-medium", brand ? "bg-white/10" : "bg-surface")}>{slide.eyebrow}</p>
                ) : null}
                <Title className={cn("max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl", brand && "text-hero-foreground")}>
                  {slide.title}
                </Title>
                {slide.text ? <p className="max-w-xl text-lg opacity-90">{slide.text}</p> : null}
                {slide.cta_label && slide.cta_href ? (
                  <CmsLink href={slide.cta_href} className={cn(buttonClasses({ variant: brand ? "highlight" : "accent", size: "lg" }), "w-fit")}>
                    {slide.cta_label}
                  </CmsLink>
                ) : null}
              </div>
              {slide.image_url ? (
                <div className="relative aspect-[4/3] w-full">
                  <Image src={slide.image_url} unoptimized={!canOptimize(slide.image_url)} alt={slide.image_alt ?? ""} fill sizes="(min-width: 768px) 40vw, 100vw" className="object-contain" priority={i === 0} />
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
      {many ? (
        <div className="absolute bottom-3 right-4 flex items-center gap-1 rounded-full bg-background/90 p-1 shadow-md md:right-8">
          <button type="button" onClick={() => go(-1)} className="flex size-11 items-center justify-center rounded-full hover:bg-surface-muted" aria-label="Poprzedni slajd">
            <ChevronLeftIcon />
          </button>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slajd ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className="flex size-8 items-center justify-center"
            >
              <span className={cn("block size-2.5 rounded-full", i === index ? "bg-accent-strong" : "bg-border")} />
            </button>
          ))}
          <button type="button" onClick={() => go(1)} className="flex size-11 items-center justify-center rounded-full hover:bg-surface-muted" aria-label="Następny slajd">
            <ChevronRightIcon />
          </button>
          {section.autoplay && !reduced ? (
            <button
              type="button"
              onClick={() => setUserPaused((p) => !p)}
              className="flex size-11 items-center justify-center rounded-full hover:bg-surface-muted"
              aria-label={playing ? "Zatrzymaj przewijanie" : "Wznów przewijanie"}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
