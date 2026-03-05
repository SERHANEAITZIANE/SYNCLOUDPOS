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
  expiryDate  - License expiry as YYYY-MM-DD (e.g. 2027-03-05)
  plan        - License plan: "starter" | "pro" | "enterprise" (default: pro)

Example:
  node scripts/generate-license.js a1b2c3d4e5f6abcdef 2027-03-05 pro
`)
    process.exit(1)
}

// Validate date
const expiry = new Date(expiryDate)
if (isNaN(expiry.getTime())) {
    console.error("ERROR: Invalid date format. Use YYYY-MM-DD")
    process.exit(1)
}

if (expiry < new Date()) {
    console.error("ERROR: Expiry date is in the past!")
    process.exit(1)
}

// Sign the license
const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, "utf-8")
const licenseData = `${machineId}|${expiryDate}|${plan}`
const signature = crypto.sign(null, Buffer.from(licenseData), privateKey)
const licenseKey = `${signature.toString("base64")}|${expiryDate}|${plan}`

const daysValid = Math.floor((expiry - new Date()) / (1000 * 60 * 60 * 24))

console.log("\n" + "=".repeat(70))
console.log("  SYNCLOUDPOS LICENSE KEY")
console.log("=".repeat(70))
console.log(`  Machine ID : ${machineId}`)
console.log(`  Plan       : ${plan}`)
console.log(`  Expires    : ${expiryDate} (${daysValid} days)`)
console.log("=".repeat(70))
console.log("\n  LICENSE KEY (send this to the customer):\n")
console.log("  " + licenseKey)
console.log("\n" + "=".repeat(70) + "\n")
