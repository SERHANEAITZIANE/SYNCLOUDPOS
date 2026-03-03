"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Printer, Store, Sparkles, Settings2, HardDrive, Star, MessageCircle } from "lucide-react"
import { GeneralForm } from "./general-form"
import { PrintingSettingsForm } from "./printing-settings-form"
import { PosDefaultsForm } from "./pos-defaults-form"
import { AiSettingsForm } from "./ai-settings-form"
import { AdvancedSettingsForm } from "./advanced-settings-form"
import { BackupsListClient } from "./backups-list-client"
import { LoyaltySettingsForm } from "./loyalty-settings-form"
import { WhatsAppSettingsForm } from "./whatsapp-settings-form"

interface TenantData {
    name: string
    ownerName: string | null
    activity: string | null
    address: string | null
    wilaya: string | null
    commune: string | null
    phone: string | null
    fax: string | null
    email: string | null
    nif: string | null
    rc: string | null
    artImposition: string | null
    nis: string | null
    bankAccount: string | null
    logo: string | null
    headerText: string | null
    blTemplate: string
    aiProvider: string
    geminiApiKey: string | null
    openaiApiKey: string | null
    anthropicApiKey: string | null
    loyaltyPointsPerDa: number
    loyaltyDaPerPoint: number
}

interface Account {
    id: string
    name: string
    type: string
    balance: number
}

interface UnifiedSettingsClientProps {
    tenant: TenantData
    accounts: Account[]
    databaseUrl: string
}

export const UnifiedSettingsClient = ({ tenant, accounts, databaseUrl }: UnifiedSettingsClientProps) => {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Configurez votre application, vos préférences d&apos;impression et vos paramètres POS.
                </p>
            </div>

            <Tabs defaultValue="company" className="w-full">
                <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/60 p-1 rounded-xl mb-6 overflow-x-auto justify-start">
                    <TabsTrigger value="company" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4" />
                        <span>Entreprise</span>
                    </TabsTrigger>
                    <TabsTrigger value="printing" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Printer className="w-4 h-4" />
                        <span>Impression</span>
                    </TabsTrigger>
                    <TabsTrigger value="pos" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Store className="w-4 h-4" />
                        <span>POS Par Défaut</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>IA</span>
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Settings2 className="w-4 h-4" />
                        <span>Avancé</span>
                    </TabsTrigger>
                    <TabsTrigger value="loyalty" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Star className="w-4 h-4" />
                        <span>Fidélité</span>
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <HardDrive className="w-4 h-4" />
                        <span>Sauvegarde</span>
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1 — Company / Entreprise */}
                <TabsContent value="company" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                Informations de l&apos;Entreprise
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ces informations apparaissent sur tous vos documents (BL, factures, reçus).
                            </p>
                        </div>
                        <GeneralForm initialData={tenant} />
                    </div>
                </TabsContent>

                {/* Tab 2 — Printing */}
                <TabsContent value="printing" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Printer className="w-5 h-5 text-orange-500" />
                                Paramètres d&apos;Impression
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configurez le format papier, le modèle de BL et les options du reçu POS.
                            </p>
                        </div>
                        <PrintingSettingsForm initialBlTemplate={tenant.blTemplate} />
                    </div>
                </TabsContent>

                {/* Tab 3 — POS Defaults */}
                <TabsContent value="pos" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Store className="w-5 h-5 text-green-500" />
                                POS — Paramètres par Défaut
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Choisissez la caisse, le mode de paiement et options pré-sélectionnés à chaque vente.
                            </p>
                        </div>
                        <PosDefaultsForm accounts={accounts} />
                    </div>
                </TabsContent>

                {/* Tab 4 — AI */}
                <TabsContent value="ai" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500" />
                                Intelligence Artificielle
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configurez vos clés API pour activer la numérisation OCR et les fonctions IA.
                            </p>
                            <div className="max-w-3xl">
                                <AiSettingsForm
                                    initialProvider={tenant.aiProvider}
                                    initialGeminiApiKey={tenant.geminiApiKey}
                                    initialOpenaiApiKey={tenant.openaiApiKey}
                                    initialAnthropicApiKey={tenant.anthropicApiKey}
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab 5 — Advanced */}
                <TabsContent value="advanced" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-red-500" />
                                Paramètres Avancés
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Paramètres techniques réservés aux administrateurs. Prudence requise.
                            </p>
                        </div>
                        <AdvancedSettingsForm initialDatabaseUrl={databaseUrl} />
                    </div>
                </TabsContent>

                {/* Tab 6 — Loyalty */}
                <TabsContent value="loyalty" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                Programme de Fidélité
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Configurez le taux d&apos;accumulation et de remboursement des points de fidélité client.
                            </p>
                        </div>
                        <LoyaltySettingsForm
                            loyaltyPointsPerDa={tenant.loyaltyPointsPerDa}
                            loyaltyDaPerPoint={tenant.loyaltyDaPerPoint}
                        />
                    </div>
                </TabsContent>

                {/* Tab 7 — Backup & Restore */}
                <TabsContent value="backup" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-emerald-500" />
                                Sauvegarde &amp; Restauration
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Exportez toutes vos données ou restaurez depuis une sauvegarde précédente.
                            </p>
                        </div>
                        <BackupsListClient />
                    </div>
                </TabsContent>
                {/* Tab 8 — WhatsApp */}
                <TabsContent value="whatsapp" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-emerald-500" />
                                WhatsApp Business
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Envoyez des notifications, rappels de dettes et reçus par WhatsApp.
                            </p>
                        </div>
                        <WhatsAppSettingsForm />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
