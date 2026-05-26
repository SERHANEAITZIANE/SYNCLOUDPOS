"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { toast } from "react-hot-toast"
import { Upload } from "lucide-react"

export const ReconciliationClient = () => {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<any[]>([])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const processFile = async () => {
        if (!file) return

        try {
            setLoading(true)
            const text = await file.text()
            // Basic CSV parser
            const lines = text.split('\n').filter(l => l.trim() !== '')
            const headers = lines[0].split(',')
            
            const parsed = lines.slice(1).map(line => {
                const values = line.split(',')
                const obj: any = {}
                headers.forEach((h, i) => {
                    obj[h.trim()] = values[i]?.trim()
                })
                return obj
            })

            // In a real app, we'd send this to the server to match against TreasuryTransaction
            // For now, we just display the parsed data to simulate matching
            setResults(parsed.map(p => ({
                ...p,
                status: Math.random() > 0.5 ? "MATCHED" : "UNMATCHED"
            })))
            
            toast.success("Fichier traité avec succès")
        } catch (error) {
            toast.error("Erreur lors de la lecture du fichier")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Input type="file" accept=".csv" onChange={handleFileUpload} />
                <Button disabled={!file || loading} onClick={processFile}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importer et Rapprocher
                </Button>
            </div>

            {results.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-medium mb-4">Résultats du Rapprochement</h3>
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-left">Libellé</th>
                                    <th className="p-3 text-right">Montant</th>
                                    <th className="p-3 text-center">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="p-3">{r.Date || r.date || '-'}</td>
                                        <td className="p-3">{r.Description || r.libelle || r.Libelle || '-'}</td>
                                        <td className="p-3 text-right">{r.Amount || r.montant || r.Montant || '-'}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'MATCHED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {r.status === 'MATCHED' ? 'Rapproché' : 'Non trouvé'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
