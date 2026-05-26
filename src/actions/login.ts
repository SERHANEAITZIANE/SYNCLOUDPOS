"use server"

import * as z from "zod"
import { signIn } from "@/auth"
import { LoginSchema } from "@/schemas"
import { AuthError } from "next-auth"
import { sanitizeString, sanitizeEmail } from "@/lib/sanitizer"
import { rateLimit } from "@/lib/redis"

export const login = async (values: z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { identifier, password } = validatedFields.data

    // Apply Rate Limiting (max 5 attempts per minute per identifier)
    const { success } = await rateLimit(`login:${identifier}`, 5, 60 * 1000)
    
    if (!success) {
        return { error: "Trop de tentatives. Veuillez réessayer dans une minute." }
    }

    // Sanitize inputs to prevent injection attacks
    const sanitizedIdentifier = identifier.includes('@')
      ? sanitizeEmail(identifier)
      : sanitizeString(identifier)

    try {
        await signIn("credentials", {
            identifier,
            password,
            redirectTo: "/hub",
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Identifiants invalides !" }
                default:
                    return { error: "Une erreur est survenue !" }
            }
        }

        throw error
    }
}
