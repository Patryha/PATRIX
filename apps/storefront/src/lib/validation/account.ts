import { z } from "zod"

const email = z.string().trim().toLowerCase().pipe(z.email("Podaj prawidłowy adres e-mail."))

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, "Podaj hasło.").max(128),
})

export const RegisterSchema = z.object({
  email,
  first_name: z.string().trim().min(1, "Podaj imię.").max(60),
  last_name: z.string().trim().min(1, "Podaj nazwisko.").max(80),
  password: z
    .string()
    .min(10, "Hasło musi mieć co najmniej 10 znaków.")
    .max(128, "Hasło jest za długie.")
    .regex(/[a-zA-Z]/, "Hasło musi zawierać literę.")
    .regex(/\d/, "Hasło musi zawierać cyfrę."),
  terms: z.literal("on", { error: "Zaakceptuj regulamin sklepu." }),
})

/** Bezpieczny adres powrotu po zalogowaniu: tylko ścieżki tego sklepu. */
export function safeRedirect(target: unknown, fallback = "/konto") {
  return typeof target === "string" && /^\/(?![/\\])/.test(target) ? target : fallback
}
