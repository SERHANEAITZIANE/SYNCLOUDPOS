"use client"

import { useState } from "react"
import { toast } from "react-hot-toast"
import { updateSystemSettings } from "@/actions/settings"
import { useRouter } from "@/i18n/routing"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Sparkles, ExternalLink } from "lucide-react"
import { useTranslations } from "next-intl"

interface AiSettingsFormProps {
    initialProvider: string
    initialGeminiApiKey: string | null
    initialOpenaiApiKey: string | null
    initialAnthropicApiKey: string | null
}

export const AiSettingsForm = ({
    initialProvider,
    initialGeminiApiKey,
    initialOpenaiApiKey,
    initialAnthropicApiKey
}: AiSettingsFormProps) => {
    const router = useRouter()
    const t = useTranslations("Settings.AiSettingsForm")
    const [loading, setLoading] = useState(false)
    const [provider, setProvider] = useState(initialProvider || "GEMINI")
    const [geminiApiKey, setGeminiApiKey] = useState(initialGeminiApiKey || "")
    const [openaiApiKey, setOpenaiApiKey] = useState(initialOpenaiApiKey || "")
    const [anthropicApiKey, setAnthropicApiKey] = useState(initialAnthropicApiKey || "")

    const handleSave = async () => {
        try {
            setLoading(true)
            const result = await updateSystemSettings({
                aiProvider: provider,
                geminiApiKey,
                openaiApiKey,
                anthropicApiKey
            })
            if (result.error) { toast.error(result.error); return }
            toast.success(t("success"))
            router.refresh()
        } catch {
            toast.error(t("error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="p-5 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 rounded-xl space-y-6">

                {/* Provider Selection */}
                <div className="flex flex-col md:flex-row md:items-start gap-5 border-b border-indigo-100 dark:border-indigo-900/50 pb-5">
                    <Sparkles className="w-6 h-6 text-indigo-500 shrink-0 hidden md:block mt-1" />
                    <div className="space-y-4 w-full">
                        <div>
                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-indigo-500 md:hidden" />
                                {t("title")}
                            </h3>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                                {t("description")}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <ProviderCard
                                id="GEMINI"
                                label="Google Gemini"
                                icon="✨"
                                selected={provider === "GEMINI"}
                                onSelect={() => setProvider("GEMINI")}
                                activeText={t("active")}
                            />
                            <ProviderCard
                                id="OPENAI"
                                label="OpenAI ChatGPT"
                                icon="🧠"
                                selected={provider === "OPENAI"}
                                onSelect={() => setProvider("OPENAI")}
                                activeText={t("active")}
                            />
                            <ProviderCard
                                id="ANTHROPIC"
                                label="Anthropic Claude"
                                icon="👁️"
                                selected={provider === "ANTHROPIC"}
                                onSelect={() => setProvider("ANTHROPIC")}
                                activeText={t("active")}
                            />
                        </div>
                    </div>
                </div>

                {/* API Key Inputs */}
                <div className="space-y-5">
                    {provider === "GEMINI" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Label>{t("gemini.label")}</Label>
                            <Input
                                type="password"
                                placeholder="AIzaSy..."
                                className="font-mono text-sm max-w-xl"
                                value={geminiApiKey}
                                onChange={(e) => setGeminiApiKey(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("gemini.hint")}{" "}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                >
                                    Google AI Studio <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </div>
                    )}

                    {provider === "OPENAI" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Label>{t("openai.label")}</Label>
                            <Input
                                type="password"
                                placeholder="sk-proj-..."
                                className="font-mono text-sm max-w-xl"
                                value={openaiApiKey}
                                onChange={(e) => setOpenaiApiKey(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("openai.hint")}{" "}
                                <a
                                    href="https://platform.openai.com/api-keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                >
                                    OpenAI Platform <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </div>
                    )}

                    {provider === "ANTHROPIC" && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <Label>{t("anthropic.label")}</Label>
                            <Input
                                type="password"
                                placeholder="sk-ant-..."
                                className="font-mono text-sm max-w-xl"
                                value={anthropicApiKey}
                                onChange={(e) => setAnthropicApiKey(e.target.value)}
                                disabled={loading}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t("anthropic.hint")}{" "}
                                <a
                                    href="https://console.anthropic.com/settings/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                >
                                    Anthropic Console <ExternalLink className="w-3 h-3" />
                                </a>
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-36">
                        {loading ? t("saving") : t("submit")}
                    </Button>
                </div>
            </div>
        </div>
    )
}

function ProviderCard({ id, label, icon, selected, onSelect, activeText }: { id: string, label: string, icon: string, selected: boolean, onSelect: () => void, activeText: string }) {
    return (
        <button
            onClick={(e) => { e.preventDefault(); onSelect(); }}
            className={`
                flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-200
                ${selected
                    ? "border-indigo-500 bg-white dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500"
                    : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 hover:border-indigo-300 dark:hover:border-indigo-700"}
            `}
        >
            <div className={`p-2 rounded-md ${selected ? "bg-indigo-100 dark:bg-indigo-900" : "bg-white dark:bg-gray-800 shadow-sm"}`}>
                <span className="text-xl leading-none block">{icon}</span>
            </div>
            <div>
                <span className={`font-semibold text-sm ${selected ? "text-indigo-900 dark:text-indigo-100" : "text-gray-700 dark:text-gray-300"}`}>
                    {label}
                </span>
                {selected && <span className="block text-[10px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">{activeText}</span>}
            </div>
        </button>
    )
}
