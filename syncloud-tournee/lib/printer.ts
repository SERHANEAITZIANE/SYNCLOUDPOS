import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface BLData {
    receiptNumber: string;
    date: string;
    customer: {
        name: string;
        address?: string;
        phone?: string;
        nif?: string;
        rc?: string;
    };
    items: Array<{
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    subtotal: number;
    taxAmount: number;
    stampTax: number;
    total: number;
    paymentMethod: string;
    amountPaid: number;
    tenantName: string;
    tenantPhone?: string;
    tenantAddress?: string;
}

/**
 * Generate HTML for a Bon de Livraison (delivery note)
 */
function generateBLHtml(data: BLData): string {
    const itemRows = data.items.map((item, i) => `
        <tr>
            <td style="text-align:center;padding:4px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
            <td style="padding:4px;border-bottom:1px solid #e2e8f0;">${item.name}</td>
            <td style="text-align:center;padding:4px;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
            <td style="text-align:right;padding:4px;border-bottom:1px solid #e2e8f0;">${item.unitPrice.toLocaleString("fr-FR")}</td>
            <td style="text-align:right;padding:4px;border-bottom:1px solid #e2e8f0;font-weight:600;">${item.total.toLocaleString("fr-FR")}</td>
        </tr>
    `).join("");

    const remaining = data.total - data.amountPaid;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; color: #1e293b; padding: 16px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #10b981; }
            .company { font-size: 16px; font-weight: 800; color: #0f172a; }
            .company-info { font-size: 10px; color: #64748b; margin-top: 2px; }
            .doc-badge { background: #10b981; color: white; padding: 6px 14px; border-radius: 8px; font-weight: 700; font-size: 12px; text-align: center; }
            .doc-number { font-size: 10px; margin-top: 4px; color: #64748b; text-align: center; }
            .client-box { background: #f1f5f9; border-radius: 8px; padding: 10px; margin-bottom: 12px; }
            .client-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .client-name { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
            .client-detail { font-size: 10px; color: #475569; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            thead th { background: #10b981; color: white; padding: 6px 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
            .totals { margin-left: auto; width: 200px; }
            .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 11px; }
            .total-row.grand { font-size: 16px; font-weight: 900; color: #0f172a; border-top: 2px solid #10b981; padding-top: 6px; margin-top: 4px; }
            .payment-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 8px; margin: 12px 0; font-size: 10px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .sig-box { text-align: center; width: 45%; }
            .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #64748b; }
            .footer { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                <div class="company">${data.tenantName}</div>
                ${data.tenantAddress ? `<div class="company-info">📍 ${data.tenantAddress}</div>` : ""}
                ${data.tenantPhone ? `<div class="company-info">📞 ${data.tenantPhone}</div>` : ""}
            </div>
            <div>
                <div class="doc-badge">BON DE LIVRAISON</div>
                <div class="doc-number">N° ${data.receiptNumber}</div>
                <div class="doc-number">${new Date(data.date).toLocaleDateString("fr-FR")}</div>
            </div>
        </div>

        <div class="client-box">
            <div class="client-label">Client</div>
            <div class="client-name">${data.customer.name}</div>
            ${data.customer.address ? `<div class="client-detail">📍 ${data.customer.address}</div>` : ""}
            ${data.customer.phone ? `<div class="client-detail">📞 ${data.customer.phone}</div>` : ""}
            ${data.customer.nif ? `<div class="client-detail">NIF: ${data.customer.nif} | RC: ${data.customer.rc || "-"}</div>` : ""}
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width:30px;">#</th>
                    <th style="text-align:left;">Désignation</th>
                    <th style="width:50px;">Qté</th>
                    <th style="width:70px;text-align:right;">P.U.</th>
                    <th style="width:80px;text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemRows}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row"><span>Sous-total HT</span><span>${data.subtotal.toLocaleString("fr-FR")} DA</span></div>
            <div class="total-row"><span>TVA</span><span>${data.taxAmount.toLocaleString("fr-FR")} DA</span></div>
            ${data.stampTax > 0 ? `<div class="total-row"><span>Droit de timbre</span><span>${data.stampTax.toLocaleString("fr-FR")} DA</span></div>` : ""}
            <div class="total-row grand"><span>TOTAL TTC</span><span>${data.total.toLocaleString("fr-FR")} DA</span></div>
        </div>

        <div class="payment-info">
            <strong>Mode de paiement:</strong> ${data.paymentMethod === "CASH" ? "Espèces" : data.paymentMethod === "CHECK" ? "Chèque" : "Virement"}
            &nbsp;|&nbsp; <strong>Payé:</strong> ${data.amountPaid.toLocaleString("fr-FR")} DA
            ${remaining > 0 ? `&nbsp;|&nbsp; <strong style="color:#ef4444;">Reste:</strong> ${remaining.toLocaleString("fr-FR")} DA` : ""}
        </div>

        <div class="signatures">
            <div class="sig-box">
                <div class="sig-line">Signature Client</div>
            </div>
            <div class="sig-box">
                <div class="sig-line">Signature Livreur</div>
            </div>
        </div>

        <div class="footer">
            ${data.tenantName} — Document généré depuis SynCloud Tournée
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate ESC/POS receipt format (80mm thermal printer)
 */
function generateThermalReceipt(data: BLData): string {
    const sep = "─".repeat(32);
    const lines: string[] = [];

    // Header
    lines.push(data.tenantName.toUpperCase());
    if (data.tenantAddress) lines.push(data.tenantAddress);
    if (data.tenantPhone) lines.push(`Tel: ${data.tenantPhone}`);
    lines.push(sep);
    lines.push(`BON DE LIVRAISON`);
    lines.push(`N° ${data.receiptNumber}`);
    lines.push(`Date: ${new Date(data.date).toLocaleDateString("fr-FR")}`);
    lines.push(sep);

    // Client
    lines.push(`Client: ${data.customer.name}`);
    if (data.customer.address) lines.push(data.customer.address);
    lines.push(sep);

    // Items
    for (const item of data.items) {
        lines.push(item.name);
        lines.push(`  ${item.quantity} x ${item.unitPrice.toLocaleString("fr-FR")}  = ${item.total.toLocaleString("fr-FR")} DA`);
    }
    lines.push(sep);

    // Totals
    lines.push(`Sous-total:  ${data.subtotal.toLocaleString("fr-FR")} DA`);
    lines.push(`TVA:         ${data.taxAmount.toLocaleString("fr-FR")} DA`);
    if (data.stampTax > 0) lines.push(`Timbre:      ${data.stampTax.toLocaleString("fr-FR")} DA`);
    lines.push(sep);
    lines.push(`TOTAL TTC:   ${data.total.toLocaleString("fr-FR")} DA`);
    lines.push(sep);

    // Payment
    lines.push(`Payé: ${data.amountPaid.toLocaleString("fr-FR")} DA (${data.paymentMethod})`);
    const remaining = data.total - data.amountPaid;
    if (remaining > 0) lines.push(`Reste: ${remaining.toLocaleString("fr-FR")} DA`);
    lines.push("");
    lines.push("Signature client: ___________");
    lines.push("");

    return lines.join("\n");
}

/**
 * Print BL as PDF (A4 format for standard printers)
 */
export async function printBL(data: BLData): Promise<void> {
    const html = generateBLHtml(data);
    await Print.printAsync({ html });
}

/**
 * Generate PDF and share via WhatsApp/Email
 */
export async function shareBL(data: BLData): Promise<void> {
    const html = generateBLHtml(data);
    const { uri } = await Print.printToFileAsync({ html });

    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `BL ${data.receiptNumber}`,
            UTI: "com.adobe.pdf",
        });
    }
}

/**
 * Generate thermal receipt text for Bluetooth ESC/POS printers
 */
export function getThermalReceiptText(data: BLData): string {
    return generateThermalReceipt(data);
}

export type { BLData };
