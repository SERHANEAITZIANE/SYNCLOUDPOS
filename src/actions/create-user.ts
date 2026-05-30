"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"

const CreateUserSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "STOCK_MANAGER"]),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
})

export const createUser = async (values: z.infer<typeof CreateUserSchema>) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("users"))) return { error: "Accès refusé" }

    const validatedFields = CreateUserSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { name, email, username, password, role, canEdit, canDelete } = validatedFields.data

    // Get current user's tenant
    const currentUser = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!currentUser?.tenantId) {
        return { error: "Current user has no tenant" }
    }

    // Check unique email
    const existingUser = await db.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        return { error: "Un utilisateur avec cet email existe déjà !" }
    }

    // Check unique username (case-insensitively)
    let lowerUsername = null;
    if (username && username.trim().length > 0) {
        lowerUsername = username.trim().toLowerCase();
        const existingUsername = await db.user.findFirst({
            where: { username: lowerUsername }
        });
        if (existingUsername) {
            return { error: "Ce nom d'utilisateur est déjà pris !" }
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Only non-admins get granular permissions, admins have full by default
    const finalCanEdit = (role === "ADMIN" || role === "MANAGER") ? true : (canEdit ?? false)
    const finalCanDelete = (role === "ADMIN" || role === "MANAGER") ? true : (canDelete ?? false)

    try {
        await db.user.create({
            data: {
                name,
                email,
                username: lowerUsername || null,
                password: hashedPassword,
                role,
                canEdit: finalCanEdit,
                canDelete: finalCanDelete,
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
