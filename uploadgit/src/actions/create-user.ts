"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"

const CreateUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER"]),
})

export const createUser = async (values: z.infer<typeof CreateUserSchema>) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validatedFields = CreateUserSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { name, email, password, role } = validatedFields.data

    // Get current user's tenant
    const currentUser = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!currentUser?.tenantId) {
        return { error: "Current user has no tenant" }
    }

    const existingUser = await db.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        return { error: "User with this email already exists" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                tenantId: currentUser.tenantId
            }
        })

        revalidatePath("/users")
        return { success: "User created" }
    } catch (error) {
        console.error("Failed to create user", error)
        return { error: "Failed to create user" }
    }
}
