"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Printer, Store, Sparkles, Settings2, HardDrive, Star, MessageCircle, Flag, Lock } from "lucide-react"
import { GeneralForm } from "./general-form"
import { PrintingSettingsForm } from "./printing-settings-form"
import { PosDefaultsForm } from "./pos-defaults-form"
import { AiSettingsForm } from "./ai-settings-form"
import { AdvancedSettingsForm } from "./advanced-settings-form"
import { BackupsListClient } from "./backups-list-client"
import { LoyaltySettingsForm } from "./loyalty-settings-form"
import { WhatsAppSettingsForm } from "./whatsapp-settings-form"
import { AlgerianSettingsForm } from "./algerian-settings-form"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { useTranslations } from "next-intl"

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
    const t = useTranslations("Settings");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {t("description")}
                </p>
            </div>

            <Tabs defaultValue="company" className="w-full">
                <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/60 p-1 rounded-xl mb-6 overflow-x-auto justify-start">
                    <TabsTrigger value="company" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4" />
                        <span>{t("Tabs.company")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="printing" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Printer className="w-4 h-4" />
                        <span>{t("Tabs.printing")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="pos" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Store className="w-4 h-4" />
                        <span>{t("Tabs.pos")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Sparkles className="w-4 h-4" />
                        <span>{t("Tabs.ai")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Settings2 className="w-4 h-4" />
                        <span>{t("Tabs.advanced")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="loyalty" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Star className="w-4 h-4" />
                        <span>{t("Tabs.loyalty")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="backup" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <HardDrive className="w-4 h-4" />
                        <span>{t("Tabs.backup")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <MessageCircle className="w-4 h-4" />
                        <span>{t("Tabs.whatsapp")}</span>
                    </TabsTrigger>
                    <TabsTrigger value="algeria" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Flag className="w-4 h-4" />
                        <span>🇩🇿 Algérie</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-sm">
                        <Lock className="w-4 h-4" />
                        <span>Sécurité</span>
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1 — Company / Entreprise */}
                <TabsContent value="company" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                {t("Company.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Company.description")}
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
                                {t("Printing.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Printing.description")}
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
                                {t("PosDefaults.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("PosDefaults.description")}
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
                                {t("Ai.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Ai.description")}
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
                                {t("Advanced.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Advanced.description")}
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
                                {t("Loyalty.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Loyalty.description")}
                            </p>
                        </div>
                        <LoyaltySettingsForm
                            initialData={{
                                loyaltyPointsPerDa: tenant.loyaltyPointsPerDa,
                                loyaltyDaPerPoint: tenant.loyaltyDaPerPoint
                            }}
                        />
                    </div>
                </TabsContent>

                {/* Tab 7 — Backup & Restore */}
                <TabsContent value="backup" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <HardDrive className="w-5 h-5 text-emerald-500" />
                                {t("Backup.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Backup.description")}
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
                                {t("Whatsapp.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t("Whatsapp.description")}
                            </p>
                        </div>
                        <WhatsAppSettingsForm />
                    </div>
                </TabsContent>
                {/* Tab 9 — Algeria */}
                <TabsContent value="algeria" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Flag className="w-5 h-5 text-green-600" />
                                Paramètres Algériens 🇩🇿
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Mode Ramadan, commissions, régime fiscal, et API livraison
                            </p>
                        </div>
                        <AlgerianSettingsForm />
                    </div>
                </TabsContent>

                {/* Tab — Security / Change Password */}
                <TabsContent value="security" className="mt-0">
                    <div className="bg-card border rounded-xl p-6 shadow-sm">
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Lock className="w-5 h-5 text-red-500" />
                                Sécurité du Compte
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Modifiez votre mot de passe de connexion.
                            </p>
                        </div>
                        <ChangePasswordForm />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
