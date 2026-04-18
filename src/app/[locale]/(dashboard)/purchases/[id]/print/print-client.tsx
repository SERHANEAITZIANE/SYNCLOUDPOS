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
        fax?: string | null;
        email?: string | null;
        nif?: string | null;
        rc?: string | null;
        nis?: string | null;
        artImposition?: string | null;
        bankAccount?: string | null;
        logo?: string | null;
        activity?: string | null;
        headerText?: string | null;
    } | null;
}

const formatNumber = (n: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

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

    // TVA breakdown by rate
    const tvaBreakdown: Record<number, { base: number, amount: number }> = {};
    po.items.forEach(item => {
        const rate = Number(item.tvaRate);
        const ht = item.quantity * item.costPrice / (1 + rate / 100);
        const tva = ht * (rate / 100);
        if (!tvaBreakdown[rate]) tvaBreakdown[rate] = { base: 0, amount: 0 };
        tvaBreakdown[rate].base += ht;
        tvaBreakdown[rate].amount += tva;
    });

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

            {/* Print area — Premium Template */}
            <div ref={printRef} className="print-template print-facture" style={{ borderColor: "#8b5cf6" }}>
                {/* Decorative accent strip — purple for purchase orders */}
                <div className="print-accent-strip" style={{ background: "linear-gradient(90deg, #7c3aed 0%, #8b5cf6 40%, #a78bfa 100%)" }} />

                {/* Header */}
                <div className="print-header">
                    <div className="print-company-info">
                        {tenant?.logo ? (
                            <img src={tenant.logo} alt="Logo" className="print-logo" />
                        ) : (
                            <div className="print-logo-placeholder" style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                                {tenant?.name?.substring(0, 2).toUpperCase() || "SC"}
                            </div>
                        )}
                        <div>
                            <div className="print-company-name">{tenant?.name || "SYNCLOUDPOS"}</div>
                            {tenant?.activity && <div className="print-company-activity">{tenant.activity}</div>}
                        </div>
                    </div>
                    <div className="print-header-right">
                        <div className="print-doc-type" style={{ color: "#ede9fe" }}>BON DE COMMANDE</div>
                        <div className="print-doc-badge" style={{ background: "linear-gradient(135deg, #f5f3ff, #ede9fe)", color: "#5b21b6", borderColor: "#c4b5fd" }}>
                            BC-{po.id.slice(-6).toUpperCase()}
                        </div>
                        <div className="print-doc-date">
                            {format(new Date(po.createdAt), "dd MMMM yyyy", { locale: fr })}
                        </div>
                        <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>
                            Statut: <strong>{statusLabel[po.status] || po.status}</strong>
                        </div>
                    </div>
                </div>

                {/* Parties */}
                <div className="print-parties">
                    {/* Supplier */}
                    <div className="print-customer-box">
                        <div className="print-customer-label">Fournisseur</div>
                        <div className="print-customer-name">{po.supplier.name}</div>
                        {po.supplier.address && <div className="print-customer-detail">{po.supplier.address}</div>}
                        {po.supplier.phone && <div className="print-customer-detail">Tél: {po.supplier.phone}</div>}
                        <div className="print-customer-fiscal">
                            {po.supplier.nif && <span>NIF: {po.supplier.nif}</span>}
                            {po.supplier.rc && <span>RC: {po.supplier.rc}</span>}
                            {po.supplier.rib && <span>RIB: {po.supplier.rib}</span>}
                        </div>
                    </div>

                    {/* Store info */}
                    <div className="print-store-details">
                        <div className="print-customer-label">Nos coordonnées</div>
                        <div className="print-fiscal-grid">
                            {tenant?.address && <div className="print-fiscal-row"><span className="print-fiscal-label">Adresse</span><span className="print-fiscal-value">{tenant.address}</span></div>}
                            {tenant?.phone && <div className="print-fiscal-row"><span className="print-fiscal-label">Tél</span><span className="print-fiscal-value">{tenant.phone}</span></div>}
                            {tenant?.fax && <div className="print-fiscal-row"><span className="print-fiscal-label">Fax</span><span className="print-fiscal-value">{tenant.fax}</span></div>}
                            {tenant?.email && <div className="print-fiscal-row"><span className="print-fiscal-label">Email</span><span className="print-fiscal-value">{tenant.email}</span></div>}
                            {tenant?.nif && <div className="print-fiscal-row"><span className="print-fiscal-label">NIF</span><span className="print-fiscal-value">{tenant.nif}</span></div>}
                            {tenant?.rc && <div className="print-fiscal-row"><span className="print-fiscal-label">RC</span><span className="print-fiscal-value">{tenant.rc}</span></div>}
                            {tenant?.nis && <div className="print-fiscal-row"><span className="print-fiscal-label">NIS</span><span className="print-fiscal-value">{tenant.nis}</span></div>}
                            {tenant?.artImposition && <div className="print-fiscal-row"><span className="print-fiscal-label">Art. Imp</span><span className="print-fiscal-value">{tenant.artImposition}</span></div>}
                            {tenant?.bankAccount && <div className="print-fiscal-row"><span className="print-fiscal-label">RIB</span><span className="print-fiscal-value">{tenant.bankAccount}</span></div>}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="print-table-wrapper">
                    <table className="print-table">
                        <thead>
                            <tr style={{ background: "linear-gradient(135deg, #4c1d95, #5b21b6)" }}>
                                <th className="print-th-num">#</th>
                                <th className="print-th-designation">Désignation</th>
                                <th className="print-th-center">Qté</th>
                                <th className="print-th-right">P.U TTC (DA)</th>
                                <th className="print-th-center">TVA %</th>
                                <th className="print-th-right">Total TTC (DA)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={index % 2 === 0 ? "print-row-even" : ""}
                                >
                                    <td className="print-td-num">{String(index + 1).padStart(2, "0")}</td>
                                    <td className="print-td-designation">{item.product.name}</td>
                                    <td className="print-td-center">{item.quantity}</td>
                                    <td className="print-td-right">
                                        {formatNumber(Number(item.costPrice))}
                                    </td>
                                    <td className="print-td-center">{Number(item.tvaRate)}%</td>
                                    <td className="print-td-right print-td-bold">
                                        {formatNumber(item.quantity * Number(item.costPrice))}
                                    </td>
                                </tr>
                            ))}
                            {po.items.length < 8 && Array.from({ length: 8 - po.items.length }).map((_, i) => (
                                <tr key={`empty-${i}`} className="print-row-empty">
                                    <td className="print-td-num">&nbsp;</td>
                                    <td className="print-td-designation">&nbsp;</td>
                                    <td className="print-td-center">&nbsp;</td>
                                    <td className="print-td-right">&nbsp;</td>
                                    <td className="print-td-center">&nbsp;</td>
                                    <td className="print-td-right">&nbsp;</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* TVA Breakdown + Totals */}
                <div className="print-footer-section">
                    <div className="print-tva-breakdown">
                        <div className="print-tva-title">Récapitulatif TVA</div>
                        <table className="print-tva-table">
                            <thead>
                                <tr>
                                    <th>Taux</th>
                                    <th>Base HT</th>
                                    <th>Montant TVA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(tvaBreakdown).map(([rate, data]) => (
                                    <tr key={rate}>
                                        <td>{rate}%</td>
                                        <td>{formatNumber(data.base)}</td>
                                        <td>{formatNumber(data.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="print-totals-box">
                        <div className="print-total-row">
                            <span>Total HT</span>
                            <span>{formatNumber(subtotalHT)}</span>
                        </div>
                        <div className="print-total-row">
                            <span>TVA</span>
                            <span>{formatNumber(totalTVA)}</span>
                        </div>
                        <div className="print-total-row" style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                            <span>Total TTC</span>
                            <span style={{ fontWeight: 700 }}>{formatNumber(totalTTC)}</span>
                        </div>
                        {withholdingAmount > 0 && (
                            <>
                                <div className="print-total-row" style={{ color: "#dc2626" }}>
                                    <span style={{ color: "#dc2626" }}>Retenue à la source</span>
                                    <span style={{ color: "#dc2626", fontWeight: 700 }}>-{formatNumber(withholdingAmount)}</span>
                                </div>
                                <div className="print-total-row print-total-final" style={{ background: "linear-gradient(135deg, #4c1d95, #5b21b6)" }}>
                                    <span>NET À PAYER</span>
                                    <span>{formatNumber(netToPay)} DA</span>
                                </div>
                            </>
                        )}
                        {withholdingAmount <= 0 && (
                            <div className="print-total-row print-total-final" style={{ background: "linear-gradient(135deg, #4c1d95, #5b21b6)" }}>
                                <span>TOTAL TTC</span>
                                <span>{formatNumber(totalTTC)} DA</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Signatures */}
                <div className="print-signatures">
                    <div className="print-signature-block">
                        <div className="print-signature-label">Cachet et Signature de l&apos;entreprise</div>
                        <div className="print-signature-space">
                            <div className="print-stamp-ghost" style={{ borderColor: "rgba(124, 58, 237, 0.12)", color: "rgba(124, 58, 237, 0.08)" }}>
                                {tenant?.name?.substring(0, 10) || "SOCIÉTÉ"}
                            </div>
                        </div>
                    </div>
                    <div className="print-signature-block">
                        <div className="print-signature-label">Cachet et Signature du fournisseur</div>
                        <div className="print-signature-space" />
                    </div>
                </div>

                {/* Footer */}
                <div className="print-footer-bar" style={{ borderTopColor: "#5b21b6" }}>
                    {tenant?.headerText || `${tenant?.name || "SYNCLOUDPOS"} — ${tenant?.address || ""}`}
                    {tenant?.phone && ` | Tél: ${tenant.phone}`}
                    {tenant?.nif && ` | NIF: ${tenant.nif}`}
                </div>
            </div>
        </div>
    );
}
