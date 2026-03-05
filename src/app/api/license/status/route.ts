import { NextResponse } from "next/server"
import { getMachineId, verifyLicenseCached } from "@/lib/license"

export async function GET() {
    const machineId = getMachineId()
    const license = verifyLicenseCached()

    return NextResponse.json({
        machineId: machineId || "NOT_DETECTED",
        license,
    })
}
