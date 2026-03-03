"use client"

import { useState, useEffect } from "react"
import { getLocalBackups, BackupFile } from "@/actions/backups"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Database, Download, Loader2, HardDriveDownload, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"

export function BackupsListClient() {
    const [backups, setBackups] = useState<BackupFile[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchBackups()
    }, [])

    const fetchBackups = async () => {
        setIsLoading(true)
        const res = await getLocalBackups()
        if (res.error) {
            setError(res.error)
        } else if (res.data) {
            setBackups(res.data)
        }
        setIsLoading(false)
    }

    const handleDownload = (filename: string) => {
        // In reality, we'd need a route handler to stream the file securely to the client.
        // E.g. /api/download-backup?file=filename
        // We'll mock the click for now or point to the route if we create it.
        window.location.href = `/api/download-backup?file=${filename}`
    }

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm">
                Erreur: {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Sauvegardes Locales (VPS)</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Les bases de données sont sauvegardées automatiquement chaque nuit par le script PM2.
                        Les archives de plus de 7 jours sont effacées pour économiser l'espace disque.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-4 h-4" />
                    Cron Actif
                </div>
            </div>

            {backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-slate-200 border-dashed rounded-2xl bg-slate-50">
                    <Database className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-slate-500 font-medium">Aucune sauvegarde trouvée.</p>
                    <p className="text-xs text-slate-400 mt-1">Le dossier /backups/ est actuellement vide.</p>
                </div>
            ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-5 py-3 font-medium text-slate-500">Fichier d'archive</th>
                                <th className="px-5 py-3 font-medium text-slate-500">Date de création</th>
                                <th className="px-5 py-3 font-medium text-slate-500">Taille</th>
                                <th className="px-5 py-3 font-medium text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {backups.map((b) => (
                                <tr key={b.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300 flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                            <HardDriveDownload className="w-4 h-4 text-indigo-500" />
                                        </div>
                                        {b.name}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                                        {format(new Date(b.date), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">
                                        {b.size}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => handleDownload(b.name)}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Télécharger
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
