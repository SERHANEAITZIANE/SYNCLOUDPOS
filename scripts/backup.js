// scripts/backup.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
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
    // ignore
}

console.log(`Starting database backup to ${backupFilename}...`);

// Hybrid Backup Execution
async function runBackup() {
    try {
        console.log('Attempting standard pg_dump backup...');
        await runPgDump(DB_URL, pgPassword, backupPath);
        console.log(`pg_dump backup completed successfully: ${backupPath}`);
    } catch (err) {
        console.warn(`pg_dump method failed or is not available: ${err.message}`);
        console.log('Falling back to custom Node + Prisma database exporter...');
        
        try {
            // Clean up partial file if created
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
            }
            
            await runCustomBackup(DB_URL, backupPath);
            console.log(`Custom fallback backup completed successfully: ${backupPath}`);
        } catch (fallbackErr) {
            console.error(`Backup fully failed: ${fallbackErr.message}`);
            process.exit(1);
        }
    }

    // Rotate old backups
    cleanOldBackups();
}

function runPgDump(dbUrl, password, outputPath) {
    return new Promise((resolve, reject) => {
        const gzip = zlib.createGzip();
        const writeStream = fs.createWriteStream(outputPath);
        
        gzip.pipe(writeStream);

        const pgDump = spawn('pg_dump', [dbUrl], {
            env: { ...process.env, PGPASSWORD: password }
        });

        pgDump.stdout.pipe(gzip);

        let stderrData = "";
        pgDump.stderr.on('data', (data) => {
            stderrData += data.toString();
        });

        pgDump.on('error', (err) => {
            reject(err);
        });

        pgDump.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`pg_dump exited with code ${code}: ${stderrData}`));
            } else {
                resolve();
            }
        });

        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
    });
}

async function runCustomBackup(dbUrl, outputPath) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        const gzip = zlib.createGzip();
        const writeStream = fs.createWriteStream(outputPath);
        gzip.pipe(writeStream);

        const write = (text) => gzip.write(text + '\n');

        write('-- Custom Node-based PostgreSQL Backup Fallback');
        write(`-- Date: ${new Date().toISOString()}`);
        write('SET statement_timeout = 0;');
        write('SET lock_timeout = 0;');
        write("SET client_encoding = 'UTF8';");
        write('SET standard_conforming_strings = on;');
        write('SET check_function_bodies = false;');
        write('SET xmloption = content;');
        write('SET client_min_messages = warning;');
        write('SET row_security = off;\n');

        // Get all tables in public schema
        const tables = await prisma.$queryRawUnsafe(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
              AND table_name NOT LIKE '_prisma_migrations';
        `);

        for (const row of tables) {
            const tableName = row.table_name;
            write(`-- Table: ${tableName}`);
            write(`ALTER TABLE "${tableName}" DISABLE TRIGGER ALL;`);
            write(`TRUNCATE TABLE "${tableName}" CASCADE;`);

            // Fetch columns information
            const columns = await prisma.$queryRawUnsafe(`
                SELECT column_name, data_type, column_default
                FROM information_schema.columns 
                WHERE table_name = '${tableName}'
                ORDER BY ordinal_position;
            `);

            const colNames = columns.map(c => `"${c.column_name}"`).join(', ');

            // Fetch table data
            const data = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}";`);

            for (const item of data) {
                const values = columns.map(col => {
                    const val = item[col.column_name];
                    if (val === null || val === undefined) {
                        return 'NULL';
                    }
                    if (typeof val === 'string') {
                        return `'${val.replace(/'/g, "''")}'`;
                    }
                    if (val instanceof Date) {
                        return `'${val.toISOString()}'`;
                    }
                    if (typeof val === 'object') {
                        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
                    }
                    return val;
                });

                write(`INSERT INTO "${tableName}" (${colNames}) VALUES (${values.join(', ')});`);
            }

            // Restore sequences if table has an ID sequence default
            const nextvalCol = columns.find(c => c.column_default && c.column_default.startsWith('nextval'));
            if (nextvalCol) {
                write(`SELECT setval(pg_get_serial_sequence('"${tableName}"', '${nextvalCol.column_name}'), coalesce(max("${nextvalCol.column_name}"), 1), max("${nextvalCol.column_name}") IS NOT null) FROM "${tableName}";`);
            }

            write(`ALTER TABLE "${tableName}" ENABLE TRIGGER ALL;\n`);
        }

        gzip.end();
        await new Promise((resolve, reject) => {
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
        });
    } finally {
        await prisma.$disconnect();
    }
}

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

runBackup();
