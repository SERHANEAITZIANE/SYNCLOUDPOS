"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { ProductSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { checkSubscription } from "@/lib/subscription"

export const createProduct = async (values: z.infer<typeof ProductSchema>) => {
    const session = await auth()
    await checkSubscription();

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

        revalidatePath("/[locale]/(dashboard)/products", "page")
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

        const safeSearch = typeof search === 'string' ? search : (Array.isArray(search) ? search[0] : '')

        if (safeSearch) {
            whereClause.OR = [
                { name: { contains: safeSearch, mode: 'insensitive' } },
                { description: { contains: safeSearch, mode: 'insensitive' } },
                { barcodes: { some: { value: { contains: safeSearch, mode: 'insensitive' } } } }
            ]
        }

        const safePage = isNaN(page) ? 1 : page;
        const safePageSize = isNaN(pageSize) ? 20 : pageSize;

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
                skip: (safePage - 1) * safePageSize,
                take: safePageSize,
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
                storeProducts: {
                    some: {
                        stock: {
                            lte: db.storeProduct.fields.minStock
                        }
                    }
                }
            },
            include: {
                category: true,
                brand: true,
                images: true,
                barcodes: true,
                storeProducts: true
            } as any,
            orderBy: {
                createdAt: 'desc'
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
    await checkSubscription();
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

        revalidatePath("/[locale]/(dashboard)/products", "page")
        return { success: "Product deleted!" }
    } catch {
        return { error: "Failed to delete product!" }
    }
}

export const updateProduct = async (id: string, values: z.infer<typeof ProductSchema>) => {
    const session = await auth()
    await checkSubscription();
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return { error: "Unauthorized" }
    }

    const validatedFields = ProductSchema.safeParse(values)

    if (!validatedFields.success) {
        console.error("Validation failed in updateProduct:", validatedFields.error)
        return { error: `Invalid fields: ${validatedFields.error.message}` }
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
                            ...images.map((image: { url: string }) => ({ url: image.url }))
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

        revalidatePath("/[locale]/(dashboard)/products", "page")
        return { success: "Product updated!" }
    } catch (error) {
        console.error("PRISMA ERROR in updateProduct:", error)
        return { error: "Failed to update product!" }
    }
}

