// scripts/backup.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Ensure we can read .env

// Configuration
const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_URL = process.env.DATABASE_URL;
const RETENTION_DAYS = 7;

if (!DB_URL) {
    console.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
}

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate filename based on current date
const date = new Date();
const timestamp = date.toISOString().replace(/[:.]/g, '-');
const backupFilename = `db-backup-${timestamp}.sql.gz`;
const backupPath = path.join(BACKUP_DIR, backupFilename);

// Extract password from URL to pass to PGPASSWORD
let pgPassword = "";
try {
    const url = new URL(DB_URL);
    pgPassword = url.password;
} catch (e) {
    console.warn("Could not parse DB_URL to extract password. pg_dump might prompt for it.");
}

// Execute pg_dump
console.log(`Starting database backup to ${backupFilename}...`);
// Use the URL format directly, but provide PGPASSWORD in env just in case.
const dumpCommand = `pg_dump "${DB_URL}" | gzip > "${backupPath}"`;

exec(dumpCommand, { env: { ...process.env, PGPASSWORD: pgPassword } }, (error, stdout, stderr) => {
    if (error) {
        console.error(`Backup failed: ${error.message}`);
        process.exit(1);
    }

    console.log(`Backup completed successfully: ${backupPath}`);

    // Rotate old backups
    cleanOldBackups();
});

function cleanOldBackups() {
    console.log(`Checking for backups older than ${RETENTION_DAYS} days...`);
    const files = fs.readdirSync(BACKUP_DIR);

    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    let deletedCount = 0;

    files.forEach(file => {
        if (!file.startsWith('db-backup-') || !file.endsWith('.sql.gz')) return;

        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtimeMs > retentionMs) {
            fs.unlinkSync(filePath);
            console.log(`Deleted old backup: ${file}`);
            deletedCount++;
        }
    });

    console.log(`Backup cleanup finished. Deleted ${deletedCount} old files.`);
}
