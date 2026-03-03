"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Trash2, Settings2, ChevronDown, Sparkles, TrendingUp, Package, Users, DollarSign, AlertTriangle, BarChart3, X, Eye, EyeOff, Loader2, Copy, Check, Volume2, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

// ─── Types ─────────────────────────────────────────────────────────────────

type Provider = "gemini" | "openai" | "claude" | "kimi";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    provider?: Provider;
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
}

export function AiClient({ dbProvider, dbKeys }: AiClientProps) {
    const initialProvider = (dbProvider?.toLowerCase() as Provider) || "gemini";
    // Check if the provider actually exists in the array
    const validProvider = PROVIDERS.find(p => p.id === initialProvider) ? initialProvider : "gemini";
    const [selectedProvider, setSelectedProvider] = useState<Provider>(validProvider);

    const [showKey, setShowKey] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [speakingId, setSpeakingId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const synthRef = useRef<SpeechSynthesis | null>(null);

    const provider = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[0];
    const currentKey = dbKeys[selectedProvider] || "";
    const hasKey = currentKey.trim().length > 3;

    // Scroll to bottom on new message
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    // Initialize speech synthesis
    useEffect(() => {
        if (typeof window !== "undefined") {
            synthRef.current = window.speechSynthesis;
        }
        return () => {
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    const handleSpeak = (id: string, text: string) => {
        if (!synthRef.current) return;

        // If it's already speaking this exact message, stop it
        if (speakingId === id) {
            synthRef.current.cancel();
            setSpeakingId(null);
            return;
        }

        // Stop any currently playing audio
        synthRef.current.cancel();

        // Remove markdown tokens for cleaner speech
        const cleanText = text.replace(/[#*`_~\[\]()]/g, ' ').replace(/> /g, '').trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "fr-FR";

        utterance.onend = () => {
            setSpeakingId(prev => (prev === id ? null : prev));
        };
        utterance.onerror = () => {
            setSpeakingId(prev => (prev === id ? null : prev));
        };

        setSpeakingId(id);
        synthRef.current.speak(utterance);
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

        // Build history for context (last 10 messages)
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
    }, [loading, hasKey, messages, selectedProvider, currentKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const clearChat = () => {
        setMessages([]);
        inputRef.current?.focus();
    };

    return (
        <div className="flex flex-col h-screen bg-[#0a0a0f] text-white overflow-hidden">

            {/* ── Header ── */}
            <div className="shrink-0 border-b border-white/5 bg-[#0d0d15]/80 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${provider.gradient} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="font-semibold text-white text-sm sm:text-base leading-none">Intelligence IA</h1>
                        <p className="text-[11px] text-white/40 mt-0.5">Analyse de données & rapports dynamiques</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* DateRange Picker */}
                    <div className="hidden lg:flex">
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-[260px]"
                        />
                    </div>

                    {/* Provider Pills */}
                    <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1">
                        {PROVIDERS.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProvider(p.id)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    selectedProvider === p.id
                                        ? `bg-gradient-to-r ${p.gradient} text-white shadow-sm`
                                        : "text-white/50 hover:text-white/80"
                                )}
                            >
                                <span>{p.emoji}</span>
                                <span>{p.name.split(" ")[0]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Mobile: provider dropdown button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r ${provider.gradient} text-white`}
                        >
                            <span>{provider.emoji}</span>
                            <span>{provider.name.split(" ")[0]}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl text-white/60 hover:text-white hover:bg-white/10 h-8 w-8"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings2 className="h-4 w-4" />
                    </Button>

                    {messages.length > 0 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8"
                            onClick={clearChat}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Settings Panel ── */}
            {showSettings && (
                <div className="shrink-0 border-b border-white/5 bg-[#0d0d15] px-4 sm:px-6 py-4 space-y-4">
                    {/* Mobile DateRange Picker & Provider Selector */}
                    <div className="lg:hidden">
                        <h4 className="text-white/70 text-xs font-semibold uppercase mb-2">Période d'analyse</h4>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full mb-4"
                        />
                    </div>

                    <div className="md:hidden">
                        <h4 className="text-white/70 text-xs font-semibold uppercase mb-2">Modèle d'IA</h4>
                        <div className="flex gap-2 flex-wrap">
                            {PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedProvider(p.id)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                        selectedProvider === p.id
                                            ? `bg-gradient-to-r ${p.gradient} text-white border-transparent`
                                            : "text-white/50 border-white/10 hover:border-white/30"
                                    )}
                                >
                                    <span>{p.emoji}</span>
                                    <span>{p.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key Instructions */}
                    <div className="flex items-start gap-4 p-4 mt-2 bg-white/5 rounded-lg border border-white/10">
                        <div className={`shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${provider.gradient} flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                            {provider.emoji}
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">Authentification {provider.name}</h4>
                            <p className="text-sm text-white/70 mb-3">
                                Pour des raisons de sécurité et pour que l'IA fonctionne avec vos données comme l'OCR de reçus, toutes les clés API sont maintenant gérées <b>centralement</b>.
                            </p>

                            {hasKey ? (
                                <div className="flex items-center gap-2 text-sm text-emerald-400">
                                    <Check className="h-4 w-4" />
                                    <span>Clé API configurée et détectée.</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Aucune clé API configurée pour ce fournisseur.</span>
                                </div>
                            )}

                            <a
                                href="/settings"
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-indigo-600 text-white shadow hover:bg-indigo-700 h-9 px-4 py-2 mt-2"
                            >
                                <Settings2 className="mr-2 h-4 w-4" />
                                Aller aux paramètres de la boutique
                            </a>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="shrink-0 text-white/30 hover:text-white/60 p-1">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── Messages Area ── */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto">

                    {/* Welcome State */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-8">
                            <div className="text-center space-y-3">
                                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${provider.gradient} flex items-center justify-center shadow-2xl`}>
                                    <Sparkles className="h-8 w-8 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Analyste IA</h2>
                                <p className="text-white/50 text-sm max-w-sm mx-auto">
                                    Posez n'importe quelle question sur votre business. L'IA accède à vos données en temps réel.
                                </p>
                                {!hasKey && (
                                    <button
                                        onClick={() => setShowSettings(true)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${provider.gradient} text-white text-sm font-bold shadow-lg hover:opacity-90 transition-opacity`}
                                    >
                                        <Settings2 className="h-4 w-4" />
                                        Configurer ma clé API
                                    </button>
                                )}
                            </div>

                            {/* Quick Prompts */}
                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {QUICK_PROMPTS.map((qp, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(qp.prompt)}
                                        className="group text-left p-4 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15 transition-all"
                                    >
                                        <qp.icon className={`h-5 w-5 mb-2 ${provider.color}`} />
                                        <p className="font-semibold text-white/80 text-sm group-hover:text-white transition-colors">{qp.label}</p>
                                        <p className="text-xs text-white/35 mt-1 line-clamp-2">{qp.prompt}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map(msg => (
                        <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>

                            {/* Avatar */}
                            <div className={cn(
                                "shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shadow-lg",
                                msg.role === "user"
                                    ? "bg-white/10 text-white/60"
                                    : `bg-gradient-to-br ${PROVIDERS.find(p => p.id === msg.provider)?.gradient ?? "from-gray-600 to-gray-500"} text-white`
                            )}>
                                {msg.role === "user" ? "Vous" : (PROVIDERS.find(p => p.id === msg.provider)?.emoji ?? <Bot className="h-4 w-4" />)}
                            </div>

                            {/* Bubble */}
                            <div className={cn(
                                "flex-1 max-w-[85%] space-y-1",
                                msg.role === "user" ? "items-end flex flex-col" : ""
                            )}>
                                {msg.role === "user" ? (
                                    <div className="bg-white/10 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white/90">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="group relative bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-4">
                                        <div className="prose prose-invert prose-sm max-w-none text-white/85
                                            prose-headings:text-white prose-headings:font-bold
                                            prose-strong:text-white prose-strong:font-semibold
                                            prose-ul:text-white/80 prose-li:text-white/80
                                            prose-code:text-emerald-400 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded
                                            prose-p:leading-relaxed">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                        {/* Speak button */}
                                        <button
                                            onClick={() => handleSpeak(msg.id, msg.content)}
                                            className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
                                            title="Écouter"
                                        >
                                            {speakingId === msg.id ? <Square className="h-3.5 w-3.5 text-blue-400 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                                        </button>
                                        {/* Copy button */}
                                        <button
                                            onClick={() => handleCopy(msg.id, msg.content)}
                                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/70 transition-all"
                                            title="Copier"
                                        >
                                            {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                                <p className="text-[10px] text-white/25 px-1">
                                    {msg.timestamp.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                                    {msg.provider && msg.role === "assistant" && (
                                        <span className="ml-2 opacity-70">{PROVIDERS.find(p => p.id === msg.provider)?.name}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Loading */}
                    {loading && (
                        <div className="flex gap-3">
                            <div className={`shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br ${provider.gradient} flex items-center justify-center`}>
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                            </div>
                            <div className="bg-white/5 border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                                <div className="flex gap-1.5 items-center">
                                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </ScrollArea>

            {/* ── Input Bar ── */}
            <div className="shrink-0 border-t border-white/5 bg-[#0d0d15]/80 backdrop-blur-xl px-4 sm:px-6 py-4">
                {/* Quick prompts shortcut row (visible when chat is active) */}
                {messages.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                        {QUICK_PROMPTS.slice(0, 4).map((qp, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(qp.prompt)}
                                disabled={loading}
                                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/55 hover:text-white/80 hover:border-white/25 text-xs font-medium transition-all disabled:opacity-40"
                            >
                                <qp.icon className="h-3 w-3" />
                                {qp.label}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                    <div className="flex-1 relative">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder={hasKey ? "Posez votre question sur votre business..." : `Configurez d'abord votre clé ${provider.name}...`}
                            disabled={loading}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 pr-4 rounded-2xl text-sm focus:border-white/30 focus:ring-0"
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
                            "h-12 w-12 rounded-2xl shrink-0 transition-all shadow-lg",
                            input.trim() && !loading
                                ? `bg-gradient-to-br ${provider.gradient} hover:opacity-90`
                                : "bg-white/10 cursor-not-allowed"
                        )}
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                </form>
                <p className="text-center text-[10px] text-white/20 mt-2">
                    L'IA accède à vos données en temps réel. Les clés API sont stockées localement sur votre appareil.
                </p>
            </div>
        </div>
    );
}
