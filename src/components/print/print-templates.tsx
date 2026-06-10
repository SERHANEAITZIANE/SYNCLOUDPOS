"use client"

import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { QRCodeSVG } from "qrcode.react"

// ─── Shared Types ───────────────────────────────────────────────────────────────
export interface PrintableItem {
    product?: { 
        name: string
        id?: string
        code?: string | null
        barcodes?: string[] | null
    }
    quantity: number
    unitPrice: number
    tvaRate?: number
    priceHt?: number
    serialNumber?: string | null
    discountAmount?: number
    discountLabel?: string
}

export interface PrintableCustomer {
    name: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
    nif?: string
    nis?: string
    artImposition?: string
    rc?: string
    rib?: string
    balance?: number
}

export interface PrintableStore {
    name?: string
    activity?: string
    address?: string
    phone?: string
    fax?: string
    email?: string
    nif?: string
    rc?: string
    nis?: string
    artImposition?: string
    bankAccount?: string
    logo?: string
    headerText?: string
    posBlFormat?: string | null
    posBlColumns?: string | null
}

export interface PrintTemplateProps {
    items: PrintableItem[]
    customer?: PrintableCustomer | null
    store?: PrintableStore | null
    receiptNumber?: string
    date?: Date
    subtotalHT: number
    totalTVA: number
    stampTax: number
    totalTTC: number
    paymentMethod?: string
    previousBalance?: number
    paymentAmount?: number
    newBalance?: number
    documentId?: string
}

// ─── Utility: Number to French Words ─────────────────────────────────────────
const numberToFrenchWords = (num: number): string => {
    if (num === 0) return "zéro"
    const ones = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"]
    const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"]
    function convertGroup(n: number): string {
        let str = ""
        const c = Math.floor(n / 100)
        const r = n % 100
        if (c > 0) {
            if (c === 1) str += "cent "
            else str += ones[c] + " cent" + (r === 0 ? "s " : " ")
        }
        if (r > 0) {
            if (r < 20) str += ones[r] + " "
            else {
                const d = Math.floor(r / 10)
                const u = r % 10
                if (d === 7 || d === 9) {
                    str += tens[d - 1] + (u === 1 && d === 7 ? " et " : "-") + ones[10 + u] + " "
                } else {
                    str += tens[d] + (u === 1 ? " et un" : (u > 0 ? "-" + ones[u] : (d === 8 ? "s" : ""))) + " "
                }
            }
        }
        return str.trim()
    }
    let result = ""
    let n = Math.floor(num)
    if (n >= 1000000000) {
        const b = Math.floor(n / 1000000000)
        result += (b === 1 ? "un milliard " : convertGroup(b) + " milliards ")
        n %= 1000000000
    }
    if (n >= 1000000) {
        const m = Math.floor(n / 1000000)
        result += (m === 1 ? "un million " : convertGroup(m) + " millions ")
        n %= 1000000
    }
    if (n >= 1000) {
        const k = Math.floor(n / 1000)
        result += (k === 1 ? "mille " : convertGroup(k) + " mille ")
        n %= 1000
    }
    if (n > 0 || result === "") {
        result += convertGroup(n)
    }
    // Handle centimes
    const centimes = Math.round((num - Math.floor(num)) * 100)
    if (centimes > 0) {
        result = result.trim() + " dinars et " + convertGroup(centimes) + " centimes"
    } else {
        result = result.trim() + " dinars"
    }
    return result.charAt(0).toUpperCase() + result.slice(1)
}

const formatNumber = (n: number) =>
    new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// ─── Company Header Block (shared between templates) ────────────────────────
