/**
 * SYNCLOUDPOS License Generator
 * 
 * Run this to generate a license key for a customer:
 *   node scripts/generate-license.js <machineId> <expiryDate> <plan>
 * 
 * Example:
 *   node scripts/generate-license.js "a1b2c3d4e5f6..." "2027-03-05" "pro"
 * 
 * The output is the license key to give the customer.
 * They paste it into the activation screen.
 * 
 * KEEP scripts/license.private.pem SECRET — NEVER SHARE IT.
 */

const crypto = require("crypto")
const fs = require("fs")
const path = require("path")

const PRIVATE_KEY_PATH = path.join(__dirname, "license.private.pem")

if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error("ERROR: Private key not found at", PRIVATE_KEY_PATH)
    process.exit(1)
}

const [, , machineId, expiryDate, plan = "pro"] = process.argv

if (!machineId || !expiryDate) {
    console.log(`
Usage: node scripts/generate-license.js <machineId> <expiryDate> [plan]

  machineId   - The machine ID shown on the customer's activation screen
  expiryDate  - "lifetime" for no expiry, or a date like 2027-03-05
  plan        - "starter" | "pro" | "enterprise" | "lifetime" (default: pro)

Examples:
  node scripts/generate-license.js a1b2c3d4 lifetime lifetime
  node scripts/generate-license.js a1b2c3d4 2027-03-05 pro
`)
    process.exit(1)
}

// Handle lifetime plan
const isLifetime = expiryDate === 'lifetime' || plan === 'lifetime'
const finalPlan = isLifetime ? 'lifetime' : plan
const finalExpiry = isLifetime ? 'lifetime' : expiryDate

if (!isLifetime) {
    // Validate date only for time-limited plans
    const expiry = new Date(expiryDate)
    if (isNaN(expiry.getTime())) {
        console.error("ERROR: Invalid date. Use YYYY-MM-DD or 'lifetime'")
        process.exit(1)
    }
    if (expiry < new Date()) {
        console.error("ERROR: Expiry date is in the past!")
        process.exit(1)
    }
}

// Sign the license
const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8')
const licenseData = `${machineId}|${finalExpiry}|${finalPlan}`
const signature = crypto.sign(null, Buffer.from(licenseData), privateKey)
const licenseKey = `${signature.toString('base64')}|${finalExpiry}|${finalPlan}`

const daysInfo = isLifetime ? 'LIFETIME (never expires)' : `${Math.floor((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24))} days`

console.log("\n" + "=".repeat(70))
console.log("  SYNCLOUDPOS LICENSE KEY")
console.log("=".repeat(70))
console.log(`  Machine ID : ${machineId}`)
console.log(`  Plan       : ${finalPlan}`)
console.log(`  Expires    : ${isLifetime ? 'NEVER (Lifetime)' : finalExpiry + ' (' + daysInfo + ')'}`)
console.log("=".repeat(70))
console.log("\n  LICENSE KEY (send this to the customer):\n")
console.log("  " + licenseKey)
console.log("\n" + "=".repeat(70) + "\n")
