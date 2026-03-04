"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { BrandSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createBrand = async (values: z.infer<typeof BrandSchema>) => {
    const session = await auth()

    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = BrandSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name } = validatedFields.data

    try {
        const brand = await db.brand.create({
            data: {
                name,
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

export const getBrands = async () => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const brands = await db.brand.findMany({
            where: {
                tenantId
            },
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
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    try {
        await db.brand.delete({
            where: {
                id,
                tenantId // Ensure deletion is scoped to tenant
            }
        })

        revalidatePath("/[locale]/dashboard/brands", "page")
        return { success: "Brand deleted!" }
    } catch {
        return { error: "Failed to delete brand!" }
    }
}

export const updateBrand = async (id: string, values: z.infer<typeof BrandSchema>) => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = BrandSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { name } = validatedFields.data

    try {
        await db.brand.update({
            where: {
                id,
                tenantId
            },
            data: {
                name
            }
        })

        revalidatePath("/[locale]/dashboard/brands", "page")
        return { success: "Brand updated!" }
    } catch {
        return { error: "Failed to update brand!" }
    }
}

export const importBrands = async (rows: { name: string }[]) => {
    const session = await auth()
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
