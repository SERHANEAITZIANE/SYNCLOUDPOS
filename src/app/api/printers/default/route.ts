import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        if (process.platform !== "win32") {
            return NextResponse.json({ defaultPrinter: "default" })
        }
        const { stdout } = await execAsync("powershell -Command \"Get-CimInstance Win32_Printer -Filter 'Default=True' | Select-Object -ExpandProperty Name\"")
        return NextResponse.json({ defaultPrinter: stdout.trim() })
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

        // Set default printer using COM object WScript.Network (very fast and compatible)
        const cmd = `powershell -Command "(New-Object -ComObject WScript.Network).SetDefaultPrinter('${printerName.replace(/'/g, "''")}')"`
        await execAsync(cmd)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to set default printer:", error)
        return NextResponse.json({ error: "Failed to set default printer" }, { status: 500 })
    }
}
