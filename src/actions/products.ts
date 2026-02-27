"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { ProductSchema } from "@/schemas"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export const createProduct = async (values: z.infer<typeof ProductSchema>) => {
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
        cost
    } = validatedFields.data

    try {
        await db.product.create({
            data: {
                name,
                price,
                stock,
                minStock,
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

export const getProducts = async () => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
    const tenantId = session?.user?.tenantId

    if (!tenantId) {
        return []
    }

    try {
        const products = await db.product.findMany({
            where: {
                tenantId
            },
            include: {
                category: true,
                brand: true,
                images: true,
                barcodes: true,
                _count: {
                    select: { orderItems: true }
                }
            } as any,
            orderBy: {
                orderItems: {
                    _count: 'desc'
                }
            }
        })
        return products
    } catch {
        return []
    }
}

export const getLowStockProducts = async () => {
    const session = await auth()
    // @ts-expect-error tenantId is not in session type yet
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
        cost
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
