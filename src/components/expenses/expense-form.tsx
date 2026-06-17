"use client"

import * as z from "zod"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useRouter } from "@/i18n/routing"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import { useEffect } from "react"
import { Receipt, Calendar, Clock, Plus, Wallet, Tag } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { Heading } from "@/components/ui/heading"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createExpense, createExpenseCategory, updateExpense } from "@/actions/expenses"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "@/components/ui/image-upload"

const formSchema = z.object({
    description: z.string().min(1, "La description est requise"),
    amount: z.number().min(0.01, "Le montant doit être supérieur à 0"),
    categoryId: z.string().min(1, "Sélectionnez une catégorie"),
    accountId: z.string().optional(),
    date: z.string(),
    time: z.string(),
    notes: z.string().optional(),
    imageUrl: z.string().optional(),
})

type ExpenseFormValues = z.infer<typeof formSchema>

interface ExpenseFormProps {
    initialData: any | null
    categories: any[]
    accounts: any[]
}

const now = () => {
    const d = new Date()
    return { date: format(d, "yyyy-MM-dd"), time: format(d, "HH:mm") }
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ initialData, categories, accounts }) => {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [openCategoryModal, setOpenCategoryModal] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState("")

    const { date: defaultDate, time: defaultTime } = now()

    const form = useForm<ExpenseFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ? {
            description: initialData.description || "",
            amount: Number(initialData.amount) || 0,
            categoryId: initialData.categoryId || "",
            accountId: initialData.accountId || "",
            date: initialData.date ? format(new Date(initialData.date), "yyyy-MM-dd") : defaultDate,
            time: initialData.date ? format(new Date(initialData.date), "HH:mm") : defaultTime,
            notes: initialData.notes || "",
            imageUrl: initialData.imageUrl || "",
        } : {
            description: "",
            amount: 0,
            categoryId: "",
            accountId: "",
            date: defaultDate,
            time: defaultTime,
            notes: "",
            imageUrl: "",
        }
    })

    // Load default account from pos preferences if creating a new expense
    useEffect(() => {
        if (!initialData) {
            try {
                const prefs = localStorage.getItem("pos_defaults_prefs")
                if (prefs) {
                    const parsed = JSON.parse(prefs)
                    if (parsed.defaultAccountId && parsed.defaultAccountId !== "none") {
                        form.setValue("accountId", parsed.defaultAccountId)
                    } else {
                        // Fallback to "CAISSE SECONDAIRE" or "CAISSE PRINCIPALE" if needed, matching POS behavior
                        const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE SECONDAIRE" || a.name.toUpperCase() === "CAISSE PRINCIPALE")
                        if (defaultAccount) {
                            form.setValue("accountId", defaultAccount.id)
                        }
                    }
                } else {
                    const defaultAccount = accounts?.find(a => a.name.toUpperCase() === "CAISSE SECONDAIRE" || a.name.toUpperCase() === "CAISSE PRINCIPALE")
                    if (defaultAccount) {
                        form.setValue("accountId", defaultAccount.id)
                    }
                }
            } catch { /* ignore */ }
        }
    }, [initialData, form, accounts])

    const onSubmit = async (values: ExpenseFormValues) => {
        try {
            setLoading(true)
            // Combine date + time into a Date object
            const dateTime = new Date(`${values.date}T${values.time}`)
            
            if (initialData) {
                const res = await updateExpense(initialData.id, { ...values, date: dateTime } as any)
                if (res?.error) {
                    toast.error(res.error)
                    return
                }
                toast.success("Dépense mise à jour avec succès.")
            } else {
                const res = await createExpense({ ...values, date: dateTime } as any)
                if (res?.error) {
                    toast.error(res.error)
                    return
                }
                toast.success("Dépense enregistrée avec succès.")
            }
            router.push(`/expenses`)
            router.refresh()
        } catch { 
            toast.error("Une erreur est survenue.") 
        } finally { 
            setLoading(false) 
        }
    }

    const onCreateCategory = async () => {
        try {
            setLoading(true)
            await createExpenseCategory({ name: newCategoryName, type: "VARIABLE" })
            toast.success("Catégorie créée.")
            setNewCategoryName("")
            setOpenCategoryModal(false)
            router.refresh()
        } catch { toast.error("Erreur lors de la création.") }
        finally { setLoading(false) }
    }

    return (
        <>
            {/* Category quick-create modal */}
            <Modal title="Nouvelle catégorie" description="Créer une catégorie de dépense" isOpen={openCategoryModal} onClose={() => setOpenCategoryModal(false)}>
                <div className="space-y-4 py-2">
                    <Input placeholder="Nom de la catégorie (ex: Loyer, Électricité...)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpenCategoryModal(false)}>Annuler</Button>
                        <Button onClick={onCreateCategory} disabled={loading || !newCategoryName}>Créer</Button>
                    </div>
                </div>
            </Modal>

            <div className="flex items-center justify-between">
                <Heading
                    title={initialData ? "Modifier la dépense" : "Nouvelle dépense"}
                    description={initialData ? "Modifier les informations de la dépense" : "Enregistrer une nouvelle dépense"}
                />
            </div>
            <Separator />

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* LEFT - main info (2/3 width) */}
                        <div className="lg:col-span-2 space-y-5">

                            {/* General Info Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Receipt className="h-4 w-4 text-muted-foreground" />
                                        Informations de la dépense
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl>
                                                <Input disabled={loading} placeholder="Ex: Loyer mensuel, facture EGA..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {/* Amount */}
                                    <FormField control={form.control} name="amount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Montant</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        disabled={loading}
                                                        placeholder="0.00"
                                                        className="text-2xl font-bold pr-14 h-13 text-red-600"
                                                        {...field}
                                                        onChange={e => field.onChange(e.target.valueAsNumber)}
                                                    />
                                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-red-500 font-bold">DA</span>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="notes" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes (Optionnel)</FormLabel>
                                            <FormControl>
                                                <Textarea disabled={loading} placeholder="Informations supplémentaires..." rows={2} {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            {/* Category & Account */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Tag className="h-4 w-4 text-muted-foreground" />
                                        Classification & Imputabilité
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="categoryId" render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center justify-between">
                                                <FormLabel>Catégorie de dépense</FormLabel>
                                                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setOpenCategoryModal(true)}>
                                                    <Plus className="h-3 w-3" /> Nouvelle catégorie
                                                </Button>
                                            </div>
                                            <SearchableSelect
                                                options={categories.map(c => ({ value: c.id, label: c.name }))}
                                                value={field.value}
                                                onChange={field.onChange}
                                                disabled={loading}
                                                placeholder="Sélectionner une catégorie..."
                                                searchPlaceholder="Rechercher une catégorie..."
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="accountId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5">
                                                <Wallet className="h-3.5 w-3.5" /> Imputer sur le compte (Trésorerie)
                                            </FormLabel>
                                            <Select disabled={loading} onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Sélectionner Caisse / Banque..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">Aucun — Enregistrement seulement</SelectItem>
                                                    {accounts.map(a => (
                                                        <SelectItem key={a.id} value={a.id}>
                                                            {a.name} — Solde: {a.balance}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT - date/time + submit */}
                        <div className="space-y-5">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        Date de la dépense
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField control={form.control} name="date" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs text-muted-foreground uppercase tracking-wide">Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" disabled={loading} {...field} className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="time" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wide">
                                                <Clock className="h-3 w-3" /> Heure
                                            </FormLabel>
                                            <FormControl>
                                                <Input type="time" disabled={loading} {...field} className="font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    {/* Summary */}
                                    <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 p-3 mt-2">
                                        <p className="text-xs text-red-500 font-semibold uppercase tracking-wide">Montant à débiter</p>
                                        <p className="text-2xl font-bold text-red-600 mt-0.5">
                                            {Number(form.watch("amount") || 0).toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Receipt Image Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Receipt className="h-4 w-4 text-muted-foreground" />
                                        Justificatif de dépense (Photo)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center justify-center py-4">
                                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                                        <FormItem className="w-full flex flex-col items-center">
                                            <FormControl>
                                                <ImageUpload
                                                    value={field.value ? [field.value] : []}
                                                    disabled={loading}
                                                    onChange={(url) => field.onChange(url)}
                                                    onRemove={() => field.onChange("")}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Button id="global-save-button" disabled={loading} className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700" type="submit">
                                {loading ? "Enregistrement..." : initialData ? "✓ Modifier la dépense" : "✓ Enregistrer la dépense"}
                                <span className="ml-2 text-[10px] opacity-70 font-bold uppercase tracking-widest">[F8]</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Form>
        </>
    )
}
