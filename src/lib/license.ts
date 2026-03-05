/**
 * SYNCLOUDPOS License System
 * 
 * Architecture:
 * - Machine ID: SHA-256 hash of host hardware info (CPU, MAC, hostname)
 *   detected by install.bat/install.sh and passed via MACHINE_ID env var
 * - License Key: Ed25519 signature of "machineId|expiryDate|plan" 
 *   signed with your private key, verified here with the embedded public key
 * - Storage: license.key file mounted into Docker at /app/license.key
 * 
 * To issue a license: run  node scripts/generate-license.js
 */

import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"

// ── Embedded public key (Ed25519) ─────────────────────────────────────────────
// The matching private key is in scripts/license.private.pem (NEVER commit it)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEABvJ3hxY97aRKT36khEOFEthzlDMuutueWe/bIkj6OLrM=
-----END PUBLIC KEY-----`

// ── License file path ─────────────────────────────────────────────────────────
const LICENSE_FILE = process.env.LICENSE_FILE || path.join(process.cwd(), "license.key")

// ── Cloud mode: skip all license checks when running on the VPS ──────────────
const IS_CLOUD = process.env.SYNCLOUDPOS_MODE === "cloud"

export interface LicenseInfo {
    valid: boolean
    machineId?: string
    expiry?: string
    plan?: string
    daysLeft?: number
    error?: string
}

/**
 * Get the machine ID passed by the installer via env var.
 * On cloud/VPS mode, returns null (no license needed).
 */
export function getMachineId(): string | null {
    if (IS_CLOUD) return null
    return process.env.MACHINE_ID || null
}

/**
 * Read and verify the stored license key.
 * Returns full license info including validity, expiry, and plan.
 */
export function verifyLicense(): LicenseInfo {
    // Cloud/VPS mode — no license check
    if (IS_CLOUD) {
        return { valid: true, plan: "cloud" }
    }

    const machineId = getMachineId()
    if (!machineId) {
        return { valid: false, error: "MACHINE_ID not set. Run the installer." }
    }

    // Read license file
    if (!fs.existsSync(LICENSE_FILE)) {
        return { valid: false, error: "No license file found." }
    }

    let licenseContent: string
    try {
        licenseContent = fs.readFileSync(LICENSE_FILE, "utf-8").trim()
    } catch {
        return { valid: false, error: "Could not read license file." }
    }

    // Format: base64Signature|expiryDate|plan
    const parts = licenseContent.split("|")
    if (parts.length !== 3) {
        return { valid: false, error: "Invalid license format." }
    }

    const [signatureB64, expiryDate, plan] = parts
    const licenseData = `${machineId}|${expiryDate}|${plan}`

    // Verify Ed25519 signature
    try {
        const signature = Buffer.from(signatureB64, "base64")
        const isValid = crypto.verify(
            null,
            Buffer.from(licenseData),
            PUBLIC_KEY,
            signature
        )

        if (!isValid) {
            return { valid: false, error: "Invalid license key. Wrong machine or tampered key." }
        }

        // Check expiry
        const expiry = new Date(expiryDate)
        const now = new Date()
        const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (now > expiry) {
            return { valid: false, expiry: expiryDate, plan, daysLeft: 0, error: "License has expired." }
        }

        return {
            valid: true,
            machineId,
            expiry: expiryDate,
            plan,
            daysLeft,
        }
    } catch {
        return { valid: false, error: "License verification failed." }
    }
}

/**
 * Save a license key to the license file.
 */
export function saveLicense(licenseKey: string): { success: boolean; error?: string } {
    try {
        fs.writeFileSync(LICENSE_FILE, licenseKey.trim(), "utf-8")
        return { success: true }
    } catch {
        return { success: false, error: "Could not write license file. Check permissions." }
    }
}

// Cache the result for 5 minutes to avoid hitting disk on every request
let _cache: { info: LicenseInfo; at: number } | null = null

export function verifyLicenseCached(): LicenseInfo {
    const now = Date.now()
    if (_cache && now - _cache.at < 5 * 60 * 1000) return _cache.info
    const info = verifyLicense()
    _cache = { info, at: now }
    return info
}
