import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

/**
 * Serves files written by /api/upload.
 *
 * Catch-all rather than a single `[filename]` segment, because uploads are now
 * stored under a per-tenant directory (`/uploads/<tenantId>/<uuid>.<ext>`).
 * Legacy flat paths (`/uploads/<uuid>.<ext>`) still resolve through the same
 * handler.
 *
 * Two things this must get right:
 *
 *  1. **Path traversal.** The segments are URL-decoded before they reach here,
 *     so a request for `/uploads/..%2f..%2f.env` would otherwise be joined
 *     straight into a filesystem path and read arbitrary server files. The
 *     resolved path is therefore checked to be inside the uploads root.
 *
 *  2. **SVG.** An SVG served as image/svg+xml from the app's own origin can
 *     execute script, which is stored XSS. /api/upload no longer accepts SVG,
 *     but legacy files may exist, so it is served as a non-renderable type and
 *     every response gets nosniff plus a locked-down CSP.
 */

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads")

const CONTENT_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ filePath: string[] }> }
) {
    const { filePath } = await params

    if (!filePath?.length) {
        return new NextResponse("File not found", { status: 404 })
    }

    // Reject traversal and absolute-path segments up front.
    if (filePath.some(seg => !seg || seg === "." || seg === ".." || seg.includes("\0"))) {
        return new NextResponse("File not found", { status: 404 })
    }

    const requested = path.resolve(UPLOADS_ROOT, ...filePath)

    // Belt and braces: even if a segment slipped through, the resolved path must
    // still sit inside the uploads root.
    const rootWithSep = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep
    if (!requested.startsWith(rootWithSep)) {
        return new NextResponse("File not found", { status: 404 })
    }

    let stat: fs.Stats
    try {
        stat = fs.statSync(requested)
    } catch {
        return new NextResponse("File not found", { status: 404 })
    }
    if (!stat.isFile()) {
        return new NextResponse("File not found", { status: 404 })
    }

    try {
        const fileBuffer = fs.readFileSync(requested)
        const ext = path.extname(requested).toLowerCase()

        // Unknown/legacy types (including .svg) are sent as a download rather
        // than rendered inline.
        const contentType = CONTENT_TYPES[ext] || "application/octet-stream"

        return new NextResponse(fileBuffer as any, {
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=31536000, immutable",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "default-src 'none'; sandbox",
            },
        })
    } catch (error) {
        console.error("[UPLOADS_GET_ERROR]", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
