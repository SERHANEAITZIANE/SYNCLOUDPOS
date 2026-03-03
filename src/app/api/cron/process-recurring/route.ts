import { processDueRecurringInvoices } from "@/actions/recurring-invoices"
import { NextResponse } from "next/server"

// This endpoint should be called daily by a cron service like Vercel Cron, GitHub Actions, or PM2 cron
// In production, secure this with an Authorization header check against a secret
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization")
        const cronSecret = process.env.CRON_SECRET

        // If a secret is defined, verify it
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const result = await processDueRecurringInvoices()

        return NextResponse.json({
            success: true,
            message: `Processed ${result.processed} recurring invoices.`,
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error("Cron Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
