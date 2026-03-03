import fs from "fs"
import path from "path"
import { NextResponse } from "next/server"
import { auth } from "@/auth"

export async function GET(req: Request) {
    const session = await auth()
    // Restrict this to SUPERADMIN or at least ADMIN
    if (!session?.user || ((session.user as any).role !== "SUPERADMIN" && (session.user as any).role !== "ADMIN")) {
        return new NextResponse("Non autorisé.", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const filename = searchParams.get("file")

    if (!filename || !filename.startsWith("db-backup-") || !filename.endsWith(".sql.gz")) {
        return new NextResponse("Fichier invalide.", { status: 400 })
    }

    const filePath = path.join(process.cwd(), "backups", filename)

    if (!fs.existsSync(filePath)) {
        return new NextResponse("Fichier introuvable.", { status: 404 })
    }

    try {
        const fileStat = fs.statSync(filePath)
        const fileStream = fs.createReadStream(filePath) as any

        return new NextResponse(fileStream, {
            headers: {
                "Content-Type": "application/gzip",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": fileStat.size.toString()
            }
        })
    } catch (error) {
        console.error("Error downloading backup:", error)
        return new NextResponse("Erreur lors du téléchargement.", { status: 500 })
    }
}