const CompanyHeaderBlock = ({ store }: { store?: PrintableStore | null }) => {
    let showLogo = true;
    if (typeof window !== "undefined") {
        try {
            const stored = localStorage.getItem("pos_printing_prefs");
            if (stored) {
                const prefs = JSON.parse(stored);
                if (prefs.showLogoOnBL !== undefined) {
                    showLogo = prefs.showLogoOnBL;
                }
            }
        } catch (e) {
            // ignore
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {showLogo && store?.logo && (
                <div className="mb-2">
                    <img src={store.logo} alt="Logo" className="print-logo" style={{ maxHeight: "60px", maxWidth: "120mm", objectFit: "contain" }} />
                </div>
            )}
            <div className="flex items-center gap-14">
                {(!showLogo || !store?.logo) && (
                    <div className="print-logo-placeholder">
                        {store?.name?.substring(0, 2).toUpperCase() || "SC"}
                    </div>
                )}
                <div>
                    <div className="print-company-name">{store?.name || "VOTRE SOCIÉTÉ"}</div>
                    {store?.activity && <div className="print-company-activity">{store.activity}</div>}
                </div>
            </div>
        </div>
    );
};

// ─── Company Fiscal Details (right side) ─────────────────────────────────────
const CompanyFiscalBlock = ({ store }: { store?: PrintableStore | null }) => (
    <div className="print-fiscal-grid">
        {store?.address && <div className="print-fiscal-row"><span className="print-fiscal-label">Adresse</span><span className="print-fiscal-value">{store.address}</span></div>}
        {store?.phone && <div className="print-fiscal-row"><span className="print-fiscal-label">Tél</span><span className="print-fiscal-value">{store.phone}</span></div>}
        {store?.fax && <div className="print-fiscal-row"><span className="print-fiscal-label">Fax</span><span className="print-fiscal-value">{store.fax}</span></div>}
        {store?.email && <div className="print-fiscal-row"><span className="print-fiscal-label">Email</span><span className="print-fiscal-value">{store.email}</span></div>}
        {store?.nif && <div className="print-fiscal-row"><span className="print-fiscal-label">NIF</span><span className="print-fiscal-value">{store.nif}</span></div>}
        {store?.rc && <div className="print-fiscal-row"><span className="print-fiscal-label">RC</span><span className="print-fiscal-value">{store.rc}</span></div>}
        {store?.nis && <div className="print-fiscal-row"><span className="print-fiscal-label">NIS</span><span className="print-fiscal-value">{store.nis}</span></div>}
        {store?.artImposition && <div className="print-fiscal-row"><span className="print-fiscal-label">Art. Imp</span><span className="print-fiscal-value">{store.artImposition}</span></div>}
        {store?.bankAccount && <div className="print-fiscal-row"><span className="print-fiscal-label">RIB</span><span className="print-fiscal-value">{store.bankAccount}</span></div>}
    </div>
)

// ─── Customer Block ──────────────────────────────────────────────────────────
const CustomerBlock = ({ customer, label = "Client" }: { customer?: PrintableCustomer | null, label?: string }) => (
    <div className="print-customer-box">
        <div className="print-customer-label">{label}</div>
        <div className="print-customer-name">{customer?.name || "Client Standard"}</div>
        {customer?.address && <div className="print-customer-detail">{customer.address}</div>}
        {customer?.phone && <div className="print-customer-detail">Tél: {customer.phone}</div>}
        <div className="print-customer-fiscal">
            {(customer?.nif || customer?.taxId) && <span>NIF: {customer.nif || customer.taxId}</span>}
            {customer?.rc && <span>RC: {customer.rc}</span>}
            {customer?.nis && <span>NIS: {customer.nis}</span>}
            {customer?.artImposition && <span>Art: {customer.artImposition}</span>}
            {customer?.rib && <span>RIB: {customer.rib}</span>}
        </div>
    </div>
)


// ─── BaridiMob Payment Block (Algérie Poste Integration) ─────────────────────
const BaridiMobPaymentBlock = ({
    bankAccount,
    storeName,
    amount,
    receiptNumber
}: {
    bankAccount?: string | null
    storeName?: string | null
    amount: number
    receiptNumber?: string
}) => {
    if (!bankAccount) return null

    // Format BaridiMob structured payment text
    const qrValue = `Algérie Poste - BaridiMob
Bénéficiaire: ${storeName || "SYNCLOUDPOS Merchant"}
RIB/CCP: ${bankAccount}
Montant: ${amount.toFixed(2)} DA
Réf: ${receiptNumber || "N/A"}`.trim()

    return (
        <div className="print-baridimob-box border border-dashed border-gray-300 rounded-lg p-3 mt-4 flex items-center justify-between gap-4 max-w-[340px] bg-gray-50/50" style={{ pageBreakInside: "avoid" }}>
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e67e22]">BaridiMob Pay</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[9px] text-gray-500 leading-normal font-medium">
                    Scannez ce QR Code avec votre application BaridiMob pour effectuer le virement instantané sans erreur de saisie.
                </p>
                <div className="text-[8.5px] font-mono text-gray-600 mt-1 space-y-0.5">
                    <div><span className="text-[8px] text-gray-400 font-sans uppercase">RIB:</span> {bankAccount}</div>
                    {storeName && <div><span className="text-[8px] text-gray-400 font-sans uppercase">Titu:</span> {storeName}</div>}
                </div>
            </div>
            <div className="p-1.5 bg-white border border-gray-200 rounded-md shrink-0 flex items-center justify-center">
                <QRCodeSVG value={qrValue} size={65} level="M" />
            </div>
        </div>
    )
}


