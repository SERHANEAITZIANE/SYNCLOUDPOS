"use server"

import { db } from "@/lib/db"
import { getActiveTenantId } from "./get-active-tenant"
import { hasPermission } from "@/lib/rbac"

export async function exportTenantData() {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "Non autorisé." }

        if (!(await hasPermission("settings:export"))) {
            return { error: "Access denied." }
        }

        const [
            tenant,
            products,
            categories,
            brands,
            customers,
            suppliers,
            orders,
            salesOrders,
            purchaseOrders,
            expenses,
            treasuryAccounts,
        ] = await Promise.all([
            db.tenant.findUnique({ where: { id: tenantId } }),
            db.product.findMany({ where: { tenantId } }),
            db.category.findMany({ where: { tenantId } }),
            db.brand.findMany({ where: { tenantId } }),
            db.customer.findMany({ where: { tenantId } }),
            db.supplier.findMany({ where: { tenantId } }),
            db.order.findMany({ where: { tenantId }, include: { items: true } }),
            db.salesOrder.findMany({ where: { tenantId }, include: { items: true } }),
            db.purchaseOrder.findMany({ where: { tenantId }, include: { items: true } }),
            db.expense.findMany({ where: { tenantId } }),
            db.treasuryAccount.findMany({ where: { tenantId } }),
        ])

        const sensitiveTenantFields = new Set([
            "geminiApiKey", "openaiApiKey", "anthropicApiKey",
            "whatsappToken", "whatsappPhoneId", "whatsappInstanceId",
            "yalidineApiId", "yalidineApiToken", "dhdApiToken", "hddApiToken",
            "smtpPass"
        ])
        const safeTenant = tenant
            ? Object.fromEntries(
                Object.entries(tenant).filter(([key]) => !sensitiveTenantFields.has(key))
            )
            : null

        const exportData = {
            exportDate: new Date().toISOString(),
            version: "1.0",
            tenantId,
            tenant: safeTenant,
            products,
            categories,
            brands,
            customers,
            suppliers,
            orders,
            salesOrders,
            purchaseOrders,
            expenses,
            treasuryAccounts,
        }

        return { success: true, data: JSON.stringify(exportData, null, 2) }
    } catch (error) {
        console.error("[EXPORT_ERROR]", error)
        return { error: "Erreur lors de l'export des données." }
    }
}

export async function getDataSummary() {
    try {
        const tenantId = await getActiveTenantId()
        if (!tenantId) return { error: "Non autorisé." }

        if (!(await hasPermission("reports:read"))) return { error: "Access denied." }

        const [products, customers, suppliers, orders, salesOrders, purchaseOrders, expenses] = await Promise.all([
            db.product.count({ where: { tenantId } }),
            db.customer.count({ where: { tenantId } }),
            db.supplier.count({ where: { tenantId } }),
            db.order.count({ where: { tenantId } }),
            db.salesOrder.count({ where: { tenantId } }),
            db.purchaseOrder.count({ where: { tenantId } }),
            db.expense.count({ where: { tenantId } }),
        ])

        return {
            success: true,
            summary: {
                products,
                customers,
                suppliers,
                sales: orders + salesOrders, // POS + BL combined
                purchases: purchaseOrders,
                expenses
            }
        }
    } catch (error) {
        console.error("[SUMMARY_ERROR]", error)
        return { error: "Erreur." }
    }
}
