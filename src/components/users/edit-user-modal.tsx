"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { updateUser } from "@/actions/update-user"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Pencil } from "lucide-react"

const formSchema = z.object({
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "STOCK_MANAGER"]),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
})

interface EditUserModalProps {
    user: {
        id: string;
        name: string | null;
        role: string;
        canEdit: boolean;
        canDelete: boolean;
    }
}

export function EditUserModal({ user }: EditUserModalProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | undefined>("")

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            role: user.role as "ADMIN" | "MANAGER" | "CASHIER" | "ACCOUNTANT" | "STOCK_MANAGER",
            canEdit: user.canEdit,
            canDelete: user.canDelete,
        },
    })

    const selectedRole = form.watch("role")

    function onSubmit(values: z.infer<typeof formSchema>) {
        setError("")
        startTransition(() => {
            const payload = {
                id: user.id,
                role: values.role,
                canEdit: values.canEdit ?? false,
                canDelete: values.canDelete ?? false,
            }
            updateUser(payload).then((data) => {
                if (data.error) {
                    setError(data.error)
                } else {
                    setOpen(false)
                }
            })
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mettre à jour le rôle</DialogTitle>
                    <DialogDescription>
                        Modifier les permissions de l'utilisateur {user.name}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Rôle</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selectionner le rôle" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ADMIN">Admin</SelectItem>
                                            <SelectItem value="MANAGER">Manager</SelectItem>
                                            <SelectItem value="CASHIER">Cashier (Vendeur)</SelectItem>
                                            <SelectItem value="ACCOUNTANT">Accountant (Comptable)</SelectItem>
                                            <SelectItem value="STOCK_MANAGER">Stock Manager (Gestionnaire Stock)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {!(selectedRole === "ADMIN" || selectedRole === "MANAGER") && (
                            <div className="flex flex-col gap-3 py-2 border-t pt-4">
                                <span className="text-sm font-medium text-muted-foreground mb-1">Permissions Spécifiques</span>
                                <FormField
                                    control={form.control}
                                    name="canEdit"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="cursor-pointer">Autoriser la modification</FormLabel>
                                                <p className="text-xs text-muted-foreground">Peut modifier les informations.</p>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="canDelete"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="cursor-pointer">Autoriser la suppression</FormLabel>
                                                <p className="text-xs text-muted-foreground">Peut supprimer des données du système.</p>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        )}
                        {error && <div className="text-sm text-red-500">{error}</div>}
                        <DialogFooter>
                            <Button type="submit" disabled={isPending}>Enregistrer</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
