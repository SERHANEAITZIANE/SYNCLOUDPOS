"use server"

import fs from "fs"
import path from "path"
import { revalidatePath } from "next/cache"
import { getActiveTenantId } from "./get-active-tenant"
import { db } from "@/lib/db"

export async function getEnvDatabaseUrl(): Promise<string> {
    try {
        const envPath = path.join(process.cwd(), ".env");
        if (!fs.existsSync(envPath)) return "";

        const content = fs.readFileSync(envPath, "utf-8");
        const lines = content.split("\n");
        const dbLine = lines.find(line => line.startsWith("DATABASE_URL="));

        if (dbLine) {
            return dbLine.split("=")[1].trim().replace(/['"]/g, "");
        }
    } catch (error) {
        console.error("Failed to read .env", error);
    }
    return "";
}

export async function updateEnvDatabaseUrl(newUrl: string): Promise<{ success?: string, error?: string }> {
    try {
        const envPath = path.join(process.cwd(), ".env");
        let content = "";

        if (fs.existsSync(envPath)) {
            content = fs.readFileSync(envPath, "utf-8");
        }

        const lines = content.split("\n");
        const dbLineIndex = lines.findIndex(line => line.startsWith("DATABASE_URL="));

        if (dbLineIndex !== -1) {
            lines[dbLineIndex] = `DATABASE_URL="${newUrl}"`;
        } else {
            lines.push(`DATABASE_URL="${newUrl}"`);
        }

        fs.writeFileSync(envPath, lines.join("\n"), "utf-8");

        return { success: "Fichier .env mis à jour avec succès. Un redémarrage du serveur peut être nécessaire." };
    } catch (error) {
        console.error("Failed to write to .env", error);
        return { error: "Erreur lors de l'écriture du fichier .env" };
    }
}
