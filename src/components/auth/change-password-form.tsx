"use client"

import { useState, useTransition } from "react"
import { toast } from "react-hot-toast"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { changeMyPassword } from "@/actions/superadmin"

export const ChangePasswordForm = () => {
    const [isPending, startTransition] = useTransition()
    const [current, setCurrent] = useState("")
    const [newPw, setNewPw] = useState("")
    const [confirm, setConfirm] = useState("")

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (newPw !== confirm) {
            toast.error("Les mots de passe ne correspondent pas")
            return
        }
        if (newPw.length < 6) {
            toast.error("Minimum 6 caractères")
            return
        }
        startTransition(async () => {
            const result = await changeMyPassword(current, newPw)
            if (result.success) {
                toast.success(result.success)
                setCurrent("")
                setNewPw("")
                setConfirm("")
            } else {
                toast.error(result.error || "Erreur")
            }
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Changer le mot de passe
                </CardTitle>
                <CardDescription>Mettez à jour votre mot de passe de connexion.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
                    <div className="space-y-1">
                        <Label>Mot de passe actuel</Label>
                        <Input
                            type="password"
                            value={current}
                            onChange={e => setCurrent(e.target.value)}
                            placeholder="••••••••"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Nouveau mot de passe</Label>
                        <Input
                            type="password"
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder="••••••••"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label>Confirmer le nouveau mot de passe</Label>
                        <Input
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="••••••••"
                            disabled={isPending}
                        />
                    </div>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Mise à jour..." : "Modifier le mot de passe"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
