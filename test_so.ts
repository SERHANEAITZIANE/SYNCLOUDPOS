import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
async function test() {
    const user = await db.user.findUnique({ where: { email: "salimzsec@gmail.com" }})
    if (!user) return;
    const so = await db.salesOrder.findMany({ where: { tenantId: user.tenantId }, select: { id: true, type: true, source: true, receiptNumber: true } })
    console.log("SalesOrder types:", new Set(so.map(s => s.type)))
    console.log("SalesOrder sources:", new Set(so.map(s => s.source)))
    console.log("Sample receiptNumbers:", so.slice(0, 5).map(s => s.receiptNumber))
}
test().finally(() => db.$disconnect())
