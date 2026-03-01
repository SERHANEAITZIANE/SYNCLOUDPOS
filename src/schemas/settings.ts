import { z } from "zod"

export const SettingsSchema = z.object({
    name: z.string().min(1, "Store name is required"),
    ownerName: z.string().optional(),
    activity: z.string().optional(),
    address: z.string().optional(),
    wilaya: z.string().optional(),
    commune: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    email: z.string().optional(),
    nif: z.string().optional(),
    rc: z.string().optional(),
    artImposition: z.string().optional(),
    nis: z.string().optional(),
    bankAccount: z.string().optional(),
    logo: z.string().optional(),
    headerText: z.string().optional(),
    blTemplate: z.string().optional()
})

export const SystemSettingsSchema = z.object({
    blTemplate: z.string().optional(),
    databaseUrl: z.string().url("Veuillez entrer une URL de base de données valide."),
    geminiApiKey: z.string().optional()
})
