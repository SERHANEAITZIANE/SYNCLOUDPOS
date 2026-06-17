"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { BrandSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createBrand = async (values: z.infer<typeof BrandSchema>) => {
    const session = await auth()
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("brands:create"))) return { error: "Accès refusé" }

    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = BrandSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name, imageUrl, isArchived, commissionWholesale, commissionReseller, commissionRetail } = validatedFields.data

    try {
        const brand = await db.brand.create({
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

        revalidatePath("/[locale]/dashboard/brands", "page") // Verify path
        return { success: "Brand created!", data: brand }
    } catch (error) {
        console.error("Error creating brand:", error)
        return { error: "Something went wrong!" }
    }
}

export const getBrands = async (includeArchived: boolean = true) => {
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
        const brands = await db.brand.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            }
        })
        return brands
    } catch {
        return []
    }
}

export const deleteBrand = async (id: string) => {
    const session = await auth()
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("brands:delete"))) return { error: "Accès refusé" }
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    try {
        const res = await db.brand.updateMany({
            where: {
                id,
                tenantId // Ensure deletion is scoped to tenant
            },
            data: {
                isArchived: true
            }
        })
        if (res.count === 0) return { error: "Brand not found or unauthorized" }

        revalidatePath("/[locale]/dashboard/brands", "page")
        return { success: "Brand deleted!" }
    } catch {
        return { error: "Failed to delete brand!" }
    }
}

export const updateBrand = async (id: string, values: z.infer<typeof BrandSchema>) => {
    const session = await auth()

    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("brands:update"))) return { error: "Accès refusé" }
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = BrandSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name, imageUrl, isArchived, commissionWholesale, commissionReseller, commissionRetail } = validatedFields.data

    try {
        const res = await db.brand.updateMany({
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
        if (res.count === 0) return { error: "Brand not found or unauthorized" }

        revalidatePath("/[locale]/dashboard/brands", "page")
        return { success: "Brand updated!" }
    } catch {
        return { error: "Failed to update brand!" }
    }
}

export const importBrands = async (rows: { name: string }[]) => {
    const session = await auth()
    
    // RBAC Check
    const { hasPermission } = await import("@/lib/rbac")
    if (!(await hasPermission("brands:create"))) return { error: "Accès refusé" }
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    let created = 0
    let errors = 0
    for (const row of rows) {
        if (!row.name?.trim()) { errors++; continue }
        try {
            await db.brand.create({ data: { name: row.name.trim(), tenantId } })
            created++
        } catch { errors++ }
    }

    revalidatePath("/[locale]/dashboard/brands", "page")
    return { success: `${created} marque(s) importée(s)`, errors }
}
