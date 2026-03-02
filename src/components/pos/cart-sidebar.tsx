"use client"

import { useState, useEffect } from "react"
import { Trash, Plus, Minus, ShoppingCart, X, PlusCircle, Edit2, Check, ChevronsUpDown } from "lucide-react"
import { toast } from "react-hot-toast"
import { useRouter } from "@/i18n/routing"

import { usePosStore } from "@/hooks/use-pos-store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { createOrder } from "@/actions/orders"
import { PaymentModal } from "./payment-modal"
import { cn } from "@/lib/utils"

interface CartSidebarProps {
    customers?: any[]
    accounts?: any[]
    storeName?: string
    storeAddress?: string
    storePhone?: string
}

export const CartSidebar = ({ customers = [], accounts = [], storeName, storeAddress, storePhone }: CartSidebarProps) => {
    const cart = usePosStore()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [openCustomer, setOpenCustomer] = useState(false)
    const [editingItem, setEditingItem] = useState<any>(null)
    const [editQuantity, setEditQuantity] = useState("")
    const [editPrice, setEditPrice] = useState("")

    const handleEditItem = (item: any) => {
        setEditingItem(item)
        setEditQuantity(item.quantity.toString())
        setEditPrice(item.price.toString())
    }

    const saveItemEdit = () => {
        if (!editingItem) return
        const qty = parseFloat(editQuantity)
        const price = parseFloat(editPrice)
        if (!isNaN(qty) && !isNaN(price)) {
            cart.updateQuantity(editingItem.id, qty)
            cart.updatePrice(editingItem.id, price)
        }
        setEditingItem(null)
    }

    // Get active session data
    // We need to ensure we have a fallback if hydration hasn't finished or something is weird
    const activeSession = cart.sessions.find(s => s.id === cart.activeSessionId)
    const items = activeSession?.items || []

    // Calculate total for active session manually since hook might lag or we want direct control
    // But we also have cart.total() which uses get()... let's strictly use the items derived above for rendering
    // User requested NO TVA and NO TIMBRE on POS/Bon de Livraison. We will set tvaAmount=0 and stampTax=0
    // so we just sum up the raw price entered in the POS cart. Wait, the prices entered in the cart are TTC usually. 
    // If there is no TVA, then TTC = HT.
    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0)

    const onCheckout = async (method: "CASH" | "CARD" | "TRANSFER" | "CHECK" | "TERM", paidAmount: number, accountId: string | undefined, stampTax: number, subtotal: number, tvaAmount: number, totalTTC: number) => {
        setLoading(true)
        try {
            const response = await createOrder({
                storeId: "default",
                items: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    tvaRate: item.tvaRate,
                    priceHt: item.priceHt
                })),
                total: totalTTC,
                subtotal: subtotal,
                tvaAmount: tvaAmount,
                stampTax: stampTax,
                paymentMethod: method,
                paidAmount: paidAmount,
                customerId: activeSession?.customerId || null,
                accountId: accountId || undefined,
                status: "COMPLETED",
                originalOrderId: activeSession?.originalOrderId || null
            })

            if (response.error) {
                toast.error(response.error)
                return { success: false }
            } else {
                toast.success("Commande validée!")
                // Keep the modal open to show the Success/Print view, but clear the cart behind
                cart.resetSession()
                router.refresh()
                return {
                    success: true,
                    data: {
                        receiptNumber: response.receiptNumber,
                        paidAmount: paidAmount,
                        previousBalance: response.previousBalance,
                        newBalance: response.newBalance
                    }
                }
            }
        } catch (error) {
            console.error(error)
            toast.error("Erreur lors de la validation.")
            return { success: false }
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Dialog open={!!editingItem} onOpenChange={(val) => !val && setEditingItem(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Éditer l'article</DialogTitle>
                    </DialogHeader>
                    {editingItem && (
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="qty">Quantité (Utiliser un négatif pour un retour)</Label>
                                <Input
                                    id="qty"
                                    type="number"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Prix Unitaire (DZD)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>Annuler</Button>
                        <Button onClick={saveItemEdit}>Enregistrer</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PaymentModal
                isOpen={open}
                onClose={() => setOpen(false)}
                onConfirm={(method, paidAmount, accountId, stampTax, subtotal, tvaAmount, totalTTC) => onCheckout(method, paidAmount, accountId || undefined, stampTax, subtotal, tvaAmount, totalTTC)}
                loading={loading}
                total={total}
                items={items}
                customerName={activeSession?.customerName || undefined}
                hasCustomer={!!activeSession?.customerId}
                accounts={accounts}
                storeName={storeName}
                storeAddress={storeAddress}
                storePhone={storePhone}
            />
            <div className="flex h-full flex-col bg-white dark:bg-[#18181b] border-l border-gray-200 dark:border-slate-800 overflow-hidden">

                {/* Session Tabs */}
                <div className="bg-[#1f2937] p-2 border-b-0">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <div className="flex w-max space-x-2">
                            {cart.sessions.map((session, index) => (
                                <div
                                    key={session.id}
                                    onClick={() => cart.setActiveSession(session.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-full text-base font-bold cursor-pointer transition-all border-2",
                                        cart.activeSessionId === session.id
                                            ? "bg-white text-gray-900 border-gray-200 shadow-sm"
                                            : "bg-transparent border-transparent hover:bg-white/50 text-gray-500"
                                    )}
                                >
                                    <span>Order {index + 1}</span>
                                    {cart.sessions.length > 1 && (
                                        <div
                                            role="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                cart.removeSession(session.id)
                                            }}
                                            className="hover:text-red-500 rounded-full p-1 transition-colors hover:bg-white/20"
                                        >
                                            <X size={14} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-white border-2 border-gray-100 shadow-sm ml-1 text-gray-500 hover:text-gray-900"
                                onClick={cart.createSession}
                            >
                                <Plus size={16} />
                            </Button>
                        </div>
                        <ScrollBar orientation="horizontal" className="h-1.5" />
                    </ScrollArea>
                </div>

                <div className="flex shrink-0 items-center justify-between p-6 pb-4">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                        Order {cart.sessions.findIndex(s => s.id === cart.activeSessionId) + 1}
                    </h2>
                    <Button variant="ghost" size="sm" onClick={cart.resetSession} disabled={items.length === 0} className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full px-4 h-8 text-sm font-black uppercase tracking-wider">
                        Clear Ticket
                    </Button>
                </div>


                <div className="px-6 pb-6 border-b border-gray-100 dark:border-slate-800 shrink-0 space-y-3">
                    <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCustomer}
                                className="w-full justify-between h-12 rounded-2xl bg-[#f8f9fa] dark:bg-[#1e293b] border-gray-200 dark:border-slate-700 text-base font-semibold text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-500 hover:bg-[#f8f9fa] dark:hover:bg-[#1e293b] shadow-sm"
                            >
                                <span className="truncate pr-2 border-none">
                                    {activeSession?.customerId
                                        ? customers.find((c) => c.id === activeSession.customerId)?.name
                                        : "Walking Customer (No Name)"}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] md:w-[400px] p-0 rounded-2xl z-[99999]" align="start">
                            <Command>
                                <CommandInput placeholder="Search client..." className="h-11" />
                                <CommandList>
                                    <CommandEmpty>No client found.</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="Walking Customer No Name"
                                            onSelect={() => {
                                                cart.clearCustomer();
                                                cart.setClientType("RETAIL");
                                                setOpenCustomer(false);
                                            }}
                                            className="font-medium cursor-pointer py-3"
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    !activeSession?.customerId ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            Walking Customer (No Name)
                                        </CommandItem>
                                        {customers.map((c) => (
                                            <CommandItem
                                                key={c.id}
                                                value={`${c.name} ${c.phone || ''} ${c.barcode || ''}`}
                                                onSelect={() => {
                                                    cart.setCustomer(c.id, c.name);
                                                    if (c.clientType) {
                                                        cart.setClientType(c.clientType as any);
                                                    } else {
                                                        cart.setClientType("RETAIL");
                                                    }
                                                    setOpenCustomer(false);
                                                }}
                                                className="font-medium cursor-pointer py-3"
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        activeSession?.customerId === c.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span>{c.name}</span>
                                                    {(c.phone || c.barcode) && (
                                                        <span className="text-xs text-muted-foreground mt-0.5">
                                                            {c.phone} {c.phone && c.barcode ? '·' : ''} {c.barcode}
                                                        </span>
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <ScrollArea className="flex-1 min-h-0 px-5">
                    {items.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center space-y-4 text-gray-400 dark:text-gray-500 mt-28">
                            <div className="p-6 rounded-full bg-gray-50 dark:bg-gray-800/50">
                                <ShoppingCartIcon className="h-12 w-12 opacity-40" />
                            </div>
                            <p className="text-lg font-medium">Your ticket is empty</p>
                            <p className="text-sm opacity-70">Scan or tap products to add</p>
                        </div>
                    )}
                    <div className="flex flex-col gap-1 py-1">
                        {(() => {
                            const bgColors = [
                                "bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/20 dark:hover:bg-rose-900/40",
                                "bg-sky-50/70 hover:bg-sky-100/70 dark:bg-sky-950/20 dark:hover:bg-sky-900/40",
                                "bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40",
                                "bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/20 dark:hover:bg-amber-900/40",
                                "bg-purple-50/70 hover:bg-purple-100/70 dark:bg-purple-950/20 dark:hover:bg-purple-900/40",
                                "bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40"
                            ];
                            return [...items].reverse().map((item, index) => (
                                <div key={item.id} className={cn(
                                    "flex flex-col py-4 px-5 rounded-sm border border-transparent transition-all duration-200 group/item",
                                    bgColors[index % bgColors.length]
                                )}>
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex flex-col gap-2 overflow-hidden w-full">
                                            <h4 className="font-bold text-gray-900 dark:text-slate-200 uppercase tracking-widest text-[11px] leading-tight pr-4 group-hover/item:text-primary dark:group-hover/item:text-primary transition-colors">
                                                <span className="text-gray-400 dark:text-gray-500 mr-1.5">{index + 1}.</span>
                                                {item.name}
                                            </h4>
                                            <div className="flex items-center gap-1 group/price">
                                                <input
                                                    type="number"
                                                    className="w-24 text-sm font-semibold text-gray-800 dark:text-gray-200 bg-transparent py-0 px-0 focus:outline-none focus:ring-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                    value={item.price}
                                                    onChange={(e) => {
                                                        const newPrice = parseFloat(e.target.value)
                                                        if (!isNaN(newPrice) && newPrice >= 0) {
                                                            cart.updatePrice(item.id, newPrice)
                                                        }
                                                    }}
                                                />
                                                <svg className="text-gray-300 dark:text-gray-600 w-3 h-3 mx-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 10 12 5 17 10" /><polyline points="7 14 12 19 17 14" /></svg>
                                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">DA</span>
                                            </div>
                                        </div>
                                        <div className="font-black text-xl text-gray-900 dark:text-white mt-0.5 whitespace-nowrap leading-none tracking-tight">
                                            {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.price * item.quantity)}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-4">
                                            <button
                                                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors w-6 h-6 flex items-center justify-center -ml-2"
                                                onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                                            >
                                                <Minus strokeWidth={2} size={16} />
                                            </button>
                                            <span className="w-4 text-center font-black text-gray-900 dark:text-gray-100 text-base">{item.quantity}</span>
                                            <button
                                                className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors w-6 h-6 flex items-center justify-center"
                                                onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                                            >
                                                <Plus strokeWidth={2} size={16} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
                                            <button
                                                className="w-8 h-8 flex items-center justify-center hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                onClick={() => handleEditItem(item)}
                                            >
                                                <Edit2 strokeWidth={2.5} size={15} />
                                            </button>
                                            <button
                                                className="w-8 h-8 flex items-center justify-center hover:text-red-500 transition-colors"
                                                onClick={() => cart.removeItem(item.id)}
                                            >
                                                <Trash strokeWidth={2.5} size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        })()}
                    </div>
                </ScrollArea>

                <div className="px-6 py-6 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#18181b] z-30 shrink-0 shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
                    <div className="mb-6">
                        <div className="flex justify-between items-center text-gray-900 dark:text-slate-100">
                            <span className="text-3xl font-black">Total</span>
                            <div className="text-right flex items-baseline gap-2">
                                <span className="text-[3rem] leading-none font-black tracking-tighter">
                                    {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
                                </span>
                                <span className="text-lg font-black uppercase">DA</span>
                            </div>
                        </div>
                    </div>

                    <Button
                        id="checkout-button"
                        className="w-full h-[72px] rounded-2xl text-2xl font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 hover:-translate-y-0.5 flex flex-col items-center justify-center gap-1"
                        disabled={items.length === 0 || loading}
                        onClick={() => setOpen(true)}
                    >
                        <span>Checkout</span>
                        <span className="text-[10px] font-bold opacity-70 uppercase tracking-widest leading-none">Space / F9</span>
                    </Button>
                </div>
            </div>
        </>
    )
}

function ShoppingCartIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
    )
}
