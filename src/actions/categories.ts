"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { CategorySchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createCategory = async (values: z.infer<typeof CategorySchema>) => {
    const session = await auth()
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("categories"))) return { error: "Accès refusé" }

    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = CategorySchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name, imageUrl, isArchived, commissionWholesale, commissionReseller, commissionRetail } = validatedFields.data

    try {
        const category = await db.category.create({
            data: {
                name,
                imageUrl: imageUrl ?? null,
                isArchived: isArchived ?? false,
                commissionWholesale: commissionWholesale ?? 0,
                commissionReseller: commissionReseller ?? 0,
                commissionRetail: commissionRetail ?? 0,
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

export const getCategories = async (includeArchived: boolean = true) => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const where: any = { tenantId }
        if (!includeArchived) {
            where.isArchived = false
        }
        const categories = await db.category.findMany({
            where,
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
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("categories"))) return { error: "Accès refusé" }
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

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("categories"))) return { error: "Accès refusé" }
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = CategorySchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name, imageUrl, isArchived, commissionWholesale, commissionReseller, commissionRetail } = validatedFields.data

    try {
        await db.category.update({
            where: {
                id,
                tenantId
            },
            data: {
                name,
                imageUrl: imageUrl ?? null,
                isArchived: isArchived ?? false,
                commissionWholesale: commissionWholesale ?? 0,
                commissionReseller: commissionReseller ?? 0,
                commissionRetail: commissionRetail ?? 0,
            }
        })

        revalidatePath("/[locale]/dashboard/categories", "page")
        return { success: "Category updated!" }
    } catch {
        return { error: "Failed to update category!" }
    }
}

export const importCategories = async (rows: { name: string }[]) => {
    const session = await auth()
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("categories"))) return { error: "Accès refusé" }
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    let created = 0
    let errors = 0
    for (const row of rows) {
        if (!row.name?.trim()) { errors++; continue }
        try {
            await db.category.create({ data: { name: row.name.trim(), tenantId } })
            created++
        } catch { errors++ }
    }

    revalidatePath("/[locale]/dashboard/categories", "page")
    return { success: `${created} catégorie(s) importée(s)`, errors }
}
