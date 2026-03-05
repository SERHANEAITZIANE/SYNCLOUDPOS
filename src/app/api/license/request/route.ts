import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getMachineId } from "@/lib/license"

// Public endpoint — called from local installations to request a license
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { companyName, ownerName, phone, email, address, wilaya, machineId, plan = "lifetime" } = body

        // Validate required fields
        if (!companyName || !ownerName || !phone || !email || !machineId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Get client IP
        const ipAddress = req.headers.get("x-forwarded-for") ||
            req.headers.get("x-real-ip") || "unknown"

        // Check if there's already a pending/approved request for this machine
        const existing = await db.licenseRequest.findFirst({
            where: { machineId, status: { in: ["PENDING", "APPROVED"] } }
        })

        if (existing?.status === "APPROVED" && existing.licenseKey) {
            return NextResponse.json({
                success: true,
                alreadyApproved: true,
                message: "Your license has already been approved. Check your email or contact support."
            })
        }

        if (existing?.status === "PENDING") {
            return NextResponse.json({
                success: true,
                pending: true,
                message: "Your request is already pending. You will be contacted shortly."
            })
        }

        // Create the request
        const request = await db.licenseRequest.create({
            data: { companyName, ownerName, phone, email, address, wilaya, machineId, ipAddress: String(ipAddress), plan }
        })

        // Send WhatsApp notification to superadmin
        await notifySuperadmin({ companyName, ownerName, phone, email, machineId, plan, requestId: request.id })

        return NextResponse.json({
            success: true,
            requestId: request.id,
            message: "Activation request sent! You will be contacted via WhatsApp or email shortly."
        })
    } catch (error) {
        console.error("[LICENSE_REQUEST]", error)
        return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
    }
}

async function notifySuperadmin({ companyName, ownerName, phone, email, machineId, plan, requestId }: {
    companyName: string, ownerName: string, phone: string, email: string,
    machineId: string, plan: string, requestId: string
}) {
    const token = process.env.WHATSAPP_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_ID
    const adminPhone = process.env.SUPERADMIN_WHATSAPP // Your personal phone number

    if (!token || !phoneId || !adminPhone) return

    const message = `🔑 *New License Request*\n\n` +
        `🏢 *Company:* ${companyName}\n` +
        `👤 *Owner:* ${ownerName}\n` +
        `📱 *Phone:* ${phone}\n` +
        `📧 *Email:* ${email}\n` +
        `📦 *Plan:* ${plan}\n` +
        `🔒 *Machine ID:*\n${machineId}\n\n` +
        `👉 Approve: https://chirpedbeo.online/superadmin/licenses`

    try {
        await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                to: adminPhone,
                type: "text",
                text: { body: message }
            })
        })
    } catch { /* Non-critical */ }
}