// ═════════════════════════════════════════════════════════════════════════════
//  1. FACTURE (Invoice) — Premium Modern Design
// ═════════════════════════════════════════════════════════════════════════════
export function InvoicePrintTemplate(props: PrintTemplateProps) {
    const {
        items, customer, store, receiptNumber, date = new Date(),
        subtotalHT, totalTVA, stampTax, totalTTC, paymentMethod, documentId
    } = props

    // Group TVA by rate
    const tvaBreakdown: Record<number, { base: number, amount: number }> = {}
    items.forEach(item => {
        const rate = Number(item.tvaRate ?? 0)
        const discountAmount = item.discountAmount || 0
        const netUnitPriceTTC = Number(item.unitPrice) - (item.quantity === 0 ? 0 : discountAmount / item.quantity)
        const ht = item.quantity * (netUnitPriceTTC / (1 + rate / 100))
        const tva = ht * (rate / 100)
        if (!tvaBreakdown[rate]) tvaBreakdown[rate] = { base: 0, amount: 0 }
        tvaBreakdown[rate].base += ht
        tvaBreakdown[rate].amount += tva
    })

    const colModel = store?.posBlColumns || "standard"
    
    // First column header label
    let firstColHeader = "N°"
    if (colModel === "code") firstColHeader = "Code"
    else if (colModel === "barcode") firstColHeader = "Code-barres"

    const getFirstColValue = (item: PrintableItem, index: number) => {
        if (colModel === "code") {
            return item.product?.code || item.product?.id?.slice(-6).toUpperCase() || `P-${String(index + 1).padStart(3, "0")}`
        }
        if (colModel === "barcode") {
            return item.product?.barcodes?.[0] || "Sans Code"
        }
        return String(index + 1).padStart(2, "0")
    }

    const firstColStyle = colModel === "standard" ? "print-th-num" : "print-th-designation text-left pl-3"
    const firstColTdStyle = colModel === "standard" ? "print-td-num" : "print-td-num text-left pl-3 font-mono text-[9px] text-gray-600"

    return (
        <div className={`print-template print-facture ${store?.posBlFormat === "A5" ? "format-a5" : ""}`}>
            {/* ── Dynamic Page Sizing Styles ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: ${store?.posBlFormat === "A5" ? "A5 portrait" : "A4 portrait"};
                    margin: ${store?.posBlFormat === "A5" ? "5mm 6mm" : "10mm 12mm"};
                }
            `}} />

            {/* ── Decorative Top Strip ── */}
            <div className="print-accent-strip" />

            {/* ── Header ── */}
            <div className="print-header">
                <CompanyHeaderBlock store={store} />
                <div className="print-header-right">
                    <div className="print-doc-type">FACTURE</div>
                    <div className="print-doc-badge">
                        N° {receiptNumber || `FA-${documentId?.slice(-6) || "000000"}`}
                    </div>
                    <div className="print-doc-date">
                        {format(date, "dd MMMM yyyy", { locale: fr })}
                    </div>
                </div>
            </div>

            {/* ── Parties ── */}
            <div className="print-parties">
                <CustomerBlock customer={customer} label="Facturé à" />
                <div className="print-store-details">
                    <div className="print-customer-label">Nos coordonnées</div>
                    <CompanyFiscalBlock store={store} />
                </div>
            </div>

            {/* ── Items Table ── */}
            <div className="print-table-wrapper">
                <table className="print-table">
                    <thead>
                        <tr>
                            <th className={firstColStyle}>{firstColHeader}</th>
                            <th className="print-th-designation">Désignation</th>
                            <th className="print-th-center">Qté</th>
                            <th className="print-th-right">P.U HT (DA)</th>
                            <th className="print-th-center">TVA %</th>
                            <th className="print-th-right">Montant HT (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => {
                            const rate = Number(item.tvaRate ?? 0)
                            const originalHT = item.priceHt || item.unitPrice / (1 + rate / 100)
                            const discountAmount = item.discountAmount || 0
                            
                            const netUnitPriceTTC = Number(item.unitPrice) - (item.quantity === 0 ? 0 : discountAmount / item.quantity)
                            const netHT = netUnitPriceTTC / (1 + rate / 100)
                            const lineHT = item.quantity * netHT
                            return (
                                <tr key={i} className={i % 2 === 0 ? "print-row-even" : ""}>
                                    <td className={firstColTdStyle}>{getFirstColValue(item, i)}</td>
                                    <td className="print-td-designation">
                                        <div>{item.product?.name}</div>
                                        {item.serialNumber && (
                                            <div className="text-[10px] text-gray-500 font-mono italic mt-0.5 pl-1">
                                                S/N: {item.serialNumber}
                                            </div>
                                        )}
                                        {discountAmount > 0 && (
                                            <div className="text-[9px] text-violet-700 dark:text-violet-400 font-bold mt-0.5 pl-1">
                                                🏷️ {item.discountLabel} (-{formatNumber(discountAmount)} DA)
                                            </div>
                                        )}
                                    </td>
                                    <td className="print-td-center">{item.quantity}</td>
                                    <td className="print-td-right">
                                        {discountAmount > 0 ? (
                                            <>
                                                <div className="line-through text-gray-400 text-xs">
                                                    {formatNumber(originalHT)}
                                                </div>
                                                <div>
                                                    {formatNumber(netHT)}
                                                </div>
                                            </>
                                        ) : (
                                            formatNumber(originalHT)
                                        )}
                                    </td>
                                    <td className="print-td-center">{rate}%</td>
                                    <td className="print-td-right print-td-bold">{formatNumber(lineHT)}</td>
                                </tr>
                            )
                        })}
                        {/* Empty rows pad to fill space */}
                        {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="print-row-empty">
                                <td className={firstColTdStyle}>&nbsp;</td>
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

            {/* ── TVA Breakdown + Totals ── */}
            <div className="print-footer-section">
                {/* TVA Breakdown */}
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

                    {/* Amount in words */}
                    <div className="print-amount-words">
                        <div className="print-amount-words-label">Arrêtée la présente facture à la somme de :</div>
                        <div className="print-amount-words-text">{numberToFrenchWords(totalTTC)}</div>
                    </div>
                    {paymentMethod && (
                        <div className="print-payment-mode">
                            Mode de règlement : <strong>{paymentMethod === "CASH" ? "Espèces" : paymentMethod === "CHECK" ? "Chèque" : paymentMethod === "TRANSFER" ? "Virement" : paymentMethod === "CARD" ? "Carte bancaire" : paymentMethod === "TERM" ? "À terme" : paymentMethod}</strong>
                        </div>
                    )}
                    <BaridiMobPaymentBlock
                        bankAccount={store?.bankAccount}
                        storeName={store?.name}
                        amount={totalTTC}
                        receiptNumber={receiptNumber || `FA-${documentId?.slice(-6) || "000000"}`}
                    />
                </div>

                {/* Totals column */}
                <div className="print-totals-box">
                    <div className="print-total-row">
                        <span>Total HT</span>
                        <span>{formatNumber(subtotalHT)}</span>
                    </div>
                    <div className="print-total-row">
                        <span>TVA</span>
                        <span>{formatNumber(totalTVA)}</span>
                    </div>
                    {stampTax > 0 && (
                        <div className="print-total-row">
                            <span>Droit de Timbre</span>
                            <span>{formatNumber(stampTax)}</span>
                        </div>
                    )}
                    {Math.abs(totalTTC - (subtotalHT + totalTVA + stampTax)) > 0.01 && (
                        <div className="print-total-row">
                            <span>Arrondi de Caisse</span>
                            <span>{formatNumber(totalTTC - (subtotalHT + totalTVA + stampTax))}</span>
                        </div>
                    )}
                    <div className="print-total-row print-total-final">
                        <span>NET À PAYER</span>
                        <span>{formatNumber(totalTTC)} DA</span>
                    </div>
                </div>
            </div>

            {/* ── Signatures ── */}
            <div className="print-signatures">
                <div className="print-signature-block">
                    <div className="print-signature-label">Signature du Client</div>
                    <div className="print-signature-space" />
                    <div className="print-signature-note">Précédé de la mention &quot;Lu et approuvé&quot;</div>
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">Cachet &amp; Signature</div>
                    <div className="print-signature-space">
                        <div className="print-stamp-ghost">
                            {store?.name?.substring(0, 10) || "SOCIÉTÉ"}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="print-footer-bar">
                {store?.headerText || `${store?.name || "SYNCLOUDPOS"} — ${store?.address || ""}`}
                {store?.phone && ` | Tél: ${store.phone}`}
                {store?.nif && ` | NIF: ${store.nif}`}
            </div>
        </div>
    )
}


