import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
    try {
        const skipValue = NaN; // Simulate NaN
        const whereClause: any = { tenantId: "dummy" }

        await db.product.findMany({
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
            skip: skipValue,
            take: 20,
        })
        console.log("Success")
    } catch (e: any) {
        console.error("PRISMA ERROR IS:", e.message)
    } finally {
        await db.$disconnect()
    }
}

main()
