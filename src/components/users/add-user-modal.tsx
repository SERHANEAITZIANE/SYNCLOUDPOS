"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { createUser } from "@/actions/create-user"
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
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(3, "Username must be at least 3 characters").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "STOCK_MANAGER"]),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    defaultStoreId: z.string().optional().nullable(),
})

interface AddUserModalProps {
    stores?: { id: string; name: string }[]
    currentStoreId?: string | null
}

export function AddUserModal({ stores = [], currentStoreId }: AddUserModalProps) {
    const [open, setOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | undefined>("")

    const initialStores = stores.length > 0
        ? (currentStoreId && stores.some(s => s.id === currentStoreId) ? [currentStoreId] : [stores[0].id])
        : []
    const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(initialStores)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            username: "",
            password: "",
            role: "CASHIER",
            canEdit: false,
            canDelete: false,
            defaultStoreId: initialStores.join(","),
        },
    })

    const selectedRole = form.watch("role")

    const toggleStore = (storeId: string) => {
        setSelectedStoreIds(prev =>
            prev.includes(storeId)
                ? (prev.length > 1 ? prev.filter(id => id !== storeId) : prev)
                : [...prev, storeId]
        )
    }

    function onSubmit(values: z.infer<typeof formSchema>) {
        setError("")
        startTransition(() => {
            const payload = {
                name: values.name,
                email: values.email,
                username: values.username,
                password: values.password,
                role: values.role,
                canEdit: values.canEdit ?? false,
                canDelete: values.canDelete ?? false,
                defaultStoreId: selectedStoreIds.join(",") || undefined,
            }
            createUser(payload).then((data) => {
                if (data.error) {
                    setError(data.error)
                } else {
                    setOpen(false)
                    form.reset()
                }
            })
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                        Create a new user for your store.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="john@example.com" type="email" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username (Identifiant unique - non sensible à la casse)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="johndoe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input placeholder="******" type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
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
                        {stores.length > 0 && (
                            <div className="space-y-2 border-t pt-3">
                                <FormLabel className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Magasin(s) autorisés (1 ou plusieurs)
                                </FormLabel>
                                <p className="text-[11px] text-muted-foreground">
                                    Le magasin actuel est coché par défaut. Cochez les magasins autorisés pour cet utilisateur.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-44 overflow-y-auto p-2 border rounded-xl bg-slate-50 dark:bg-slate-900">
                                    {stores.length > 1 && (
                                        <label
                                            className={`flex items-center space-x-2 p-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors col-span-1 sm:col-span-2 ${
                                                selectedStoreIds.length === stores.length
                                                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-200"
                                                    : "bg-white border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
                                            }`}
                                        >
                                            <Checkbox
                                                checked={selectedStoreIds.length === stores.length}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedStoreIds(stores.map(s => s.id))
                                                    } else {
                                                        setSelectedStoreIds(currentStoreId && stores.some(s => s.id === currentStoreId) ? [currentStoreId] : [stores[0].id])
                                                    }
                                                }}
                                            />
                                            <span className="truncate">
                                                Tous les magasins (Accès global)
                                            </span>
                                        </label>
                                    )}
                                    {stores.map(store => {
                                        const isChecked = selectedStoreIds.includes(store.id)
                                        const isCurrent = store.id === currentStoreId
                                        return (
                                            <label
                                                key={store.id}
                                                className={`flex items-center space-x-2 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                                    isChecked
                                                        ? "bg-indigo-50 border-indigo-300 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-200"
                                                        : "bg-white border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onCheckedChange={() => toggleStore(store.id)}
                                                />
                                                <span className="truncate">
                                                    {store.name} {isCurrent ? " (Actuel)" : ""}
                                                </span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                        {!(selectedRole === "ADMIN" || selectedRole === "MANAGER") && (
                            <div className="flex flex-col gap-3 py-2 border-t pt-4">
                                <span className="text-sm font-medium text-muted-foreground mb-1">Permissions du Vendeur</span>
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
                                                <p className="text-xs text-muted-foreground">Peut modifier les commandes, clients, etc.</p>
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
                            <Button type="submit" disabled={isPending}>Create User</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
