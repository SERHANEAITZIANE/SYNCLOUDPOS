"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Shield, Clock, User, ArrowRight, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
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
    IMPORT: { label: "Import", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
    TRANSFER: { label: "Transfert", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
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
    SALES_ORDER: "Bon de livraison",
    PURCHASE_ORDER: "Achat / Commande",
    EXPENSE: "Dépense",
    EXPENSE_CATEGORY: "Catégorie Dépense",
    TREASURY: "Trésorerie / Caisse",
    PAYMENT: "Paiement / Règlement",
    LOAN: "Emprunt / Avance",
    RETURN: "Retour Produit",
    TRANSFER: "Transfert de fonds",
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
    taxId: "Identifiant fiscal",
    nif: "NIF",
    nis: "NIS",
    artImposition: "Article d'imposition",
    rc: "Registre de commerce (RC)",
    rib: "RIB / Compte bancaire",
    initialBalance: "Solde initial",
    balance: "Solde actuel",
    contactPerson: "Contact principal",
    categoryId: "Catégorie (ID)",
    accountId: "Compte financier (ID)",
    date: "Date",
    tvaRate: "Taux TVA (%)",
};

const formatValue = (key: string, val: any) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "boolean") return val ? "Oui" : "Non";
    
    const priceKeys = ["price", "cost", "wholesalePrice", "dealerPrice", "total", "subtotal", "amountPaid", "tvaAmount", "stampTax", "revenue", "balance", "initialBalance", "amount"];
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
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Filter states
    const [selectedUser, setSelectedUser] = useState<string>("ALL");
    const [selectedAction, setSelectedAction] = useState<string>("ALL");
    const [selectedEntity, setSelectedEntity] = useState<string>("ALL");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const uniqueUsers = useMemo(() => {
        const set = new Set(logs.map((l) => l.userName).filter(Boolean));
        return Array.from(set).sort() as string[];
    }, [logs]);

    const uniqueActions = useMemo(() => {
        const set = new Set(logs.map((l) => l.action).filter(Boolean));
        return Array.from(set).sort() as string[];
    }, [logs]);

    const uniqueEntities = useMemo(() => {
        const set = new Set(logs.map((l) => l.entity).filter(Boolean));
        return Array.from(set).sort() as string[];
    }, [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            if (selectedUser !== "ALL" && log.userName !== selectedUser) {
                return false;
            }
            if (selectedAction !== "ALL" && log.action !== selectedAction) {
                return false;
            }
            if (selectedEntity !== "ALL" && log.entity !== selectedEntity) {
                return false;
            }
            if (dateRange?.from) {
                const logDate = new Date(log.createdAt);
                const start = new Date(dateRange.from);
                start.setHours(0, 0, 0, 0);
                if (logDate < start) return false;

                if (dateRange.to) {
                    const end = new Date(dateRange.to);
                    end.setHours(23, 59, 59, 999);
                    if (logDate > end) return false;
                }
            }
            return true;
        });
    }, [logs, selectedUser, selectedAction, selectedEntity, dateRange]);

    const resetFilters = () => {
        setSelectedUser("ALL");
        setSelectedAction("ALL");
        setSelectedEntity("ALL");
        setDateRange(undefined);
    };

    const hasActiveFilters = selectedUser !== "ALL" || selectedAction !== "ALL" || selectedEntity !== "ALL" || dateRange !== undefined;

    const columns: ColumnDef<AuditLog>[] = useMemo(() => [
        {
            accessorKey: "createdAt",
            header: "Date Heure",
            cell: ({ row }) => {
                return (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono font-bold">
                        <Clock className="h-3.5 w-3.5 opacity-70" />
                        {format(new Date(row.original.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: fr })}
                    </div>
                );
            }
        },
        {
            accessorKey: "userName",
            header: "Utilisateur",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <User className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-sm">
                        {row.original.userName || "Système"}
                    </span>
                </div>
            )
        },
        {
            accessorKey: "action",
            header: "Action",
            cell: ({ row }) => {
                const action = row.original.action;
                const badge = ACTION_BADGES[action] || {
                    label: action,
                    color: "bg-gray-100 text-gray-700 dark:bg-gray-850 dark:text-gray-300"
                };
                return (
                    <Badge className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider", badge.color)}>
                        {badge.label}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "entity",
            header: "Module",
            cell: ({ row }) => {
                const entity = row.original.entity;
                return (
                    <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider bg-slate-50 dark:bg-slate-900">
                        {ENTITY_LABELS[entity] || entity}
                    </Badge>
                );
            }
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ row }) => (
                <div className="text-sm font-medium max-w-[350px] truncate" title={row.original.description || ""}>
                    {row.original.description || "—"}
                </div>
            )
        },
        {
            accessorKey: "ipAddress",
            header: "Adresse IP",
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.ipAddress || "—"}
                </span>
            )
        },
        {
            id: "actions",
            header: "Détails",
            cell: ({ row }) => {
                const hasDetails = row.original.before || row.original.after;
                if (!hasDetails) return null;
                return (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1.5"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(row.original);
                            setIsDialogOpen(true);
                        }}
                    >
                        <Eye className="h-4 w-4" />
                        Voir
                    </Button>
                );
            }
        }
    ], []);

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
            </div>

            {/* Filter controls */}
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200/50 dark:border-slate-850">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Filtres du journal</span>
                    {hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-red-500 hover:text-red-700 h-8 flex items-center gap-1">
                            <X className="h-4 w-4" />
                            Réinitialiser
                        </Button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* User Select */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Utilisateur</label>
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger className="bg-white dark:bg-slate-950">
                                <SelectValue placeholder="Tous les utilisateurs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les utilisateurs</SelectItem>
                                {uniqueUsers.map((user) => (
                                    <SelectItem key={user} value={user}>
                                        {user}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Action Select */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Action / Opération</label>
                        <Select value={selectedAction} onValueChange={setSelectedAction}>
                            <SelectTrigger className="bg-white dark:bg-slate-950">
                                <SelectValue placeholder="Toutes les actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Toutes les actions</SelectItem>
                                {uniqueActions.map((act) => (
                                    <SelectItem key={act} value={act}>
                                        {ACTION_BADGES[act]?.label || act}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Entity Select */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Module / Entité</label>
                        <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                            <SelectTrigger className="bg-white dark:bg-slate-950">
                                <SelectValue placeholder="Tous les modules" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Tous les modules</SelectItem>
                                {uniqueEntities.map((ent) => (
                                    <SelectItem key={ent} value={ent}>
                                        {ENTITY_LABELS[ent] || ent}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date picker */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">Période</label>
                        <DatePickerWithRange
                            date={dateRange}
                            setDate={setDateRange}
                            className="w-full bg-white dark:bg-slate-950"
                        />
                    </div>
                </div>
            </div>

            {/* Well-structured DataTable */}
            <DataTable
                columns={columns}
                data={filteredLogs}
                searchKey="description"
                exportTitle="Journal d'Audit"
                exportDescription="Historique de traçabilité des actions critiques."
            />

            {/* Detailed Changes Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Shield className="h-5 w-5 text-violet-500" />
                            Détails de l&apos;Action d&apos;Audit
                        </DialogTitle>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4 pt-2">
                            {/* Meta Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border text-sm">
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Heure</p>
                                    <p className="font-semibold">{format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: fr })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Utilisateur</p>
                                    <p className="font-semibold">{selectedLog.userName || "Système"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Module</p>
                                    <p className="font-semibold">{ENTITY_LABELS[selectedLog.entity] || selectedLog.entity}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adresse IP</p>
                                    <p className="font-semibold font-mono">{selectedLog.ipAddress || "—"}</p>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="p-3 bg-violet-50/50 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900/30 rounded-lg">
                                <p className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider mb-1">Description</p>
                                <p className="text-sm font-medium">{selectedLog.description || "—"}</p>
                            </div>

                            {/* Changes */}
                            {(() => {
                                const beforeObj = parseJSON(selectedLog.before);
                                const afterObj = parseJSON(selectedLog.after);
                                const isDelete = selectedLog.action === "DELETE";
                                const isUpdate = selectedLog.action === "UPDATE";
                                const isCreate = selectedLog.action === "CREATE";

                                const hasStructured = (selectedLog.before ? beforeObj !== null : true) && (selectedLog.after ? afterObj !== null : true);

                                if (!hasStructured) {
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selectedLog.before && (
                                                <div>
                                                    <p className="text-xs font-bold text-red-500 mb-1.5">Avant</p>
                                                    <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-auto max-h-60 font-mono">
                                                        {selectedLog.before}
                                                    </pre>
                                                </div>
                                            )}
                                            {selectedLog.after && (
                                                <div>
                                                    <p className="text-xs font-bold text-emerald-500 mb-1.5">Après</p>
                                                    <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg overflow-auto max-h-60 font-mono">
                                                        {selectedLog.after}
                                                    </pre>
                                                </div>
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
                                    <div className="space-y-4">
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

                                        {/* Fallback for other actions */}
                                        {!isDelete && !isUpdate && !isCreate && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedLog.before && (
                                                    <div>
                                                        <p className="text-xs font-bold text-red-500 mb-1.5">Avant</p>
                                                        <pre className="text-xs bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 p-3 rounded-lg overflow-auto max-h-60 font-mono">
                                                            {JSON.stringify(beforeObj, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                {selectedLog.after && (
                                                    <div>
                                                        <p className="text-xs font-bold text-emerald-500 mb-1.5">Après</p>
                                                        <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg overflow-auto max-h-60 font-mono">
                                                            {JSON.stringify(afterObj, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
