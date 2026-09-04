#!/usr/bin/env node
/**
 * Secret scanner for staged changes.
 *
 * Exists because the repository accumulated 80+ tracked files holding plaintext
 * VPS/SSH/Postgres passwords and two NEXTAUTH_SECRET literals
 * (PROJECT_AUDIT.md, finding C-1). Those files were untracked and .gitignore was
 * tightened, but neither stops someone re-adding a credential tomorrow. This
 * does.
 *
 * Wire it up as a pre-commit hook:
 *   git config core.hooksPath .githooks
 *
 * Run manually over staged content:
 *   node scripts/check-secrets.js
 *
 * Bypass for a deliberate false positive:
 *   SKIP_SECRET_SCAN=1 git commit ...
 */

const { execSync, execFileSync } = require("child_process")

if (process.env.SKIP_SECRET_SCAN === "1") {
    console.log("[check-secrets] skipped via SKIP_SECRET_SCAN=1")
    process.exit(0)
}

const PATTERNS = [
    { name: "NEXTAUTH_SECRET / AUTH_SECRET literal", re: /\b(NEXTAUTH_SECRET|AUTH_SECRET)\s*[:=]\s*["'][^"'$\s]{8,}["']/ },
    // Note: no \b before the keyword — "_" is a word character, so \b would
    // fail to match ssh_password / DB_PASSWORD, which is exactly the shape the
    // committed deploy scripts used.
    { name: "hardcoded password assignment", re: /[A-Za-z_]*(password|passwd|pwd)[A-Za-z_]*\s*[:=]\s*["'][^"'$\s]{4,}["']/i },
    { name: "private key block", re: /-----BEGIN (RSA|OPENSSH|EC|DSA|PGP)? ?PRIVATE KEY-----/ },
    { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
    { name: "Anthropic API key", re: /\bsk-ant-[0-9A-Za-z_-]{20,}/ },
    { name: "OpenAI API key", re: /\bsk-[A-Za-z0-9]{32,}\b/ },
    { name: "Slack token", re: /\bxox[abprs]-[0-9A-Za-z-]{10,}/ },
    { name: "postgres URL with inline password", re: /\bpostgres(ql)?:\/\/[^\s:@/]+:[^\s:@/]+@/ },
]

// Placeholders that are documentation, not secrets.
const PLACEHOLDER = /(your[_-]?|example|placeholder|changeme|xxx+|\*{3,}|<[^>]+>|\$\{|process\.env|REPLACE_ME|dummy|sample|test[_-]?secret)/i

function stagedFiles() {
    const out = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf8" })
    return out.split("\n").map(s => s.trim()).filter(Boolean)
}

const SKIP_EXT = /\.(png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tgz|lock|woff2?|ttf|eot|mp[34]|traineddata)$/i
const SKIP_PATH = /(^|\/)(package-lock\.json|node_modules\/)/

let findings = 0

for (const file of stagedFiles()) {
    if (SKIP_EXT.test(file) || SKIP_PATH.test(file)) continue

    let content
    try {
        content = execFileSync("git", ["show", `:${file}`], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 })
    } catch {
        continue // deleted, or not readable as text
    }
    if (content.indexOf(String.fromCharCode(0)) !== -1) continue // binary

    content.split("\n").forEach((line, i) => {
        if (PLACEHOLDER.test(line)) return
        for (const { name, re } of PATTERNS) {
            if (re.test(line)) {
                findings++
                const shown = line.trim().slice(0, 100)
                console.error(`\n  ${file}:${i + 1}`)
                console.error(`    ${name}`)
                console.error(`    ${shown}${line.trim().length > 100 ? "…" : ""}`)
                break
            }
        }
    })
}

if (findings > 0) {
    console.error(`\n[check-secrets] ${findings} possible secret(s) in staged changes — commit blocked.`)
    console.error("Move the value into an environment variable, or set SKIP_SECRET_SCAN=1 if this is a false positive.\n")
    process.exit(1)
}

console.log("[check-secrets] no secrets detected in staged changes")
