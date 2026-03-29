"use client";

import { useRef } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/routing";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PurchaseOrderPrintClientProps {
    po: {
        id: string;
        createdAt: string;
        status: string;
        total: number;
        withholdingAmount: number;
        supplier: {
            name: string;
            phone?: string | null;
            address?: string | null;
            nif?: string | null;
            rc?: string | null;
            rib?: string | null;
        };
        items: {
            id: string;
            quantity: number;
            costPrice: number;
            tvaRate: number;
            product: {
                name: string;
            };
        }[];
        store?: {
            name: string;
            address?: string | null;
        } | null;
    };
    tenant: {
        name: string;
        ownerName?: string | null;
        address?: string | null;
        phone?: string | null;
        nif?: string | null;
        rc?: string | null;
        nis?: string | null;
        artImposition?: string | null;
    } | null;
}

export function PurchaseOrderPrintClient({ po, tenant }: PurchaseOrderPrintClientProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const subtotalHT = po.items.reduce((sum, item) => sum + item.quantity * item.costPrice / (1 + item.tvaRate / 100), 0);
    const totalTVA = po.items.reduce((sum, item) => {
        const ht = item.quantity * item.costPrice / (1 + item.tvaRate / 100);
        return sum + ht * (item.tvaRate / 100);
    }, 0);
    const totalTTC = Number(po.total);
    const withholdingAmount = Number(po.withholdingAmount);
    const netToPay = totalTTC - withholdingAmount;

    const handlePrint = () => {
        window.print();
    };

    const statusLabel: Record<string, string> = {
        PENDING: "En attente",
        COMPLETED: "Complétée",
        CANCELLED: "Annulée",
        PAID: "Payée",
    };

    return (
        <div>
            {/* Action bar — hidden on print */}
            <div className="print:hidden flex items-center justify-between mb-6 gap-4">
                <Button
                    variant="outline"
                    className="rounded-xl gap-2"
                    onClick={() => router.push("/purchases")}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                </Button>
                <Button
                    onClick={handlePrint}
                    className="rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 gap-2 font-bold"
                >
                    <Printer className="h-4 w-4" />
                    Imprimer
                </Button>
            </div>

            {/* Print area */}
            <div ref={printRef} className="bg-white p-8 rounded-xl border border-gray-200 dark:border-gray-700 max-w-3xl mx-auto text-gray-900 print:border-none print:rounded-none print:p-0 print:max-w-none">
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b-2 border-gray-900 pb-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">{tenant?.name || "SYNCLOUDPOS"}</h1>
                        {tenant?.address && <p className="text-sm text-gray-600 mt-1">{tenant.address}</p>}
                        {tenant?.phone && <p className="text-sm text-gray-600">Tél: {tenant.phone}</p>}
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                            {tenant?.nif && <p>NIF: {tenant.nif}</p>}
                            {tenant?.rc && <p>RC: {tenant.rc}</p>}
                            {tenant?.nis && <p>NIS: {tenant.nis}</p>}
                            {tenant?.artImposition && <p>Art. d&apos;Imposition: {tenant.artImposition}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-wider">
                            BON DE COMMANDE
                        </h2>
                        <p className="text-sm text-gray-600 mt-2">
                            Date: {format(new Date(po.createdAt), "dd MMMM yyyy", { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-600">
                            Statut: <span className="font-bold">{statusLabel[po.status] || po.status}</span>
                        </p>
                    </div>
                </div>

                {/* Supplier Info */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200 print:bg-transparent">
                    <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Fournisseur</h3>
                    <p className="text-lg font-bold">{po.supplier.name}</p>
                    {po.supplier.address && <p className="text-sm text-gray-600">{po.supplier.address}</p>}
                    {po.supplier.phone && <p className="text-sm text-gray-600">Tél: {po.supplier.phone}</p>}
                    <div className="flex gap-6 mt-2 text-xs text-gray-500">
                        {po.supplier.nif && <span>NIF: {po.supplier.nif}</span>}
                        {po.supplier.rc && <span>RC: {po.supplier.rc}</span>}
                        {po.supplier.rib && <span>RIB: {po.supplier.rib}</span>}
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full text-sm border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-900 text-white">
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">#</th>
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider">Désignation</th>
                            <th className="text-center py-3 px-4 font-bold text-xs uppercase tracking-wider">Qté</th>
                            <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider">P.U. TTC</th>
                            <th className="text-center py-3 px-4 font-bold text-xs uppercase tracking-wider">TVA %</th>
                            <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider">Total TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.items.map((item, index) => (
                            <tr
                                key={item.id}
                                className={index % 2 === 0 ? "bg-gray-50 print:bg-transparent" : ""}
                            >
                                <td className="py-2.5 px-4 text-gray-500 font-mono text-xs">{index + 1}</td>
                                <td className="py-2.5 px-4 font-semibold">{item.product.name}</td>
                                <td className="py-2.5 px-4 text-center font-bold">{item.quantity}</td>
                                <td className="py-2.5 px-4 text-right font-mono">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(Number(item.costPrice))}
                                </td>
                                <td className="py-2.5 px-4 text-center text-gray-500">{Number(item.tvaRate)}%</td>
                                <td className="py-2.5 px-4 text-right font-bold font-mono">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(item.quantity * Number(item.costPrice))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-72 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total HT</span>
                            <span className="font-bold font-mono">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(subtotalHT)} DA
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">TVA</span>
                            <span className="font-bold font-mono">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(totalTVA)} DA
                            </span>
                        </div>
                        <div className="flex justify-between text-base border-t border-gray-200 pt-2">
                            <span className="font-bold">Total TTC</span>
                            <span className="font-black font-mono">
                                {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(totalTTC)} DA
                            </span>
                        </div>
                        {withholdingAmount > 0 && (
                            <>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>Retenue à la source</span>
                                    <span className="font-bold font-mono">
                                        -{new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(withholdingAmount)} DA
                                    </span>
                                </div>
                                <div className="flex justify-between text-lg border-t-2 border-gray-900 pt-2">
                                    <span className="font-black">NET À PAYER</span>
                                    <span className="font-black font-mono text-emerald-700">
                                        {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(netToPay)} DA
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 mt-12 pt-8 border-t border-gray-200">
                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-12">
                            Cachet et Signature de l&apos;entreprise
                        </p>
                        <div className="border-t border-gray-300 w-48 mx-auto" />
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-12">
                            Cachet et Signature du fournisseur
                        </p>
                        <div className="border-t border-gray-300 w-48 mx-auto" />
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400">
                    Document généré par SYNCLOUDPOS — {format(new Date(), "dd/MM/yyyy HH:mm")}
                </div>
            </div>
        </div>
    );
}
