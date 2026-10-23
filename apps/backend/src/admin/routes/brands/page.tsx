import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import { Button, Container, Heading, Input, Label, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { sdk } from "../../lib/sdk"

type Brand = { id: string; name: string; handle: string; country_code: string | null; website: string | null }

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const BrandsPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ["patrix-brands"], queryFn: () => sdk.client.fetch<{ brands: Brand[] }>("/admin/patrix/brands") })
  const [name, setName] = useState("")
  const [country, setCountry] = useState("de")
  const [website, setWebsite] = useState("")

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["patrix-brands"] })
  const create = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/patrix/brands", {
        method: "POST",
        body: { name: name.trim(), handle: slugify(name), country_code: country.trim().toLowerCase() || null, website: website.trim() || null },
      }),
    onSuccess: () => {
      setName("")
      setWebsite("")
      invalidate()
      toast.success("Dodano markę")
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/brands/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate()
      toast.success("Usunięto markę")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (slugify(name)) {
      create.mutate()
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Marki</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Marki przypisujesz produktom w sekcji „Dane produktu PATRIX”. Służą do filtrów i stron marek w sklepie.
        </Text>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-4 md:items-end">
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="brand-name" size="small" weight="plus">
            Nazwa
          </Label>
          <Input id="brand-name" size="small" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="brand-country" size="small" weight="plus">
            Kraj marki (kod, np. de)
          </Label>
          <Input id="brand-country" size="small" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="brand-website" size="small" weight="plus">
            Strona www
          </Label>
          <Input id="brand-website" size="small" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <Button type="submit" size="small" isLoading={create.isPending}>
          Dodaj markę
        </Button>
      </form>
      {isLoading ? (
        <Text className="px-6 py-4">Wczytywanie…</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nazwa</Table.HeaderCell>
              <Table.HeaderCell>Adres w sklepie</Table.HeaderCell>
              <Table.HeaderCell>Kraj</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {(data?.brands ?? []).map((b) => (
              <Table.Row key={b.id}>
                <Table.Cell>{b.name}</Table.Cell>
                <Table.Cell>/marka/{b.handle}</Table.Cell>
                <Table.Cell>{b.country_code?.toUpperCase() ?? "—"}</Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Usunąć markę ${b.name}?`)) {
                        remove.mutate(b.id)
                      }
                    }}
                  >
                    Usuń
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({ label: "Marki", icon: Tag })

export default BrandsPage
