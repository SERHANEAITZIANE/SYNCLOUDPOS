// scripts/restore.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const zlib = require('zlib');
require('dotenv').config(); // Ensure we can read .env

const BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
    console.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
}

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`Backups directory not found at: ${BACKUP_DIR}`);
    process.exit(1);
}

// List available backups
const files = fs.readdirSync(BACKUP_DIR)
    .filter(file => file.startsWith('db-backup-') && file.endsWith('.sql.gz'))
    .sort((a, b) => {
        return fs.statSync(path.join(BACKUP_DIR, b)).mtimeMs - fs.statSync(path.join(BACKUP_DIR, a)).mtimeMs;
    });

if (files.length === 0) {
    console.log('Aucun fichier de sauvegarde trouvé dans le dossier backups/.');
    process.exit(0);
}

// Check command line arguments for specific file
const argFile = process.argv[2];
if (argFile) {
    const targetFile = files.find(f => f === argFile || path.basename(f) === argFile);
    if (!targetFile) {
        console.error(`Fichier de sauvegarde non trouvé : ${argFile}`);
        process.exit(1);
    }
    confirmAndRestore(targetFile);
} else {
    // Interactive mode
    console.log('\n--- RESTAURATION DE LA BASE DE DONNÉES SYNCLOUDPOS ---');
    console.log('Choisissez une sauvegarde à restaurer (la plus récente en premier) :\n');
    
    files.forEach((file, index) => {
        const stats = statsSafe(path.join(BACKUP_DIR, file));
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        const dateStr = stats.mtime.toLocaleString('fr-FR');
        console.log(`[\x1b[36m${index + 1}\x1b[0m] ${file}  (${sizeMb} MB) - ${dateStr}`);
    });
    
    console.log('\n[\x1b[31mQ\x1b[0m] Quitter');
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('\nEntrez le numéro de la sauvegarde à restaurer : ', (answer) => {
        if (answer.toLowerCase() === 'q') {
            console.log('Opération annulée.');
            rl.close();
            process.exit(0);
        }
        
        const selectedIndex = parseInt(answer) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= files.length) {
            console.error('Choix invalide.');
            rl.close();
            process.exit(1);
        }
        
        rl.close();
        confirmAndRestore(files[selectedIndex]);
    });
}

function statsSafe(filePath) {
    try {
        return fs.statSync(filePath);
    } catch (e) {
        return { size: 0, mtime: new Date() };
    }
}

function confirmAndRestore(filename) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log(`\n\x1b[31m[ATTENTION] La restauration va écraser TOUTES les données actuelles de la base de données !\x1b[0m`);
    rl.question(`Êtes-vous sûr de vouloir restaurer "${filename}" ? (oui/non) : `, (confirm) => {
        rl.close();
        if (confirm.toLowerCase() !== 'oui' && confirm.toLowerCase() !== 'o') {
            console.log('Opération annulée.');
            process.exit(0);
        }
        
        performRestore(filename);
    });
}

async function performRestore(filename) {
    const backupPath = path.join(BACKUP_DIR, filename);
    console.log(`\nPréparation de la base de données...`);
    
    // Step 1: Attempt standard psql/gunzip restore first (fast, standard)
    try {
        console.log('Attempting standard psql restoration...');
        await runStandardRestore(backupPath);
        console.log(`\n\x1b[32m[SUCCÈS] Base de données restaurée avec succès depuis ${filename} !\x1b[0m\n`);
        process.exit(0);
    } catch (err) {
        console.warn(`Standard restore failed or tools are not available: ${err.message}`);
        console.log('Falling back to custom Node + Prisma SQL restore runner...');
        
        try {
            await runCustomRestore(backupPath);
            console.log(`\n\x1b[32m[SUCCÈS] Base de données restaurée avec succès depuis ${filename} !\x1b[0m\n`);
            process.exit(0);
        } catch (customErr) {
            console.error(`Restauration fully failed: ${customErr.message}`);
            process.exit(1);
        }
    }
}

function runStandardRestore(backupPath) {
    return new Promise((resolve, reject) => {
        let pgPassword = "";
        try {
            const url = new URL(DB_URL);
            pgPassword = url.password;
        } catch (e) {
            // ignore
        }

        const cleanCommand = `psql "${DB_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`;
        const restoreCommand = `gunzip -c "${backupPath}" | psql "${DB_URL}"`;

        exec(cleanCommand, { env: { ...process.env, PGPASSWORD: pgPassword } }, (err) => {
            if (err) {
                // Warning, but attempt direct restore anyway
            }
            
            exec(restoreCommand, { env: { ...process.env, PGPASSWORD: pgPassword } }, (restoreErr, stdout, stderr) => {
                if (restoreErr) {
                    reject(restoreErr);
                } else {
                    resolve();
                }
            });
        });
    });
}

async function runCustomRestore(backupPath) {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        console.log('Decompressing backup archive...');
        const compressedData = fs.readFileSync(backupPath);
        const sqlBuffer = zlib.gunzipSync(compressedData);
        const sqlText = sqlBuffer.toString('utf8');

        console.log('Parsing SQL statements...');
        const lines = sqlText.split('\n');

        console.log('Cleaning existing public schema...');
        try {
            await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
            console.log('Schema cleared successfully.');
        } catch (e) {
            console.warn('DROP SCHEMA public CASCADE failed. Attempting manual truncation...');
            const tables = await prisma.$queryRawUnsafe(`
                SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
            `);
            for (const t of tables) {
                await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t.table_name}" CASCADE;`);
            }
        }

        console.log('Executing SQL statements...');
        let count = 0;
        
        await prisma.$transaction(async (tx) => {
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
                    continue;
                }
                await tx.$executeRawUnsafe(trimmed);
                count++;
            }
        }, {
            timeout: 90000 // 90 seconds timeout
        });

        console.log(`Executed ${count} SQL statements successfully.`);
    } finally {
        await prisma.$disconnect();
    }
}
