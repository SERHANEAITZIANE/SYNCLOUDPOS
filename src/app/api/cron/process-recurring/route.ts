import { processDueRecurringInvoices } from "@/actions/recurring-invoices"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization")
        const cronSecret = process.env.CRON_SECRET

        if (!cronSecret) {
            console.error("CRON_SECRET is not configured")
            return new NextResponse("Service unavailable", { status: 503 })
        }
        if (authHeader !== "Bearer " + cronSecret) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const result = await processDueRecurringInvoices()
        return NextResponse.json({
            success: true,
            message: "Processed " + result.processed + " recurring invoices.",
            timestamp: new Date().toISOString()
        })
    } catch (error) {
        console.error("Cron Error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
