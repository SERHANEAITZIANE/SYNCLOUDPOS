import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { stdout } = await execAsync('reg query "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Windows" /v Device')
        const match = stdout.match(/Device\\s+REG_SZ\\s+([^,]+)/)
        const printerName = match ? match[1].trim() : "default"
        return NextResponse.json({ defaultPrinter: printerName })
    } catch (error) {
        console.error("Failed to get default printer:", error)
        return NextResponse.json({ error: "Failed to get default printer" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { printerName } = await req.json()
        if (!printerName || printerName === "default") {
            return NextResponse.json({ success: true, message: "No action for default printer" })
        }

        if (process.platform !== "win32") {
            return NextResponse.json({ success: true, message: "Not on Windows, skipped setting default" })
        }

        // Set default printer using COM object WScript.Network (this broadcasts WM_SETTINGCHANGE so Chrome detects it instantly)
        // We use -NoProfile to make PowerShell start much faster (takes ~300ms instead of 2000ms)
        const cmd = `powershell -NoProfile -Command "(New-Object -ComObject WScript.Network).SetDefaultPrinter('${printerName.replace(/'/g, "''")}')"`
        await execAsync(cmd)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to set default printer:", error)
        return NextResponse.json({ error: "Failed to set default printer" }, { status: 500 })
    }
}
