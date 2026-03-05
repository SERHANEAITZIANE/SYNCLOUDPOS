import { NextRequest, NextResponse } from "next/server"
import { saveLicense, verifyLicense } from "@/lib/license"

export async function POST(req: NextRequest) {
    const { licenseKey } = await req.json()

    if (!licenseKey?.trim()) {
        return NextResponse.json({ error: "License key is required" }, { status: 400 })
    }

    // Save the key first
    const save = saveLicense(licenseKey.trim())
    if (!save.success) {
        return NextResponse.json({ error: save.error }, { status: 500 })
    }

    // Re-verify immediately after saving
    const result = verifyLicense()

    if (!result.valid) {
        return NextResponse.json({ error: result.error || "Invalid license key" }, { status: 400 })
    }

    return NextResponse.json({
        success: true,
        plan: result.plan,
        expiry: result.expiry,
        daysLeft: result.daysLeft,
    })
}
