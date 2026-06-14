import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params
    const filePath = path.join(process.cwd(), "public", "uploads", filename)

    if (!fs.existsSync(filePath)) {
        return new NextResponse("File not found", { status: 404 })
    }

    try {
        const fileBuffer = fs.readFileSync(filePath)
        const ext = path.extname(filename).toLowerCase()
        
        let contentType = "image/jpeg"
        if (ext === ".png") contentType = "image/png"
        else if (ext === ".webp") contentType = "image/webp"
        else if (ext === ".gif") contentType = "image/gif"
        else if (ext === ".svg") contentType = "image/svg+xml"

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        })
    } catch (error) {
        console.error("Error serving upload file:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
