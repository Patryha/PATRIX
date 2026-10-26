import { credentialHints, retryDelayMs } from "../integrations"

describe("integracje", () => {
  it("ponowienia: 1, 2, 4 minuty… najwyżej 6 godzin", () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([60_000, 120_000, 240_000, 480_000])
    expect(retryDelayMs(20)).toBe(6 * 60 * 60_000)
  })

  it("podpowiedzi: sekret tylko z końcówką (krótki wcale), pole jawne w całości, puste pominięte", () => {
    const fields = [
      { key: "api_key", label: "Klucz", secret: true },
      { key: "pin", label: "PIN", secret: true },
      { key: "merchant_id", label: "ID", secret: false },
      { key: "empty", label: "Puste", secret: false },
    ]
    expect(credentialHints({ api_key: "sk_test_abcdefgh1234", pin: "1234", merchant_id: "12345" }, fields)).toEqual({
      api_key: "••••1234",
      pin: "••••",
      merchant_id: "12345",
    })
  })
})
