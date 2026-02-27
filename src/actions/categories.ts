"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { CategorySchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createCategory = async (values: z.infer<typeof CategorySchema>) => {
    const session = await auth()

    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = CategorySchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name } = validatedFields.data

    try {
        const category = await db.category.create({
            data: {
                name,
                tenantId,
            }
        })

        revalidatePath("/[locale]/dashboard/categories", "page")
        return { success: "Category created!", data: category }
    } catch (error) {
        console.error("Error creating category:", error)
        return { error: "Something went wrong!" }
    }
}

export const getCategories = async () => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const categories = await db.category.findMany({
            where: {
                tenantId
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
        return categories
    } catch {
        return []
    }
}

export const deleteCategory = async (id: string) => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    try {
        await db.category.delete({
            where: {
                id,
                tenantId // Ensure deletion is scoped to tenant
            }
        })

        revalidatePath("/[locale]/dashboard/categories", "page")
        return { success: "Category deleted!" }
    } catch {
        return { error: "Failed to delete category!" }
    }
}

export const updateCategory = async (id: string, values: z.infer<typeof CategorySchema>) => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = CategorySchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name } = validatedFields.data

    try {
        await db.category.update({
            where: {
                id,
                tenantId
            },
            data: {
                name
            }
        })

        revalidatePath("/[locale]/dashboard/categories", "page")
        return { success: "Category updated!" }
    } catch {
        return { error: "Failed to update category!" }
    }
}
