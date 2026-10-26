"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/cn"

export function ProductGallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [active, setActive] = useState(0)
  const current = images[active]
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
        {current ? (
          <Image
            src={current.url}
            alt={images.length > 1 ? `${title}, zdjęcie ${active + 1} z ${images.length}` : title}
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-contain p-6"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">Brak zdjęcia</div>
        )}
      </div>
      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Miniatury zdjęć">
          {images.map((img, i) => (
            <li key={img.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={i === active}
                aria-label={`Pokaż zdjęcie ${i + 1}`}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-md border bg-surface transition-colors md:size-20",
                  i === active ? "border-accent-strong ring-2 ring-accent-strong" : "border-border hover:border-accent"
                )}
              >
                <Image src={img.url} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
