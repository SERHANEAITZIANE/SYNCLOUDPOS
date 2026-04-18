import { NextResponse } from "next/server";
import { exec } from "child_process";
import util from "util";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";

const execAsync = util.promisify(exec);

export const maxDuration = 300; // Allow up to 5 minutes for the backup process

export async function GET(req: Request) {
    // 1. Authenticate with CRON_SECRET
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // 2. Prepare directory
        const backupsDir = path.join(process.cwd(), "backups");
        if (!fsSync.existsSync(backupsDir)) {
            await fs.mkdir(backupsDir, { recursive: true });
        }

        // 3. Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `syncloudpos-backup-${timestamp}.sql.gz`;
        const filepath = path.join(backupsDir, filename);

        // 4. Execute pg_dump and compress via gzip
        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            throw new Error("DATABASE_URL is not set");
        }

        const command = `pg_dump "${dbUrl}" | gzip > "${filepath}"`;
        await execAsync(command);

        // 5. Cleanup old backups (keep last 7 days)
        const files = await fs.readdir(backupsDir);
        const now = Date.now();
        const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

        let deletedCount = 0;
        for (const file of files) {
            const fullPath = path.join(backupsDir, file);
            const stat = await fs.stat(fullPath);
            if (now - stat.mtimeMs > MAX_AGE_MS) {
                await fs.unlink(fullPath);
                deletedCount++;
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: "Backup created successfully", 
            file: filename,
            cleanup: `Deleted ${deletedCount} old backup(s)`
        });

    } catch (error: any) {
        console.error("Backup failed:", error);
        return NextResponse.json(
            { success: false, error: "Backup failed", details: error.message },
            { status: 500 }
        );
    }
}
