"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import bcrypt from "bcryptjs"

const UpdateUserSchema = z.object({
    id: z.string().min(1, "User ID is required"),
    name: z.string().min(1, "Name is required").optional(),
    email: z.string().email("Invalid email").optional(),
    username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "STOCK_MANAGER"]),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
})

export const updateUser = async (values: z.infer<typeof UpdateUserSchema>) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("users"))) return { error: "Accès refusé" }

    const validatedFields = UpdateUserSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { id, name, email, username, password, role, canEdit, canDelete } = validatedFields.data

    const currentUser = await db.user.findUnique({
        where: { id: session.user.id }
    })

    if (!currentUser?.tenantId) {
        return { error: "Current user has no tenant" }
    }

    const userToUpdate = await db.user.findUnique({
        where: { id }
    })

    if (!userToUpdate || userToUpdate.tenantId !== currentUser.tenantId) {
        return { error: "User not found" }
    }

    // Check unique email if modified
    if (email && email !== userToUpdate.email) {
        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
            return { error: "Un utilisateur avec cet email existe déjà !" }
        }
    }

    // Check unique username if modified
    let lowerUsername = null
    if (username && username.trim().length > 0) {
        lowerUsername = username.trim().toLowerCase()
        if (lowerUsername !== userToUpdate.username) {
            const existingUsername = await db.user.findFirst({
                where: { username: lowerUsername }
            })
            if (existingUsername) {
                return { error: "Ce nom d'utilisateur est déjà pris !" }
            }
        }
    }

    // Only non-admins get granular permissions, admins have full by default
    const finalCanEdit = (role === "ADMIN" || role === "MANAGER") ? true : (canEdit ?? false)
    const finalCanDelete = (role === "ADMIN" || role === "MANAGER") ? true : (canDelete ?? false)

    const dataToUpdate: any = {
        role,
        canEdit: finalCanEdit,
        canDelete: finalCanDelete,
    }

    if (name) dataToUpdate.name = name
    if (email) dataToUpdate.email = email
    
    // Explicitly update username to lowerUsername or null if cleared
    dataToUpdate.username = lowerUsername || null

    if (password && password.trim().length >= 6) {
        dataToUpdate.password = await bcrypt.hash(password, 10)
    }

    try {
        await db.user.update({
            where: { id },
            data: dataToUpdate
        })

        revalidatePath("/users")
        return { success: "User updated successfully" }
    } catch (error) {
        console.error("Failed to update user", error)
        return { error: "Failed to update user" }
    }
}

const UpdateMyProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
})

export const updateMyProfile = async (values: z.infer<typeof UpdateMyProfileSchema>) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validatedFields = UpdateMyProfileSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { name, email, username, password } = validatedFields.data
    const id = session.user.id

    const userToUpdate = await db.user.findUnique({
        where: { id }
    })

    if (!userToUpdate) {
        return { error: "Utilisateur non trouvé" }
    }

    // Check unique email if modified
    if (email && email !== userToUpdate.email) {
        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
            return { error: "Un utilisateur avec cet email existe déjà !" }
        }
    }

    // Check unique username if modified
    let lowerUsername = null
    if (username && username.trim().length > 0) {
        lowerUsername = username.trim().toLowerCase()
        if (lowerUsername !== userToUpdate.username) {
            const existingUsername = await db.user.findFirst({
                where: { username: lowerUsername }
            })
            if (existingUsername) {
                return { error: "Ce nom d'utilisateur est déjà pris !" }
            }
        }
    }

    const dataToUpdate: any = {
        name,
        email,
        username: lowerUsername || null
    }

    if (password && password.trim().length >= 6) {
        dataToUpdate.password = await bcrypt.hash(password, 10)
    }

    try {
        await db.user.update({
            where: { id },
            data: dataToUpdate
        })

        revalidatePath("/users")
        return { success: "Votre profil a été mis à jour avec succès !" }
    } catch (error: any) {
        console.error("Failed to update profile", error)
        return { error: error.message || "Failed to update profile" }
    }
}
