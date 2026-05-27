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
    nif: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIF doit comporter exactement 15 chiffres").optional(),
    rc: z.string().optional(),
    artImposition: z.string().refine(val => !val || /^\d{11}$/.test(val), "L'article d'imposition doit comporter 11 chiffres").optional(),
    nis: z.string().refine(val => !val || /^\d{15}$/.test(val), "Le NIS doit comporter exactement 15 chiffres").optional(),
    bankAccount: z.string().optional(),
    logo: z.string().optional(),
    headerText: z.string().optional(),
    blTemplate: z.string().optional(),
    posBlFormat: z.string().optional(),
    posBlColumns: z.string().optional()
})

export const SystemSettingsSchema = z.object({
    blTemplate: z.string().optional(),
    posBlFormat: z.enum(["A4", "A5"]).optional(),
    posBlColumns: z.enum(["standard", "code", "barcode"]).optional(),
    databaseUrl: z.string().url("Veuillez entrer une URL de base de données valide."),
    geminiApiKey: z.string().optional()
})
