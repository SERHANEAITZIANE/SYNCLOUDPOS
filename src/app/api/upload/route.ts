import { NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import { auth } from "@/auth"

/**
 * Image upload endpoint.
 *
 * The middleware already 401s unauthenticated requests to non-public API paths,
 * but this handler re-checks the session itself rather than trusting that: the
 * PUBLIC_PATHS list is edited whenever a new namespace is added, and a route
 * that writes to disk should not depend on a list it does not own.
 *
 * Hardening (PROJECT_AUDIT.md, finding M-2):
 *  - only image MIME types are accepted;
 *  - the stored extension is derived from the *sniffed* MIME type, never from
 *    the client-supplied filename, so ".php"/".html" cannot be smuggled in;
 *  - uploads are capped in size;
 *  - files are written under a per-tenant directory, which namespaces them and
 *    prevents cross-tenant overwrites. Note this is not an access-control
 *    boundary: /uploads bypasses the middleware entirely (see middleware.ts),
 *    so anyone holding a URL can fetch it. Do not put sensitive documents here
 *    without adding an authenticated serving path.
 */

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // 5 MB

// MIME type -> canonical extension. This map is the allowlist: anything not a
// key here is rejected.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
}

/** Magic-byte signatures, so we do not trust the client-declared MIME either. */
function sniffImageType(buffer: Buffer): string | null {
    if (buffer.length < 12) return null

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg"

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return "image/png"
    }

    // GIF: "GIF87a" / "GIF89a"
    const gif = buffer.subarray(0, 6).toString("ascii")
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif"

    // RIFF....WEBP
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp"
    }

    // ISO-BMFF container with an AVIF brand
    if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
        const brand = buffer.subarray(8, 12).toString("ascii")
        if (brand === "avif" || brand === "avis") return "image/avif"
    }

    return null
}

export async function POST(req: Request) {
    try {
        const session = await auth()
        const tenantId = (session?.user as any)?.tenantId as string | undefined

        if (!session?.user?.id || !tenantId) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        if ((session.user as any).isBlocked) {
            return NextResponse.json({ error: "Compte bloqué" }, { status: 403 })
        }

        const formData = await req.formData()
        const file = (formData as any).get("file") as File | null

        if (!file || typeof file.arrayBuffer !== "function") {
            return NextResponse.json({ error: "Aucun fichier envoyé" }, { status: 400 })
        }

        // Reject on the declared size before buffering the whole body.
        if (typeof file.size === "number" && file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: `Fichier trop volumineux (max ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo)` },
                { status: 413 }
            )
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // ...and again on the actual bytes, in case the declared size lied.
        if (buffer.byteLength > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { error: `Fichier trop volumineux (max ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo)` },
                { status: 413 }
            )
        }

        if (buffer.byteLength === 0) {
            return NextResponse.json({ error: "Fichier vide" }, { status: 400 })
        }

        const sniffed = sniffImageType(buffer)
        if (!sniffed || !ALLOWED_IMAGE_TYPES[sniffed]) {
            return NextResponse.json(
                { error: "Type de fichier non autorisé. Images uniquement (JPEG, PNG, WebP, GIF, AVIF)." },
                { status: 415 }
            )
        }

        const extension = ALLOWED_IMAGE_TYPES[sniffed]

        // tenantId comes from the signed session, but keep the path build
        // defensive so a malformed claim can never escape the uploads root.
        const safeTenant = tenantId.replace(/[^a-zA-Z0-9_-]/g, "")
        if (!safeTenant) {
            return NextResponse.json({ error: "Locataire invalide" }, { status: 400 })
        }

        const uploadDir = path.join(process.cwd(), "public", "uploads", safeTenant)
        await mkdir(uploadDir, { recursive: true })

        const filename = `${uuidv4()}${extension}`
        await writeFile(path.join(uploadDir, filename), buffer)

        return NextResponse.json({ url: `/uploads/${safeTenant}/${filename}` })
    } catch (error) {
        console.error("[API_UPLOAD_POST_ERROR]", error)
        return NextResponse.json({ error: "Erreur interne" }, { status: 500 })
    }
}
