import { resolvePermission, getEffectiveCatalogPermissions, roleGrants, isValidPermission } from "../src/lib/permissions"

let pass = 0, fail = 0
function check(name: string, actual: any, expected: any) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) { pass++; console.log(`  PASS  ${name}`) }
  else { fail++; console.log(`  FAIL  ${name}\n        expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`) }
}

console.log("\n-- role baseline --")
check("CASHIER has pos:create", roleGrants("CASHIER", "pos:create"), true)
check("CASHIER lacks treasury:read", roleGrants("CASHIER", "treasury:read"), false)
check("MANAGER lacks products:delete (explicit carve-out)", roleGrants("MANAGER", "products:delete"), false)
check("MANAGER has products:update", roleGrants("MANAGER", "products:update"), true)
check("MANAGER wildcard pos:* -> pos:delete", roleGrants("MANAGER", "pos:delete"), true)

console.log("\n-- grant (extra) --")
check("grant treasury:read to CASHIER", resolvePermission("CASHIER", ["treasury:read"], [], "treasury:read"), true)
check("grant does not leak to sibling action", resolvePermission("CASHIER", ["treasury:read"], [], "treasury:delete"), false)

console.log("\n-- deny wins --")
check("deny pos:create from CASHIER", resolvePermission("CASHIER", [], ["pos:create"], "pos:create"), false)
check("deny beats explicit grant", resolvePermission("CASHIER", ["treasury:read"], ["treasury:read"], "treasury:read"), false)
check("deny cuts through role wildcard", resolvePermission("MANAGER", [], ["pos:delete"], "pos:delete"), false)
check("deny does not affect siblings", resolvePermission("MANAGER", [], ["pos:delete"], "pos:create"), true)

console.log("\n-- unknown role falls back to CASHIER --")
check("unknown role gets pos:create", resolvePermission("NOPE", [], [], "pos:create"), true)
check("unknown role lacks treasury:read", resolvePermission("NOPE", [], [], "treasury:read"), false)

console.log("\n-- catalog validation --")
check("valid perm accepted", isValidPermission("products:delete"), true)
check("bogus module rejected", isValidPermission("nuclear:launch"), false)
check("wildcard rejected (granular only)", isValidPermission("products:*"), false)
check("full wildcard rejected", isValidPermission("*:*"), false)

console.log("\n-- effective set --")
const eff = getEffectiveCatalogPermissions("CASHIER", ["treasury:read"], ["pos:create"])
check("effective includes granted", eff.includes("treasury:read"), true)
check("effective excludes denied", eff.includes("pos:create"), false)
check("effective keeps untouched role perm", eff.includes("pos:read"), true)

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
