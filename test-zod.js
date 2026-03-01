const { PrismaClient } = require('@prisma/client')
const { z } = require('zod')

const ProductSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    images: z.object({ url: z.string() }).array(),
    price: z.coerce.number().min(1),
    tvaRate: z.coerce.number().min(0).max(100).default(19).optional(),
    categoryId: z.string().min(1, { message: "Category is required" }),
    brandId: z.string().min(1, { message: "Brand is required" }),
    colorId: z.string().optional(),
    sizeId: z.string().optional(),
    isFeatured: z.boolean().default(false).optional(),
    isArchived: z.boolean().default(false).optional(),
    wholesalePrice: z.coerce.number().optional(),
    dealerPrice: z.coerce.number().optional(),
    cost: z.coerce.number().optional(),
    stock: z.coerce.number().min(0).default(0),
    minStock: z.coerce.number().min(0).default(0),
    barcodes: z.array(z.object({ value: z.string(), label: z.string().optional() })).optional(),
    description: z.string().optional(),
})

const db = new PrismaClient()

async function main() {
    try {
        const initialData = await db.product.findFirst({
            include: { images: true, barcodes: true }
        })
        if (!initialData) return console.log("No product found")

        const formValues = {
            ...initialData,
            price: parseFloat(String(initialData.price)),
            cost: initialData.cost ? parseFloat(String(initialData.cost)) : 0,
            wholesalePrice: initialData.wholesalePrice ? parseFloat(String(initialData.wholesalePrice)) : 0,
            dealerPrice: initialData.dealerPrice ? parseFloat(String(initialData.dealerPrice)) : 0,
            stock: initialData.stock,
            minStock: initialData.minStock,
            tvaRate: initialData.tvaRate ?? 19,
            barcodes: initialData.barcodes?.map(b => ({ value: b.value, label: b.label || "" })) || [],
            description: initialData.description || "",
            categoryId: initialData.categoryId || "",
            brandId: initialData.brandId || "",
            isFeatured: initialData.isFeatured || false,
            isArchived: initialData.isArchived || false,
            images: initialData.images || []
        }

        const validated = ProductSchema.safeParse(formValues)
        if (!validated.success) {
            console.log("VALIDATION FAILED:", JSON.stringify(validated.error.format(), null, 2))
        } else {
            console.log("VALIDATION SUCCESS")
        }
    } catch (e) {
        console.error(e)
    } finally {
        await db.$disconnect()
    }
}
main()
