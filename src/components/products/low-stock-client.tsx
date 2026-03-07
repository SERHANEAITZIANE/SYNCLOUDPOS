"use client"

import { useTranslations } from "next-intl"

import { DataTable } from "@/components/ui/data-table"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ProductColumn } from "./columns" // reuse main product columns
import { AlertCircle } from "lucide-react"
import { useProductColumns } from "./columns"

interface LowStockClientProps {
    data: ProductColumn[]
}

export const LowStockClient: React.FC<LowStockClientProps> = ({ data }) => {
    const columns = useProductColumns()

    const outOfStockCount = data.filter(p => p.stock <= 0).length

    return (
        <>
            <div className="flex items-center justify-between">
                <Heading
                    title={`Rupture de Stock (${data.length})`}
                    description="Gérez les produits dont le stock est faible ou épuisé."
                />
            </div>

            <Separator />

            {data.length > 0 && (
                <div className="mb-4 flex flex-row p-4 border rounded-md border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-200">
                    <AlertCircle className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">Attention</span>
                        <span className="text-sm">Vous avez {outOfStockCount} produit(s) en rupture totale et {data.length - outOfStockCount} produit(s) sous le seuil d'alerte. Pensez à générer un Bon d'achat.</span>
                    </div>
                </div>
            )}

            <DataTable  exportTitle={"Export"} exportDescription={""} searchKey="name" columns={columns} data={data} />
        </>
    )
}
