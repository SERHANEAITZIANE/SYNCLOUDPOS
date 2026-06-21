import { Suspense } from "react"
import { ForecastClient } from "./components/forecast-client"

export default function AIForecastPage() {
    return (
        <div className="flex flex-col flex-1 h-full min-h-dvh">
            <div className="flex-1 p-4 md:p-8 pt-6 w-full max-w-6xl mx-auto space-y-6">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                        Prévisions IA (Demand Forecasting)
                    </h2>
                    <p className="text-muted-foreground mt-2">
                        Analysez vos 90 derniers jours de ventes et obtenez des recommandations intelligentes de réapprovisionnement générées par l'Intelligence Artificielle.
                    </p>
                </div>

                <Suspense fallback={<div className="h-64 rounded-xl border animate-pulse bg-muted" />}>
                    <ForecastClient />
                </Suspense>
            </div>
        </div>
    )
}