// ═════════════════════════════════════════════════════════════════════════════
//  2. BON DE LIVRAISON (Delivery Note) — Clean & Professional
// ═════════════════════════════════════════════════════════════════════════════
export function BonLivraisonPrintTemplate(props: PrintTemplateProps) {
    const {
        items, customer, store, receiptNumber, date = new Date(),
        subtotalHT, totalTVA, stampTax, totalTTC,
        previousBalance = 0, paymentAmount = 0, newBalance = 0, documentId
    } = props

    const colModel = store?.posBlColumns || "standard"
    
    // First column header label
    let firstColHeader = "N°"
    if (colModel === "code") firstColHeader = "Code"
    else if (colModel === "barcode") firstColHeader = "Code-barres"

    const getFirstColValue = (item: PrintableItem, index: number) => {
        if (colModel === "code") {
            return item.product?.code || item.product?.id?.slice(-6).toUpperCase() || `P-${String(index + 1).padStart(3, "0")}`
        }
        if (colModel === "barcode") {
            return item.product?.barcodes?.[0] || "Sans Code"
        }
        return String(index + 1).padStart(2, "0")
    }

    const firstColStyle = colModel === "standard" ? "print-th-num" : "print-th-designation text-left pl-3"
    const firstColTdStyle = colModel === "standard" ? "print-td-num" : "print-td-num text-left pl-3 font-mono text-[9px] text-gray-600"

    return (
        <div className={`print-template print-bl ${store?.posBlFormat === "A5" ? "format-a5" : ""}`}>
            {/* ── Dynamic Page Sizing Styles ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: ${store?.posBlFormat === "A5" ? "A5 portrait" : "A4 portrait"};
                    margin: ${store?.posBlFormat === "A5" ? "5mm 6mm" : "10mm 12mm"};
                }
            `}} />

            {/* ── Decorative Top Strip ── */}
            <div className="print-accent-strip print-accent-strip-emerald" />

            {/* ── Header ── */}
            <div className="print-header">
                <CompanyHeaderBlock store={store} />
                <div className="print-header-right">
                    <div className="print-doc-type print-doc-type-emerald">BON DE LIVRAISON</div>
                    <div className="print-doc-badge print-doc-badge-emerald">
                        N° {receiptNumber || `BL-${documentId?.slice(-6) || "000000"}`}
                    </div>
                    <div className="print-doc-date">
                        {format(date, "dd MMMM yyyy", { locale: fr })}
                    </div>
                </div>
            </div>

            {/* ── Client Info Row ── */}
            <div className="print-parties">
                <CustomerBlock customer={customer} label="Livré à" />
                <div className="print-store-details">
                    <div className="print-customer-label">Nos coordonnées</div>
                    <CompanyFiscalBlock store={store} />
                </div>
            </div>

            {/* ── Items Table ── */}
            <div className="print-table-wrapper">
                <table className="print-table print-table-bl">
                    <thead>
                        <tr>
                            <th className={firstColStyle}>{firstColHeader}</th>
                            <th className="print-th-designation">Désignation</th>
                            <th className="print-th-center">Qté</th>
                            <th className="print-th-right">P.U (DA)</th>
                            <th className="print-th-right">Montant (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => {
                            const originalLineTotal = item.quantity * Number(item.unitPrice)
                            const discountAmount = item.discountAmount || 0
                            const lineTotal = originalLineTotal - discountAmount
                            return (
                                <tr key={i} className={i % 2 === 0 ? "print-row-even" : ""}>
                                    <td className={firstColTdStyle}>{getFirstColValue(item, i)}</td>
                                    <td className="print-td-designation">
                                        <div>{item.product?.name}</div>
                                        {item.serialNumber && (
                                            <div className="text-[10px] text-gray-500 font-mono italic mt-0.5 pl-1">
                                                S/N: {item.serialNumber}
                                            </div>
                                        )}
                                        {discountAmount > 0 && (
                                            <div className="text-[9px] text-violet-700 dark:text-violet-400 font-bold mt-0.5 pl-1">
                                                🏷️ {item.discountLabel} (-{formatNumber(discountAmount)} DA)
                                            </div>
                                        )}
                                    </td>
                                    <td className="print-td-center">{item.quantity}</td>
                                    <td className="print-td-right">
                                        {discountAmount > 0 ? (
                                            <>
                                                <div className="line-through text-gray-400 text-xs">
                                                    {formatNumber(Number(item.unitPrice))}
                                                </div>
                                                <div>
                                                    {formatNumber(item.quantity === 0 ? 0 : (originalLineTotal - discountAmount) / item.quantity)}
                                                </div>
                                            </>
                                        ) : (
                                            formatNumber(Number(item.unitPrice))
                                        )}
                                    </td>
                                    <td className="print-td-right print-td-bold">{formatNumber(lineTotal)}</td>
                                </tr>
                            )
                        })}
                        {items.length < 10 && Array.from({ length: 10 - items.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="print-row-empty">
                                <td className={firstColTdStyle}>&nbsp;</td>
                                <td className="print-td-designation">&nbsp;</td>
                                <td className="print-td-center">&nbsp;</td>
                                <td className="print-td-right">&nbsp;</td>
                                <td className="print-td-right">&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Balance + Totals ── */}
            <div className="print-footer-section">
                <div className="print-bl-notes">
                    <div className="print-tva-title">Observations</div>
                    <div className="print-bl-notes-area" />
                    <BaridiMobPaymentBlock
                        bankAccount={store?.bankAccount}
                        storeName={store?.name}
                        amount={totalTTC}
                        receiptNumber={receiptNumber || `BL-${documentId?.slice(-6) || "000000"}`}
                    />
                </div>

                <div className="print-totals-box print-totals-box-bl">
                    <div className="print-total-row print-total-row-muted">
                        <span>Ancien Solde</span>
                        <span>{formatNumber(previousBalance)}</span>
                    </div>
                    <div className="print-total-row">
                        <span>Total TTC</span>
                        <span>{formatNumber(totalTTC)}</span>
                    </div>
                    {totalTVA > 0 && (
                        <div className="print-total-row print-total-row-muted">
                            <span>dont TVA</span>
                            <span>{formatNumber(totalTVA)}</span>
                        </div>
                    )}
                    {stampTax > 0 && (
                        <div className="print-total-row print-total-row-muted">
                            <span>dont Timbre</span>
                            <span>{formatNumber(stampTax)}</span>
                        </div>
                    )}
                    {Math.abs(totalTTC - (subtotalHT + totalTVA + stampTax)) > 0.01 && (
                        <div className="print-total-row print-total-row-muted">
                            <span>dont Arrondi</span>
                            <span>{formatNumber(totalTTC - (subtotalHT + totalTVA + stampTax))}</span>
                        </div>
                    )}
                    <div className="print-total-row print-total-row-muted">
                        <span>Paiement</span>
                        <span>{formatNumber(paymentAmount)}</span>
                    </div>
                    <div className="print-total-row print-total-final print-total-final-emerald">
                        <span>NOUVEAU SOLDE</span>
                        <span>{formatNumber(newBalance)} DA</span>
                    </div>
                </div>
            </div>

            {/* ── Signatures ── */}
            <div className="print-signatures">
                <div className="print-signature-block">
                    <div className="print-signature-label">Reçu par (Client)</div>
                    <div className="print-signature-space" />
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">Livré par</div>
                    <div className="print-signature-space" />
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">Cachet &amp; Signature</div>
                    <div className="print-signature-space">
                        <div className="print-stamp-ghost print-stamp-ghost-emerald">
                            {store?.name?.substring(0, 10) || "SOCIÉTÉ"}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="print-footer-bar print-footer-bar-emerald">
                {store?.headerText || `${store?.name || "SYNCLOUDPOS"} — ${store?.address || ""}`}
                {store?.phone && ` | Tél: ${store.phone}`}
            </div>
        </div>
    )
}


// ═════════════════════════════════════════════════════════════════════════════
//  3. PROFORMA / DEVIS (Quotation) — Elegant Professional Design
// ═════════════════════════════════════════════════════════════════════════════
export function ProformaPrintTemplate(props: PrintTemplateProps) {
    const {
        items, customer, store, receiptNumber, date = new Date(),
        subtotalHT, totalTVA, stampTax, totalTTC, paymentMethod, documentId
    } = props

    // Calculate validity (30 days from date)
    const validityDate = new Date(date)
    validityDate.setDate(validityDate.getDate() + 30)

    const colModel = store?.posBlColumns || "standard"
    
    // First column header label
    let firstColHeader = "N°"
    if (colModel === "code") firstColHeader = "Code"
    else if (colModel === "barcode") firstColHeader = "Code-barres"

    const getFirstColValue = (item: PrintableItem, index: number) => {
        if (colModel === "code") {
            return item.product?.code || item.product?.id?.slice(-6).toUpperCase() || `P-${String(index + 1).padStart(3, "0")}`
        }
        if (colModel === "barcode") {
            return item.product?.barcodes?.[0] || "Sans Code"
        }
        return String(index + 1).padStart(2, "0")
    }

    const firstColStyle = colModel === "standard" ? "print-th-num" : "print-th-designation text-left pl-3"
    const firstColTdStyle = colModel === "standard" ? "print-td-num" : "print-td-num text-left pl-3 font-mono text-[9px] text-gray-600"

    return (
        <div className={`print-template print-proforma ${store?.posBlFormat === "A5" ? "format-a5" : ""}`}>
            {/* ── Dynamic Page Sizing Styles ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: ${store?.posBlFormat === "A5" ? "A5 portrait" : "A4 portrait"};
                    margin: ${store?.posBlFormat === "A5" ? "5mm 6mm" : "10mm 12mm"};
                }
            `}} />

            {/* ── Decorative Top Strip ── */}
            <div className="print-accent-strip print-accent-strip-amber" />

            {/* ── Watermark ── */}
            <div className="print-watermark">PROFORMA</div>

            {/* ── Header ── */}
            <div className="print-header">
                <CompanyHeaderBlock store={store} />
                <div className="print-header-right">
                    <div className="print-doc-type print-doc-type-amber">DEVIS / PROFORMA</div>
                    <div className="print-doc-badge print-doc-badge-amber">
                        N° {receiptNumber || `DE-${documentId?.slice(-6) || "000000"}`}
                    </div>
                    <div className="print-doc-date">
                        {format(date, "dd MMMM yyyy", { locale: fr })}
                    </div>
                    <div className="print-doc-validity">
                        Validité : {format(validityDate, "dd/MM/yyyy")}
                    </div>
                </div>
            </div>

            {/* ── Parties ── */}
            <div className="print-parties">
                <CustomerBlock customer={customer} label="Destinataire" />
                <div className="print-store-details">
                    <div className="print-customer-label">Émetteur</div>
                    <CompanyFiscalBlock store={store} />
                </div>
            </div>

            {/* ── Items Table ── */}
            <div className="print-table-wrapper">
                <table className="print-table print-table-proforma">
                    <thead>
                        <tr>
                            <th className={firstColStyle}>{firstColHeader}</th>
                            <th className="print-th-designation">Désignation</th>
                            <th className="print-th-center">Qté</th>
                            <th className="print-th-right">P.U HT (DA)</th>
                            <th className="print-th-center">TVA %</th>
                            <th className="print-th-right">Montant HT (DA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, i) => {
                            const rate = Number(item.tvaRate ?? 0)
                            const originalHT = item.priceHt || item.unitPrice / (1 + rate / 100)
                            const discountAmount = item.discountAmount || 0
                            
                            const netUnitPriceTTC = Number(item.unitPrice) - (item.quantity === 0 ? 0 : discountAmount / item.quantity)
                            const netHT = netUnitPriceTTC / (1 + rate / 100)
                            const lineHT = item.quantity * netHT
                            return (
                                <tr key={i} className={i % 2 === 0 ? "print-row-even" : ""}>
                                    <td className={firstColTdStyle}>{getFirstColValue(item, i)}</td>
                                    <td className="print-td-designation">
                                        <div>{item.product?.name}</div>
                                        {item.serialNumber && (
                                            <div className="text-[10px] text-gray-500 font-mono italic mt-0.5 pl-1">
                                                S/N: {item.serialNumber}
                                            </div>
                                        )}
                                        {discountAmount > 0 && (
                                            <div className="text-[9px] text-violet-700 dark:text-violet-400 font-bold mt-0.5 pl-1">
                                                🏷️ {item.discountLabel} (-{formatNumber(discountAmount)} DA)
                                            </div>
                                        )}
                                    </td>
                                    <td className="print-td-center">{item.quantity}</td>
                                    <td className="print-td-right">
                                        {discountAmount > 0 ? (
                                            <>
                                                <div className="line-through text-gray-400 text-xs">
                                                    {formatNumber(originalHT)}
                                                </div>
                                                <div>
                                                    {formatNumber(netHT)}
                                                </div>
                                            </>
                                        ) : (
                                            formatNumber(originalHT)
                                        )}
                                    </td>
                                    <td className="print-td-center">{rate}%</td>
                                    <td className="print-td-right print-td-bold">{formatNumber(lineHT)}</td>
                                </tr>
                            )
                        })}
                        {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="print-row-empty">
                                <td className={firstColTdStyle}>&nbsp;</td>
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

            {/* ── Totals + Amount in words ── */}
            <div className="print-footer-section">
                <div className="print-tva-breakdown">
                    <div className="print-amount-words">
                        <div className="print-amount-words-label">Arrêté le présent devis à la somme de :</div>
                        <div className="print-amount-words-text">{numberToFrenchWords(totalTTC)}</div>
                    </div>
                    {paymentMethod && (
                        <div className="print-payment-mode">
                            Conditions de règlement : <strong>{paymentMethod === "CASH" ? "Espèces" : paymentMethod === "CHECK" ? "Chèque" : paymentMethod === "TRANSFER" ? "Virement" : paymentMethod === "CARD" ? "Carte bancaire" : paymentMethod === "TERM" ? "À terme" : paymentMethod}</strong>
                        </div>
                    )}
                    <div className="print-proforma-notice">
                        <strong>Note :</strong> Ce document est un devis estimatif et ne constitue pas une facture.
                        Il est valable 30 jours à compter de sa date d&apos;émission.
                    </div>
                    <BaridiMobPaymentBlock
                        bankAccount={store?.bankAccount}
                        storeName={store?.name}
                        amount={totalTTC}
                        receiptNumber={receiptNumber || `DE-${documentId?.slice(-6) || "000000"}`}
                    />
                </div>

                <div className="print-totals-box print-totals-box-proforma">
                    <div className="print-total-row">
                        <span>Total HT</span>
                        <span>{formatNumber(subtotalHT)}</span>
                    </div>
                    <div className="print-total-row">
                        <span>TVA</span>
                        <span>{formatNumber(totalTVA)}</span>
                    </div>
                    {stampTax > 0 && (
                        <div className="print-total-row">
                            <span>Droit de Timbre</span>
                            <span>{formatNumber(stampTax)}</span>
                        </div>
                    )}
                    <div className="print-total-row print-total-final print-total-final-amber">
                        <span>TOTAL TTC</span>
                        <span>{formatNumber(totalTTC)} DA</span>
                    </div>
                </div>
            </div>

            {/* ── Signatures ── */}
            <div className="print-signatures">
                <div className="print-signature-block">
                    <div className="print-signature-label">Bon pour accord (Client)</div>
                    <div className="print-signature-space" />
                    <div className="print-signature-note">Précédé de la mention &quot;Bon pour accord&quot;</div>
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">Cachet &amp; Signature</div>
                    <div className="print-signature-space">
                        <div className="print-stamp-ghost print-stamp-ghost-amber">
                            {store?.name?.substring(0, 10) || "SOCIÉTÉ"}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="print-footer-bar print-footer-bar-amber">
                {store?.headerText || `${store?.name || "SYNCLOUDPOS"} — ${store?.address || ""}`}
                {store?.phone && ` | Tél: ${store.phone}`}
                {store?.nif && ` | NIF: ${store.nif}`}
            </div>
        </div>
    )
}

