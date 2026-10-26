import { COMPLIANCE_COLUMNS, mergeCompliance, parseComplianceRow, parseCostRow, unknownColumns } from "../catalog/import"
import { normalizeHeader, parseCsv, parseDecimal, parseYesNo } from "../csv"

describe("CSV", () => {
  it("polski Excel: średnik, BOM, cudzysłowy, nowa linia w polu, CRLF", () => {
    const csv = '﻿Uchwyt;Skład;Ilość netto\r\ntest-a;"woda; ""aqua""\nperfum";1,5\r\n;;\r\ntest-b;;2\r\n'
    const { headers, rows } = parseCsv(csv)
    expect(headers).toEqual(["uchwyt", "sklad", "ilosc_netto"])
    expect(rows).toEqual([
      { uchwyt: "test-a", sklad: 'woda; "aqua"\nperfum', ilosc_netto: "1,5" },
      { uchwyt: "test-b", sklad: "", ilosc_netto: "2" },
    ])
  })

  it("przecinek jako separator, brakujące komórki są puste", () => {
    expect(parseCsv("sku,cena_zakupu,dostawca\nA-1,12.5\n").rows).toEqual([{ sku: "A-1", cena_zakupu: "12.5", dostawca: "" }])
  })

  it("odrzuca niezamknięty cudzysłów, pusty plik i powtórzone kolumny", () => {
    expect(() => parseCsv('a;b\n"x;y\n')).toThrow("Niezamknięty cudzysłów")
    expect(() => parseCsv("")).toThrow("pusty")
    expect(() => parseCsv("sku;SKU\n1;2")).toThrow("Powtórzona kolumna: sku")
  })

  it("liczby i tak/nie", () => {
    expect(parseDecimal("1 234,50")).toBe(1234.5)
    expect(parseDecimal("12.5")).toBe(12.5)
    expect(parseDecimal("12,5 zł")).toBeNull()
    expect(parseYesNo("TAK")).toBe(true)
    expect(parseYesNo("nie")).toBe(false)
    expect(parseYesNo("może")).toBeNull()
    expect(normalizeHeader(" Sposób użycia ")).toBe("sposob_uzycia")
  })
})

describe("import danych produktów", () => {
  it("mapuje kolumny, pomija puste komórki, zbiera błędy", () => {
    const row = parseComplianceRow({ uchwyt: "Test-A", rodzaj: "kosmetyk", marka: "Nivea", alergeny: "mleko | orzechy", ilosc_netto: "abc", producent: "" })
    expect(row.handle).toBe("test-a")
    expect(row.brand_handle).toBe("nivea")
    expect(row.changes).toEqual({ product_kind: "cosmetic", allergens: ["mleko", "orzechy"] })
    expect(row.errors).toEqual(["ilosc_netto: liczba większa od zera"])
    expect(parseComplianceRow({ rodzaj: "inne" }).errors).toEqual(["brak uchwytu produktu (kolumna uchwyt)", "rodzaj: ogólny, żywność, chemia albo kosmetyk"])
  })

  it("zmiana danych cofa potwierdzenie etykiety, zmiana alergenów cofa ich potwierdzenie", () => {
    const existing = { id: "x", product_kind: "food", manufacturer_in_eu: true, allergens: ["mleko"], allergens_confirmed: true, polish_label_verified: true, ingredients: "mąka" }
    const same = mergeCompliance(existing, { ingredients: "mąka" })
    expect(same.changed).toEqual([])
    expect(same.data?.polish_label_verified).toBe(true)

    const changed = mergeCompliance(existing, { allergens: ["mleko", "jaja"] })
    expect(changed.changed).toEqual(["allergens"])
    expect(changed.data).toMatchObject({ polish_label_verified: false, allergens_confirmed: false, ingredients: "mąka" })
    expect(changed.data).not.toHaveProperty("id")

    const text = mergeCompliance(existing, { ingredients: "mąka pszenna" })
    expect(text.data).toMatchObject({ polish_label_verified: false, allergens_confirmed: true })

    const brand = mergeCompliance(existing, { brand_id: "brand_1" })
    expect(brand.changed).toEqual(["brand_id"])
    expect(brand.labelChanged).toEqual([])
    expect(brand.data).toMatchObject({ brand_id: "brand_1", polish_label_verified: true })
  })

  it("nowe dane bez rekordu: wartości domyślne, walidacja schematu (UFI, jednostka)", () => {
    expect(mergeCompliance(null, { manufacturer_name: "TEST GmbH" }).data).toMatchObject({ product_kind: "general", manufacturer_in_eu: true })
    expect(mergeCompliance(null, { ufi_code: "zly" }).errors[0]).toContain("ufi_code")
    expect(mergeCompliance(null, { net_quantity_unit: "beczka" }).errors[0]).toContain("net_quantity_unit")
  })

  it("nieznane kolumny", () => {
    expect(unknownColumns(["uchwyt", "sklad", "skladniki"], ["uchwyt", ...Object.keys(COMPLIANCE_COLUMNS)])).toEqual(["skladniki"])
  })

  it("ceny zakupu: SKU i kwota netto", () => {
    expect(parseCostRow({ sku: "A-1", cena_zakupu: "12,499", dostawca: "Hurtownia" })).toEqual({ sku: "A-1", purchase_price: 12.5, supplier: "Hurtownia", errors: [] })
    expect(parseCostRow({ sku: "", cena_zakupu: "-1" }).errors).toEqual(["brak SKU", "cena_zakupu: kwota netto w zł, np. 12,50"])
  })
})
