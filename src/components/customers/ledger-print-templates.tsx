"use client"

import { format } from "date-fns"
import { LedgerLine } from "@/actions/ledger"

export type PrintTemplate = "simple" | "classique" | "premium"

interface PrintProps {
    data: LedgerLine[]
    totalDebits: number
    totalCredits: number
    finalBalance: number
    customerName: string
    customerPhone?: string
    customerAddress?: string
    customerCity?: string
    customerTaxId?: string
    typeLabel: string
    storeName: string
    isOwed: boolean
    formatCurrency: (val: number) => string
}

/* ═══════════════════════════════════════════════════════════════════════
   SHARED TABLE RENDERER
   ═══════════════════════════════════════════════════════════════════════ */
const LedgerTable = ({ data, formatCurrency, variant = "simple" }: {
    data: LedgerLine[], formatCurrency: (v: number) => string, variant?: PrintTemplate
}) => {
    const isClassique = variant === "classique"
    const isPremium = variant === "premium"
    return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif" }}>
            <thead>
                <tr style={{
                    background: isPremium ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : isClassique ? "#1f2937" : "#f3f4f6",
                    color: isPremium || isClassique ? "#fff" : "#111"
                }}>
                    <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px" }}>Date</th>
                    <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px" }}>Vente/Emprunt</th>
                    <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px" }}>Paiement</th>
                    <th style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px" }}>Solde</th>
                    <th style={{ padding: "7px 10px", textAlign: "left", fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px" }}>Observations</th>
                </tr>
            </thead>
            <tbody>
                {data.map((line, i) => (
                    <tr key={line.id} style={{ background: i % 2 === 0 ? "#fff" : isPremium ? "#f0f4ff" : "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "5px 10px", fontSize: "9.5px", color: "#374151" }}>{format(new Date(line.date), "dd/MM/yyyy HH:mm")}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: line.debit > 0 ? "#dc2626" : "#9ca3af", fontWeight: line.debit > 0 ? 600 : 400, fontFamily: "monospace", fontSize: "9.5px" }}>{line.debit > 0 ? formatCurrency(line.debit) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", color: line.credit > 0 ? "#059669" : "#9ca3af", fontWeight: line.credit > 0 ? 600 : 400, fontFamily: "monospace", fontSize: "9.5px" }}>{line.credit > 0 ? formatCurrency(line.credit) : "—"}</td>
                        <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 700, color: line.balance > 0 ? "#dc2626" : "#059669", fontFamily: "monospace", fontSize: "9.5px" }}>{formatCurrency(line.balance)}</td>
                        <td style={{ padding: "5px 10px", fontSize: "9px", color: "#6b7280" }}>{line.observation}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   1. SIMPLE — Minimal, clean, fast to print
   ═══════════════════════════════════════════════════════════════════════ */
export const PrintSimple = (props: PrintProps) => {
    const { data, totalDebits, totalCredits, finalBalance, customerName, customerPhone, customerAddress, customerCity, customerTaxId, typeLabel, storeName, isOwed, formatCurrency } = props
    const now = new Date()
    return (
        <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#111", padding: "8mm", fontSize: "11px", lineHeight: 1.5 }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #d1d5db" }}>
                <div>
                    <div style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>Relevé de Compte</div>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>{storeName}</div>
                </div>
                <div style={{ textAlign: "right", fontSize: "11px", color: "#374151" }}>
                    <div>{now.toLocaleDateString("fr-FR")}</div>
                    <div style={{ fontSize: "9px", color: "#9ca3af" }}>{now.toLocaleTimeString("fr-FR")}</div>
                </div>
            </div>

            {/* Customer Info */}
            <div style={{ display: "flex", gap: "24px", marginBottom: "14px", fontSize: "10.5px", color: "#374151" }}>
                <div><strong>Client:</strong> {customerName} <span style={{ color: "#6b7280" }}>({typeLabel})</span></div>
                {customerPhone && <div><strong>Tél:</strong> {customerPhone}</div>}
                {customerTaxId && <div><strong>NIF:</strong> {customerTaxId}</div>}
            </div>
            {(customerAddress || customerCity) && (
                <div style={{ marginBottom: "14px", fontSize: "10px", color: "#6b7280" }}>
                    <strong>Adresse:</strong> {[customerAddress, customerCity].filter(Boolean).join(", ")}
                </div>
            )}

            {/* Table */}
            <LedgerTable data={data} formatCurrency={formatCurrency} variant="simple" />

            {/* Totals */}
            <div style={{ marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ width: "280px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10px", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                        <span>Total Vente/Emprunt</span><span style={{ color: "#dc2626", fontWeight: 600 }}>{formatCurrency(totalDebits)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "10px", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                        <span>Total Paiement</span><span style={{ color: "#059669", fontWeight: 600 }}>{formatCurrency(totalCredits)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "14px", fontWeight: 800, color: isOwed ? "#dc2626" : "#059669", borderTop: "2px solid #111" }}>
                        <span>Solde</span><span>{formatCurrency(finalBalance)}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   2. CLASSIQUE — Professional, bordered, structured
   ═══════════════════════════════════════════════════════════════════════ */
export const PrintClassique = (props: PrintProps) => {
    const { data, totalDebits, totalCredits, finalBalance, customerName, customerPhone, customerAddress, customerCity, customerTaxId, typeLabel, storeName, isOwed, formatCurrency } = props
    const now = new Date()
    return (
        <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#111", padding: "10mm", fontSize: "11px", lineHeight: 1.5 }}>
            {/* Top accent bar */}
            <div style={{ height: "4px", background: "linear-gradient(90deg,#1f2937,#374151,#1f2937)", marginBottom: "20px", borderRadius: "2px" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "3px" }}>{storeName}</div>
                    <div style={{ fontSize: "24px", fontWeight: 900, color: "#111827", marginTop: "4px", letterSpacing: "-0.5px" }}>Relevé de Compte</div>
                </div>
                <div style={{ textAlign: "right", padding: "10px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>Date d&apos;émission</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#111827", marginTop: "2px" }}>{now.toLocaleDateString("fr-FR")}</div>
                    <div style={{ fontSize: "9px", color: "#9ca3af" }}>{now.toLocaleTimeString("fr-FR")}</div>
                </div>
            </div>

            {/* Customer Box */}
            <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", padding: "16px", marginBottom: "20px", background: "#fafbfc" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Informations Client</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", fontSize: "10.5px" }}>
                    <div><span style={{ fontWeight: 700, color: "#374151" }}>Client:</span> <span style={{ color: "#111" }}>{customerName}</span></div>
                    <div><span style={{ fontWeight: 700, color: "#374151" }}>Type:</span> <span style={{ color: "#111" }}>{typeLabel}</span></div>
                    {customerPhone && <div><span style={{ fontWeight: 700, color: "#374151" }}>Tél:</span> <span style={{ color: "#111" }}>{customerPhone}</span></div>}
                    {customerTaxId && <div><span style={{ fontWeight: 700, color: "#374151" }}>NIF:</span> <span style={{ color: "#111" }}>{customerTaxId}</span></div>}
                    {(customerAddress || customerCity) && <div style={{ gridColumn: "span 2" }}><span style={{ fontWeight: 700, color: "#374151" }}>Adresse:</span> <span style={{ color: "#111" }}>{[customerAddress, customerCity].filter(Boolean).join(", ")}</span></div>}
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", textAlign: "center", background: "#fef2f2" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "1px" }}>Total Vente/Emprunt</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#991b1b", marginTop: "4px" }}>{formatCurrency(totalDebits)}</div>
                </div>
                <div style={{ border: "1px solid #a7f3d0", borderRadius: "8px", padding: "12px", textAlign: "center", background: "#ecfdf5" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "1px" }}>Total Paiement</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#065f46", marginTop: "4px" }}>{formatCurrency(totalCredits)}</div>
                </div>
                <div style={{ border: "2px solid #111827", borderRadius: "8px", padding: "12px", textAlign: "center", background: "#f9fafb" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "1px" }}>Solde Actuel</div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: isOwed ? "#991b1b" : "#065f46", marginTop: "4px" }}>{formatCurrency(finalBalance)}</div>
                </div>
            </div>

            {/* Table */}
            <div style={{ border: "1px solid #d1d5db", borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
                <LedgerTable data={data} formatCurrency={formatCurrency} variant="classique" />
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "2px solid #1f2937", fontSize: "8px", color: "#9ca3af", textAlign: "center" }}>
                <span>Document généré automatiquement — {storeName}</span>
                <span>{now.toLocaleDateString("fr-FR")} {now.toLocaleTimeString("fr-FR")}</span>
            </div>
        </div>
    )
}

/* ═══════════════════════════════════════════════════════════════════════
   3. PREMIUM — Luxury, gradient header, signatures, watermark
   ═══════════════════════════════════════════════════════════════════════ */
export const PrintPremium = (props: PrintProps) => {
    const { data, totalDebits, totalCredits, finalBalance, customerName, customerPhone, customerAddress, customerCity, customerTaxId, typeLabel, storeName, isOwed, formatCurrency } = props
    const now = new Date()
    return (
        <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", color: "#111", padding: "10mm 12mm", fontSize: "11px", lineHeight: 1.5, position: "relative", minHeight: "277mm" }}>
            {/* Top accent strip */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "5px", background: "linear-gradient(90deg,#1e40af,#3b82f6,#60a5fa)" }} />

            {/* Watermark */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-30deg)", fontSize: "80px", fontWeight: 900, color: "rgba(0,0,0,0.015)", letterSpacing: "20px", whiteSpace: "nowrap", pointerEvents: "none", zIndex: 0 }}>RELEVÉ</div>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "10px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #e5e7eb", position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "50px", height: "50px", background: "linear-gradient(135deg,#1e40af,#3b82f6)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "20px", fontWeight: 800, boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}>
                        {storeName.charAt(0)}
                    </div>
                    <div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>{storeName}</div>
                        <div style={{ fontSize: "9px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1.5px" }}>Relevé de Compte</div>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-block", background: "linear-gradient(135deg,#eff6ff,#dbeafe)", color: "#1e40af", padding: "4px 14px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, border: "1px solid #bfdbfe" }}>
                        RELEVÉ DE COMPTE
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "6px" }}>Date: {now.toLocaleDateString("fr-FR")}</div>
                    <div style={{ fontSize: "8px", color: "#9ca3af" }}>{now.toLocaleTimeString("fr-FR")}</div>
                </div>
            </div>

            {/* Customer + Store info */}
            <div style={{ display: "flex", gap: "16px", marginBottom: "18px", position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Client</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>{customerName}</div>
                    <div style={{ fontSize: "10px", color: "#4b5563", lineHeight: 1.6 }}>
                        <div>Type: {typeLabel}</div>
                        {customerPhone && <div>Tél: {customerPhone}</div>}
                        {customerTaxId && <div>NIF: {customerTaxId}</div>}
                        {(customerAddress || customerCity) && <div>Adresse: {[customerAddress, customerCity].filter(Boolean).join(", ")}</div>}
                    </div>
                </div>
                <div style={{ width: "180px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "8px" }}>Résumé</div>
                    <div style={{ fontSize: "10px", color: "#6b7280", lineHeight: 1.8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Opérations:</span><span style={{ fontWeight: 600, color: "#111" }}>{data.length}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Période:</span><span style={{ fontWeight: 600, color: "#111" }}>{data.length > 0 ? format(new Date(data[0].date), "MM/yyyy") : "—"}</span></div>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "18px", position: "relative", zIndex: 1 }}>
                <div style={{ background: "linear-gradient(135deg,#fef2f2,#fff1f2)", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "1px" }}>Total Vente/Emprunt</div>
                    <div style={{ fontSize: "17px", fontWeight: 900, color: "#991b1b", marginTop: "4px", fontFamily: "monospace" }}>{formatCurrency(totalDebits)}</div>
                </div>
                <div style={{ background: "linear-gradient(135deg,#ecfdf5,#f0fdf4)", border: "1px solid #a7f3d0", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "1px" }}>Total Paiement</div>
                    <div style={{ fontSize: "17px", fontWeight: 900, color: "#065f46", marginTop: "4px", fontFamily: "monospace" }}>{formatCurrency(totalCredits)}</div>
                </div>
                <div style={{ background: "linear-gradient(135deg,#111827,#1f2937)", borderRadius: "10px", padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1.5px" }}>Solde Actuel</div>
                    <div style={{ fontSize: "19px", fontWeight: 900, color: isOwed ? "#fca5a5" : "#6ee7b7", marginTop: "4px", fontFamily: "monospace" }}>{formatCurrency(finalBalance)}</div>
                </div>
            </div>

            {/* Table */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", overflow: "hidden", marginBottom: "20px", position: "relative", zIndex: 1 }}>
                <LedgerTable data={data} formatCurrency={formatCurrency} variant="premium" />
            </div>

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", gap: "40px", marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #e5e7eb", position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Le Client</div>
                    <div style={{ height: "50px" }} />
                    <div style={{ borderBottom: "1px solid #d1d5db", width: "60%", margin: "0 auto" }} />
                </div>
                <div style={{ flex: 1, textAlign: "center" }}>
                    <div style={{ fontSize: "9px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Cachet & Signature</div>
                    <div style={{ height: "50px" }} />
                    <div style={{ borderBottom: "1px solid #d1d5db", width: "60%", margin: "0 auto" }} />
                </div>
            </div>

            {/* Footer bar */}
            <div style={{ marginTop: "14px", paddingTop: "8px", borderTop: "2px solid #1e40af", textAlign: "center", fontSize: "7.5px", color: "#9ca3af", letterSpacing: "0.3px" }}>
                {storeName} — Document généré automatiquement le {now.toLocaleDateString("fr-FR")} à {now.toLocaleTimeString("fr-FR")}
            </div>
        </div>
    )
}