// ═════════════════════════════════════════════════════════════════════════════
//  4. BON DE GARANTIE (Warranty Slip) — Clean Professional Design
// ═════════════════════════════════════════════════════════════════════════════
export function BonGarantiePrintTemplate(props: PrintTemplateProps) {
    const {
        items, customer, store, receiptNumber, date = new Date(), documentId
    } = props

    const colModel = store?.posBlColumns || "standard"
    
    // First column header label
    let firstColHeader = "N°"
    if (colModel === "code") firstColHeader = "Code"
    else if (colModel === "barcode") firstColHeader = "Code-barres"

    const getFirstColValue = (item: PrintableItem, index: number) => {
        if (colModel === "code") {
            return item.product?.code || item.product?.id?.slice(-6).toUpperCase() || `P-${String(index + 1).padStart(3, "0")}`
        }
        if (colModel === "barcode") {
            return item.product?.barcodes?.[0] || "Sans Code"
        }
        return String(index + 1).padStart(2, "0")
    }

    const firstColStyle = colModel === "standard" ? "print-th-num" : "print-th-designation text-left pl-3"
    const firstColTdStyle = colModel === "standard" ? "print-td-num" : "print-td-num text-left pl-3 font-mono text-[9px] text-gray-600"

    // Only filter items that have serial numbers for the warranty slip
    const serialItems = items.filter(item => item.serialNumber);

    return (
        <div className={`print-template print-garantie ${store?.posBlFormat === "A5" ? "format-a5" : ""}`}>
            {/* ── Dynamic Page Sizing Styles ── */}
            <style dangerouslySetInnerHTML={{ __html: `
                @page {
                    size: ${store?.posBlFormat === "A5" ? "A5 portrait" : "A4 portrait"};
                    margin: ${store?.posBlFormat === "A5" ? "5mm 6mm" : "10mm 12mm"};
                }
            `}} />

            {/* ── Decorative Top Strip ── */}
            <div className="print-accent-strip" style={{ height: "4px", backgroundColor: "#3b82f6" }} />

            {/* ── Header ── */}
            <div className="print-header">
                <CompanyHeaderBlock store={store} />
                <div className="print-header-right">
                    <div className="print-doc-type" style={{ color: "#3b82f6", borderColor: "#3b82f6" }}>BON DE GARANTIE</div>
                    <div className="print-doc-badge" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                        N° {receiptNumber || `GA-${documentId?.slice(-6) || "000000"}`}
                    </div>
                    <div className="print-doc-date">
                        {format(date, "dd MMMM yyyy", { locale: fr })}
                    </div>
                </div>
            </div>

            {/* ── Client Info Row ── */}
            <div className="print-parties">
                <CustomerBlock customer={customer} label="Client (Bénéficiaire)" />
                <div className="print-store-details">
                    <div className="print-customer-label">Garant émetteur</div>
                    <CompanyFiscalBlock store={store} />
                </div>
            </div>

            {/* ── Items Table ── */}
            <div className="print-table-wrapper">
                <table className="print-table">
                    <thead>
                        <tr>
                            <th className={firstColStyle}>{firstColHeader}</th>
                            <th className="print-th-designation">Désignation de l'article</th>
                            <th className="print-th-designation">Numéro de Série (S/N)</th>
                            <th className="print-th-center">Qté</th>
                            <th className="print-th-center">Garantie</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(serialItems.length > 0 ? serialItems : items).map((item, i) => {
                            return (
                                <tr key={i} className={i % 2 === 0 ? "print-row-even" : ""}>
                                    <td className={firstColTdStyle}>{getFirstColValue(item, i)}</td>
                                    <td className="print-td-designation">{item.product?.name}</td>
                                    <td className="print-td-designation font-mono font-bold text-xs" style={{ color: "#1e3a8a" }}>
                                        {item.serialNumber || "N/A"}
                                    </td>
                                    <td className="print-td-center">{item.quantity}</td>
                                    <td className="print-td-center font-bold text-emerald-600">12 Mois</td>
                                </tr>
                            )
                        })}
                        {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
                            <tr key={`empty-${i}`} className="print-row-empty">
                                <td className={firstColTdStyle}>&nbsp;</td>
                                <td className="print-td-designation">&nbsp;</td>
                                <td className="print-td-designation">&nbsp;</td>
                                <td className="print-td-center">&nbsp;</td>
                                <td className="print-td-center">&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ── Conditions + Notice ── */}
            <div className="print-footer-section">
                <div className="print-bl-notes" style={{ width: "100%" }}>
                    <div className="print-tva-title" style={{ color: "#3b82f6" }}>Conditions Générales de Garantie</div>
                    <div className="text-[10px] text-gray-600 leading-relaxed border p-3 rounded-lg bg-gray-50/50 mt-1.5 space-y-1">
                        <p>1. Les articles désignés ci-dessus bénéficient d&apos;une garantie pièces et main-d&apos;œuvre pendant une période de <strong>12 mois</strong> à compter de la date de livraison.</p>
                        <p>2. La garantie couvre uniquement les défauts de fabrication et vices cachés, sous réserve d&apos;une utilisation conforme aux spécifications techniques.</p>
                        <p>3. Sont exclus de la garantie : les pannes résultant de chocs, chutes, surtension électrique, humidité, ou toute intervention ou modification effectuée par un tiers non agréé.</p>
                        <p>4. La présentation de ce bon muni du numéro de série lisible est obligatoire pour toute demande de prise en charge sous garantie.</p>
                    </div>
                </div>
            </div>

            {/* ── Signatures ── */}
            <div className="print-signatures">
                <div className="print-signature-block">
                    <div className="print-signature-label">Signature du Client</div>
                    <div className="print-signature-space" />
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">L&apos;Agent Émetteur</div>
                    <div className="print-signature-space" />
                </div>
                <div className="print-signature-block">
                    <div className="print-signature-label">Cachet de la Caisse</div>
                    <div className="print-signature-space">
                        <div className="print-stamp-ghost" style={{ color: "#3b82f6", borderColor: "#3b82f6" }}>
                            {store?.name?.substring(0, 10) || "SOCIÉTÉ"}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <div className="print-footer-bar" style={{ backgroundColor: "#3b82f6" }}>
                {store?.headerText || `${store?.name || "SYNCLOUDPOS"} — ${store?.address || ""}`}
                {store?.phone && ` | Tél: ${store.phone}`}
            </div>
        </div>
    )
}
