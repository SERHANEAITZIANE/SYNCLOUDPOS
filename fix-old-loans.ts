import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("Starting missing referenceId patch...")

    // 1. Backfill Customer Loans (MANUAL_OUT with missing referenceId)
    const customerTXs = await db.treasuryTransaction.findMany({
        where: {
            source: "MANUAL_OUT",
            referenceId: null
        }
    })

    console.log(`Found ${customerTXs.length} MANUAL_OUT transactions that may be customer loans without referenceId.`)

    for (const tx of customerTXs) {
        if (!tx.description) continue;

        // Find if this is a customer loan explicitly
        const match = tx.description.match(/Prêt accordé au client:\s*(.+)/);
        if (match && match[1]) {
            let customerName = match[1].trim();
            if (customerName === "Inconnu") continue;

            const customer = await db.customer.findFirst({
                where: { name: customerName, tenantId: tx.tenantId }
            })

            if (customer) {
                await db.treasuryTransaction.update({
                    where: { id: tx.id },
                    data: { referenceId: customer.id }
                })
                console.log(`[OK] Linked TX ${tx.id} -> Customer ${customer.name}`)
            } else {
                console.log(`[WARN] Could not find Customer with name ${customerName}`)
            }
        }
    }

    // 2. Backfill Supplier Loans (MANUAL_IN with missing referenceId)
    const supplierTXs = await db.treasuryTransaction.findMany({
        where: {
            source: "MANUAL_IN",
            referenceId: null
        }
    })

    console.log(`Found ${supplierTXs.length} MANUAL_IN transactions that may be supplier advances without referenceId.`)

    for (const tx of supplierTXs) {
        if (!tx.description) continue;

        // Find if this is a supplier advance explicitly
        const match = tx.description.match(/Avance reçue du fournisseur:\s*(.+)/);
        if (match && match[1]) {
            let supplierName = match[1].trim();
            if (supplierName === "Inconnu") continue;

            const supplier = await db.supplier.findFirst({
                where: { name: supplierName, tenantId: tx.tenantId }
            })

            if (supplier) {
                await db.treasuryTransaction.update({
                    where: { id: tx.id },
                    data: { referenceId: supplier.id }
                })
                console.log(`[OK] Linked TX ${tx.id} -> Supplier ${supplier.name}`)
            } else {
                console.log(`[WARN] Could not find Supplier with name ${supplierName}`)
            }
        }
    }

    console.log("Patch complete.")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await db.$disconnect()
    })
