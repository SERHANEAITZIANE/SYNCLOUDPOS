"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { ProductSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createProduct = async (values: z.infer<typeof ProductSchema>) => {
    const session = await auth()

    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = ProductSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const {
        name,
        price,
        categoryId,
        brandId,
        images,
        isFeatured,
        isArchived,
        stock,
        minStock,
        barcodes,
        description,
        wholesalePrice,
        dealerPrice,
        cost,
        tvaRate
    } = validatedFields.data

    try {
        await db.product.create({
            data: {
                name,
                price,
                stock,
                minStock,
                tvaRate,
                description,
                cost: cost ?? undefined,
                wholesalePrice: wholesalePrice ?? undefined,
                dealerPrice: dealerPrice ?? undefined,
                isFeatured: isFeatured || false,
                isArchived: isArchived || false,
                categoryId,
                brandId,
                tenantId,
                images: {
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image)
                        ]
                    }
                },
                barcodes: barcodes && barcodes.length > 0 ? {
                    createMany: {
                        data: barcodes.map((b: { value: string; label?: string }) => ({
                            value: b.value,
                            label: b.label || null
                        }))
                    }
                } : undefined
            } as any
        })

        revalidatePath("/[locale]/dashboard/products", "page")
        return { success: "Product created!" }
    } catch (error) {
        console.error("Error creating product:", error)
        return { error: "Something went wrong!" }
    }
}

export const getProducts = async (page: number = 1, pageSize: number = 20, search?: string) => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { items: [], totalCount: 0 }
    }

    try {
        const whereClause: any = { tenantId }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { barcodes: { some: { value: { contains: search, mode: 'insensitive' } } } }
            ]
        }

        const [products, totalCount] = await Promise.all([
            db.product.findMany({
                where: whereClause,
                include: {
                    category: true,
                    brand: true,
                    images: true,
                    barcodes: true,
                },
                orderBy: {
                    createdAt: 'desc'
                },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.product.count({ where: whereClause })
        ]);

        return { items: products, totalCount }
    } catch (error) {
        console.error("getProducts error:", error)
        return { items: [], totalCount: 0 }
    }
}

export const getLowStockProducts = async () => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const products = await db.product.findMany({
            where: {
                tenantId,
                stock: {
                    lte: db.product.fields.minStock
                }
            },
            include: {
                category: true,
                brand: true,
                images: true,
                barcodes: true
            } as any,
            orderBy: {
                stock: 'asc'
            }
        })
        return products
    } catch {
        return []
    }
}

export const getProduct = async (productId: string) => {
    try {
        const product = await db.product.findUnique({
            where: {
                id: productId
            },
            include: {
                images: true,
                category: true,
                brand: true,
                barcodes: true
            } as any
        })
        return product
    } catch {
        return null
    }
}

export const deleteProduct = async (id: string) => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    try {
        await db.product.delete({
            where: {
                id,
                tenantId // Ensure deletion is scoped to tenant
            }
        })

        revalidatePath("/[locale]/dashboard/products", "page")
        return { success: "Product deleted!" }
    } catch {
        return { error: "Failed to delete product!" }
    }
}

export const updateProduct = async (id: string, values: z.infer<typeof ProductSchema>) => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = ProductSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const {
        name,
        price,
        categoryId,
        brandId,
        images,
        isFeatured,
        isArchived,
        stock,
        minStock,
        barcodes,
        description,
        wholesalePrice,
        dealerPrice,
        cost,
        tvaRate
    } = validatedFields.data

    try {
        await db.product.update({
            where: {
                id,
                tenantId
            },
            data: {
                name,
                price,
                tvaRate,
                categoryId,
                brandId,
                stock,
                minStock,
                description,
                cost: cost ?? undefined,
                wholesalePrice: wholesalePrice ?? undefined,
                dealerPrice: dealerPrice ?? undefined,
                isFeatured,
                isArchived,
                images: {
                    deleteMany: {},
                    createMany: {
                        data: [
                            ...images.map((image: { url: string }) => image)
                        ]
                    }
                },
                barcodes: {
                    deleteMany: {},
                    ...(barcodes && barcodes.length > 0 ? {
                        createMany: {
                            data: barcodes.map((b: { value: string; label?: string }) => ({
                                value: b.value,
                                label: b.label || null
                            }))
                        }
                    } : {})
                }
            } as any
        })

        revalidatePath("/[locale]/dashboard/products", "page")
        return { success: "Product updated!" }
    } catch (error) {
        console.error(error)
        return { error: "Failed to update product!" }
    }
}

export const importProducts = async (rows: Record<string, string>[]) => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    let created = 0
    let errors = 0

    for (const row of rows) {
        const name = row["name"] || row["nom"] || row["Nom"] || row["Name"] || ""
        if (!name.trim()) { errors++; continue }

        try {
            const price = parseFloat(row["price"] || row["prix"] || row["Prix Vente"] || "0") || 0
            const cost = parseFloat(row["cost"] || row["cout"] || row["Prix Achat"] || "0") || undefined
            const wholesalePrice = parseFloat(row["wholesalePrice"] || row["Prix Gros"] || "0") || undefined
            const stock = parseInt(row["stock"] || row["Stock"] || "0") || 0
            const minStock = parseInt(row["minStock"] || row["Stock Min"] || "0") || 0
            const description = row["description"] || row["Description"] || undefined
            const barcode = row["barcode"] || row["Barcode"] || row["Code-barres"] || undefined
            const categoryName = row["category"] || row["categorie"] || row["Catégorie"] || row["Categorie"] || ""
            const brandName = row["brand"] || row["marque"] || row["Marque"] || ""

            // Resolve or create category
            let categoryId: string | undefined
            if (categoryName.trim()) {
                let cat = await db.category.findFirst({ where: { name: { equals: categoryName.trim() }, tenantId } })
                if (!cat) cat = await db.category.create({ data: { name: categoryName.trim(), tenantId } })
                categoryId = cat.id
            }

            // Resolve or create brand
            let brandId: string | undefined
            if (brandName.trim()) {
                let br = await db.brand.findFirst({ where: { name: { equals: brandName.trim() }, tenantId } })
                if (!br) br = await db.brand.create({ data: { name: brandName.trim(), tenantId } })
                brandId = br.id
            }

            await db.product.create({
                data: {
                    name: name.trim(),
                    price,
                    cost,
                    wholesalePrice,
                    stock,
                    minStock,
                    description,
                    categoryId,
                    brandId,
                    tenantId,
                    ...(barcode ? {
                        barcodes: { create: [{ value: barcode }] }
                    } : {})
                } as any
            })
            created++
        } catch { errors++ }
    }

    revalidatePath("/[locale]/dashboard/products", "page")
    return { success: `${created} produit(s) importé(s)`, errors }
}
