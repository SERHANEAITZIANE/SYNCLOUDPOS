"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Languages, Play, Square, Settings, Sliders, HelpCircle, Send } from "lucide-react";
import { processVocalQuery } from "@/actions/voice-assistant";
import { cn } from "@/lib/utils";

export const VoiceAssistantWidget: React.FC = () => {
    const [isSupported, setIsSupported] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState<"darija" | "arabic" | "french">("french");
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [typedQuery, setTypedQuery] = useState("");

    // Widget settings options
    const [showSettings, setShowSettings] = useState(false);
    const [aiEngine, setAiEngine] = useState<"gemini" | "gpt4" | "claude">("gpt4"); // Default to gpt4 for premium quality
    const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
    const [persona, setPersona] = useState<"pro" | "friendly" | "brief">("friendly");

    const recognitionRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null); // Server-side Neural Edge TTS player

    useEffect(() => {
        // Check if Web Speech API is supported for microphone input
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition && typeof window !== "undefined") {
            setIsSupported(true);
            
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;

            rec.onstart = () => {
                setIsListening(true);
                setTranscript("Listening / Écoute en cours...");
                stopSpeaking();
            };

            rec.onerror = (event: any) => {
                if (event.error !== "no-speech" && event.error !== "not-allowed") {
                    console.error("Speech Recognition Error:", event.error);
                }
                if (event.error === "no-speech") {
                    setTranscript("Aucune voix détectée. Réessayez.");
                } else if (event.error === "not-allowed") {
                    setTranscript("Accès au microphone refusé. Veuillez l'autoriser.");
                } else {
                    setTranscript(`Erreur: ${event.error}`);
                }
                setIsListening(false);
            };

            rec.onend = () => {
                setIsListening(false);
            };

            rec.onresult = async (event: any) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
                await handleQuerySubmit(text);
            };

            recognitionRef.current = rec;
        }
    }, [language]);

    // Cleanup audio playback on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            // Configure voice language code
            if (language === "french") {
                recognitionRef.current.lang = "fr-FR";
            } else if (language === "arabic" || language === "darija") {
                recognitionRef.current.lang = "ar-DZ"; // Algerian Arabic context for transcription
            }
            recognitionRef.current.start();
        }
    };

    const handleQuerySubmit = async (queryText: string) => {
        if (!queryText.trim()) return;
        setLoading(true);
        setAiResponse("AI is thinking...");

        try {
            // Append persona styles to prompt text if brief
            let promptText = queryText;
            if (persona === "brief") {
                promptText += " (Réponds de manière extrêmement brève et directe)";
            } else if (persona === "friendly") {
                promptText += " (Réponds de manière chaleureuse, amicale et proche du commerçant)";
            }

            const result = await processVocalQuery(promptText, language, aiEngine);
            if (result.success) {
                setAiResponse(result.text);
                if (!isMuted) {
                    speakText(result.text);
                }
            } else {
                setAiResponse(result.text || "Une erreur est survenue.");
            }
        } catch (error) {
            console.error("Vocal query error:", error);
            setAiResponse("Erreur de connexion avec l'intelligence artificielle.");
        } finally {
            setLoading(false);
        }
    };

    const speakText = (text: string) => {
        if (typeof window === "undefined") return;

        // Stop and pause any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        // Helper function to strip markdown for clean Text-to-Speech
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

        setIsSpeaking(true);

        // Fetch high-quality neural voice stream from our server TTS
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
                
                // Adjust speed if set
                audio.playbackRate = voiceSpeed;
                
                audio.play()
                    .catch(err => {
                        console.error("Audio playback failed:", err);
                        setIsSpeaking(false);
                    });

                audio.onended = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                };
                audio.onerror = () => {
                    setIsSpeaking(false);
                    audioRef.current = null;
                };
            } else {
                setIsSpeaking(false);
            }
        })
        .catch(err => {
            console.error("TTS fetch error:", err);
            setIsSpeaking(false);
        });
    };

    const stopSpeaking = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setIsSpeaking(false);
    };

    // Quick suggestion questions based on the active language
    const SUGGESTIONS = {
        french: [
            { label: "🚀 Présentation", text: "Pouvez-vous me présenter SyncloudPOS ?" },
            { label: "💎 Tarifs", text: "Quels sont les différents tarifs et offres ?" },
            { label: "📱 Apps Mobiles", text: "Quelles sont les fonctionnalités des applications mobiles ?" },
            { label: "🔌 Hors-ligne", text: "Est-ce que le logiciel fonctionne sans connexion internet ?" }
        ],
        arabic: [
            { label: "🚀 لمحة عامة", text: "مرحبا، هل يمكنك تقديم شرح عن برنامج SyncloudPOS؟" },
            { label: "💎 الأسعار", text: "ما هي أسعار وعروض برنامج كاشير SyncloudPOS؟" },
            { label: "📱 التطبيقات", text: "ما هي مميزات تطبيقات الموبايل للمدير والسائق؟" },
            { label: "🔌 أوفلاين", text: "هل يشتغل البرنامج بدون اتصال إنترنت؟" }
        ],
        darija: [
            { label: "🚀 واش هادا؟", text: "فهمنا واش هوا هاد اللوجيسيال تاع كاشير؟" },
            { label: "💎 شحال السومة؟", text: "شحال يسوى هاد البروكرام وتكاليف تاعه؟" },
            { label: "📱 تطبيق تليفون", text: "واش نقدر ندير بتطبيقات الموبايل ؟" },
            { label: "🔌 بلا أنترنيت", text: "يمشي اللوجيسيال بلا كونيكسيون في المحل ؟" }
        ]
    }[language] || [];

    return (
        <>
            {/* Custom Premium Breathing Glow & Visualizer Animations */}
            <style jsx global>{`
                @keyframes orb-glow {
                    0% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7), 0 0 0 4px rgba(6, 182, 212, 0.3), 0 0 20px rgba(99, 102, 241, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 0 10px rgba(99, 102, 241, 0), 0 0 0 20px rgba(6, 182, 212, 0), 0 0 35px rgba(99, 102, 241, 0.6);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0), 0 0 0 0 rgba(6, 182, 212, 0), 0 0 20px rgba(99, 102, 241, 0.3);
                    }
                }
                @keyframes fluid-wave {
                    0%, 100% {
                        transform: scaleY(0.3);
                    }
                    50% {
                        transform: scaleY(1.0);
                    }
                }
                .orb-active-glow {
                    animation: orb-glow 2.0s infinite cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .visualizer-bar {
                    animation: fluid-wave 0.8s ease-in-out infinite;
                }
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Speech & AI Dashboard Overlay Panel */}
            {isOpen && (
                <div 
                    className={cn(
                        "flex flex-col text-white transition-all transform duration-300 ease-out backdrop-filter backdrop-blur-2xl border bg-slate-950/90 z-[999] shadow-2xl",
                        // Desktop positioning & size (floating card on right, with gradient neon-glow borders)
                        "md:fixed md:bottom-24 md:right-[96px] md:w-[420px] md:h-[650px] md:max-h-[80vh] md:rounded-[32px] md:border-slate-800/80 md:p-6",
                        // Mobile bottom sheet positioning & size (attached to bottom, full width, 80% height)
                        "fixed bottom-0 left-0 right-0 w-full h-[80vh] rounded-t-[36px] border-t border-slate-850 p-5"
                    )}
                >
                    {/* Cool mobile drag handle */}
                    <div className="w-14 h-1.5 bg-slate-800/60 rounded-full mx-auto mb-3 md:hidden shrink-0" />
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-850/60 pb-3 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-teal-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                                <Sparkles className="h-5 w-5 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-sm tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">SYNCLOUD AI</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Assistant Vocal</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* Language Select Chip */}
                            <div className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-300 transition-all">
                                <Languages className="h-3.5 w-3.5 text-indigo-400" />
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as any)}
                                    className="bg-transparent border-none outline-none text-[10px] font-black cursor-pointer pr-1"
                                >
                                    <option value="french" className="bg-slate-950 text-white">Français</option>
                                    <option value="arabic" className="bg-slate-950 text-white">العربية</option>
                                    <option value="darija" className="bg-slate-950 text-white">الدارجة</option>
                                </select>
                            </div>

                            {/* Settings Toggle Cog */}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={cn(
                                    "p-1.5 rounded-xl border transition-all hover:bg-slate-900",
                                    showSettings ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30" : "bg-slate-900/40 border-slate-800 text-slate-400"
                                )}
                                title="Options avancées"
                            >
                                <Settings className="h-4 w-4" />
                            </button>

                            {/* Close Button */}
                            <button 
                                onClick={() => setIsOpen(false)} 
                                className="p-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable content container for mobile friendliness */}
                    <div className="flex-1 overflow-y-auto space-y-4 pr-1 mt-4 scrollbar-none">
                        
                        {/* Options Settings View (Active Toggle) */}
                        {showSettings && (
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-400 uppercase tracking-widest">
                                    <Sliders className="h-4 w-4" />
                                    <span>Options & Personnalisation</span>
                                </div>

                                {/* AI Engine selector */}
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <span className="text-xs text-slate-400 font-bold">Moteur IA :</span>
                                    <select
                                        value={aiEngine}
                                        onChange={(e) => setAiEngine(e.target.value as any)}
                                        className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs outline-none text-slate-200 font-medium"
                                    >
                                        <option value="gpt4">GPT-4o (Ultra-Darija)</option>
                                        <option value="gemini">Gemini 2.0 (Stable)</option>
                                        <option value="claude">Claude 3.5 Sonnet</option>
                                    </select>
                                </div>

                                {/* Voice Speed Slider */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-bold">Vitesse de lecture :</span>
                                        <span className="text-indigo-400 font-extrabold">{voiceSpeed}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.8"
                                        max="1.3"
                                        step="0.1"
                                        value={voiceSpeed}
                                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* AI Persona Styles */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-400 font-bold">Style de Réponse :</span>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: "friendly", label: "Chaleureux" },
                                            { id: "pro", label: "Professionnel" },
                                            { id: "brief", label: "Très Bref" }
                                        ].map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPersona(p.id as any)}
                                                className={cn(
                                                    "py-1.5 rounded-lg text-[10px] font-black border transition-all",
                                                    persona === p.id 
                                                        ? "bg-teal-500/10 border-teal-500/30 text-teal-300"
                                                        : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-white"
                                                )}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Speech Bubble / Live transcription */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Votre Commande</span>
                            {isSupported && (
                                <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-4 text-sm min-h-[56px] flex items-center text-slate-200 mb-1 relative overflow-hidden">
                                    {transcript || <span className="text-slate-500 italic">Appuyez sur le micro pour parler...</span>}
                                    {isListening && (
                                        <div className="absolute right-4 top-4 flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Siri-like visualizer wave when listening */}
                            {isListening && (
                                <div className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/20 border border-slate-900/60 rounded-xl">
                                    <div className="w-1 h-5 bg-red-400 rounded-full visualizer-bar" style={{ animationDelay: "0s", animationDuration: "0.5s" }} />
                                    <div className="w-1 h-9 bg-red-500 rounded-full visualizer-bar" style={{ animationDelay: "0.1s", animationDuration: "0.4s" }} />
                                    <div className="w-1 h-7 bg-red-400 rounded-full visualizer-bar" style={{ animationDelay: "0.2s", animationDuration: "0.6s" }} />
                                    <div className="w-1 h-10 bg-rose-500 rounded-full visualizer-bar" style={{ animationDelay: "0.3s", animationDuration: "0.3s" }} />
                                    <div className="w-1 h-6 bg-red-500 rounded-full visualizer-bar" style={{ animationDelay: "0.4s", animationDuration: "0.5s" }} />
                                </div>
                            )}

                            {/* Text-Input fallback */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={typedQuery}
                                    onChange={(e) => setTypedQuery(e.target.value)}
                                    placeholder={isSupported ? "Ou tapez votre question..." : "Posez votre question..."}
                                    className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 focus:bg-slate-900/70 transition-all font-medium"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleQuerySubmit(typedQuery);
                                            setTypedQuery("");
                                        }
                                    }}
                                />
                                <button 
                                    onClick={() => {
                                        handleQuerySubmit(typedQuery);
                                        setTypedQuery("");
                                    }}
                                    className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white border border-indigo-500/30 transition-all flex items-center justify-center"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Clickable Quick Suggestion Chips (User Friendly Queries) */}
                            <div className="flex flex-col gap-1.5 mt-2">
                                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                    <HelpCircle className="h-3 w-3" />
                                    <span>Questions fréquentes</span>
                                </div>
                                <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none" style={{ scrollbarWidth: "none" }}>
                                    {SUGGESTIONS.map((sug, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setTranscript(sug.text);
                                                handleQuerySubmit(sug.text);
                                            }}
                                            className="bg-slate-900/40 hover:bg-indigo-650/15 border border-slate-850 hover:border-indigo-500/50 rounded-full px-3 py-1.5 text-[10px] font-bold text-indigo-300 hover:text-white transition-all whitespace-nowrap"
                                        >
                                            {sug.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI response panel */}
                        <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Réponse Assistant</span>
                                {isSpeaking && (
                                    <button 
                                        onClick={stopSpeaking}
                                        className="flex items-center gap-1.5 text-[10px] text-red-400 font-black bg-red-950/20 px-2.5 py-1 rounded-lg border border-red-900/40 hover:bg-red-950/40 transition-all"
                                    >
                                        <Square className="h-2.5 w-2.5 fill-current" /> Arrêter
                                    </button>
                                )}
                            </div>
                            
                            {/* Siri-like voice playback wave */}
                            {isSpeaking && (
                                <div className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900/10 border border-slate-900/40 rounded-xl">
                                    <div className="w-1 h-4 bg-indigo-400 rounded-full visualizer-bar" style={{ animationDelay: "0.1s", animationDuration: "0.6s" }} />
                                    <div className="w-1 h-7 bg-indigo-500 rounded-full visualizer-bar" style={{ animationDelay: "0.3s", animationDuration: "0.5s" }} />
                                    <div className="w-1 h-8 bg-purple-500 rounded-full visualizer-bar" style={{ animationDelay: "0.5s", animationDuration: "0.7s" }} />
                                    <div className="w-1 h-5 bg-indigo-400 rounded-full visualizer-bar" style={{ animationDelay: "0.2s", animationDuration: "0.4s" }} />
                                </div>
                            )}

                            <div className={cn(
                                "bg-indigo-950/10 border border-indigo-900/30 rounded-2xl p-4 text-sm min-h-[100px] text-slate-100 flex flex-col justify-between leading-relaxed shadow-inner overflow-y-auto max-h-[25vh] md:max-h-none",
                                loading && "animate-pulse border-indigo-500/20 bg-indigo-950/20"
                            )}>
                                <p className="mb-3 text-slate-200 font-medium">{aiResponse || <span className="text-slate-500 italic">L'assistant vocal parlera après votre commande...</span>}</p>
                                
                                {aiResponse && !loading && (
                                    <div className="flex items-center justify-between border-t border-indigo-950/40 pt-3 mt-1">
                                        <button 
                                            onClick={() => speakText(aiResponse)}
                                            className="flex items-center gap-1.5 text-xs text-indigo-400 font-black hover:text-indigo-300 transition-colors"
                                        >
                                            <Play className="h-3 w-3 fill-current" /> Réécouter
                                        </button>
                                        <button 
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                                            title={isMuted ? "Activer le son" : "Muter le son"}
                                        >
                                            {isMuted ? <VolumeX className="h-4.5 w-4.5 text-red-400" /> : <Volume2 className="h-4.5 w-4.5 text-emerald-400" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status bar */}
                    <div className="text-[9px] text-slate-600 flex items-center justify-between border-t border-slate-900/60 pt-3 shrink-0 font-bold uppercase tracking-wider">
                        <span>Statut: {loading ? "Analyse..." : isListening ? "Écoute..." : "En attente"}</span>
                        <span>Mode {aiEngine.toUpperCase()}</span>
                    </div>
                </div>
            )}

            {/* Premium Floating Controller & Microphone Orb */}
            <div 
                className={cn(
                    "fixed z-50 flex font-sans transition-all duration-300",
                    // Stack vertically on mobile viewports above WhatsApp button (WhatsApp sits at right-6 bottom-6)
                    "bottom-[96px] right-6 flex-col items-end gap-3",
                    // Align side-by-side on desktop viewports
                    "md:right-[96px] md:bottom-6 md:flex-row md:items-center md:gap-4"
                )}
            >
                {/* Micro Orb with Dynamic Breathing Auras */}
                <button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (isSupported) {
                            toggleListening();
                        }
                    }}
                    className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 transform shadow-2xl border focus:outline-none relative group overflow-visible",
                        isListening 
                            ? "bg-gradient-to-r from-red-500 to-rose-600 border-red-400 text-white orb-active-glow scale-110" 
                            : "bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 border-indigo-500/40 text-white hover:scale-105"
                    )}
                    title={isSupported ? (isListening ? "Arrêter d'écouter" : "Parler à l'assistant AI") : "Ouvrir l'assistant AI"}
                >
                    {/* Premium Pulse rings when idle/listening */}
                    {!isListening && (
                        <span className="absolute inset-0 rounded-full bg-indigo-500/20 opacity-0 group-hover:opacity-100 group-hover:animate-ping duration-1000 -z-10" />
                    )}
                    
                    {isSupported ? (
                        isListening ? (
                            <MicOff className="h-6 w-6 animate-pulse" />
                        ) : (
                            <Mic className="h-6 w-6" />
                        )
                    ) : (
                        <Sparkles className="h-6 w-6 animate-pulse" />
                    )}
                </button>
            </div>
        </>
    );
};
