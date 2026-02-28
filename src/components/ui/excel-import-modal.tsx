"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { FileSpreadsheet, Upload, Download, X, Check, Loader2, AlertTriangle } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"

interface ColumnMap {
    label: string      // Column header shown in template
    key: string        // Object key to map to
}

interface ExcelImportModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    columns: ColumnMap[]
    onImport: (rows: Record<string, string>[]) => Promise<{ success?: string; error?: string; errors?: number }>
    templateFileName?: string
}

export function ExcelImportModal({
    isOpen,
    onClose,
    title,
    description,
    columns,
    onImport,
    templateFileName = "template"
}: ExcelImportModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [previewing, setPreviewing] = useState<Record<string, string>[]>([])
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ success?: string; error?: string; errors?: number } | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        setFile(f)
        setResult(null)

        const reader = new FileReader()
        reader.onload = (ev) => {
            const data = ev.target?.result
            const wb = XLSX.read(data, { type: "binary" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

            // Map columns: find by header label (case-insensitive)
            const mapped = raw.map((row) => {
                const obj: Record<string, string> = {}
                for (const col of columns) {
                    // Try to find the column by its label (or the key itself)
                    const found = Object.keys(row).find(k =>
                        k.toLowerCase().trim() === col.label.toLowerCase().trim() ||
                        k.toLowerCase().trim() === col.key.toLowerCase().trim()
                    )
                    obj[col.key] = found ? String(row[found] ?? "") : ""
                }
                return obj
            })
            setPreviewing(mapped.slice(0, 5))
        }
        reader.readAsBinaryString(f)
    }

    const handleImport = async () => {
        if (!file) return
        setImporting(true)

        const reader = new FileReader()
        reader.onload = async (ev) => {
            const data = ev.target?.result
            const wb = XLSX.read(data, { type: "binary" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" })

            const mapped = raw.map((row) => {
                const obj: Record<string, string> = {}
                for (const col of columns) {
                    const found = Object.keys(row).find(k =>
                        k.toLowerCase().trim() === col.label.toLowerCase().trim() ||
                        k.toLowerCase().trim() === col.key.toLowerCase().trim()
                    )
                    obj[col.key] = found ? String(row[found] ?? "") : ""
                }
                return obj
            }).filter(r => Object.values(r).some(v => v.trim()))

            try {
                const res = await onImport(mapped)
                setResult(res)
                if (res.success) {
                    toast.success(res.success + (res.errors ? ` (${res.errors} erreurs)` : ""))
                } else if (res.error) {
                    toast.error(res.error)
                }
            } catch {
                setResult({ error: "Erreur lors de l'import" })
            } finally {
                setImporting(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.label), columns.map(() => "")])
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Template")
        XLSX.writeFile(wb, `${templateFileName}.xlsx`)
    }

    const handleClose = () => {
        setFile(null)
        setPreviewing([])
        setResult(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-500" />
                        {title}
                    </DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <div className="space-y-4">
                    {/* Download template */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                        <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Télécharger le modèle Excel</p>
                            <p className="text-xs text-muted-foreground">Colonnes: {columns.map(c => c.label).join(", ")}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={downloadTemplate}>
                            Modèle
                        </Button>
                    </div>

                    {/* File upload */}
                    <div
                        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        {file ? (
                            <div className="flex items-center justify-center gap-2 text-sm font-medium text-green-600">
                                <Check className="h-4 w-4" />
                                {file.name}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Cliquez ou déposez un fichier <span className="font-medium">.xlsx / .xls / .csv</span>
                            </p>
                        )}
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Preview */}
                    {previewing.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Aperçu (5 premières lignes) :</p>
                            <div className="overflow-auto max-h-40 rounded border text-xs">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {columns.map(c => (
                                                <th key={c.key} className="px-2 py-1 text-left font-medium">{c.label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewing.map((row, i) => (
                                            <tr key={i} className="border-t">
                                                {columns.map(c => (
                                                    <td key={c.key} className="px-2 py-1 truncate max-w-[120px]">{row[c.key]}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${result.error ? "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400" : "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400"}`}>
                            {result.error ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Check className="h-4 w-4 shrink-0" />}
                            <span>{result.success || result.error}</span>
                            {result.errors != null && result.errors > 0 && (
                                <span className="text-yellow-600 dark:text-yellow-400">· {result.errors} ligne(s) ignorée(s)</span>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={handleClose}>
                            <X className="h-4 w-4 mr-1" /> Fermer
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={!file || importing}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                            {importing ? "Import en cours..." : "Importer"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
