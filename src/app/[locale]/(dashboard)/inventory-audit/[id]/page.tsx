import { getStockCountSession } from "@/actions/inventory-audit"
import { SessionDetailClient } from "../components/session-detail-client"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import type { Metadata } from "next"

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return { title: `Session Inventaire | SynCloudPOS` }
}

export default async function SessionDetailPage({ params }: Props) {
    const session = await getStockCountSession(params.id)
    if (!session) notFound()

    return (
        <div className="flex-1 p-4 md:p-8 pt-4 md:pt-6 animate-in fade-in duration-700">
            <Link href="/inventory-audit" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mb-6">
                <ChevronLeft className="w-4 h-4" />
                Retour aux sessions
            </Link>
            <SessionDetailClient
                sessionId={session.id}
                sessionName={session.name}
                status={session.status}
                items={session.items.map(i => ({
                    id: i.id,
                    productName: i.productName,
                    expectedQty: i.expectedQty,
                    actualQty: i.actualQty,
                    difference: i.difference
                }))}
            />
        </div>
    )
}
