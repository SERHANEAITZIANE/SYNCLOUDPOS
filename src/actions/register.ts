"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getUserByEmail } from "@/data/user"
import { createValidatedAction } from "@/lib/server-action-validation"
import { registerValidationSchema } from "@/validation/register"
import { RegisterInput } from "@/types/register"
import { sanitizeEmail, sanitizeString, sanitizePhone } from "@/lib/sanitizer"

async function registerCore(values: RegisterInput) {
    const { email, password, name, phone } = values

    // Sanitize inputs to prevent injection attacks
    const emailToUse = sanitizeEmail(email)
    const nameToUse = sanitizeString(name)
    const phoneToUse = phone ? sanitizePhone(phone) : undefined

    const hashedPassword = await bcrypt.hash(password, 10)

    const existingUser = await getUserByEmail(email)

    if (existingUser) {
        return { error: "Email already in use!" }
    }

    try {
        const trialEndDate = new Date()
        trialEndDate.setDate(trialEndDate.getDate() + 7)

        // Use sanitized inputs in database operations
        const sanitizedEmail = sanitizeEmail(email)
        const sanitizedName = sanitizeString(name)
        const sanitizedPhone = phone ? sanitizePhone(phone) : undefined

        const tenant = await db.tenant.create({
            data: {
                name: `${sanitizedName}'s Shop`,
                phone: sanitizedPhone,
                subscriptionEndsAt: trialEndDate,
            }
        })

        // Create default store for the new tenant
        const defaultStore = await db.store.create({
            data: {
                name: "Boutique Principale",
                tenantId: tenant.id,
            }
        })

        await db.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                tenantId: tenant.id,
                role: "ADMIN",
                defaultStoreId: defaultStore.id,
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
    } catch (error: any) {
        console.error("[REGISTER_ACTION_ERROR]", error)
        return { error: `Erreur: ${error?.message || "Something went wrong"}` }
    }
}

// Export the validated version of the register action
export const register = createValidatedAction(
    registerValidationSchema,
    registerCore,
    'register'
)
