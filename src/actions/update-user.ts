"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const UpdateUserSchema = z.object({
    id: z.string().min(1, "User ID is required"),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "STOCK_MANAGER"]),
    canEdit: z.boolean().optional(),
    canDelete: z.boolean().optional(),
})

export const updateUser = async (values: z.infer<typeof UpdateUserSchema>) => {
    const session = await auth()

    if (!session?.user?.id) {
        return { error: "Unauthorized" }
    }

    const validatedFields = UpdateUserSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields" }
    }

    const { id, role, canEdit, canDelete } = validatedFields.data

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

    // Only non-admins get granular permissions, admins have full by default
    const finalCanEdit = (role === "ADMIN" || role === "MANAGER") ? true : (canEdit ?? false)
    const finalCanDelete = (role === "ADMIN" || role === "MANAGER") ? true : (canDelete ?? false)

    try {
        await db.user.update({
            where: { id },
            data: {
                role,
                canEdit: finalCanEdit,
                canDelete: finalCanDelete,
            }
        })

        revalidatePath("/users")
        return { success: "User updated successfully" }
    } catch (error) {
        console.error("Failed to update user", error)
        return { error: "Failed to update user" }
    }
}
