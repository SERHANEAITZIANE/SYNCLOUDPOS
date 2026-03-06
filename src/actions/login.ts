"use server"

import * as z from "zod"
import { signIn } from "@/auth"
import { LoginSchema } from "@/schemas"
import { AuthError } from "next-auth"

export const login = async (values: z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { identifier, password } = validatedFields.data

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
