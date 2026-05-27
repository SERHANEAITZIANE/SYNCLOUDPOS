"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Languages, Play, Square, Settings, Sliders, Info, HelpCircle } from "lucide-react";
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
    const [aiEngine, setAiEngine] = useState<"gemini" | "gpt4" | "claude">("gemini");
    const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
    const [voicePitch, setVoicePitch] = useState<number>(1.0);
    const [persona, setPersona] = useState<"pro" | "friendly" | "brief">("friendly");

    const recognitionRef = useRef<any>(null);
    const synthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Check if Web Speech API is supported
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition && typeof window !== "undefined" && window.speechSynthesis) {
            setIsSupported(true);
            
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;

            rec.onstart = () => {
                setIsListening(true);
                setTranscript("Listening / Écoute en cours...");
                // Stop any running speech synthesis
                window.speechSynthesis.cancel();
                setIsSpeaking(false);
            };

            rec.onerror = (event: any) => {
                if (event.error !== "no-speech" && event.error !== "not-allowed") {
                    console.error("Speech Recognition Error:", event.error);
                } else {
                    console.warn("Speech Recognition Info (Handled):", event.error);
                }
                if (event.error === "no-speech") {
                    setTranscript("Aucune voix détectée. Réessayez.");
                } else if (event.error === "not-allowed") {
                    setTranscript("Accès au microphone refusé. Veuillez autoriser le micro dans votre navigateur.");
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

    // Cleanup speech synthesis and warm up voices on mount/unmount
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            // Warm up voices catalog for Chrome/Edge asynchronous loading
            window.speechSynthesis.getVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = () => {
                    window.speechSynthesis.getVoices();
                };
            }
        }
        return () => {
            if (typeof window !== "undefined" && window.speechSynthesis) {
                window.speechSynthesis.cancel();
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

            const result = await processVocalQuery(promptText, language);
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
        if (typeof window === "undefined" || !window.speechSynthesis) return;

        window.speechSynthesis.cancel(); // Stop current speakings

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

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Dynamically detect language from the text content itself (Arabic vs French/Western)
        const hasArabic = /[\u0600-\u06FF]/.test(cleanText);
        
        if (hasArabic) {
            utterance.lang = "ar-SA"; // default fallback
            
            const voices = window.speechSynthesis.getVoices();
            // Search for any Arabic voice installed on the user's browser/system (preferring local service)
            const arVoice = voices.find(v => v.lang.toLowerCase().startsWith("ar") && v.localService)
                         || voices.find(v => v.lang.toLowerCase().startsWith("ar"));
            if (arVoice) {
                utterance.voice = arVoice;
                utterance.lang = arVoice.lang;
            }
        } else {
            utterance.lang = "fr-FR"; // default fallback
            
            const voices = window.speechSynthesis.getVoices();
            // Search for any French voice installed on the user's browser/system (preferring local service)
            const frVoice = voices.find(v => v.lang.toLowerCase().startsWith("fr") && v.localService)
                         || voices.find(v => v.lang.toLowerCase().startsWith("fr"));
            if (frVoice) {
                utterance.voice = frVoice;
                utterance.lang = frVoice.lang;
            }
        }

        // Apply dynamically configured speed and pitch options
        utterance.rate = voiceSpeed;
        utterance.pitch = voicePitch;

        utterance.onstart = () => {
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = (e) => {
            console.error("Speech Synthesis Error:", e);
            setIsSpeaking(false);
        };

        synthesisUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
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
            {/* Custom breathing glow & waveform animations */}
            <style jsx global>{`
                @keyframes voice-pulsate {
                    0% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.8), 0 0 0 0 rgba(0, 212, 170, 0.5);
                    }
                    70% {
                        box-shadow: 0 0 0 15px rgba(99, 102, 241, 0), 0 0 0 10px rgba(0, 212, 170, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0), 0 0 0 0 rgba(0, 212, 170, 0);
                    }
                }
                .voice-pulse-active {
                    animation: voice-pulsate 1.6s infinite cubic-bezier(0.66, 0, 0, 1);
                }
                .scrollbar-none::-webkit-scrollbar {
                    display: none;
                }
            `}</style>

            {/* Widget Main UI */}
            <div className="fixed bottom-6 right-6 z-50 hidden md:flex flex-col items-end gap-3 font-sans">
                
                {/* Speech & AI Dashboard Overlay Panel */}
                {isOpen && (
                    <div className="w-[350px] sm:w-[400px] bg-slate-950/95 border border-slate-800/80 rounded-3xl p-5 shadow-3xl flex flex-col gap-4 text-white transition-all transform duration-300 scale-100 ease-out backdrop-filter backdrop-blur-xl">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                                    <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-extrabold text-sm tracking-wide bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">Syncloud AI</span>
                                    <span className="text-[10px] text-slate-500 font-semibold leading-none mt-0.5">Assistant Vocal Intelligent</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                                {/* Language Select Chip */}
                                <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-800 text-slate-300 hover:text-white">
                                    <Languages className="h-3 w-3 text-indigo-400" />
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as any)}
                                        className="bg-transparent border-none outline-none text-[10px] font-extrabold cursor-pointer pr-1"
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
                                        "p-1.5 rounded-lg border border-slate-800 transition-all hover:bg-slate-900",
                                        showSettings ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/30" : "bg-slate-900/40 text-slate-400"
                                    )}
                                    title="Options avancées"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                </button>

                                {/* Close Button */}
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-white"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Options Settings View (Active Toggle) */}
                        {showSettings && (
                            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col gap-3.5 animate-lp-fade-in">
                                <div className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-400 uppercase tracking-wider">
                                    <Sliders className="h-3.5 w-3.5" />
                                    <span>Options & Personnalisation</span>
                                </div>

                                {/* AI Engine selector */}
                                <div className="grid grid-cols-2 items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium">Moteur IA :</span>
                                    <select
                                        value={aiEngine}
                                        onChange={(e) => setAiEngine(e.target.value as any)}
                                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs outline-none"
                                    >
                                        <option value="gemini">Gemini 2.5 Flash</option>
                                        <option value="gpt4">GPT-4o Mini (Pro)</option>
                                        <option value="claude">Claude 3.5 Haiku</option>
                                    </select>
                                </div>

                                {/* Voice Speed Slider */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Vitesse de lecture :</span>
                                        <span className="text-indigo-400 font-bold">{voiceSpeed}x</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.7"
                                        max="1.4"
                                        step="0.1"
                                        value={voiceSpeed}
                                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Voice Pitch Slider */}
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Hauteur de ton :</span>
                                        <span className="text-teal-400 font-bold">{voicePitch === 1 ? "Normal" : voicePitch < 1 ? "Grave" : "Aigu"}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.7"
                                        max="1.3"
                                        step="0.1"
                                        value={voicePitch}
                                        onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-teal-500"
                                    />
                                </div>

                                {/* AI Persona Styles */}
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-400 font-medium">Style de Réponse :</span>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {[
                                            { id: "friendly", label: "Chaleureux" },
                                            { id: "pro", label: "Pro / B2B" },
                                            { id: "brief", label: "Très Bref" }
                                        ].map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPersona(p.id as any)}
                                                className={cn(
                                                    "py-1 rounded-md text-[10px] font-bold border transition-all",
                                                    persona === p.id 
                                                        ? "bg-teal-500/10 border-teal-500/40 text-teal-300"
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
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Votre Commande</span>
                            {isSupported && (
                                <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-3.5 text-sm min-h-[50px] flex items-center text-slate-200 mb-1 relative overflow-hidden">
                                    {transcript || <span className="text-slate-500 italic">Appuyez sur le micro pour parler...</span>}
                                    {isListening && (
                                        <div className="absolute right-3 top-3 flex gap-0.5">
                                            <span className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Soundwave animation when listening */}
                            {isListening && (
                                <div className="flex items-center justify-center gap-1 py-1">
                                    <div className="w-1 h-4 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.6s' }} />
                                    <div className="w-1 h-8 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s', animationDuration: '0.5s' }} />
                                    <div className="w-1 h-6 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.7s' }} />
                                    <div className="w-1 h-9 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0.45s', animationDuration: '0.4s' }} />
                                    <div className="w-1 h-4 bg-red-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '0.8s' }} />
                                </div>
                            )}

                            {/* Text-Input fallback */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={typedQuery}
                                    onChange={(e) => setTypedQuery(e.target.value)}
                                    placeholder={isSupported ? "Ou tapez votre question..." : "Posez votre question..."}
                                    className="flex-1 bg-slate-900/70 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/80 focus:bg-slate-900 transition-all"
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
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold transition-all text-white border border-indigo-500/30"
                                >
                                    Envoyer
                                </button>
                            </div>

                            {/* Clickable Quick Suggestion Chips (User Friendly Queries) */}
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                    <HelpCircle className="h-3 w-3" />
                                    <span>Questions fréquentes</span>
                                </div>
                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                                    {SUGGESTIONS.map((sug, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setTranscript(sug.text);
                                                handleQuerySubmit(sug.text);
                                            }}
                                            className="bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-indigo-500/60 rounded-full px-2.5 py-1.5 text-[10px] font-bold text-indigo-300 hover:text-white transition-all whitespace-nowrap"
                                        >
                                            {sug.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* AI response panel */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Réponse Audio</span>
                                {isSpeaking && (
                                    <button 
                                        onClick={stopSpeaking}
                                        className="flex items-center gap-1 text-[9px] text-red-400 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-900/40 hover:bg-red-950/40"
                                    >
                                        <Square className="h-2 w-2 fill-current" /> Arrêter la voix
                                    </button>
                                )}
                            </div>
                            
                            {/* Soundwave animation when speaking */}
                            {isSpeaking && (
                                <div className="flex items-center justify-center gap-1 py-1">
                                    <div className="w-1 h-3 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '0.7s' }} />
                                    <div className="w-1 h-6 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
                                    <div className="w-1 h-7 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '0.8s' }} />
                                    <div className="w-1 h-4 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.6s', animationDuration: '0.5s' }} />
                                </div>
                            )}

                            <div className={cn(
                                "bg-indigo-950/15 border border-indigo-950 rounded-2xl p-4 text-sm min-h-[90px] text-slate-100 flex flex-col justify-between leading-relaxed shadow-inner",
                                loading && "animate-pulse border-indigo-800/40"
                            )}>
                                <p className="mb-2 text-slate-200">{aiResponse || <span className="text-slate-500 italic">L'assistant vocal parlera après votre commande...</span>}</p>
                                
                                {aiResponse && !loading && (
                                    <div className="flex items-center justify-between border-t border-indigo-950/40 pt-2 mt-2">
                                        <button 
                                            onClick={() => speakText(aiResponse)}
                                            className="flex items-center gap-1.5 text-xs text-indigo-400 font-extrabold hover:text-indigo-300"
                                        >
                                            <Play className="h-3 w-3 fill-current" /> Écouter à nouveau
                                        </button>
                                        <button 
                                            onClick={() => setIsMuted(!isMuted)}
                                            className="p-1 rounded text-slate-400 hover:text-white"
                                            title={isMuted ? "Activer le son" : "Muter le son"}
                                        >
                                            {isMuted ? <VolumeX className="h-4 w-4 text-red-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status bar */}
                        <div className="text-[9px] text-slate-600 flex items-center justify-between border-t border-slate-900/60 pt-2">
                            <span>Statut: {loading ? "Analyse Gemini AI..." : isListening ? "Micro activé..." : "En attente"}</span>
                            <span>Powered by {aiEngine === "gemini" ? "Gemini 2.5" : aiEngine === "gpt4" ? "GPT-4o" : "Claude 3.5"}</span>
                        </div>
                    </div>
                )}

                {/* Floating Microphone Action Pill */}
                <button
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (isSupported) {
                            toggleListening();
                        }
                    }}
                    className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 transform shadow-xl border focus:outline-none",
                        isListening 
                            ? "bg-red-500 border-red-400 text-white voice-pulse-active scale-110" 
                            : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white hover:scale-105"
                    )}
                    title={isSupported ? (isListening ? "Arrêter d'écouter" : "Parler à l'assistant AI") : "Ouvrir l'assistant AI"}
                >
                    {isSupported ? (
                        isListening ? (
                            <MicOff className="h-6 w-6 animate-pulse" />
                        ) : (
                            <Mic className="h-6 w-6" />
                        )
                    ) : (
                        <Sparkles className="h-6 w-6" />
                    )}
                </button>
            </div>
        </>
    );
};
