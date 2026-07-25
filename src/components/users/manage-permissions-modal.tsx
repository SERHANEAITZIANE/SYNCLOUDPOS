"use client"

import { useCallback, useState, useTransition } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, Loader2 } from "lucide-react"
import { PermissionsMatrix } from "@/components/users/permissions-matrix"
import {
    getUserEffectivePermissions,
    updateUserPermissions,
} from "@/actions/update-user-permissions"

interface ManagePermissionsModalProps {
    user: {
        id: string
        name: string | null
        email: string
        role: string
    }
}

/**
 * Admin-only dialog to grant/revoke individual permissions for a user.
 * Loads the user's current effective permissions on open, lets the admin
 * toggle the matrix, then persists the full desired set (the server diffs it
 * against the role to store minimal overrides).
 */
export function ManagePermissionsModal({ user }: ManagePermissionsModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | undefined>()
    const [success, setSuccess] = useState<string | undefined>()
    const [isFullAccess, setIsFullAccess] = useState(false)
    const [role, setRole] = useState<string>(user.role)
    const [selected, setSelected] = useState<Set<string>>(new Set())

    // Load current permissions when the dialog opens (event handler, not an
    // effect — avoids synchronous setState-in-effect cascades).
    const loadPermissions = useCallback(() => {
        setError(undefined)
        setSuccess(undefined)
        setLoading(true)
        getUserEffectivePermissions(user.id)
            .then((res) => {
                if ("error" in res && res.error) {
                    setError(res.error)
                    return
                }
                if ("data" in res && res.data) {
                    setIsFullAccess(res.data.isFullAccess)
                    setRole(res.data.role)
                    setSelected(new Set(res.data.effective))
                }
            })
            .finally(() => setLoading(false))
    }, [user.id])

    const handleOpenChange = (next: boolean) => {
        setOpen(next)
        if (next) loadPermissions()
    }

    const onSave = () => {
        setError(undefined)
        setSuccess(undefined)
        startTransition(() => {
            updateUserPermissions({
                userId: user.id,
                permissions: Array.from(selected),
            }).then((res) => {
                if (res.error) setError(res.error)
                else {
                    setSuccess(res.success)
                    setTimeout(() => setOpen(false), 700)
                }
            })
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="Gérer les permissions">
                    <ShieldCheck className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Permissions — {user.name || user.email}
                        <Badge variant="outline">{role}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                        Autorisez ou refusez chaque action individuellement. Les cases
                        cochées correspondent à ce que l&apos;utilisateur peut faire.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement…
                    </div>
                ) : isFullAccess ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        Cet utilisateur est <strong>Administrateur</strong> et dispose
                        déjà d&apos;un accès complet. Les permissions ne sont pas modifiables ici.
                    </div>
                ) : (
                    <PermissionsMatrix
                        value={selected}
                        onChange={setSelected}
                        disabled={isPending}
                    />
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                {!isFullAccess && !loading && (
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setSelected(new Set())}
                        >
                            Tout décocher
                        </Button>
                        <Button type="button" onClick={onSave} disabled={isPending}>
                            {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Enregistrer
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
