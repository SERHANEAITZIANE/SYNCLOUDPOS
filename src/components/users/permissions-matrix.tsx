"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PERMISSION_CATALOG, type Action } from "@/lib/permissions"

const ALL_ACTIONS: Action[] = ["read", "create", "update", "delete", "export"]

const ACTION_LABELS: Record<Action, string> = {
    read: "Voir",
    create: "Créer",
    update: "Modifier",
    delete: "Supprimer",
    export: "Exporter",
}

interface PermissionsMatrixProps {
    /** Currently-checked "module:action" permissions. */
    value: Set<string>
    /** Called with the next Set whenever a toggle changes. */
    onChange: (next: Set<string>) => void
    disabled?: boolean
}

/**
 * Grid: rows = modules, columns = actions. Each cell is a checkbox for the
 * "module:action" permission (only rendered when the module supports that
 * action). Includes per-module select-all / clear.
 */
export function PermissionsMatrix({ value, onChange, disabled }: PermissionsMatrixProps) {
    const toggle = (perm: string, checked: boolean) => {
        const next = new Set(value)
        if (checked) next.add(perm)
        else next.delete(perm)
        onChange(next)
    }

    const setModule = (module: string, actions: Action[], checked: boolean) => {
        const next = new Set(value)
        for (const a of actions) {
            const perm = `${module}:${a}`
            if (checked) next.add(perm)
            else next.delete(perm)
        }
        onChange(next)
    }

    const grantedCount = value.size

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                    <Badge variant="secondary" className="mr-2">{grantedCount}</Badge>
                    permission(s) accordée(s)
                </span>
            </div>

            <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                        <tr>
                            <th className="text-left font-medium p-2 min-w-[180px]">Module</th>
                            {ALL_ACTIONS.map((a) => (
                                <th key={a} className="text-center font-medium p-2 whitespace-nowrap">
                                    {ACTION_LABELS[a]}
                                </th>
                            ))}
                            <th className="p-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {PERMISSION_CATALOG.map((mod) => {
                            const allChecked = mod.actions.every((a) => value.has(`${mod.module}:${a}`))
                            return (
                                <tr key={mod.module} className="border-t hover:bg-muted/30">
                                    <td className="p-2 font-medium">{mod.label}</td>
                                    {ALL_ACTIONS.map((a) => {
                                        const supported = mod.actions.includes(a)
                                        const perm = `${mod.module}:${a}`
                                        return (
                                            <td key={a} className="text-center p-2">
                                                {supported ? (
                                                    <Checkbox
                                                        checked={value.has(perm)}
                                                        disabled={disabled}
                                                        onCheckedChange={(c) => toggle(perm, c === true)}
                                                        aria-label={`${mod.label} — ${ACTION_LABELS[a]}`}
                                                    />
                                                ) : (
                                                    <span className="text-muted-foreground/30">—</span>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="p-2 text-right">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={disabled}
                                            className="h-7 text-xs"
                                            onClick={() => setModule(mod.module, mod.actions, !allChecked)}
                                        >
                                            {allChecked ? "Aucun" : "Tout"}
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
