"use server"

import * as z from "zod"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { RegisterSchema } from "@/schemas"
import { getUserByEmail } from "@/data/user"

export const register = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { email, password, name, phone } = validatedFields.data
    const hashedPassword = await bcrypt.hash(password, 10)

    const existingUser = await getUserByEmail(email)

    if (existingUser) {
        return { error: "Email already in use!" }
    }

    try {
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7)

        const tenant = await db.tenant.create({
            data: {
                name: `${name}'s Shop`,
                phone: phone,
                subscriptionEndsAt: trialEndDate,
            }
        })

        await db.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                tenantId: tenant.id,
                role: "ADMIN"
            },
        })

        // Seed default accounts and customer
        await Promise.all([
            db.treasuryAccount.createMany({
                data: [
                    { name: "CAISSE PRINCIPALE", type: "CAISSE", tenantId: tenant.id },
                    { name: "CAISSE SECONDAIRE", type: "CAISSE", tenantId: tenant.id },
                    { name: "TPE", type: "BANK", tenantId: tenant.id }
                ]
            }),
            db.customer.create({
                data: {
                    name: "DIVERS",
                    clientType: "RETAIL",
                    tenantId: tenant.id
                }
            })
        ])

        return { success: "User created!" }
    } catch (error) {
        console.error("[REGISTER_ACTION_ERROR]", error)
        return { error: "Something went wrong during registration." }
    }
}