export const importProducts = async (rows: Record<string, string>[]) => {
    const session = await auth()
    await checkSubscription();
    const tenantId = session?.user?.tenantId
    if (!tenantId) return { error: "Unauthorized" }

    let created = 0
    let errors = 0

    try {
        // Pre-fetch all existing categories and brands to avoid N+1 lookups
        const [existingCategories, existingBrands] = await Promise.all([
            db.category.findMany({ where: { tenantId }, select: { id: true, name: true } }),
            db.brand.findMany({ where: { tenantId }, select: { id: true, name: true } })
        ])

        const categoryCache = new Map(existingCategories.map(c => [c.name.toLowerCase().trim(), c.id]))
        const brandCache = new Map(existingBrands.map(b => [b.name.toLowerCase().trim(), b.id]))

        // Collect unique category and brand names that need to be created
        const uniqueCategoryNames = new Set<string>()
        const uniqueBrandNames = new Set<string>()

        for (const row of rows) {
            const catName = (row["category"] || row["categorie"] || row["Catégorie"] || row["Categorie"] || "").trim()
            const brandName = (row["brand"] || row["marque"] || row["Marque"] || "").trim()
            if (catName && !categoryCache.has(catName.toLowerCase())) uniqueCategoryNames.add(catName)
            if (brandName && !brandCache.has(brandName.toLowerCase())) uniqueBrandNames.add(brandName)
        }

        // Batch-create missing categories and brands in parallel
        const [newCats, newBrands] = await Promise.all([
            Promise.all(Array.from(uniqueCategoryNames).map(name =>
                db.category.create({ data: { name, tenantId }, select: { id: true, name: true } })
            )),
            Promise.all(Array.from(uniqueBrandNames).map(name =>
                db.brand.create({ data: { name, tenantId }, select: { id: true, name: true } })
            ))
        ])

        newCats.forEach(c => categoryCache.set(c.name.toLowerCase().trim(), c.id))
        newBrands.forEach(b => brandCache.set(b.name.toLowerCase().trim(), b.id))

        // Helper to parse messy number strings like "17,000.00 DA" or "1 500"
        const parseNumeric = (val: string | undefined | null) => {
            if (!val) return 0
            let clean = String(val).replace(/[^0-9.,-]/g, "")
            if (clean.includes(",") && clean.includes(".")) {
                const lastComma = clean.lastIndexOf(",")
                const lastDot = clean.lastIndexOf(".")
                if (lastComma > lastDot) {
                    clean = clean.replace(/\./g, "").replace(",", ".")
                } else {
                    clean = clean.replace(/,/g, "")
                }
            } else if (clean.includes(",")) {
                clean = clean.replace(/,/g, ".")
            }
            const parsed = parseFloat(clean)
            return isNaN(parsed) ? 0 : parsed
        }

        // Helper to parse boolean values like "1", "vrai", "oui", "true", "yes"
        const parseBoolean = (val: string | undefined | null | boolean | number) => {
            if (val === true || val === 1) return true
            if (!val) return false
            const str = String(val).toLowerCase().trim()
            return ["1", "true", "yes", "oui", "vrai", "y", "o"].includes(str)
        }

        // Now batch create all products in parallel
        const createPromises = rows.map(async (row) => {
            const name = row["name"] || row["nom"] || row["Nom"] || row["Name"] || ""
            if (!name.trim()) { errors++; return }

            try {
                const price = parseNumeric(row["price"] || row["prix"] || row["Prix Vente"] || "0")
                const cost = parseNumeric(row["cost"] || row["cout"] || row["Prix Achat"]) || undefined
                const wholesalePrice = parseNumeric(row["wholesalePrice"] || row["Prix Gros"]) || undefined
                const stock = parseNumeric(row["stock"] || row["Stock"])
                const minStock = parseNumeric(row["minStock"] || row["Stock Min"])
                const description = row["description"] || row["Description"] || undefined
                const barcode = row["barcode"] || row["Barcode"] || row["Code-barres"] || undefined
                const categoryName = (row["category"] || row["categorie"] || row["Catégorie"] || row["Categorie"] || "").trim()
                const brandName = (row["brand"] || row["marque"] || row["Marque"] || "").trim()

                const categoryId = categoryName ? categoryCache.get(categoryName.toLowerCase()) : undefined
                const brandId = brandName ? brandCache.get(brandName.toLowerCase()) : undefined

                const isFeatured = parseBoolean(row["isFeatured"] || row["isfeatured"] || row["favoris"] || row["Favoris"])
                const isArchived = parseBoolean(row["isArchived"] || row["isarchived"] || row["archivé"] || row["Archive"] || row["Archiv\u00e9"])

                await db.product.create({
                    data: {
                        name: name.trim(),
                        price,
                        cost,
                        wholesalePrice,
                        description,
                        categoryId,
                        brandId,
                        isFeatured,
                        isArchived,
                        tenantId,
                        ...(barcode ? {
                            barcodes: { create: [{ value: barcode }] }
                        } : {})
                    } as any
                })
                created++
            } catch { errors++ }
        })

        // Run all creates concurrently (batched to avoid overloading connection pool)
        const batchSize = 20
        for (let i = 0; i < createPromises.length; i += batchSize) {
            await Promise.all(createPromises.slice(i, i + batchSize))
        }
    } catch (error) {
        console.error("importProducts error:", error)
        return { error: "Erreur lors de l'import" }
    }

    revalidatePath("/[locale]/(dashboard)/products", "page")
    return { success: `${created} produit(s) importé(s)`, errors }
}

export const getAllProductsForCatalogue = async () => {
    const session = await auth()
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const products = await db.product.findMany({
            where: {
                tenantId,
                isArchived: false,
                storeProducts: { some: { stock: { gt: 0 } } } // Only include available products
            },
            include: {
                category: true,
                images: true
            },
            orderBy: [
                { categoryId: 'asc' },
                { name: 'asc' }
            ]
        })

        return products.map(product => ({
            ...product,
            price: Number(product.price),
            cost: Number(product.cost),
            wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
            dealerPrice: product.dealerPrice ? Number(product.dealerPrice) : null,
            tvaRate: product.tvaRate ? Number(product.tvaRate) : null,
        }))
    } catch (error) {
        console.error("getAllProductsForCatalogue error:", error)
        return []
    }
}
