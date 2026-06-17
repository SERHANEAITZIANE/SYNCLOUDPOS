import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Starting transaction migration script...")

  const transactions = await prisma.treasuryTransaction.findMany({
    where: {
      OR: [
        { source: "MANUAL_IN", referenceId: { not: null } },
        { source: "MANUAL_OUT", referenceId: { not: null } }
      ]
    }
  })

  console.log(`Found ${transactions.length} potentially legacy transactions to inspect.`)

  let updatedCount = 0

  for (const t of transactions) {
    if (!t.referenceId) continue;

    if (t.source === "MANUAL_IN") {
      // Could be CUSTOMER_PAYMENT or SUPPLIER_LOAN
      const customer = await prisma.customer.findUnique({ where: { id: t.referenceId } })
      if (customer) {
        await prisma.treasuryTransaction.update({
          where: { id: t.id },
          data: { source: "CUSTOMER_PAYMENT" }
        })
        console.log(`[CUSTOMER_PAYMENT] Updated tx ${t.id} for customer ${customer.name}`)
        updatedCount++
      } else {
        const supplier = await prisma.supplier.findUnique({ where: { id: t.referenceId } })
        if (supplier) {
          await prisma.treasuryTransaction.update({
            where: { id: t.id },
            data: { source: "SUPPLIER_LOAN" }
          })
          console.log(`[SUPPLIER_LOAN] Updated tx ${t.id} for supplier ${supplier.name}`)
          updatedCount++
        }
      }
    } else if (t.source === "MANUAL_OUT") {
      // Could be SUPPLIER_PAYMENT or CUSTOMER_LOAN
      const customer = await prisma.customer.findUnique({ where: { id: t.referenceId } })
      if (customer) {
        await prisma.treasuryTransaction.update({
          where: { id: t.id },
          data: { source: "CUSTOMER_LOAN" }
        })
        console.log(`[CUSTOMER_LOAN] Updated tx ${t.id} for customer ${customer.name}`)
        updatedCount++
      } else {
        const supplier = await prisma.supplier.findUnique({ where: { id: t.referenceId } })
        if (supplier) {
          await prisma.treasuryTransaction.update({
            where: { id: t.id },
            data: { source: "SUPPLIER_PAYMENT" }
          })
          console.log(`[SUPPLIER_PAYMENT] Updated tx ${t.id} for supplier ${supplier.name}`)
          updatedCount++
        }
      }
    }
  }

  console.log(`Migration finished. Updated ${updatedCount} transactions.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
