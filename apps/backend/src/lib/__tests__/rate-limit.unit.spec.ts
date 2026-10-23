import { consume, MemoryRateLimitStore } from "../rate-limit"

describe("rate limit", () => {
  it("allows up to the limit and then blocks", async () => {
    const store = new MemoryRateLimitStore()
    const results: Awaited<ReturnType<typeof consume>>[] = []
    for (let i = 0; i < 4; i++) {
      results.push(await consume(store, "ip-1", 3, 60))
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false])
    expect(results[3].retryAfterSeconds).toBeGreaterThan(0)
  })
  it("counts keys separately", async () => {
    const store = new MemoryRateLimitStore()
    await consume(store, "a", 1, 60)
    expect((await consume(store, "b", 1, 60)).allowed).toBe(true)
  })
})
