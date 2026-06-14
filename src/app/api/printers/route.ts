import { NextResponse } from "next/server"
import { getLocalPrinters } from "@/actions/settings"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const printers = await getLocalPrinters()
        return NextResponse.json(printers)
    } catch (error) {
        console.error("[API_PRINTERS_GET_ERROR]", error)
        return NextResponse.json([], { status: 500 })
    }
}
