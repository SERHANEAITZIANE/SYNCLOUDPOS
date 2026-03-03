"use client"

import { useState, useEffect } from "react"
import { ShoppingCart } from "lucide-react"
import { cn, formatter } from "@/lib/utils"

export const DisplayClient = () => {
    const [cartState, setCartState] = useState<{
        items: any[];
        total: number;
        totalDiscount: number;
        customerName: string | null;
    } | null>(null)

    useEffect(() => {
        try {
            const channel = new BroadcastChannel('pos-customer-display')

            channel.onmessage = (event) => {
                if (event.data?.type === 'CART_UPDATE') {
                    setCartState(event.data.payload)
                }
            }

            return () => channel.close()
        } catch (error) {
            console.error('BroadcastChannel display error:', error)
        }
    }, [])

    if (!cartState) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 space-y-4">
                <ShoppingCart className="w-24 h-24 opacity-20" />
                <h1 className="text-3xl font-bold tracking-tight">En attente de la caisse...</h1>
                <p className="text-xl">Bienvenue !</p>
            </div>
        )
    }

    const { items, total, totalDiscount, customerName } = cartState
    const lastItem = items.length > 0 ? items[0] : null // Assuming they are reversed in cart-sidebar or not, let's just take the first/last

    return (
        <div className="flex h-full w-full bg-slate-50 dark:bg-[#0f1115] overflow-hidden">
            {/* Left side - Cart Items (2/3 width) */}
            <div className="flex-1 flex flex-col p-8 border-r border-slate-200 dark:border-slate-800">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                        Votre Panier
                    </h2>
                    {customerName && customerName !== "DIVERS" && (
                        <div className="text-xl font-bold text-primary px-4 py-2 bg-primary/10 rounded-full">
                            Client: {customerName}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto space-y-3 pr-4">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-4">
                            <ShoppingCart className="w-20 h-20" />
                            <p className="text-2xl font-bold">Panier vide</p>
                        </div>
                    ) : (
                        items.map((item, i) => (
                            <div key={item.id} className="flex justify-between items-center p-6 bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{item.name}</h3>
                                    <div className="flex items-center gap-3 mt-2 text-lg text-slate-500 font-medium">
                                        <span>{item.quantity} x {formatter.format(item.price)}</span>
                                        {item.discountLabel && (
                                            <span className="text-violet-600 bg-violet-100 dark:bg-violet-900/30 px-2 py-0.5 rounded text-sm font-bold">
                                                {item.discountLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">
                                    {formatter.format(item.price * item.quantity)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right side - Total & Ads (1/3 width) */}
            <div className="w-[450px] bg-white dark:bg-[#18181b] p-8 flex flex-col justify-between shadow-[-10px_0_30px_rgba(0,0,0,0.03)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">

                {/* Last Scanned Item Highlight */}
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                    {lastItem ? (
                        <div className="w-full animate-in zoom-in-95 duration-300">
                            <div className="text-center text-slate-400 font-bold tracking-widest uppercase mb-4 text-sm">Précédent Article</div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center space-y-4 shadow-sm">
                                <span className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                                    {lastItem.name}
                                </span>
                                <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400">
                                    {formatter.format(lastItem.price)}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {/* Put a logo or ad here */}
                            <div className="text-4xl font-black text-slate-200 dark:text-slate-800 tracking-tighter">
                                SYNCLOUDPOS
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-6">
                    {totalDiscount > 0 && (
                        <div className="flex justify-between items-center bg-violet-50 dark:bg-violet-900/20 p-4 rounded-2xl">
                            <span className="text-xl font-bold text-violet-600 dark:text-violet-400">Économies (Remises)</span>
                            <span className="text-2xl font-black text-violet-600 dark:text-violet-400">
                                - {formatter.format(totalDiscount)}
                            </span>
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        <span className="text-2xl font-bold text-slate-500 uppercase tracking-wider">Total à payer</span>
                        <div className="text-[4.5rem] leading-none font-black text-slate-900 dark:text-white tracking-tighter">
                            {formatter.format(total)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
