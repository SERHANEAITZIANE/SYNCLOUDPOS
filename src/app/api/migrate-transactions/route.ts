import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')

    if (secret !== 'MIGRATE_2026') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        console.log("Starting transaction migration script...")

        const transactions = await db.treasuryTransaction.findMany({
            where: {
                OR: [
                    { source: "MANUAL_IN", referenceId: { not: null } },
                    { source: "MANUAL_OUT", referenceId: { not: null } }
                ]
            }
        })

        console.log(`Found ${transactions.length} potentially legacy transactions to inspect.`)

        let updatedCount = 0
        let logs: string[] = []

        for (const t of transactions) {
            if (!t.referenceId) continue;

            if (t.source === "MANUAL_IN") {
                const customer = await db.customer.findUnique({ where: { id: t.referenceId } })
                if (customer) {
                    await db.treasuryTransaction.update({
                        where: { id: t.id },
                        data: { source: "CUSTOMER_PAYMENT" as any }
                    })
                    logs.push(`[CUSTOMER_PAYMENT] Updated tx ${t.id} for customer ${customer.name}`)
                    updatedCount++
                } else {
                    const supplier = await db.supplier.findUnique({ where: { id: t.referenceId } })
                    if (supplier) {
                        await db.treasuryTransaction.update({
                            where: { id: t.id },
                            data: { source: "SUPPLIER_LOAN" as any }
                        })
                        logs.push(`[SUPPLIER_LOAN] Updated tx ${t.id} for supplier ${supplier.name}`)
                        updatedCount++
                    }
                }
            } else if (t.source === "MANUAL_OUT") {
                const customer = await db.customer.findUnique({ where: { id: t.referenceId } })
                if (customer) {
                    await db.treasuryTransaction.update({
                        where: { id: t.id },
                        data: { source: "CUSTOMER_LOAN" as any }
                    })
                    logs.push(`[CUSTOMER_LOAN] Updated tx ${t.id} for customer ${customer.name}`)
                    updatedCount++
                } else {
                    const supplier = await db.supplier.findUnique({ where: { id: t.referenceId } })
                    if (supplier) {
                        await db.treasuryTransaction.update({
                            where: { id: t.id },
                            data: { source: "SUPPLIER_PAYMENT" as any }
                        })
                        logs.push(`[SUPPLIER_PAYMENT] Updated tx ${t.id} for supplier ${supplier.name}`)
                        updatedCount++
                    }
                }
            }
        }

        return NextResponse.json({
            message: `Migration finished. Updated ${updatedCount} transactions.`,
            logs
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
