"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, X, Sparkles, Languages, Play, Square } from "lucide-react";
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
                // Use console.warn instead of console.error to avoid triggering the Next.js Dev Overlay for common/handled browser API errors
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

    // Cleanup speech synthesis on unmount
    useEffect(() => {
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
            const result = await processVocalQuery(queryText, language);
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

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Match language profiles
        if (language === "french") {
            utterance.lang = "fr-FR";
        } else {
            utterance.lang = "ar-SA"; // standard Arabic synthesizer handles phonetics perfectly
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

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

    if (!isSupported) return null;

    return (
        <>
            {/* Custom breathing glow animations */}
            <style jsx global>{`
                @keyframes voice-pulsate {
                    0% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.8), 0 0 0 0 rgba(236, 72, 153, 0.5);
                    }
                    70% {
                        box-shadow: 0 0 0 15px rgba(99, 102, 241, 0), 0 0 0 10px rgba(236, 72, 153, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(99, 102, 241, 0), 0 0 0 0 rgba(236, 72, 153, 0);
                    }
                }
                .voice-pulse-active {
                    animation: voice-pulsate 1.6s infinite cubic-bezier(0.66, 0, 0, 1);
                }
            `}</style>

            {/* Widget Main UI */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 font-sans">
                {/* Speech & AI Dashboard Overlay Panel */}
                {isOpen && (
                    <div className="w-[340px] sm:w-[380px] bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 text-white transition-all transform duration-300 scale-100 ease-out">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Sparkles className="h-4 w-4 animate-spin-slow" />
                                <span className="font-bold text-sm tracking-wide">Assistant Vocal AI</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Language selector dropdown */}
                                <div className="flex items-center gap-1 bg-slate-800/60 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer select-none text-slate-300 hover:text-white border border-slate-700/50 hover:bg-slate-800">
                                    <Languages className="h-3 w-3 text-indigo-400" />
                                    <select 
                                        value={language}
                                        onChange={(e) => setLanguage(e.target.value as any)}
                                        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer pr-1"
                                    >
                                        <option value="french" className="bg-slate-900 text-white">Français</option>
                                        <option value="arabic" className="bg-slate-900 text-white">العربية</option>
                                        <option value="darija" className="bg-slate-900 text-white">الدارجة الجزائيرية</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={() => setIsOpen(false)} 
                                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Speech Bubble / Live transcription */}
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Votre Commande</span>
                            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-3 text-sm min-h-[50px] flex items-center text-slate-200">
                                {transcript || <span className="text-slate-500 italic">Appuyez sur le micro pour parler...</span>}
                            </div>
                        </div>

                        {/* AI response panel */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Réponse Audio</span>
                                {isSpeaking && (
                                    <button 
                                        onClick={stopSpeaking}
                                        className="flex items-center gap-1 text-[10px] text-red-400 font-semibold bg-red-950/20 px-2 py-0.5 rounded border border-red-900/50 hover:bg-red-950/40"
                                    >
                                        <Square className="h-2 w-2" /> Stop Audio
                                    </button>
                                )}
                            </div>
                            <div className={cn(
                                "bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3.5 text-sm min-h-[90px] text-slate-100 flex flex-col justify-between leading-relaxed shadow-inner",
                                loading && "animate-pulse"
                            )}>
                                <p className="mb-2">{aiResponse || <span className="text-slate-500 italic">Les informations vocales s'afficheront ici...</span>}</p>
                                
                                {aiResponse && !loading && (
                                    <div className="flex items-center justify-between border-t border-indigo-900/20 pt-2 mt-2">
                                        <button 
                                            onClick={() => speakText(aiResponse)}
                                            className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold hover:text-indigo-300"
                                        >
                                            <Play className="h-3 w-3 fill-current" /> Lire à haute voix
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
                        <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-2">
                            <span>Statut: {loading ? "Analyse Gemini en cours..." : isListening ? "Micro ouvert..." : "Prêt"}</span>
                            <span>Powered by Gemini AI</span>
                        </div>
                    </div>
                )}

                {/* Floating Microphone Action Pill */}
                <button
                    onClick={() => {
                        setIsOpen(true);
                        toggleListening();
                    }}
                    className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 transform shadow-xl border focus:outline-none",
                        isListening 
                            ? "bg-red-500 border-red-400 text-white voice-pulse-active scale-110" 
                            : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white hover:scale-105"
                    )}
                    title={isListening ? "Arrêter d'écouter" : "Parler à l'assistant AI"}
                >
                    {isListening ? (
                        <MicOff className="h-6 w-6 animate-pulse" />
                    ) : (
                        <Mic className="h-6 w-6" />
                    )}
                </button>
            </div>
        </>
    );
};
