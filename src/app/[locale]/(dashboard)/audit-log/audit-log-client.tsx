"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield, Search, Filter, User, Clock, FileText, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AuditLog {
    id: string;
    tenantId: string;
    userId: string | null;
    userName: string | null;
    action: string;
    entity: string;
    entityId: string | null;
    description: string | null;
    before: string | null;
    after: string | null;
    ipAddress: string | null;
    createdAt: string;
}

const ACTION_BADGES: Record<string, { label: string; color: string }> = {
    CREATE: { label: "Création", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    UPDATE: { label: "Modification", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    DELETE: { label: "Suppression", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    VOID: { label: "Annulation", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
    LOGIN: { label: "Connexion", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
    EXPORT: { label: "Export", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
    PRINT: { label: "Impression", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    SETTINGS_CHANGE: { label: "Paramètres", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

const ENTITY_LABELS: Record<string, string> = {
    ORDER: "Vente POS",
    PRODUCT: "Produit",
    CUSTOMER: "Client",
    SUPPLIER: "Fournisseur",
    SETTINGS: "Paramètres",
    USER: "Utilisateur",
    SALES_ORDER: "Bon de vente",
    PURCHASE_ORDER: "Achat",
    EXPENSE: "Dépense",
    TREASURY: "Trésorerie",
};

const FIELD_TRANSLATIONS: Record<string, string> = {
    name: "Nom",
    price: "Prix public",
    cost: "Coût (Prix d'achat)",
    stock: "Stock",
    wholesalePrice: "Prix de gros",
    dealerPrice: "Prix revendeur",
    status: "Statut",
    paymentMethod: "Mode de paiement",
    paymentStatus: "Statut de paiement",
    total: "Total",
    subtotal: "Sous-total",
    amountPaid: "Montant payé",
    tvaAmount: "Montant TVA",
    stampTax: "Timbre fiscal",
    type: "Type",
    receiptNumber: "N° de pièce",
    clientType: "Type de client",
    description: "Description",
    notes: "Notes",
    phone: "Téléphone",
    email: "Email",
    address: "Adresse",
    city: "Ville",
    barcode: "Code-barres",
    qtySold: "Quantité vendue",
    revenue: "Chiffre d'affaires",
};

const formatValue = (key: string, val: any) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Oui" : "Non";
    
    const priceKeys = ["price", "cost", "wholesalePrice", "dealerPrice", "total", "subtotal", "amountPaid", "tvaAmount", "stampTax", "revenue"];
    if (priceKeys.includes(key) && !isNaN(Number(val))) {
        return Number(val).toLocaleString("fr-DZ") + " DA";
    }
    return String(val);
};

function parseJSON(str: string | null): any {
    if (!str) return null;
    try {
        return JSON.parse(str);
    } catch {
        return null;
    }
}

export function AuditLogClient({ logs }: { logs: AuditLog[] }) {
    const [search, setSearch] = useState("");
    const [filterEntity, setFilterEntity] = useState<string | null>(null);
    const [filterAction, setFilterAction] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const entities = useMemo(() => {
        const set = new Set(logs.map((l) => l.entity));
        return Array.from(set).sort();
    }, [logs]);

    const filtered = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch =
                !search ||
                log.description?.toLowerCase().includes(search.toLowerCase()) ||
                log.userName?.toLowerCase().includes(search.toLowerCase()) ||
                log.entity.toLowerCase().includes(search.toLowerCase());
            const matchesEntity = !filterEntity || log.entity === filterEntity;
            const matchesAction = !filterAction || log.action === filterAction;
            return matchesSearch && matchesEntity && matchesAction;
        });
    }, [logs, search, filterEntity, filterAction]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                            Journal d&apos;Audit
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Traçabilité des actions — Conformité DGI
                        </p>
                    </div>
                </div>
                <Badge variant="outline" className="w-fit text-sm font-semibold px-4 py-1.5 rounded-full">
                    {filtered.length} entrée{filtered.length !== 1 ? "s" : ""}
                </Badge>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Rechercher par description, utilisateur..."
                        className="pl-10 h-11 rounded-xl"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant={filterEntity === null ? "default" : "outline"}
                        size="sm"
                        className="rounded-full"
                        onClick={() => setFilterEntity(null)}
                    >
                        Tout
                    </Button>
                    {entities.map((entity) => (
                        <Button
                            key={entity}
                            variant={filterEntity === entity ? "default" : "outline"}
                            size="sm"
                            className="rounded-full text-xs"
                            onClick={() => setFilterEntity(filterEntity === entity ? null : entity)}
                        >
                            {ENTITY_LABELS[entity] || entity}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Action filter chips */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(ACTION_BADGES).map(([key, { label, color }]) => (
                    <button
                        key={key}
                        onClick={() => setFilterAction(filterAction === key ? null : key)}
                        className={cn(
                            "text-xs font-bold px-3 py-1.5 rounded-full transition-all border-2",
                            filterAction === key
                                ? "border-violet-500 ring-2 ring-violet-500/20"
                                : "border-transparent",
                            color
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Log Entries */}
            <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="space-y-2 pr-4">
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <FileText className="h-12 w-12 mb-4 opacity-30" />
                            <p className="text-lg font-medium">Aucune entrée trouvée</p>
                            <p className="text-sm opacity-70 mt-1">
                                Essayez de modifier vos filtres
                            </p>
                        </div>
                    )}
                    {filtered.map((log) => {
                        const badge = ACTION_BADGES[log.action] || {
                            label: log.action,
                            color: "bg-gray-100 text-gray-700",
                        };
                        const isExpanded = expandedId === log.id;

                        return (
                            <div
                                key={log.id}
                                className={cn(
                                    "bg-white dark:bg-[#1a1a2e] border border-gray-100 dark:border-gray-800 rounded-xl p-4 transition-all hover:shadow-sm cursor-pointer",
                                    isExpanded && "ring-2 ring-violet-500/20"
                                )}
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 shrink-0 mt-0.5">
                                            <User className="h-4 w-4 text-gray-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="font-bold text-sm text-gray-900 dark:text-white">
                                                    {log.userName || "Système"}
                                                </span>
                                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", badge.color)}>
                                                    {badge.label}
                                                </span>
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-800 text-gray-500 uppercase tracking-wider">
                                                    {ENTITY_LABELS[log.entity] || log.entity}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                                {log.description || "—"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(log.createdAt), "dd MMM yyyy HH:mm", { locale: fr })}
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isExpanded && (log.before || log.after) && (() => {
                                    const beforeObj = parseJSON(log.before);
                                    const afterObj = parseJSON(log.after);
                                    const isDelete = log.action === "DELETE";
                                    const isUpdate = log.action === "UPDATE";
                                    const isCreate = log.action === "CREATE";

                                    const hasStructured = (log.before ? beforeObj !== null : true) && (log.after ? afterObj !== null : true);

                                    if (!hasStructured) {
                                        return (
                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {log.before && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1.5">Avant</p>
                                                            <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                                                                {log.before}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.after && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1.5">Après</p>
                                                            <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                                                                {log.after}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                                {log.ipAddress && (
                                                    <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                                                        IP: {log.ipAddress}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }

                                    // Structured View
                                    let changedFields: { key: string; beforeVal: any; afterVal: any }[] = [];
                                    if (isUpdate && beforeObj && afterObj) {
                                        const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));
                                        allKeys.forEach((key) => {
                                            if (key.endsWith("Id") || key === "id" || key === "updatedAt" || key === "createdAt") return;
                                            const beforeVal = beforeObj[key];
                                            const afterVal = afterObj[key];
                                            if (typeof beforeVal === "object" || typeof afterVal === "object") return;
                                            const beforeStr = beforeVal !== undefined && beforeVal !== null ? String(beforeVal) : "";
                                            const afterStr = afterVal !== undefined && afterVal !== null ? String(afterVal) : "";
                                            if (beforeStr !== afterStr) {
                                                changedFields.push({ key, beforeVal, afterVal });
                                            }
                                        });
                                    }

                                    return (
                                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 space-y-4">
                                            {/* DELETE View */}
                                            {isDelete && beforeObj && (
                                                <div className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
                                                    <p className="text-xs font-extrabold uppercase tracking-widest text-red-600 dark:text-red-400 mb-3">
                                                        Élément Supprimé
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        {Object.entries(beforeObj).map(([key, val]) => {
                                                            if (key.endsWith("Id") || key === "id" || typeof val === "object") return null;
                                                            return (
                                                                <div key={key} className="flex flex-col gap-0.5 bg-white dark:bg-[#151525] p-2.5 rounded-lg border border-red-100/50 dark:border-red-900/20">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{FIELD_TRANSLATIONS[key] || key}</span>
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatValue(key, val)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* UPDATE View */}
                                            {isUpdate && (
                                                <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                                                    <p className="text-xs font-extrabold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">
                                                        Valeurs Modifiées (De ➔ À)
                                                    </p>
                                                    <div className="space-y-2">
                                                        {changedFields.map(({ key, beforeVal, afterVal }) => (
                                                            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#151525] p-3 rounded-lg border border-blue-100/50 dark:border-blue-900/20">
                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider shrink-0 w-40">
                                                                    {FIELD_TRANSLATIONS[key] || key}
                                                                </span>
                                                                <div className="flex items-center gap-3 flex-1 justify-start sm:justify-end">
                                                                    <span className="text-xs font-medium text-red-600 dark:text-red-400 line-through bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded">
                                                                        {formatValue(key, beforeVal)}
                                                                    </span>
                                                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded">
                                                                        {formatValue(key, afterVal)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {changedFields.length === 0 && (
                                                            <div className="text-xs text-muted-foreground py-2 text-center">
                                                                Aucune propriété modifiée ou pas d&apos;historique précédent.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* CREATE View */}
                                            {isCreate && afterObj && (
                                                <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4">
                                                    <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">
                                                        Nouveau Contenu
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                        {Object.entries(afterObj).map(([key, val]) => {
                                                            if (key.endsWith("Id") || key === "id" || typeof val === "object") return null;
                                                            return (
                                                                <div key={key} className="flex flex-col gap-0.5 bg-white dark:bg-[#151525] p-2.5 rounded-lg border border-emerald-100/50 dark:border-emerald-900/20">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{FIELD_TRANSLATIONS[key] || key}</span>
                                                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatValue(key, val)}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Fallback for other actions like LOGIN, PRINT etc. */}
                                            {!isDelete && !isUpdate && !isCreate && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {log.before && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1.5">Avant</p>
                                                            <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                                                                {JSON.stringify(beforeObj, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                    {log.after && (
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1.5">Après</p>
                                                            <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                                                                {JSON.stringify(afterObj, null, 2)}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {log.ipAddress && (
                                                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                                    IP: {log.ipAddress}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
