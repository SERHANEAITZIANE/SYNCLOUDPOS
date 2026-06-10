import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { formatter } from "@/lib/utils"
import type { Metadata } from "next"

interface Props {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Reçu #${id.slice(0, 8)} | SynCloudPOS`,
        description: "Visualisez votre facture et statut de paiement en ligne."
    }
}

export default async function ReceiptPage({ params }: Props) {
    const { id } = await params

    // Try POS order first, then Sales Order
    const order = await db.order.findUnique({
        where: { id },
        include: { customer: true, tenant: { select: { name: true, phone: true, address: true, email: true, logo: true } } }
    }).catch(() => null)

    const salesOrder = !order ? await db.salesOrder.findUnique({
        where: { id },
        include: { customer: true, tenant: { select: { name: true, phone: true, address: true, email: true, logo: true } } }
    }).catch(() => null) : null

    const doc = order || salesOrder
    if (!doc) notFound()

    const isPaid = order
        ? (doc as typeof order).status === "COMPLETED"
        : ["PAID"].includes((doc as typeof salesOrder)!.status)

    const customer = doc.customer
    const tenant = doc.tenant
    const total = Number(doc.total)
    // @ts-ignore
    const paid = Number(doc.paidAmount ?? doc.total)
    const remaining = total - paid

    return (
        <html lang="fr">
            <body className="min-h-screen bg-gray-50 font-sans">
                <div className="max-w-md mx-auto py-10 px-4">
                    {/* Header */}
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-6 relative">
                        {tenant.logo && (
                            <div 
                                className="absolute inset-0 opacity-[0.03] pointer-events-none bg-center bg-no-repeat bg-contain" 
                                style={{ backgroundImage: `url(${tenant.logo})`, margin: '4rem 2rem 2rem 2rem' }}
                            />
                        )}
                        <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-6 py-8 text-white relative z-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {tenant.logo && (
                                        <img 
                                            src={tenant.logo} 
                                            alt="Logo" 
                                            className="w-12 h-12 object-contain rounded-xl bg-white p-1.5 shadow-sm border border-indigo-100/30" 
                                        />
                                    )}
                                    <div>
                                        <h1 className="text-xl font-bold leading-tight">{tenant.name}</h1>
                                        <p className="text-indigo-100 text-xs mt-0.5">{tenant.phone}</p>
                                    </div>
                                </div>
                                <div className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 ${isPaid ? "bg-emerald-400 text-white" : "bg-amber-400 text-amber-900"}`}>
                                    {isPaid ? "✓ Payé" : "⏳ Solde dû"}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-6 space-y-4 relative z-10">
                            {/* Customer */}
                            {customer && (
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                                        {customer.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{customer.name}</p>
                                        <p className="text-sm text-slate-500">{customer.phone || "—"}</p>
                                    </div>
                                </div>
                            )}

                            {/* Amounts */}
                            <div className="space-y-3">
                                <AmountRow label="Total" value={formatter.format(total)} />
                                <AmountRow label="Versé" value={formatter.format(paid)} color="text-emerald-600" />
                                {remaining > 0 && <AmountRow label="Reste à payer" value={formatter.format(remaining)} color="text-rose-600 font-bold" />}
                            </div>

                            {/* Receipt ID */}
                            <p className="text-center text-xs text-slate-400 mt-4">
                                Réf: <span className="font-mono">{id}</span>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-sm text-slate-500">
                        Merci de votre confiance 🙏<br />
                        <span className="font-medium text-indigo-600">{tenant.name}</span>
                    </p>
                </div>
            </body>
        </html>
    )
}

function AmountRow({ label, value, color = "text-slate-900" }: { label: string; value: string; color?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className={`text-base font-semibold tabular-nums ${color}`}>{value}</span>
        </div>
    )
}
