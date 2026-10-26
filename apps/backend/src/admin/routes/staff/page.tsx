import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Users } from "@medusajs/icons"
import { Badge, Button, Checkbox, Container, Heading, Input, Label, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../../lib/sdk"

type Role = { id: string; handle: string; name: string; description: string | null; is_system: boolean; permissions: string[] }
type StaffUser = { id: string; email: string; first_name: string | null; last_name: string | null; roles: string[] }
const OPERATIONS = [
  ["read", "odczyt"],
  ["write", "zapis"],
  ["delete", "usuwanie"],
] as const

function granted(permissions: string[], resource: string, operation: string) {
  return permissions.includes("*") || permissions.includes(`${resource}:*`) || permissions.includes(`${resource}:${operation}`)
}

/** Zbiór zaznaczeń → lista uprawnień; komplet operacji zapisujemy jako „zasób:*”. */
function toPermissions(checked: Set<string>, resources: string[]) {
  return resources.flatMap((r) => {
    const ops = OPERATIONS.map(([op]) => op).filter((op) => checked.has(`${r}:${op}`))
    return ops.length === OPERATIONS.length ? [`${r}:*`] : ops.map((op) => `${r}:${op}`)
  })
}

function PermissionMatrix({
  resources,
  permissions,
  onChange,
  idPrefix,
}: {
  resources: Record<string, string>
  permissions: string[]
  onChange?: (next: string[]) => void
  idPrefix: string
}) {
  const keys = Object.keys(resources)
  const checked = new Set(keys.flatMap((r) => OPERATIONS.filter(([op]) => granted(permissions, r, op)).map(([op]) => `${r}:${op}`)))
  const toggle = (key: string, value: boolean) => {
    const next = new Set(checked)
    value ? next.add(key) : next.delete(key)
    onChange?.(toPermissions(next, keys))
  }
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Obszar</Table.HeaderCell>
          {OPERATIONS.map(([op, label]) => (
            <Table.HeaderCell key={op}>{label}</Table.HeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {keys.map((r) => (
          <Table.Row key={r}>
            <Table.Cell>
              <Text size="small">{resources[r]}</Text>
            </Table.Cell>
            {OPERATIONS.map(([op, label]) => {
              const key = `${r}:${op}`
              return (
                <Table.Cell key={op}>
                  <Checkbox
                    id={`${idPrefix}-${key}`}
                    aria-label={`${resources[r]}: ${label}`}
                    checked={checked.has(key)}
                    disabled={!onChange}
                    onCheckedChange={(v) => toggle(key, v === true)}
                  />
                </Table.Cell>
              )
            })}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

function StaffRow({ user, roles }: { user: StaffUser; roles: Role[] }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string[]>(user.roles)
  const dirty = [...selected].sort().join() !== [...user.roles].sort().join()
  const save = useMutation({
    mutationFn: () => sdk.client.fetch(`/admin/patrix/users/${user.id}/roles`, { method: "POST", body: { roles: selected } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrix-staff"] })
      toast.success(`Zapisano role: ${user.email}`)
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ")
  return (
    <li className="flex flex-col gap-y-2 rounded-md border border-ui-border-base p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Text weight="plus">{user.email}</Text>
          {name ? (
            <Text size="small" className="text-ui-fg-subtle">
              {name}
            </Text>
          ) : null}
        </div>
        {user.roles.length === 0 ? <Badge color="orange">Brak roli: brak dostępu do panelu</Badge> : null}
      </div>
      <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
        <legend className="sr-only">Role: {user.email}</legend>
        {roles.map((r) => (
          <div key={r.handle} className="flex items-center gap-x-2">
            <Checkbox
              id={`${user.id}-${r.handle}`}
              checked={selected.includes(r.handle)}
              onCheckedChange={(v) => setSelected((s) => (v === true ? [...s, r.handle] : s.filter((h) => h !== r.handle)))}
            />
            <Label htmlFor={`${user.id}-${r.handle}`} size="small">
              {r.name}
            </Label>
          </div>
        ))}
      </fieldset>
      <div>
        <Button size="small" variant="secondary" disabled={!dirty} isLoading={save.isPending} onClick={() => save.mutate()}>
          Zapisz role
        </Button>
      </div>
    </li>
  )
}

function RoleEditor({ role, resources, onDone }: { role?: Role; resources: Record<string, string>; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [handle, setHandle] = useState(role?.handle ?? "")
  const [name, setName] = useState(role?.name ?? "")
  const [description, setDescription] = useState(role?.description ?? "")
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? ["panel:read"])
  const save = useMutation({
    mutationFn: () =>
      role
        ? sdk.client.fetch(`/admin/patrix/roles/${role.id}`, { method: "POST", body: { name, description: description || null, permissions } })
        : sdk.client.fetch("/admin/patrix/roles", { method: "POST", body: { handle, name, description: description || null, permissions } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrix-roles"] })
      toast.success(role ? "Zapisano rolę" : "Utworzono rolę")
      onDone()
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const prefix = role?.id ?? "nowa"
  return (
    <form
      className="flex flex-col gap-y-3 rounded-md border border-ui-border-base p-3"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {!role ? (
          <div className="flex flex-col gap-y-1">
            <Label htmlFor={`${prefix}-handle`} size="small" weight="plus">
              Identyfikator (małe litery, cyfry, _)
            </Label>
            <Input id={`${prefix}-handle`} value={handle} onChange={(e) => setHandle(e.target.value)} required />
          </div>
        ) : null}
        <div className="flex flex-col gap-y-1">
          <Label htmlFor={`${prefix}-name`} size="small" weight="plus">
            Nazwa roli
          </Label>
          <Input id={`${prefix}-name`} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      </div>
      <div className="flex flex-col gap-y-1">
        <Label htmlFor={`${prefix}-desc`} size="small" weight="plus">
          Opis (opcjonalnie)
        </Label>
        <Textarea id={`${prefix}-desc`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <PermissionMatrix resources={resources} permissions={permissions} onChange={setPermissions} idPrefix={prefix} />
      <div className="flex gap-2">
        <Button size="small" type="submit" isLoading={save.isPending} disabled={!permissions.length}>
          {role ? "Zapisz rolę" : "Utwórz rolę"}
        </Button>
        <Button size="small" variant="secondary" type="button" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

const StaffPage = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [editing, setEditing] = useState<string | null>(null)
  const staff = useQuery({ queryKey: ["patrix-staff"], queryFn: () => sdk.client.fetch<{ users: StaffUser[] }>("/admin/patrix/staff") })
  const roles = useQuery({
    queryKey: ["patrix-roles"],
    queryFn: () => sdk.client.fetch<{ roles: Role[]; resources: Record<string, string> }>("/admin/patrix/roles"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`/admin/patrix/roles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patrix-roles"] })
      toast.success("Usunięto rolę")
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (staff.error || roles.error) {
    return (
      <Container>
        <Text className="text-ui-fg-error">{((staff.error ?? roles.error) as Error).message}</Text>
        <Text size="small" className="text-ui-fg-subtle">
          Zarządzanie rolami jest dostępne dla właściciela sklepu.
        </Text>
      </Container>
    )
  }
  if (!staff.data || !roles.data) {
    return (
      <Container>
        <Text>Wczytywanie…</Text>
      </Container>
    )
  }
  const { resources } = roles.data
  const custom = roles.data.roles.filter((r) => !r.is_system)
  const system = roles.data.roles.filter((r) => r.is_system)

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex flex-col gap-y-3 px-6 py-4">
        <div>
          <Heading level="h1">Pracownicy i role</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Konto bez roli nie ma dostępu do panelu. Sklep zawsze ma co najmniej jednego właściciela. Nowych pracowników zapraszasz w Ustawienia → Użytkownicy.
          </Text>
        </div>
        <ul className="flex flex-col gap-y-2" aria-label="Pracownicy">
          {staff.data.users.map((u) => (
            <StaffRow key={u.id} user={u} roles={roles.data.roles} />
          ))}
        </ul>
      </Container>

      <Container className="flex flex-col gap-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading level="h2">Role własne</Heading>
          {editing !== "new" ? (
            <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
              Nowa rola
            </Button>
          ) : null}
        </div>
        {editing === "new" ? <RoleEditor resources={resources} onDone={() => setEditing(null)} /> : null}
        {custom.length === 0 && editing !== "new" ? (
          <Text size="small" className="text-ui-fg-subtle">
            Brak ról własnych. Role systemowe poniżej pokrywają typowe stanowiska.
          </Text>
        ) : null}
        <ul className="flex flex-col gap-y-2">
          {custom.map((r) =>
            editing === r.id ? (
              <li key={r.id}>
                <RoleEditor role={r} resources={resources} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-ui-border-base p-3">
                <div>
                  <Text weight="plus">{r.name}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {r.description || r.permissions.join(", ")}
                  </Text>
                </div>
                <div className="flex gap-2">
                  <Button size="small" variant="secondary" onClick={() => setEditing(r.id)}>
                    Edytuj
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    onClick={async () => {
                      if (await prompt({ title: "Usunąć rolę?", description: `Rola „${r.name}” zostanie usunięta.`, confirmText: "Usuń", cancelText: "Anuluj" })) {
                        remove.mutate(r.id)
                      }
                    }}
                  >
                    Usuń
                  </Button>
                </div>
              </li>
            )
          )}
        </ul>
      </Container>

      <Container className="flex flex-col gap-y-3 px-6 py-4">
        <Heading level="h2">Role systemowe</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Zdefiniowane w kodzie sklepu, nie można ich zmieniać. Potrzebujesz innego zakresu? Utwórz rolę własną.
        </Text>
        {system.map((r) => (
          <details key={r.id} className="rounded-md border border-ui-border-base p-3">
            <summary className="cursor-pointer">
              <Text as="span" weight="plus">
                {r.name}
              </Text>
              {r.description ? (
                <Text as="span" size="small" className="text-ui-fg-subtle">
                  {" "}
                  · {r.description}
                </Text>
              ) : null}
            </summary>
            <PermissionMatrix resources={resources} permissions={r.permissions} idPrefix={r.handle} />
          </details>
        ))}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({ label: "Pracownicy i role", icon: Users })

export default StaffPage
