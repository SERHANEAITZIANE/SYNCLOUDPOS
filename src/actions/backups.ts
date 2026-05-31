"use server"

import { auth } from "@/auth"
import fs from "fs"
import path from "path"

export interface BackupFile {
    name: string
    size: string
    date: Date
}

export async function getLocalBackups(): Promise<{ data?: BackupFile[], error?: string }> {
    const session = await auth()
    // Restrict this to SUPERADMIN or at least ADMIN
    if (!session?.user || ((session.user as any).role !== "SUPERADMIN" && (session.user as any).role !== "ADMIN")) {
        return { error: "Non autorisé." }
    }

    const backupDir = path.join(process.cwd(), "backups")

    // If dir doesn't exist, return empty array
    if (!fs.existsSync(backupDir)) {
        return { data: [] }
    }

    try {
        const files = fs.readdirSync(backupDir)
        const backups: BackupFile[] = []

        for (const file of files) {
            if (file.startsWith("db-backup-") && file.endsWith(".sql.gz")) {
                const filePath = path.join(backupDir, file)
                const stats = fs.statSync(filePath)

                // Convert bytes to MB
                const sizeMB = (stats.size / (1024 * 1024)).toFixed(2) + " MB"

                backups.push({
                    name: file,
                    size: sizeMB,
                    date: stats.mtime
                })
            }
        }

        // Sort by newest first
        backups.sort((a, b) => b.date.getTime() - a.date.getTime())

        return { data: backups }
    } catch (e) {
        console.error("Error reading backups:", e)
        return { error: "Impossible de lire le dossier de sauvegarde." }
    }
}

import { exec } from "child_process"
import { promisify } from "util"
const execAsync = promisify(exec)

export async function createLocalBackup(): Promise<{ success?: boolean, error?: string }> {
    const session = await auth()
    // Restrict this to SUPERADMIN or at least ADMIN
    if (!session?.user || ((session.user as any).role !== "SUPERADMIN" && (session.user as any).role !== "ADMIN")) {
        return { error: "Non autorisé." }
    }

    try {
        const backupScript = path.join(process.cwd(), "scripts", "backup.js")
        await execAsync(`node "${backupScript}"`)
        return { success: true }
    } catch (e: any) {
        console.error("Error creating backup:", e)
        return { error: e.message || "Erreur lors de la création de la sauvegarde." }
    }
}
