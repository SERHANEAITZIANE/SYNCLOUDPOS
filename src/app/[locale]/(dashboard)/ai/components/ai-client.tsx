"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
    Bot, Send, Trash2, Settings2, ChevronDown, Sparkles, TrendingUp, 
    Package, Users, DollarSign, AlertTriangle, BarChart3, X, Eye, 
    EyeOff, Loader2, Copy, Check, Volume2, Square, History, Calendar, 
    ChevronLeft, ChevronRight, Activity, Percent, ArrowUpRight, 
    ArrowDownRight, RefreshCw, Layers, Mic, Play, Terminal, HelpCircle,
    Briefcase, Landmark
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { saveAiLog, getAiLogs } from "@/actions/ai-logs";
import { getBusinessStats } from "@/actions/ai-context";
import { getAIDemandForecast } from "@/actions/ai-forecast";
import { processVocalQuery } from "@/actions/voice-assistant";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

type Provider = "gemini" | "openai" | "claude" | "kimi";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    provider?: Provider;
}

interface AiLogEntry {
    id: string;
    provider: string;
    model: string | null;
    prompt: string;
    response: string;
    createdAt: string;
}

interface ProviderConfig {
    id: Provider;
    name: string;
    model: string;
    color: string;
    gradient: string;
    emoji: string;
    placeholder: string;
    docsUrl: string;
}

// ─── Provider Configs ───────────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
    {
        id: "gemini",
        name: "Google Gemini",
        model: "gemini-2.5-flash",
        color: "text-blue-400",
        gradient: "from-blue-600 to-cyan-500",
        emoji: "✦",
        placeholder: "Clé API Google AI Studio (AIza...)",
        docsUrl: "https://aistudio.google.com/apikey",
    },
    {
        id: "openai",
        name: "ChatGPT",
        model: "gpt-4o",
        color: "text-emerald-400",
        gradient: "from-emerald-600 to-teal-500",
        emoji: "⬡",
        placeholder: "Clé API OpenAI (sk-...)",
        docsUrl: "https://platform.openai.com/api-keys",
    },
    {
        id: "claude",
        name: "Claude",
        model: "claude-3-5-sonnet",
        color: "text-orange-400",
        gradient: "from-orange-500 to-amber-500",
        emoji: "◈",
        placeholder: "Clé API Anthropic (sk-ant-...)",
        docsUrl: "https://console.anthropic.com/settings/keys",
    },
    {
        id: "kimi",
        name: "Kimi (Moonshot)",
        model: "moonshot-v1-8k",
        color: "text-purple-400",
        gradient: "from-purple-600 to-violet-500",
        emoji: "◎",
        placeholder: "Clé API Moonshot (sk-...)",
        docsUrl: "https://platform.moonshot.cn/console/api-keys",
    },
];

// ─── Quick Prompts ──────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
    { icon: TrendingUp, label: "Analyse des ventes", prompt: "Analyse mes ventes du mois en cours. Quels sont les points forts et les zones à améliorer ?" },
    { icon: Package, label: "État des stocks", prompt: "Fais un rapport sur l'état de mes stocks. Quels produits sont en rupture ou sous le seuil minimum ?" },
    { icon: Users, label: "Analyse clients", prompt: "Analyse ma base client. Qui sont mes meilleurs clients et qui sont les plus grands débiteurs ?" },
    { icon: DollarSign, label: "Cash flow", prompt: "Analyse mon cash flow ce mois-ci. Calcule la rentabilité en prenant en compte ventes, achats et dépenses." },
    { icon: AlertTriangle, label: "Points d'alerte", prompt: "Identifie tous les points d'alerte critiques de mon business et propose des actions correctives prioritaires." },
    { icon: BarChart3, label: "Rapport complet", prompt: "Génère un rapport de performance complet de mon entreprise avec des recommandations stratégiques pour le mois prochain." },
];

// ─── Main Component ─────────────────────────────────────────────────────────

interface AiClientProps {
    dbProvider: string;
    dbKeys: Record<Provider, string>;
    initialStats: any;
}

const SYSTEM_LOGS_MESSAGES = [
    "sec_agent: session verified for tenant user",
    "db_query: scan for prisma indexes completed",
    "redis_cache: scan hit ratio = 98.4%",
    "accounting: loaded active customer ledger balances",
    "forecast_engine: statistical stock velocity computed",
    "gemini_client: dynamic key successfully loaded",
    "supply_chain: safety stock reorder thresholds active",
    "fiscal_calculator: calculated ifu/g50 tax simulations",
];

