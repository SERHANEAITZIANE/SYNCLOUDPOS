"use client"

import { useEffect } from "react"
import { Database, AlertTriangle, RefreshCw, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "@/i18n/routing"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    const router = useRouter()

    useEffect(() => {
        console.error("Dashboard Error Caught:", error)
    }, [error])

    // Detect if this is likely a database connection error from Prisma
    const isDbError =
        error.message?.toLowerCase().includes("prisma") ||
        error.message?.toLowerCase().includes("database") ||
        error.message?.toLowerCase().includes("connect") ||
        error.message?.toLowerCase().includes("econnrefused") ||
        error.message?.toLowerCase().includes("timeout");

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 text-center space-y-6">

                {isDbError ? (
                    <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                        <Database size={32} />
                    </div>
                ) : (
                    <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={32} />
                    </div>
                )}

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                        {isDbError ? "Connexion Perdue" : "Une erreur est survenue"}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isDbError
                            ? "Impossible de communiquer avec la base de données. Vérifiez que votre serveur (MySQL/SQLite) est en ligne ou que la chaîne de connexion est correcte."
                            : "L'application a rencontré un problème inattendu lors du chargement des données."}
                    </p>
                </div>

                {isDbError && (
                    <div className="bg-gray-100 dark:bg-gray-900 rounded p-3 text-xs text-left font-mono overflow-auto text-gray-600 dark:text-gray-400 max-h-32">
                        {error.message}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                    <Button
                        onClick={() => reset()}
                        className="w-full sm:w-auto flex items-center gap-2"
                        variant={isDbError ? "default" : "default"}
                    >
                        <RefreshCw size={16} />
                        Réessayer
                    </Button>

                    {isDbError && (
                        <Button
                            onClick={() => router.push("/settings")}
                            variant="outline"
                            className="w-full sm:w-auto flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <Settings size={16} />
                            Régler la connexion
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
