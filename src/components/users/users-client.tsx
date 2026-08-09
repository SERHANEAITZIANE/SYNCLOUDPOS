"use client"

import { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AddUserModal } from "@/components/users/add-user-modal"
import { EditUserModal } from "@/components/users/edit-user-modal"
import { RolesMatrixClient } from "@/components/settings/roles-matrix-client"
import { format } from "date-fns"
import { Users, ShieldCheck } from "lucide-react"
import { TenantRolePermissionsMap } from "@/actions/roles"

interface UserItem {
    id: string
    name: string
    email: string
    username?: string | null
    role: string
    canEdit: boolean
    canDelete: boolean
    defaultStoreId?: string | null
    createdAt: Date | string
}

export function UsersClient({
    users,
    stores = [],
    currentStoreId,
    initialPermissions
}: {
    users: UserItem[]
    stores?: { id: string; name: string }[]
    currentStoreId?: string | null
    initialPermissions: TenantRolePermissionsMap
}) {
    const [activeTab, setActiveTab] = useState<string>("users")
    const [filterStoreId, setFilterStoreId] = useState<string>(currentStoreId || "all")

    // Filter users by selected store
    const filteredUsers = users.filter((user) => {
        if (filterStoreId === "all") return true;
        if (user.role === "ADMIN") return true;
        if (!user.defaultStoreId || user.defaultStoreId.trim() === "" || user.defaultStoreId === "ALL") return true;
        const assignedIds = user.defaultStoreId.split(",").map(s => s.trim()).filter(Boolean);
        return assignedIds.includes(filterStoreId);
    });

    const activeStore = stores.find(s => s.id === filterStoreId);

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">Gestion de l'Équipe & Matrice des Rôles</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gérez vos utilisateurs et personnalisez minutieusement chaque permission d'accès.</p>
                </div>
                {activeTab === "users" && <AddUserModal stores={stores} currentStoreId={currentStoreId} />}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <TabsList className="grid w-full sm:w-auto grid-cols-2 h-12 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border">
                        <TabsTrigger value="users" className="flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-6 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 shadow-sm">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span>Membres de l'Équipe ({filteredUsers.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="roles" className="flex items-center justify-center gap-2 font-bold text-xs py-2.5 px-6 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                            <span>Matrice des Rôles & Permissions</span>
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "users" && stores.length > 1 && (
                        <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="text-slate-500 dark:text-slate-400">Afficher pour:</span>
                            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border">
                                <button
                                    onClick={() => setFilterStoreId("all")}
                                    className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
                                        filterStoreId === "all"
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                                            : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                    }`}
                                >
                                    Tous ({users.length})
                                </button>
                                {stores.map(store => {
                                    const storeUsersCount = users.filter(u => {
                                        if (u.role === "ADMIN" || !u.defaultStoreId || u.defaultStoreId === "ALL") return true;
                                        return u.defaultStoreId.split(",").map(s => s.trim()).includes(store.id);
                                    }).length;
                                    const isCurrent = store.id === currentStoreId;
                                    return (
                                        <button
                                            key={store.id}
                                            onClick={() => setFilterStoreId(store.id)}
                                            className={`px-3 py-1.5 rounded-lg transition-colors font-bold ${
                                                filterStoreId === store.id
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                            }`}
                                        >
                                            {store.name} {isCurrent ? "(Actuel)" : ""} ({storeUsersCount})
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <TabsContent value="users" className="space-y-4 pt-2">
                    <div className="border rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                <TableRow>
                                    <TableHead className="font-bold">Nom Complet</TableHead>
                                    <TableHead className="font-bold">Identifiant (@username)</TableHead>
                                    <TableHead className="font-bold">Email</TableHead>
                                    <TableHead className="font-bold">Magasin(s)</TableHead>
                                    <TableHead className="font-bold">Rôle Attribution</TableHead>
                                    <TableHead className="font-bold">Date de Création</TableHead>
                                    <TableHead className="text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => {
                                    const assignedIds = user.defaultStoreId ? user.defaultStoreId.split(",").map(s => s.trim()).filter(Boolean) : [];
                                    const matchingStores = stores.filter(s => assignedIds.includes(s.id));
                                    const storeLabel = user.role === "ADMIN" || !user.defaultStoreId || user.defaultStoreId === "ALL" || matchingStores.length === stores.length
                                        ? "Tous les magasins"
                                        : (matchingStores.length > 0 ? matchingStores.map(s => s.name).join(", ") : "Tous les magasins");
                                    return (
                                        <TableRow key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                                            <TableCell className="font-bold text-slate-900 dark:text-slate-100">{user.name}</TableCell>
                                            <TableCell className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                {user.username ? `@${user.username}` : "—"}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {storeLabel}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.role === "ADMIN" ? "default" : "secondary"} className="font-bold">
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <EditUserModal
                                                    user={{
                                                        id: user.id,
                                                        name: user.name,
                                                        email: user.email,
                                                        username: user.username || "",
                                                        role: user.role,
                                                        canEdit: user.canEdit,
                                                        canDelete: user.canDelete,
                                                        defaultStoreId: user.defaultStoreId
                                                    }}
                                                    stores={stores}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {users.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            Aucun utilisateur trouvé.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="roles" className="pt-2 w-full">
                    <RolesMatrixClient initialPermissions={initialPermissions} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
