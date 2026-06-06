"use client";

import { useState, useEffect } from "react";
import { Smartphone, X, Wifi, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


export function HeaderMobileConnect() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"gerant" | "tournee">("gerant");
    const [isLocal, setIsLocal] = useState(false);
    const [isMobileDevice, setIsMobileDevice] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const local = window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1" ||
                window.location.hostname.startsWith("192.168.");
            setIsLocal(local);

            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
            setIsMobileDevice(mobile);
        }
    }, []);

    const getAppDownloadUrl = (tab: "gerant" | "tournee") => {
        if (isLocal) {
            return "exp://192.168.0.132:8081";
        }
        const slug = tab === "gerant" ? "syncloud-gerant" : "syncloud-tournee";
        return `https://expo.dev/accounts/aitee/projects/${slug}/builds`;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <Smartphone className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-lg bg-[#05060b] border border-white/[0.05] rounded-[24px] text-white p-6 gap-4">
                <div className="absolute top-[-10%] right-[-10%] w-36 h-36 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-36 h-36 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

                <DialogHeader className="pb-3 border-b border-white/[0.03]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/15 shrink-0">
                            <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-sm font-black text-white uppercase tracking-wider">
                                Connexion Mobile App
                            </DialogTitle>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                Connectez instantanément votre appareil mobile à la caisse SynCloud.
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex p-0.5 rounded-xl bg-slate-950 border border-white/[0.03] mt-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab("gerant")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                            activeTab === "gerant"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                                : "text-slate-500 hover:text-slate-300 border border-transparent"
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "gerant" ? "bg-emerald-400 animate-pulse" : "bg-slate-700"}`} />
                        APPLICATION GÉRANT
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("tournee")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black tracking-wider transition-all cursor-pointer ${
                            activeTab === "tournee"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm"
                                : "text-slate-500 hover:text-slate-300 border border-transparent"
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "tournee" ? "bg-blue-400 animate-pulse" : "bg-slate-700"}`} />
                        APPLICATION TOURNÉE
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 mt-2 w-full">
                    {isMobileDevice ? (
                        <div className="flex flex-col items-center justify-center w-full p-5 bg-white/[0.02] border border-white/[0.05] rounded-2xl gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                                activeTab === "gerant" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            )}>
                                <Smartphone className="w-6 h-6 animate-pulse" />
                            </div>
                            <div className="text-center space-y-1">
                                <h5 className="font-black text-xs uppercase tracking-wider text-slate-200">Appareil Mobile Détecté</h5>
                                <p className="text-[10px] text-slate-500 leading-relaxed max-w-xs">
                                    Téléchargez l&apos;application caisse pour Android directement sur votre téléphone.
                                </p>
                            </div>
                            <Button
                                asChild
                                className={cn(
                                    "w-full py-5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-95",
                                    activeTab === "gerant" 
                                        ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-emerald-500/10 hover:from-emerald-500 hover:to-teal-400" 
                                        : "bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-blue-500/10 hover:from-blue-500 hover:to-indigo-400"
                                )}
                            >
                                <a href={getAppDownloadUrl(activeTab)} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                    Télécharger l&apos;APK ({activeTab})
                                </a>
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col items-center justify-center shrink-0">
                                <div 
                                    className="p-3 bg-white rounded-2xl shadow-xl relative transition-all duration-300 overflow-hidden"
                                    style={{
                                        border: `3px solid ${activeTab === "gerant" ? "#10b981" : "#3b82f6"}`
                                    }}
                                >
                                    <div 
                                        className="absolute left-0 right-0 h-0.5 z-10 opacity-70"
                                        style={{
                                            background: activeTab === "gerant" ? "#10b981" : "#3b82f6",
                                            boxShadow: `0 0 8px ${activeTab === "gerant" ? "#10b981" : "#3b82f6"}`,
                                            animation: "scanner-line 2.5s ease-in-out infinite"
                                        }}
                                    />
                                    <style>{`
                                        @keyframes scanner-line {
                                            0% { top: 0%; opacity: 0.3; }
                                            50% { top: 100%; opacity: 0.8; }
                                            100% { top: 0%; opacity: 0.3; }
                                        }
                                    `}</style>
                                    <QRCodeSVG
                                        value={getAppDownloadUrl(activeTab)}
                                        size={120}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <span className="text-[8px] uppercase tracking-widest font-black text-slate-500 mt-2">
                                    Scanner pour connecter
                                </span>
                            </div>

                            <div className="flex-1 space-y-3">
                                <h4 className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 flex items-center gap-1.5">
                                    <Wifi className="w-3.5 h-3.5" />
                                    CONSEILS DE CONNEXION :
                                </h4>
                                
                                <div className="space-y-2">
                                    <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                        <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">1</div>
                                        <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                            Scannez le QR code avec votre appareil pour charger la page de build.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                        <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">2</div>
                                        <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                            Téléchargez la dernière version APK et installez-la sur votre téléphone.
                                        </p>
                                    </div>
                                    <div className="flex gap-2 text-xs leading-relaxed text-slate-400">
                                        <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center shrink-0 text-[10px] font-black border border-slate-800">3</div>
                                        <p className="flex-1 text-[10px] font-medium leading-relaxed">
                                            Ouvrez l&apos;application et connectez-vous avec vos identifiants SynCloud.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-white/[0.02] flex flex-col space-y-1.5 mt-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        Lien de build direct :
                    </span>
                    <div className="bg-slate-900 px-3 py-2 rounded-lg border border-slate-950 overflow-x-auto flex items-center justify-between">
                        <code className="text-[9px] text-slate-400 break-all select-all font-mono">
                            {getAppDownloadUrl(activeTab)}
                        </code>
                        <button 
                            onClick={() => {
                                if (typeof navigator !== "undefined") {
                                    navigator.clipboard.writeText(getAppDownloadUrl(activeTab));
                                }
                            }}
                            className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 ml-2 uppercase shrink-0 cursor-pointer"
                        >
                            Copier
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
