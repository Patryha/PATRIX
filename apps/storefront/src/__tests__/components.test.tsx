import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Price } from "@/components/ui/price"

describe("Field", () => {
  it("links label, hint and error for assistive technology", () => {
    const { rerender } = render(<Field label="E-mail" name="email" hint="Wyślemy potwierdzenie" />)
    const input = screen.getByLabelText("E-mail")
    expect(input).toHaveAccessibleDescription("Wyślemy potwierdzenie")
    expect(input).not.toHaveAttribute("aria-invalid")

    rerender(<Field label="E-mail" name="email" hint="Wyślemy potwierdzenie" error="Podaj poprawny adres e-mail" />)
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByRole("alert")).toHaveTextContent("Podaj poprawny adres e-mail")
    expect(screen.getByLabelText("E-mail")).toHaveAccessibleDescription(/Podaj poprawny adres e-mail/)
  })
})

describe("Button", () => {
  it("is a non-submitting button by default and exposes loading state", () => {
    render(<Button loading>Zapisz</Button>)
    const button = screen.getByRole("button", { name: "Zapisz" })
    expect(button).toHaveAttribute("type", "button")
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })
})

describe("Price (Omnibus)", () => {
  it("shows the struck-through price only together with the 30-day lowest price", () => {
    const { rerender } = render(<Price amount={9.99} original={12.99} />)
    expect(screen.queryByText(/Najniższa cena z 30 dni/)).toBeNull()
    expect(screen.queryByText(/Cena przed obniżką/)).toBeNull()

    rerender(<Price amount={9.99} original={12.99} lowest30d={11.49} />)
    expect(screen.getByText(/Cena przed obniżką/)).toBeInTheDocument()
    expect(screen.getByText(/Najniższa cena z 30 dni przed obniżką: 11,49/)).toBeInTheDocument()
  })

  it("shows the unit price when measurement data exists", () => {
    render(<Price amount={20} measure={{ quantity: 2, unit: "l" }} />)
    expect(screen.getByText(/10,00\s+zł \/ l/)).toBeInTheDocument()
  })
})