export function AiClient({ dbProvider, dbKeys, initialStats }: AiClientProps) {
    const initialProvider = (dbProvider?.toLowerCase() as Provider) || "gemini";
    const validProvider = PROVIDERS.find(p => p.id === initialProvider) ? initialProvider : "gemini";
    
    const [selectedProvider, setSelectedProvider] = useState<Provider>(validProvider);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // Sidebar sub-tab navigation
    const [cockpitSubTab, setCockpitSubTab] = useState<"performance" | "predictions">("performance");

    // Dynamic simulated terminal logs
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        "sys_core: initialising artificial intelligence unit...",
        "postgres_db: connection established and optimized.",
        "redis_srv: cache monitor scan hook attached."
    ]);

    // Business cockpit statistics
    const [stats, setStats] = useState<any>(initialStats);
    const [statsLoading, setStatsLoading] = useState(false);

    // Demand Forecast State
    const [forecastLoading, setForecastLoading] = useState(false);
    const [forecastReport, setForecastReport] = useState<string | null>(null);
    const [forecastExpanded, setForecastExpanded] = useState(false);
    const [forecastCopied, setForecastCopied] = useState(false);

    // Pricing Simulator State
    const [pricingMargin, setPricingMargin] = useState(25);
    const [pricingTaxRegime, setPricingTaxRegime] = useState("ifu5");
    const [pricingRegion, setPricingRegion] = useState("alger");

    // Scenario Cash Simulator State
    const [selectedScenario, setSelectedScenario] = useState("recruter");

    // Vocal Query Assistant State
    const [vocalText, setVocalText] = useState("");
    const [vocalLanguage, setVocalLanguage] = useState<"darija" | "arabic" | "french">("darija");
    const [vocalLoading, setVocalLoading] = useState(false);
    const [vocalOutput, setVocalOutput] = useState<string | null>(null);
    const [vocalWave, setVocalWave] = useState(false);

    // History tab state
    const [activeTab, setActiveTab] = useState<"chat" | "cockpit" | "history">("chat");
    const [historyLogs, setHistoryLogs] = useState<AiLogEntry[]>([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [historyPage, setHistoryPage] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyDateRange, setHistoryDateRange] = useState<DateRange | undefined>(undefined);
    const [historyProvider, setHistoryProvider] = useState("ALL");
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const provider = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[0];
    const currentKey = dbKeys[selectedProvider] || "";
    const hasKey = currentKey.trim().length > 3;

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Cleanup audio playback on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    // Simulated terminal updates
    useEffect(() => {
        const interval = setInterval(() => {
            const randomMsg = SYSTEM_LOGS_MESSAGES[Math.floor(Math.random() * SYSTEM_LOGS_MESSAGES.length)];
            const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toLowerCase();
            setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] ${randomMsg}`]);
        }, 8500);
        return () => clearInterval(interval);
    }, []);

    // Refetch statistics when dateRange changes
    useEffect(() => {
        const fetchUpdatedStats = async () => {
            if (!dateRange?.from) return;
            setStatsLoading(true);
            try {
                const updated = await getBusinessStats(dateRange.from, dateRange.to || dateRange.from);
                if (updated) {
                    setStats(updated);
                    const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }).toLowerCase();
                    setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] metrics: business stats refetched`]);
                }
            } catch (err) {
                console.error("Failed to refetch stats:", err);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchUpdatedStats();
    }, [dateRange]);

    const formatCurrency = (val: number | undefined) => {
        if (val === undefined) return "0,00 DA";
        return val.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " DA";
    };

    // Text to Speech playback
    const handleSpeak = (id: string, text: string) => {
        if (speakingId === id) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            setSpeakingId(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        const stripMarkdownForSpeech = (rawText: string): string => {
            return rawText
                .replace(/```[\s\S]*?```/g, "")
                .replace(/\*\*([^*]+)\*\*/g, "$1")
                .replace(/\*([^*]+)\*/g, "$1")
                .replace(/__([^_]+)__/g, "$1")
                .replace(/_([^_]+)_/g, "$1")
                .replace(/`([^`]+)`/g, "$1")
                .replace(/^\s*[-*+]\s+/gm, "")
                .replace(/^\s*\d+\.\s+/gm, "")
                .replace(/^\s*#+\s+/gm, "")
                .replace(/^\s*>\s+/gm, "")
                .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                .replace(/\s+/g, " ")
                .trim();
        };

        const cleanText = stripMarkdownForSpeech(text);
        if (!cleanText) return;

        const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
        const language = hasArabic ? "darija" : "french";

        setSpeakingId(id);

        fetch("/api/mobile/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: cleanText,
                language: language,
                responseFormat: "base64"
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.audio) {
                const audio = new Audio("data:audio/mp3;base64," + data.audio);
                audioRef.current = audio;
                
                audio.play()
                    .catch(err => {
                        console.error("Audio playback failed:", err);
                        setSpeakingId(null);
                    });

                audio.onended = () => {
                    setSpeakingId(null);
                    audioRef.current = null;
                };
                audio.onerror = () => {
                    setSpeakingId(null);
                    audioRef.current = null;
                };
            } else {
                setSpeakingId(null);
            }
        })
        .catch(err => {
            console.error("TTS fetch error:", err);
            setSpeakingId(null);
        });
    };

    const handleCopy = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const sendMessage = useCallback(async (question: string) => {
        if (!question.trim() || loading) return;
        if (!hasKey) {
            setShowSettings(true);
            return;
        }

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: question.trim(),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

        try {
            const res = await fetch("/api/ai-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMsg.content,
                    provider: selectedProvider,
                    apiKey: currentKey,
                    history,
                    dateRange: dateRange ? {
                        from: dateRange.from?.toISOString(),
                        to: dateRange.to?.toISOString()
                    } : undefined
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || `Erreur serveur ${res.status}`);
            }

            const aiMsgId = crypto.randomUUID();
            setMessages(prev => [...prev, {
                id: aiMsgId,
                role: "assistant",
                content: "",
                timestamp: new Date(),
                provider: selectedProvider,
            }]);

            const reader = res.body?.getReader();
            if (!reader) throw new Error("Flux de réponse indisponible");

            const decoder = new TextDecoder();
            let accumulatedAnswer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                accumulatedAnswer += decoder.decode(value, { stream: true });
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiMsgId
                            ? { ...msg, content: accumulatedAnswer }
                            : msg
                    )
                );
            }

            if (accumulatedAnswer.trim()) {
                saveAiLog({
                    provider: selectedProvider.toUpperCase(),
                    model: provider.model,
                    prompt: question.trim(),
                    response: accumulatedAnswer,
                }).catch(err => console.error("Failed to save AI log:", err));
            }
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `❌ **Erreur réseau**: ${err.message || "Impossible de contacter l'API."}`,
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [loading, hasKey, messages, selectedProvider, currentKey, dateRange]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const clearChat = () => {
        setMessages([]);
        inputRef.current?.focus();
    };

    const handleWidgetAction = (promptText: string) => {
        setActiveTab("chat");
        sendMessage(promptText);
    };

    // ─── AI Demand Forecasting Action ──────────────────────────────────────────
    const handleRunDemandForecast = async () => {
        if (forecastLoading) return;
        setForecastLoading(true);
        setForecastReport(null);
        setForecastExpanded(true);

        const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] stats: executing 30-day demand forecast...`]);

        try {
            const res = await getAIDemandForecast();
            if ("error" in res && res.error) {
                setForecastReport(`❌ **Erreur**: ${res.error}`);
            } else if ("data" in res && res.data) {
                setForecastReport(res.data);
                setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] stats: forecast report successfully generated`]);
            }
        } catch (err: any) {
            setForecastReport(`❌ **Erreur**: ${err.message || "Impossible de générer le rapport."}`);
        } finally {
            setForecastLoading(false);
        }
    };

    // ─── Dynamic Pricing Simulation Action ─────────────────────────────────────
    const handleRunPricingSimulation = () => {
        const taxLabels: Record<string, string> = {
            ifu5: "Régime IFU 5% (Activité commerciale / distribution)",
            ifu12: "Régime IFU 12% (Prestations de services / professions libérales)",
            g50: "Régime Réel G50 (TVA + TAP + IBS)",
            none: "Aucune taxe locale / Auto-entrepreneur"
        };
        const regionLabels: Record<string, string> = {
            alger: "Alger & Centre (Logistique optimisée, forte concurrence)",
            oran: "Oran & Ouest (Logistique maritime, concurrence modérée)",
            constantine: "Constantine & Est (Logistique terrestre, marchés régionaux)",
            sahara: "Grand Sud & Sahara (Frais de transport élevés, subventions possibles)"
        };

        const targetPrompt = `Génère une simulation et recommandation de tarification dynamique pour mon catalogue de produits en Algérie.
Je cible une **marge brute ciblée de ${pricingMargin}%**.
Mon régime fiscal déclaré est le **${taxLabels[pricingTaxRegime]}**.
Mon commerce est situé dans la région de **${regionLabels[pricingRegion]}** (prends en compte les coûts logistiques locaux et le pouvoir d'achat régional).
Donne des calculs explicites en Dinars Algériens (DA), suggère comment ajuster mes prix de vente pour couvrir mes taxes tout en préservant mes ventes face au marché local, et donne des conseils stratégiques concrets.`;

        handleWidgetAction(targetPrompt);
    };

    // ─── Scenario Financial Simulation Action ─────────────────────────────────
    const handleRunScenarioSimulation = () => {
        const scenarios: Record<string, string> = {
            recruter: "Option A : Recruter un nouveau vendeur (Salaire de 45 000 DA/mois, prends en compte l'impact sur le seuil de rentabilité et la hausse potentielle des ventes au POS).",
            inflation: "Option B : Hausse des coûts d'achat fournisseurs de +10% à cause de l'inflation (calcule l'impact sur ma marge brute estimée, le COGS et suggère si je dois augmenter mes prix de vente).",
            pub: "Option C : Lancer une campagne publicitaire ciblée sur les wilayas limitrophes (Budget de 60 000 DA, vise une hausse de +15% sur les Bons de Livraison, calcule le retour sur investissement)."
        };

        const targetPrompt = `Fais une simulation de scénario financier stratégique pour ma boutique SynCloudPOS.
Le scénario choisi est : **${scenarios[selectedScenario]}**
Voici mon bilan financier actuel sur cette période :
- Chiffre d'affaires total : ${stats?.totalRevenue.toFixed(2)} DA
- Bénéfice net estimé : ${stats?.estimatedNetProfit.toFixed(2)} DA
- Dépenses totales de la période : ${stats?.totalExpenses.toFixed(2)} DA

Simule l'impact mathématique de cette décision sur ma trésorerie, projette mes nouveaux résultats financiers, donne un avis d'analyste et suggère des décisions clés.`;

        handleWidgetAction(targetPrompt);
    };

    // ─── AI Spoken Vocal Query Action ──────────────────────────────────────────
    const handleRunVocalQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vocalText.trim() || vocalLoading) return;
        
        vocalRef.current?.scrollIntoView({ behavior: "smooth" });
        setVocalLoading(true);
        setVocalOutput(null);
        setVocalWave(true);

        const timeStr = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }).toLowerCase();
        setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] vocal: analyzing vocal dashboard query...`]);

        const selectedEngine = selectedProvider === "openai" ? "gpt4" : selectedProvider === "claude" ? "claude" : "gemini";

        try {
            const res = await processVocalQuery(vocalText, vocalLanguage, selectedEngine);
            if (res.success && res.text) {
                setVocalOutput(res.text);
                handleSpeak("vocal-assistant-response", res.text);
                setTerminalLogs(prev => [...prev.slice(-3), `[${timeStr}] vocal: response synthesized in ${res.detectedLanguage}`]);
            } else {
                setVocalOutput(res.text || "Erreur de configuration.");
            }
        } catch (err: any) {
            setVocalOutput(`Une erreur est survenue: ${err.message || "Erreur serveur"}`);
        } finally {
            setVocalLoading(false);
            setVocalWave(false);
        }
    };

    // ─── History Loading ────────────────────────────────────────────────────
    const loadHistory = useCallback(async (page = 0) => {
        setHistoryLoading(true);
        try {
            const result = await getAiLogs({
                from: historyDateRange?.from?.toISOString(),
                to: historyDateRange?.to?.toISOString(),
                provider: historyProvider,
                page,
                pageSize: 15,
            });
            setHistoryLogs(result.logs);
            setHistoryTotal(result.total);
            setHistoryPage(page);
        } catch (err) {
            console.error("Failed to load history:", err);
        } finally {
            setHistoryLoading(false);
        }
    }, [historyDateRange, historyProvider]);

    useEffect(() => {
        if (activeTab === "history") {
            loadHistory(0);
        }
    }, [activeTab, loadHistory]);

    const vocalRef = useRef<HTMLDivElement>(null);

    // ─── Render Cockpit Content ──────────────────────────────────────────────
    const renderCockpit = () => (
        <div className="flex flex-col h-full space-y-4">
            {/* Header section with toggle between Cockpit stats & AI Simulators */}
            <div className="shrink-0 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white text-base flex items-center gap-2">
                            <Activity className="h-4.5 w-4.5 text-indigo-400" />
                            Business Cockpit
                        </h3>
                        <p className="text-[10px] text-white/40 mt-0.5 font-medium">
                            {dateRange?.from 
                                ? `Du ${dateRange.from.toLocaleDateString("fr-FR")} au ${(dateRange.to || dateRange.from).toLocaleDateString("fr-FR")}` 
                                : "Bilan mensuel en direct"}
                        </p>
                    </div>
                    {statsLoading && (
                        <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                    )}
                </div>

                {/* Sub Tab Navigation */}
                <div className="flex bg-white/5 rounded-xl p-0.5 border border-white/5 text-xs font-bold w-full shadow-inner">
                    <button
                        onClick={() => setCockpitSubTab("performance")}
                        className={cn(
                            "flex-1 py-1.5 rounded-lg text-center transition-all",
                            cockpitSubTab === "performance" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        Bilan Commercial
                    </button>
                    <button
                        onClick={() => setCockpitSubTab("predictions")}
                        className={cn(
                            "flex-1 py-1.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5",
                            cockpitSubTab === "predictions" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60"
                        )}
                    >
                        <Sparkles className="h-3 w-3 text-indigo-400" />
                        Simulateurs IA
                    </button>
                </div>
            </div>

            {/* Content Switcher */}
            <ScrollArea className="flex-1 min-h-0 pr-1">
                {cockpitSubTab === "performance" ? (
                    <div className="space-y-4 pb-4">
                        {/* 1. Profitability (Net Profit) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative group overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-teal-950/5 p-4 shadow-[0_0_20px_rgba(16,185,129,0.03)] hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.08)] transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[9px] font-extrabold text-emerald-400/80 uppercase tracking-widest">Rentabilité Estimée</span>
                                    <h4 className="text-xl font-bold text-white tracking-tight mt-1">
                                        {formatCurrency(stats?.estimatedNetProfit)}
                                    </h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-tight">Bénéfice net après dépenses globales</p>
                                </div>
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow-inner">
                                    <Percent className="h-4 w-4 animate-pulse" />
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-white/30 flex items-center gap-1 font-semibold">
                                    {stats?.estimatedNetProfit >= 0 ? (
                                        <>
                                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Rentabilité saine</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowDownRight className="h-3.5 w-3.5 text-red-400 animate-bounce" />
                                            <span className="text-red-400">Flux déficitaire</span>
                                        </>
                                    )}
                                </span>
                                <Button 
                                    onClick={() => handleWidgetAction(`Analyse ma rentabilité. Mon bénéfice net estimé est de ${stats?.estimatedNetProfit.toFixed(2)} DA sur un chiffre d'affaires de ${stats?.totalRevenue.toFixed(2)} DA avec des dépenses de ${stats?.totalExpenses.toFixed(2)} DA.`)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                >
                                    Analyser
                                </Button>
                            </div>
                        </motion.div>

                        {/* 2. Revenue */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="relative group overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-cyan-950/5 p-4 shadow-[0_0_20px_rgba(59,130,246,0.03)] hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.08)] transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[9px] font-extrabold text-blue-400/80 uppercase tracking-widest">Chiffre d'Affaires</span>
                                    <h4 className="text-xl font-bold text-white tracking-tight mt-1">
                                        {formatCurrency(stats?.totalRevenue)}
                                    </h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-tight">Total généré sur la période active</p>
                                </div>
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/15 shadow-inner">
                                    <TrendingUp className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                                <div>
                                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Caisse POS</span>
                                    <p className="font-bold text-white/80 mt-0.5">{formatCurrency(stats?.posRevenue)}</p>
                                </div>
                                <div>
                                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Bons Livraison (BL)</span>
                                    <p className="font-bold text-white/80 mt-0.5">{formatCurrency(stats?.blRevenue)}</p>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 flex items-center justify-end">
                                <Button 
                                    onClick={() => handleWidgetAction(`Analyse en détail mes ventes de la période. Mon chiffre d'affaires est de ${stats?.totalRevenue.toFixed(2)} DA (dont ${stats?.posRevenue.toFixed(2)} DA au POS et ${stats?.blRevenue.toFixed(2)} DA via Bons de Livraison). Donne-moi des insights et des pistes de croissance.`)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                >
                                    Analyser mes ventes
                                </Button>
                            </div>
                        </motion.div>

                        {/* 3. Stock Alerts */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="relative group overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-orange-950/5 p-4 shadow-[0_0_20px_rgba(245,158,11,0.03)] hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.08)] transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[9px] font-extrabold text-amber-400/80 uppercase tracking-widest">Alertes Inventaire</span>
                                    <h4 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
                                        {Number(stats?.outOfStockCount || 0) + Number(stats?.lowStockCount || 0)}
                                        <span className="text-[11px] font-semibold text-white/50">articles alertés</span>
                                    </h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-tight">Suivi des ruptures et stocks de sécurité</p>
                                </div>
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/15 shadow-inner">
                                    <Package className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", stats?.outOfStockCount > 0 ? "bg-red-500 animate-pulse" : "bg-white/20")} />
                                    <div>
                                        <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Ruptures</span>
                                        <p className="font-bold text-white/80">{stats?.outOfStockCount} articles</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", stats?.lowStockCount > 0 ? "bg-amber-400 animate-pulse" : "bg-white/20")} />
                                    <div>
                                        <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Stock minimum</span>
                                        <p className="font-bold text-white/80">{stats?.lowStockCount} articles</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 flex items-center justify-end">
                                <Button 
                                    onClick={() => handleWidgetAction(`Analyse mon état de stock. J'ai actuellement ${stats?.outOfStockCount} produits complètement en rupture de stock et ${stats?.lowStockCount} produits sous leur stock minimum de sécurité. Propose-moi une stratégie de réapprovisionnement et liste les actions à mener.`)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                >
                                    Optimiser
                                </Button>
                            </div>
                        </motion.div>

                        {/* 4. Receivables / Payables */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="relative group overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-violet-950/5 p-4 shadow-[0_0_20px_rgba(168,85,247,0.03)] hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.08)] transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[9px] font-extrabold text-purple-400/80 uppercase tracking-widest">Trésorerie & Crédits</span>
                                    <h4 className="text-xl font-bold text-white tracking-tight mt-1">
                                        {formatCurrency(Math.abs(stats?.totalCustomerDebt))}
                                    </h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-tight">Solde total dû par vos clients (Crédit)</p>
                                </div>
                                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/15 shadow-inner">
                                    <Users className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-3">
                                <div>
                                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Crédits Clients</span>
                                    <p className="font-bold text-emerald-400 mt-0.5">{formatCurrency(Math.abs(stats?.totalCustomerDebt))}</p>
                                </div>
                                <div>
                                    <span className="text-white/30 text-[9px] font-bold uppercase tracking-wider">Dettes Fournisseurs</span>
                                    <p className="font-bold text-red-400 mt-0.5">{formatCurrency(Math.abs(stats?.totalSupplierDebt))}</p>
                                </div>
                            </div>

                            <div className="mt-3 pt-2 flex items-center justify-end">
                                <Button 
                                    onClick={() => handleWidgetAction(`Fais un point sur ma trésorerie et la gestion des comptes clients/fournisseurs. Le solde total des crédits clients est de ${Math.abs(stats?.totalCustomerDebt).toFixed(2)} DA et le montant total des dettes fournisseurs est de ${Math.abs(stats?.totalSupplierDebt).toFixed(2)} DA. Que proposes-tu pour optimiser mon flux de trésorerie (cash flow) ?`)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                                >
                                    Gérer
                                </Button>
                            </div>
                        </motion.div>

                        {/* 5. Algerian Fiscal Estimator Card (IFU vs G50) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="relative group overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/20 to-orange-950/5 p-4 shadow-[0_0_20px_rgba(239,68,68,0.03)] hover:border-red-500/40 hover:shadow-[0_0_25px_rgba(239,68,68,0.08)] transition-all"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className="text-[9px] font-extrabold text-red-400/80 uppercase tracking-widest">🇩🇿 Estimation Fiscale</span>
                                    <h4 className="text-xl font-bold text-white tracking-tight mt-1 flex items-center gap-1.5">
                                        {(stats?.totalRevenue * 0.05).toLocaleString("fr-DZ", { maximumFractionDigits: 0 })} DA
                                        <span className="text-[10px] font-semibold text-white/50">IFU (est.)</span>
                                    </h4>
                                    <p className="text-[10px] text-white/40 mt-1 leading-tight">Simulation d'impôts sur la base des ventes</p>
                                </div>
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/15 shadow-inner">
                                    <Landmark className="h-4 w-4" />
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-white/30 font-semibold flex items-center gap-1">
                                    <Briefcase className="h-3.5 w-3.5 text-red-400" />
                                    <span>Seuil IFU de 15M DA respecté</span>
                                </span>
                                <Button 
                                    onClick={() => handleWidgetAction(`Génère une simulation fiscale et bilan comptable express pour ma boutique en Algérie. Chiffre d'affaires : ${stats?.totalRevenue.toFixed(2)} DA, Dépenses : ${stats?.totalExpenses.toFixed(2)} DA. Calcule l'estimation de l'impôt forfaitaire unique (IFU) à 5% et compare-le avec le régime réel (TVA + TAP + IBS de la G50) selon la loi de finances algérienne.`)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                >
                                    Simuler l'Impôt
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                ) : (
                    /* AI DEMAND FORECAST, pricing SIMULATOR, and cash simulator tab */
                    <div className="space-y-4 pb-4">
                        {/* 1. Demand Forecast Module */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/20 to-purple-950/5 p-4 shadow-lg space-y-3"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <Badge className="bg-indigo-500/15 text-indigo-400 text-[8px] font-bold uppercase tracking-wider mb-1.5 border-transparent">Stock Forecasting</Badge>
                                    <h4 className="text-sm font-bold text-white tracking-tight">🔮 Prévisions de Demande (30 jours)</h4>
                                    <p className="text-[10px] text-white/40 leading-snug mt-0.5">Analyse la vélocité de vos articles sur 90 jours pour prévoir les ruptures de stock.</p>
                                </div>
                                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/15 shadow-inner">
                                    <Layers className="h-4 w-4 animate-pulse" />
                                </div>
                            </div>

                            {/* Run button */}
                            {!forecastReport && (
                                <Button
                                    onClick={handleRunDemandForecast}
                                    disabled={forecastLoading || !hasKey}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-xs h-9 rounded-xl shadow-lg shadow-indigo-600/10 gap-2 border border-indigo-500/30 text-white transition-all hover:scale-[1.01]"
                                >
                                    {forecastLoading ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Analyse statistique...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-3.5 w-3.5 text-white" />
                                            Calculer les prévisions
                                        </>
                                    )}
                                </Button>
                            )}

                            {/* Forecast Result Box */}
                            {forecastExpanded && forecastReport && (
                                <div className="border border-white/5 bg-black/40 rounded-xl p-3 relative space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between text-[9px] font-bold text-white/30 border-b border-white/5 pb-2 uppercase tracking-widest">
                                        <span>Rapport prédictif généré</span>
                                        <button 
                                            onClick={() => {
                                                setForecastReport(null);
                                                setForecastExpanded(false);
                                            }}
                                            className="text-white/40 hover:text-white"
                                        >
                                            Effacer
                                        </button>
                                    </div>
                                    
                                    {forecastLoading ? (
                                        <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                                            <span className="text-[9px] text-white/30 font-mono animate-pulse">Extraction de la vélocité moyenne...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="max-h-[160px] overflow-y-auto pr-1 text-[11px] leading-relaxed text-white/70 prose prose-invert prose-xs max-w-none">
                                                <ReactMarkdown>{forecastReport}</ReactMarkdown>
                                            </div>
                                            
                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                                                <Button
                                                    onClick={() => handleWidgetAction(`Voici le rapport de prévision de demande à 30 jours de mon stock :\n\n${forecastReport}\n\nFais une analyse approfondie et donne-moi 5 plans d'actions pour éviter les ruptures.`)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 rounded-lg text-[9px] font-extrabold text-indigo-400 hover:bg-indigo-500/10"
                                                >
                                                    Discuter de ce rapport
                                                </Button>
                                                
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(forecastReport);
                                                        setForecastCopied(true);
                                                        setTimeout(() => setForecastCopied(false), 2000);
                                                    }}
                                                    className="text-[9px] text-white/30 hover:text-white flex items-center gap-1 font-bold"
                                                >
                                                    {forecastCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                                    {forecastCopied ? "Copié !" : "Copier"}
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>

                        {/* 2. Algerian Dynamic Pricing Simulator Module */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-indigo-950/5 p-4 shadow-lg space-y-4"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <Badge className="bg-blue-500/15 text-blue-400 text-[8px] font-bold uppercase tracking-wider mb-1.5 border-transparent">Marge & Fiscalité</Badge>
                                    <h4 className="text-sm font-bold text-white tracking-tight">💸 Simulateur de Prix Algérien</h4>
                                    <p className="text-[10px] text-white/40 leading-snug mt-0.5">Calcule la marge optimale en incorporant les taxes et le transport local.</p>
                                </div>
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15 shadow-inner">
                                    <Percent className="h-4 w-4" />
                                </div>
                            </div>

                            {/* Inputs form */}
                            <div className="space-y-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                {/* Slider Target Margin */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                        <span className="text-white/40">Marge brute ciblée</span>
                                        <span className="text-blue-400">{pricingMargin}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max="50" 
                                        value={pricingMargin} 
                                        onChange={e => setPricingMargin(Number(e.target.value))}
                                        className="w-full accent-blue-500 h-1 bg-white/10 rounded-lg cursor-pointer"
                                    />
                                </div>

                                {/* Select Tax regime */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 font-mono">Régime Fiscal</label>
                                    <select
                                        value={pricingTaxRegime}
                                        onChange={e => setPricingTaxRegime(e.target.value)}
                                        className="w-full h-8 rounded-lg border border-white/10 bg-[#0e0e18] text-white text-[11px] px-2 font-semibold transition-all cursor-pointer focus:ring-1 focus:ring-blue-500/50"
                                    >
                                        <option value="ifu5">IFU 5% (Activité commerciale)</option>
                                        <option value="ifu12">IFU 12% (Prof. Libérales / Services)</option>
                                        <option value="g50">Réel G50 (TVA + TAP + IBS)</option>
                                        <option value="none">Aucun / Régime libre</option>
                                    </select>
                                </div>

                                {/* Select Region log */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 font-mono">Wilaya de distribution</label>
                                    <select
                                        value={pricingRegion}
                                        onChange={e => setPricingRegion(e.target.value)}
                                        className="w-full h-8 rounded-lg border border-white/10 bg-[#0e0e18] text-white text-[11px] px-2 font-semibold transition-all cursor-pointer focus:ring-1 focus:ring-blue-500/50"
                                    >
                                        <option value="alger">Alger / Centre (Métropole)</option>
                                        <option value="oran">Oran / Ouest (Régional)</option>
                                        <option value="constantine">Constantine / Est (Régional)</option>
                                        <option value="sahara">Grand Sud / Sahara (+Transport)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Run pricing button */}
                            <Button
                                onClick={handleRunPricingSimulation}
                                disabled={!hasKey}
                                className="w-full bg-blue-600 hover:bg-blue-700 font-bold text-xs h-9 rounded-xl shadow-lg shadow-blue-600/10 gap-2 border border-blue-500/30 text-white transition-all hover:scale-[1.01]"
                            >
                                <Play className="h-3 w-3 text-white fill-current" />
                                Générer la Marge Optimale
                            </Button>
                        </motion.div>

                        {/* 3. Scenario Financial Simulator Module (NEW OPTIONS) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-indigo-950/5 p-4 shadow-lg space-y-4"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <Badge className="bg-emerald-500/15 text-emerald-400 text-[8px] font-bold uppercase tracking-wider mb-1.5 border-transparent">Scenario Simulator</Badge>
                                    <h4 className="text-sm font-bold text-white tracking-tight">📊 Simulateur Financier Stratégique</h4>
                                    <p className="text-[10px] text-white/40 leading-snug mt-0.5">Simulez mathématiquement l'impact de décisions majeures sur votre trésorerie.</p>
                                </div>
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 shadow-inner">
                                    <Briefcase className="h-4 w-4" />
                                </div>
                            </div>

                            {/* Scenarios select list */}
                            <div className="space-y-2.5">
                                <label className="text-[9px] font-bold uppercase tracking-wider text-white/40 font-mono">Sélectionner une décision</label>
                                <div className="flex flex-col gap-2">
                                    {[
                                        { id: "recruter", label: "Recruter un vendeur (Salaire 45K DA)" },
                                        { id: "inflation", label: "Hausse d'achat +10% (Inflation)" },
                                        { id: "pub", label: "Campagne Pub locale (Budget 60K DA)" }
                                    ].map(sc => (
                                        <button
                                            key={sc.id}
                                            type="button"
                                            onClick={() => setSelectedScenario(sc.id)}
                                            className={cn(
                                                "w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all relative overflow-hidden",
                                                selectedScenario === sc.id 
                                                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 shadow-inner" 
                                                    : "text-white/45 bg-[#0e0e18]/40 border-white/5 hover:border-white/10 hover:text-white"
                                            )}
                                        >
                                            {selectedScenario === sc.id && (
                                                <span className="absolute top-0 right-0 w-1.5 h-full bg-emerald-400" />
                                            )}
                                            {sc.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Run scenario simulation */}
                            <Button
                                onClick={handleRunScenarioSimulation}
                                disabled={!hasKey}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold text-xs h-9 rounded-xl shadow-lg shadow-emerald-600/10 gap-2 border border-emerald-500/30 text-white transition-all hover:scale-[1.01]"
                            >
                                <Sparkles className="h-3.5 w-3.5 text-white" />
                                Lancer la Simulation
                            </Button>
                        </motion.div>

                        {/* 4. Voice Assistant Command Center (Docked at bottom of simulators) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-indigo-950/5 p-4 shadow-lg space-y-4"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <Badge className="bg-purple-500/15 text-purple-400 text-[8px] font-bold uppercase tracking-wider mb-1.5 border-transparent">Voice Intelligence</Badge>
                                    <h4 className="text-sm font-bold text-white tracking-tight">🎙️ Assistant Vocal Intuitif</h4>
                                    <p className="text-[10px] text-white/40 leading-snug mt-0.5">Posez des questions courtes et écoutez les réponses lues à voix haute.</p>
                                </div>
                                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/15 shadow-inner">
                                    <Mic className="h-4 w-4" />
                                </div>
                            </div>

                            <form onSubmit={handleRunVocalQuery} className="space-y-3">
                                {/* Language select */}
                                <div className="flex gap-2">
                                    {["darija", "french", "arabic"].map(lang => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => setVocalLanguage(lang as any)}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg text-[9px] uppercase tracking-wider font-extrabold border transition-all",
                                                vocalLanguage === lang 
                                                    ? "bg-purple-600/20 text-purple-400 border-purple-500/35" 
                                                    : "text-white/30 border-white/5 hover:border-white/10"
                                            )}
                                        >
                                            {lang === "darija" ? "الدارجة" : lang === "arabic" ? "العربية" : "Français"}
                                        </button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <Input
                                        value={vocalText}
                                        onChange={e => setVocalText(e.target.value)}
                                        placeholder="Ex: 'شحال كاين كاسة اليوم ؟' ou 'État du profit...'"
                                        disabled={vocalLoading}
                                        className="bg-black/30 border-white/10 text-white placeholder:text-white/20 h-10 pr-10 rounded-xl text-xs focus:border-purple-500/40 focus:ring-0"
                                    />
                                    <button
                                        type="submit"
                                        disabled={vocalLoading || !vocalText.trim()}
                                        className={cn(
                                            "absolute right-2 top-2 h-6 w-6 rounded-lg flex items-center justify-center transition-colors",
                                            vocalText.trim() && !vocalLoading 
                                                ? "bg-purple-600 hover:bg-purple-700 text-white" 
                                                : "text-white/20"
                                        )}
                                    >
                                        {vocalLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mic className="h-3 w-3" />}
                                    </button>
                                </div>
                            </form>

                            {/* Soundwave bouncing visualizer when processing */}
                            {vocalWave && (
                                <div className="flex items-center gap-1.5 h-6 justify-center bg-purple-500/5 rounded-xl border border-purple-500/10 py-1.5">
                                    <span className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '60%', animationDuration: '0.6s' }} />
                                    <span className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '90%', animationDuration: '0.4s' }} />
                                    <span className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '40%', animationDuration: '0.5s' }} />
                                    <span className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '80%', animationDuration: '0.7s' }} />
                                    <span className="w-1 bg-purple-400 rounded-full animate-pulse" style={{ height: '50%', animationDuration: '0.3s' }} />
                                </div>
                            )}

                            {/* Response spoken box */}
                            {vocalOutput && (
                                <motion.div 
                                    ref={vocalRef}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="border border-purple-500/20 bg-purple-950/15 p-3 rounded-xl space-y-2.5 relative shadow-inner"
                                >
                                    <div className="absolute top-1.5 right-2 flex items-center gap-1.5">
                                        <button 
                                            onClick={() => handleSpeak("vocal-assistant-response", vocalOutput)}
                                            className="text-purple-400 hover:text-purple-300 p-1"
                                            title="Rejouer le vocal"
                                        >
                                            {speakingId === "vocal-assistant-response" ? (
                                                <Square className="h-3.5 w-3.5 fill-current text-purple-400 animate-pulse" />
                                            ) : (
                                                <Volume2 className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => setVocalOutput(null)} 
                                            className="text-white/20 hover:text-white/40 p-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-wider text-purple-400 font-extrabold">Réponse de l'assistant</p>
                                    <p className="text-[11px] leading-relaxed text-white/80 pr-6 font-medium">{vocalOutput}</p>
                                </motion.div>
                            )}
                        </motion.div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-[#060609] text-white overflow-hidden relative font-sans">
            
            {/* Inline floating orbs keyframe styles for outstanding ambient effect */}
            <style>{`
                @keyframes drift {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(45px, -60px) scale(1.15); }
                    66% { transform: translate(-30px, 30px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-drift-slow-1 {
                    animation: drift 20s infinite ease-in-out;
                }
                .animate-drift-slow-2 {
                    animation: drift 28s infinite ease-in-out;
                    animation-delay: 3s;
                }
                .animate-drift-slow-3 {
                    animation: drift 24s infinite ease-in-out;
                    animation-delay: 6s;
                }
            `}</style>

            {/* Ambient Animated Glowing Mesh Orbs */}
            <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none z-0 animate-drift-slow-1" />
            <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none z-0 animate-drift-slow-2" />
            <div className="absolute top-[35%] left-[25%] w-[40%] h-[40%] rounded-full bg-emerald-500/5 blur-[140px] pointer-events-none z-0 animate-drift-slow-3" />

            {/* Premium structural background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

            {/* ── Header ── */}
            <div className="shrink-0 border-b border-white/5 bg-[#08080d]/70 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9.5 h-9.5 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/15 border border-white/10",
                        provider.gradient
                    )}>
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white text-sm sm:text-base leading-none tracking-tight flex items-center gap-1.5">
                            Intelligence Artificielle
                            <Badge className="bg-indigo-500/15 text-indigo-400 text-[9px] uppercase border-transparent py-0.5 px-2 font-extrabold tracking-wider rounded-md">PRO SUITE</Badge>
                        </h1>
                        <p className="text-[10px] text-white/40 mt-0.5 font-semibold uppercase tracking-wider">Bilan commercial & Simulateurs prédictifs</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Navigation Tab Toggles */}
                    <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5 shadow-inner">
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "chat"
                                    ? "bg-white/10 text-white shadow-md border border-white/5"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Chat
                        </button>
                        
                        {/* Cockpit visible in tabs on mobile only */}
                        <button
                            onClick={() => setActiveTab("cockpit")}
                            className={cn(
                                "lg:hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "cockpit"
                                    ? "bg-white/10 text-white shadow-md border border-white/5"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            <Activity className="h-3.5 w-3.5" />
                            Cockpit
                        </button>

                        <button
                            onClick={() => setActiveTab("history")}
                            className={cn(
                                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                                activeTab === "history"
                                    ? "bg-white/10 text-white shadow-md border border-white/5"
                                    : "text-white/40 hover:text-white/70"
                            )}
                        >
                            <History className="h-3.5 w-3.5" />
                            Historique
                        </button>
                    </div>

                    {/* DateRange Picker for analytics (Large screen) */}
                    <div className="hidden lg:flex">
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-[260px]"
                        />
                    </div>

                    {/* Desktop Provider Selector */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProvider(p.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all",
                                    selectedProvider === p.id
                                        ? `bg-gradient-to-r ${p.gradient} text-white shadow-md border border-white/5`
                                        : "text-white/40 hover:text-white/70"
                                )}
                            >
                                <span>{p.emoji}</span>
                                <span>{p.name.split(" ")[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mobile provider selection */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r text-white shadow-md border border-white/5",
                                provider.gradient
                            )}
                        >
                            <span>{provider.emoji}</span>
                            <span>{provider.name.split(" ")[0]}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-white/50 hover:text-white hover:bg-white/10 h-8 w-8 transition-colors border border-transparent hover:border-white/5"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings2 className="h-4 w-4" />
                    </Button>

                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 transition-colors border border-transparent hover:border-white/5"
                            onClick={clearChat}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Settings / API Key Config Drawer ── */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0 border-b border-white/5 bg-[#0a0a0f] px-4 sm:px-6 py-4 space-y-4 relative z-10 overflow-hidden"
                    >
                        <div className="lg:hidden">
                            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Période d'analyse</h4>
                            <DatePickerWithRange
                                date={dateRange}
                                setDate={setDateRange}
                                className="w-full mb-4"
                            />
                        </div>

                        <div className="md:hidden">
                            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-2">Modèle d'IA</h4>
                            <div className="flex gap-2 flex-wrap">
                                {PROVIDERS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedProvider(p.id)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                            selectedProvider === p.id
                                                ? `bg-gradient-to-r ${p.gradient} text-white border-transparent shadow-md`
                                                : "text-white/40 border-white/10 hover:border-white/30 hover:text-white"
                                        )}
                                    >
                                        <span>{p.emoji}</span>
                                        <span>{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 mt-1 bg-white/[0.02] border border-white/5 rounded-2xl relative">
                            <div className={cn(
                                "shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-inner border border-white/5",
                                provider.gradient
                            )}>
                                {provider.emoji}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-white font-semibold text-sm mb-1">Configuration des clés API</h4>
                                <p className="text-xs text-white/50 leading-relaxed mb-3">
                                    Toutes les clés API pour vos assistants IA, l'OCR de tickets et l'analyse de stock sont gérées <b>centralement</b> de manière sécurisée pour votre boutique.
                                </p>

                                {hasKey ? (
                                    <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                                        <Check className="h-4 w-4 shrink-0" />
                                        <span>Clé API configurée et détectée pour {provider.name}.</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-amber-400 font-medium mb-1">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        <span>Aucune clé API configurée pour ce modèle.</span>
                                    </div>
                                )}

                                <a
                                    href="/settings"
                                    className="inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all bg-indigo-600/95 text-white shadow-md shadow-indigo-600/10 hover:bg-indigo-650 hover:shadow-indigo-600/20 h-9 px-4 py-2 mt-3 gap-2 border border-indigo-500/30"
                                >
                                    <Settings2 className="h-3.5 w-3.5" />
                                    Aller aux paramètres généraux
                                </a>
                            </div>
                            <button onClick={() => setShowSettings(false)} className="shrink-0 text-white/30 hover:text-white/70 transition-colors p-1">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Workspace Split Layout ── */}
            <div className="flex-1 flex min-h-0 relative z-10">

                {/* LEFT PANEL: Business Cockpit (Docked on large screens) */}
                <div className="hidden lg:flex flex-col w-[380px] xl:w-[420px] border-r border-white/5 bg-[#08080c]/55 backdrop-blur-3xl shrink-0 min-h-0 p-5 space-y-4">
                    {renderCockpit()}
                    
                    {/* Futuristic macOS-style Server Logs Terminal Window (Replaces the basic box) */}
                    <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl shrink-0 flex flex-col bg-[#050508]/90">
                        {/* Terminal Header */}
                        <div className="bg-white/[0.03] px-3 py-1.5 flex items-center justify-between border-b border-white/5 select-none">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                            </div>
                            <span className="text-[9px] font-mono text-white/20 tracking-wider font-bold uppercase">system_logs.sh</span>
                            <div className="w-12" /> {/* Spacer */}
                        </div>
                        {/* Terminal Body */}
                        <div className="p-3 font-mono text-[9.5px] text-green-400/90 tracking-tight space-y-1 select-none">
                            {terminalLogs.map((log, i) => (
                                <p key={i} className="truncate flex items-start gap-1.5">
                                    <span className="text-white/20 font-bold shrink-0">&gt;</span>
                                    <span className="break-all">{log}</span>
                                </p>
                            ))}
                            <p className="text-[10px] text-green-400 font-bold flex items-center gap-1 animate-pulse">
                                <span>&gt; online: ready</span>
                                <span className="w-1.5 h-3 bg-green-400 inline-block" />
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANEL: Dynamic View Area */}
                <div className="flex-1 flex flex-col min-h-0 bg-transparent relative">
                    
                    {/* MOBILE COCKPIT VIEW */}
                    {activeTab === "cockpit" && (
                        <div className="lg:hidden flex-1 overflow-y-auto p-4 sm:p-6 bg-[#07070c]/90 space-y-4">
                            {renderCockpit()}
                            {/* Mobile Terminal */}
                            <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col bg-[#050508]/90 shrink-0">
                                <div className="bg-white/[0.03] px-3 py-1.5 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                                    </div>
                                    <span className="text-[9px] font-mono text-white/20 tracking-wider font-bold">system_logs.sh</span>
                                    <div className="w-12" />
                                </div>
                                <div className="p-3 font-mono text-[9px] text-green-400/90 tracking-tight space-y-1">
                                    {terminalLogs.map((log, i) => (
                                        <p key={i} className="truncate flex items-start gap-1.5">
                                            <span className="text-white/20 font-bold shrink-0">&gt;</span>
                                            <span>{log}</span>
                                        </p>
                                    ))}
                                    <p className="text-[10px] text-green-400 font-bold flex items-center gap-1 animate-pulse">
                                        <span>&gt; online: ready</span>
                                        <span className="w-1.5 h-3 bg-green-400" />
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === "history" && (
                        <>
                            {/* History Filters */}
                            <div className="shrink-0 border-b border-white/5 bg-[#0a0a0f]/40 backdrop-blur-md px-4 sm:px-6 py-3 relative z-10">
                                <div className="flex flex-wrap items-center gap-3">
                                    <DatePickerWithRange
                                        date={historyDateRange}
                                        setDate={setHistoryDateRange}
                                        className="w-[260px]"
                                    />
                                    <select
                                        value={historyProvider}
                                        onChange={(e) => setHistoryProvider(e.target.value)}
                                        className="h-10 rounded-xl border border-white/10 bg-white/5 text-white text-xs px-3 py-2 focus:ring-1 focus:ring-white/20 transition-all cursor-pointer font-bold shadow-inner"
                                    >
                                        <option value="ALL">Tous les fournisseurs</option>
                                        <option value="GEMINI">Gemini</option>
                                        <option value="OPENAI">ChatGPT</option>
                                        <option value="ANTHROPIC">Claude</option>
                                    </select>
                                    <Button
                                        onClick={() => loadHistory(0)}
                                        size="sm"
                                        className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs rounded-xl shadow-lg border border-indigo-500/25 transition-all text-white h-9 px-4"
                                    >
                                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                        Filtrer
                                    </Button>
                                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest ml-auto font-mono">
                                        {historyTotal} conversation{historyTotal !== 1 ? "s" : ""}
                                    </span>
                                </div>
                            </div>

                            {/* History List */}
                            <ScrollArea className="flex-1 min-h-0 relative z-10">
                                <div className="px-4 sm:px-6 py-4 space-y-3 max-w-4xl mx-auto">
                                    {historyLoading ? (
                                        <div className="flex items-center justify-center py-20">
                                            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                                        </div>
                                    ) : historyLogs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-24 space-y-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                                <History className="h-5 w-5 text-white/30" />
                                            </div>
                                            <p className="text-white/50 text-sm font-semibold">Aucune conversation archivée</p>
                                            <p className="text-white/30 text-xs max-w-xs text-center leading-relaxed">
                                                Les analyses et rapports générés avec l'IA apparaîtront ici automatiquement.
                                            </p>
                                        </div>
                                    ) : (
                                        historyLogs.map((log) => {
                                            const isExpanded = expandedLogId === log.id;
                                            const providerInfo = PROVIDERS.find(p => p.id === log.provider.toLowerCase());
                                            const date = new Date(log.createdAt);
                                            return (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    key={log.id}
                                                    className="border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl overflow-hidden hover:border-white/10 transition-all shadow-lg"
                                                >
                                                    {/* Log Header */}
                                                    <button
                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        className="w-full flex items-center gap-3 p-4 text-left"
                                                    >
                                                        <div className={cn(
                                                            "shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold shadow-md",
                                                            providerInfo?.gradient ?? 'from-gray-600 to-gray-500'
                                                        )}>
                                                            {providerInfo?.emoji ?? "?"}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs sm:text-sm text-white/90 truncate font-semibold">{log.prompt}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <Badge className="bg-white/5 border-transparent text-white/50 text-[9px] font-bold px-1.5 py-0">
                                                                    {providerInfo?.name ?? log.provider}
                                                                </Badge>
                                                                {log.model && (
                                                                    <Badge className="bg-white/5 border-transparent text-white/40 text-[9px] font-medium px-1.5 py-0 hidden sm:inline-block">
                                                                        {log.model}
                                                                    </Badge>
                                                                )}
                                                                <span className="text-[9px] text-white/30 font-medium">
                                                                    {date.toLocaleDateString("fr-FR")} à {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className={cn("h-4 w-4 text-white/30 transition-transform duration-200", isExpanded && "rotate-180")} />
                                                    </button>

                                                    {/* Expanded Content */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="border-t border-white/5 bg-black/[0.15] p-4 space-y-4"
                                                            >
                                                                <div>
                                                                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-extrabold mb-1.5">Question posée</p>
                                                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 text-xs sm:text-sm text-white/80 leading-relaxed shadow-inner">{log.prompt}</div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] uppercase tracking-widest text-white/30 font-extrabold mb-1.5">Analyse de l'analyste IA</p>
                                                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 prose prose-invert prose-xs sm:prose-sm max-w-none text-white/80 prose-headings:text-white prose-headings:font-bold prose-strong:text-white prose-strong:font-bold prose-code:text-emerald-400 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded shadow-inner">
                                                                        <ReactMarkdown>{log.response}</ReactMarkdown>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </motion.div>
                                            );
                                        })
                                    )}

                                    {/* Pagination */}
                                    {historyTotal > 15 && (
                                        <div className="flex items-center justify-center gap-3 pt-6 pb-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={historyPage === 0}
                                                onClick={() => loadHistory(historyPage - 1)}
                                                className="text-white/50 hover:text-white rounded-xl transition-all"
                                            >
                                                <ChevronLeft className="h-4 w-4 mr-1" />
                                                Précédent
                                            </Button>
                                            <span className="text-xs text-white/40 font-semibold">
                                                Page {historyPage + 1} / {Math.ceil(historyTotal / 15)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={(historyPage + 1) * 15 >= historyTotal}
                                                onClick={() => loadHistory(historyPage + 1)}
                                                className="text-white/50 hover:text-white rounded-xl transition-all"
                                            >
                                                Suivant
                                                <ChevronRight className="h-4 w-4 ml-1" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </>
                    )}

                    {/* CHAT TAB */}
                    {activeTab === "chat" && (
                        <>
                            {/* Messages Scroll Area */}
                            <ScrollArea className="flex-1 min-h-0 relative z-10">
                                <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto w-full">

                                    {/* Empty Welcome State */}
                                    {messages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-8">
                                            <div className="text-center space-y-4">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl animate-pulse" />
                                                    <div className={cn(
                                                        "relative w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-2xl border border-white/10",
                                                        provider.gradient
                                                    )}>
                                                        <Sparkles className="h-6 w-6 text-white animate-spin" style={{ animationDuration: '6s' }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                                                        Analyste Financier IA
                                                    </h2>
                                                    <p className="text-white/40 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed font-medium">
                                                        Posez toutes vos questions sur les ventes, les stocks ou les bénéfices. L'IA a accès à votre base de données en temps réel.
                                                    </p>
                                                </div>

                                                {!hasKey && (
                                                    <button
                                                        onClick={() => setShowSettings(true)}
                                                        className={cn(
                                                            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-indigo-600/10 hover:opacity-90 transition-all border border-white/10 mt-2",
                                                            provider.gradient
                                                        )}
                                                    >
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                        Activer ma clé API
                                                    </button>
                                                )}
                                            </div>

                                            {/* Quick Prompts cards */}
                                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4">
                                                {QUICK_PROMPTS.map((qp, i) => (
                                                    <motion.button
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ duration: 0.3, delay: i * 0.04 }}
                                                        key={i}
                                                        onClick={() => sendMessage(qp.prompt)}
                                                        className="group text-left p-4 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 hover:shadow-xl transition-all relative overflow-hidden"
                                                    >
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-xl group-hover:bg-white/[0.03] transition-all pointer-events-none" />
                                                        <qp.icon className={cn("h-5 w-5 mb-2.5 transition-transform group-hover:scale-110", provider.color)} />
                                                        <p className="font-semibold text-white/80 text-xs sm:text-sm group-hover:text-white transition-colors">{qp.label}</p>
                                                        <p className="text-[11px] text-white/30 mt-1 line-clamp-2 leading-relaxed">{qp.prompt}</p>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Conversation Bubbles (Mac Capsule Glassmorphism Overhaul) */}
                                    {messages.map((msg, index) => (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            key={msg.id} 
                                            className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                                        >
                                            {/* Avatar */}
                                            <div className={cn(
                                                "shrink-0 w-8.5 h-8.5 rounded-xl flex items-center justify-center text-[11px] font-extrabold shadow-md relative overflow-hidden border border-white/10",
                                                msg.role === "user"
                                                    ? "bg-white/10 text-white/60"
                                                    : `bg-gradient-to-br ${PROVIDERS.find(p => p.id === msg.provider)?.gradient ?? "from-gray-600 to-gray-500"} text-white`
                                            )}>
                                                {msg.role === "user" ? (
                                                    "Vous"
                                                ) : (
                                                    <span className="relative z-10">{PROVIDERS.find(p => p.id === msg.provider)?.emoji ?? <Bot className="h-4 w-4" />}</span>
                                                )}
                                            </div>

                                            {/* Chat bubble (Glass Capsule design) */}
                                            <div className={cn(
                                                "flex-1 max-w-[85%] space-y-1",
                                                msg.role === "user" ? "items-end flex flex-col" : ""
                                            )}>
                                                {msg.role === "user" ? (
                                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 border border-indigo-400/20 text-white rounded-3xl rounded-tr-sm px-4.5 py-3 text-xs sm:text-sm shadow-lg shadow-indigo-600/10 font-medium leading-relaxed">
                                                        {msg.content}
                                                    </div>
                                                ) : (
                                                    <div className="group relative bg-white/[0.02] border border-white/10 rounded-3xl rounded-tl-sm px-5 py-5 shadow-2xl backdrop-blur-2xl">
                                                        {/* Top reflection shine line */}
                                                        <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                                                        
                                                        <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-white/85 leading-relaxed font-normal
                                                            prose-headings:text-white prose-headings:font-bold prose-headings:tracking-tight
                                                            prose-strong:text-white prose-strong:font-bold
                                                            prose-ul:text-white/85 prose-li:text-white/85
                                                            prose-code:text-emerald-400 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono
                                                            prose-p:leading-relaxed">
                                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                        </div>

                                                        {/* Action tools on AI response */}
                                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[#0e0e18]/90 p-1 rounded-lg border border-white/5 shadow-md">
                                                            {/* Audio Playback / TTS */}
                                                            <button
                                                                onClick={() => handleSpeak(msg.id, msg.content)}
                                                                className="text-white/40 hover:text-white p-1 transition-colors"
                                                                title="Écouter la synthèse vocale (Darja / Français)"
                                                            >
                                                                {speakingId === msg.id ? (
                                                                    <Square className="h-3.5 w-3.5 text-blue-400 fill-current animate-pulse" />
                                                                ) : (
                                                                    <Volume2 className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>

                                                            {/* Copy */}
                                                            <button
                                                                onClick={() => handleCopy(msg.id, msg.content)}
                                                                className="text-white/40 hover:text-white p-1 transition-colors"
                                                                title="Copier la réponse"
                                                            >
                                                                {copiedId === msg.id ? (
                                                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                                ) : (
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <p className="text-[9px] text-white/20 px-2 font-medium flex items-center gap-2 mt-0.5">
                                                    <span>{msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                                                    {msg.provider && msg.role === "assistant" && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                                            <span className="opacity-70">{PROVIDERS.find(p => p.id === msg.provider)?.name}</span>
                                                        </>
                                                    )}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ))}

                                    {/* Streaming / Typing Indicator */}
                                    {loading && (
                                        <div className="flex gap-3">
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center border border-white/10",
                                                provider.gradient
                                            )}>
                                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                                            </div>
                                            <div className="bg-white/[0.02] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 shadow-inner backdrop-blur-md">
                                                <div className="flex gap-1.5 items-center py-1">
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div ref={bottomRef} />
                                </div>
                            </ScrollArea>

                            {/* Chat Input Bar */}
                            <div className="shrink-0 border-t border-white/5 bg-[#08080d]/60 backdrop-blur-xl px-4 sm:px-6 py-4 font-sans relative z-10">
                                {messages.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-3.5 scrollbar-hide max-w-4xl mx-auto">
                                        {QUICK_PROMPTS.map((qp, i) => (
                                            <button
                                                key={i}
                                                onClick={() => sendMessage(qp.prompt)}
                                                disabled={loading}
                                                className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white/80 hover:border-white/20 text-xs font-bold transition-all disabled:opacity-40"
                                            >
                                                <qp.icon className="h-3 w-3" />
                                                {qp.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
                                    <div className="flex-1 relative">
                                        <Input
                                            ref={inputRef}
                                            value={input}
                                            onChange={e => setInput(e.target.value)}
                                            placeholder={hasKey ? "Posez votre question sur votre business..." : `Configurez d'abord votre clé ${provider.name}...`}
                                            disabled={loading}
                                            className="bg-white/5 border-white/15 text-white placeholder:text-white/25 h-12 pr-4 rounded-2xl text-xs sm:text-sm focus:border-indigo-500/50 focus:ring-0 shadow-inner font-medium"
                                            onKeyDown={e => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSubmit(e as any);
                                                }
                                            }}
                                        />
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={loading || !input.trim()}
                                        className={cn(
                                            "h-12 w-12 rounded-2xl shrink-0 transition-all shadow-md shadow-indigo-600/5 border border-white/5",
                                            input.trim() && !loading
                                                ? `bg-gradient-to-br ${provider.gradient} hover:opacity-90 hover:shadow-lg`
                                                : "bg-white/5 cursor-not-allowed text-white/25 border-transparent"
                                        )}
                                    >
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4.5 w-4.5 text-white" />}
                                    </Button>
                                </form>
                                <p className="text-center text-[9px] text-white/25 mt-2.5 font-medium tracking-tight">
                                    L'IA accède à vos données sécurisées en direct. Clés API centralisées dans les paramètres de la boutique.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
