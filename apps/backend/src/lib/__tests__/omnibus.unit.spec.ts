import { lowestInWindow } from "../../modules/patrix-catalog/service"

const d = (iso: string) => new Date(iso)

describe("lowestInWindow (Omnibus)", () => {
  const from = d("2026-09-20T00:00:00Z")

  it("zwraca null bez historii", () => {
    expect(lowestInWindow([], from)).toBeNull()
  })

  it("uwzględnia cenę obowiązującą na początku okna", () => {
    const rows = [
      { amount: 20, recorded_at: d("2026-10-10T00:00:00Z") },
      { amount: 15, recorded_at: d("2026-09-01T00:00:00Z") },
      { amount: 9, recorded_at: d("2026-08-01T00:00:00Z") },
    ]
    // 15 obowiązywało od 1.09 do 10.10, więc też w oknie; 9 sprzed okna nie liczy się
    expect(lowestInWindow(rows, from)).toBe(15)
  })

  it("bierze najniższą cenę z okna", () => {
    const rows = [
      { amount: 25, recorded_at: d("2026-10-15T00:00:00Z") },
      { amount: 18, recorded_at: d("2026-10-01T00:00:00Z") },
      { amount: 22, recorded_at: d("2026-09-10T00:00:00Z") },
    ]
    expect(lowestInWindow(rows, from)).toBe(18)
  })
})
