"use client"

import { useState } from "react"
import { getAIDemandForecast } from "@/actions/ai-forecast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, BrainCircuit, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react"
import ReactMarkdown from "react-markdown"
import toast from "react-hot-toast"

export function ForecastClient() {
    const [isLoading, setIsLoading] = useState(false)
    const [forecastData, setForecastData] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const handleGenerate = async () => {
        setIsLoading(true)
        setError(null)
        setForecastData(null)

        try {
            const res = await getAIDemandForecast()
            if (res.error) {
                setError(res.error)
                toast.error(res.error)
            } else if (res.data) {
                setForecastData(res.data)
                toast.success("Prévisions générées avec succès ! 🎉")
            }
        } catch (e: any) {
            setError(`Une erreur inattendue: ${e.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {!forecastData && !isLoading && (
                <div className="relative overflow-hidden border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-8 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-900 dark:to-indigo-950 shadow-sm">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
                        <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 ring-8 ring-white dark:ring-slate-900 shadow-sm">
                            <BrainCircuit className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-balance">
                            Boostez votre gestion de stock avec l'IA
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg text-balance">
                            Nous allons analyser vos ventes des 3 derniers mois (top 100 produits) pour prédire exactement ce que vous devez recommander pour les 30 prochains jours.
                        </p>

                        <Button
                            onClick={handleGenerate}
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 group"
                        >
                            <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                            Lancer l'Analyse Prédictive
                        </Button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-20 animate-pulse" />
                        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
                    </div>
                    <h3 className="text-xl font-semibold mt-6 text-slate-800 dark:text-slate-200">
                        Traitement neuronal en cours...
                    </h3>
                    <p className="text-slate-500 mt-2">Analyse de l'historique de vos commandes et calcul des projections 🚀</p>
                </div>
            )}

            {error && !isLoading && (
                <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-4 text-red-800 dark:text-red-400">
                    <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-lg mb-1">Échec de la prévision</h4>
                        <p>{error}</p>
                        <Button variant="outline" size="sm" className="mt-4 border-red-200 text-red-700 hover:bg-red-100" onClick={handleGenerate}>
                            Réessayer
                        </Button>
                    </div>
                </div>
            )}

            {forecastData && !isLoading && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl">
                                <BrainCircuit className="w-5 h-5" />
                            </div>
                            <h3 className="text-xl font-bold">Rapport d'Intelligence Artificielle</h3>
                        </div>
                        <Button onClick={handleGenerate} variant="outline" size="sm" className="rounded-full shadow-sm">
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Actualiser
                        </Button>
                    </div>

                    <Card className="border-indigo-100 dark:border-indigo-900/40 shadow-xl shadow-indigo-100/20 dark:shadow-none overflow-hidden rounded-3xl">
                        <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                        <CardContent className="p-8 prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:leading-relaxed prose-li:marker:text-indigo-500">
                            <ReactMarkdown>{forecastData}</ReactMarkdown>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
