"use server"

import { db } from "@/lib/db"
import { auth } from "@/auth"
import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"

const PRIVATE_KEY_PATH = path.join(process.cwd(), "scripts", "license.private.pem")

export async function getLicenseRequests() {
    const session = await auth()
    if ((session?.user as any)?.role !== "SUPERADMIN") throw new Error("Unauthorized")

    return db.licenseRequest.findMany({
        orderBy: { createdAt: "desc" },
    })
}

export async function approveLicenseRequest(id: string, plan: string = "lifetime") {
    const session = await auth()
    if ((session?.user as any)?.role !== "SUPERADMIN") throw new Error("Unauthorized")

    const request = await db.licenseRequest.findUniqueOrThrow({ where: { id } })

    // Generate license key using private key
    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        throw new Error("Private key not found on server. Upload scripts/license.private.pem to the VPS.")
    }

    const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8")
    const expiry = plan === "lifetime" ? "lifetime" : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    const licenseData = `${request.machineId}|${expiry}|${plan}`
    const signature = crypto.sign(null, Buffer.from(licenseData), privateKey)
    const licenseKey = `${signature.toString("base64")}|${expiry}|${plan}`

    await db.licenseRequest.update({
        where: { id },
        data: { status: "APPROVED", licenseKey, plan, approvedAt: new Date() }
    })

    return { licenseKey, request }
}

export async function rejectLicenseRequest(id: string) {
    const session = await auth()
    if ((session?.user as any)?.role !== "SUPERADMIN") throw new Error("Unauthorized")
    return db.licenseRequest.update({ where: { id }, data: { status: "REJECTED" } })
}

export async function getLicenseStats() {
    const session = await auth()
    if ((session?.user as any)?.role !== "SUPERADMIN") throw new Error("Unauthorized")
    const [total, pending, approved] = await Promise.all([
        db.licenseRequest.count(),
        db.licenseRequest.count({ where: { status: "PENDING" } }),
        db.licenseRequest.count({ where: { status: "APPROVED" } }),
    ])
    return { total, pending, approved }
}
