const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
async function main() {
    try {
        const p = await db.product.findFirst({ include: { images: true, barcodes: true } })
        if (!p) return console.log("No product found")
        await db.product.update({
            where: { id: p.id, tenantId: p.tenantId },
            data: {
                name: p.name + ' testing',
                images: {
                    deleteMany: {},
                    createMany: {
                        data: p.images.map(img => ({ url: img.url }))
                    }
                },
                barcodes: {
                    deleteMany: {},
                    createMany: {
                        data: p.barcodes.map(b => ({ value: b.value, label: b.label || null }))
                    }
                }
            }
        })
        console.log("Success update relation")
    } catch (e) {
        console.error("ERROR CAUGHT:")
        console.error(e)
    } finally {
        await db.$disconnect()
    }
}
main()
