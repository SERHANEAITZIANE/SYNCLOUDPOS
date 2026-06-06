import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'

export type ClientType = 'RETAIL' | 'RESELLER' | 'WHOLESALE'

export interface CartItem {
    id: string
    productId: string
    name: string
    price: number // Current active price
    retailPrice: number
    wholesalePrice?: number | null
    dealerPrice?: number | null
    cost?: number
    tvaRate?: number
    priceHt?: number
    quantity: number
    image?: string
    discount?: number
    categoryId?: string
    serialNumber?: string
    skipSplit?: boolean
}

export interface Session {
    id: string
    name: string
    items: CartItem[]
    customerId?: string | null
    customerName?: string | null
    clientType?: ClientType // Détaillant, Revendeur, Grossiste
    originalOrderId?: string | null
    originalReceiptNumber?: string | null
}

interface PosStore {
    sessions: Session[]
    activeSessionId: string

    // Session Management
    createSession: () => void
    setActiveSession: (id: string) => void
    removeSession: (id: string) => void
    updateSessionName: (id: string, name: string) => void

    // Cart Operations (on active session)
    addItem: (data: CartItem) => void
    removeItem: (id: string) => void
    updateQuantity: (id: string, quantity: number) => void
    updatePrice: (id: string, price: number) => void
    updateSerialNumber: (id: string, serialNumber: string) => void
    removeAll: () => void // Clear active session items
    total: () => number // Total of active session

    setCustomer: (id: string, name: string) => void
    clearCustomer: () => void
    setClientType: (type: ClientType) => void

    setOriginalOrder: (orderId: string, receiptNumber: string) => void
    resetSession: () => void // New reset logic

    showImages: boolean
    toggleImages: () => void
    forceElectronicsMode: boolean
    toggleElectronicsMode: () => void
    setForceElectronicsMode: (val: boolean) => void
}

export const usePosStore = create(
    persist<PosStore>((set, get) => ({
        showImages: true,
        toggleImages: () => set((state) => ({ showImages: !state.showImages })),
        forceElectronicsMode: false,
        toggleElectronicsMode: () => set((state) => ({ forceElectronicsMode: !state.forceElectronicsMode })),
        setForceElectronicsMode: (val: boolean) => set({ forceElectronicsMode: val }),
        sessions: [{ id: 'default', name: 'Order 1', items: [], clientType: 'RETAIL' }],
        activeSessionId: 'default',

        createSession: () => {
            const newId = uuidv4()
            const sessionNumber = get().sessions.length + 1
            set((state) => ({
                sessions: [...state.sessions, { id: newId, name: `Order ${sessionNumber}`, items: [], clientType: 'RETAIL' }],
                activeSessionId: newId
            }))
        },

        setActiveSession: (id: string) => {
            set({ activeSessionId: id })
        },

        removeSession: (id: string) => {
            const { sessions, activeSessionId } = get()
            if (sessions.length <= 1) return // Prevent removing last session

            const newSessions = sessions.filter(s => s.id !== id)
            let newActiveId = activeSessionId

            if (activeSessionId === id) {
                newActiveId = newSessions[0].id
            }

            set({ sessions: newSessions, activeSessionId: newActiveId })
        },

        updateSessionName: (id: string, name: string) => {
            set((state) => ({
                sessions: state.sessions.map(s => s.id === id ? { ...s, name } : s)
            }))
        },

        addItem: (data: CartItem) => {
            set((state) => {
                const session = state.sessions.find(s => s.id === state.activeSessionId)
                if (!session) return state

                // In electronics mode, each item is a separate row of quantity 1
                if (state.forceElectronicsMode && !data.skipSplit) {
                    const qtyToAdd = data.quantity || 1;
                    const additionalItems = Array.from({ length: qtyToAdd }).map(() => ({
                        ...data,
                        id: `${data.productId || data.id}-${uuidv4().slice(0, 8)}`,
                        quantity: 1
                    }));
                    const newItems = [...additionalItems, ...session.items];
                    return {
                        sessions: state.sessions.map(s =>
                            s.id === state.activeSessionId ? { ...s, items: newItems } : s
                        )
                    }
                }

                const existingItem = session.items.find((item) => item.id === data.id)
                let newItems

                if (existingItem) {
                    newItems = session.items.map((item) =>
                        item.id === data.id
                            ? { ...item, quantity: item.quantity + data.quantity }
                            : item
                    )
                } else {
                    newItems = [data, ...session.items]
                }

                return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId ? { ...s, items: newItems } : s
                    )
                }
            })
        },

        removeItem: (roomId: string) => {
            set((state) => {
                const session = state.sessions.find(s => s.id === state.activeSessionId)
                if (!session) return state

                return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId
                            ? { ...s, items: s.items.filter((item) => item.id !== roomId) }
                            : s
                    )
                }
            })
        },

        updateQuantity: (id: string, quantity: number) => {
            set((state) => {
                const session = state.sessions.find(s => s.id === state.activeSessionId)
                if (!session) return state

                return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId
                            ? { ...s, items: s.items.map(item => item.id === id ? { ...item, quantity } : item) }
                            : s
                    )
                }
            })
        },

        updatePrice: (id: string, price: number) => {
            set((state) => {
                const session = state.sessions.find(s => s.id === state.activeSessionId)
                if (!session) return state

                return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId
                            ? { ...s, items: s.items.map(item => item.id === id ? { ...item, price } : item) }
                            : s
                    )
                }
            })
        },

        updateSerialNumber: (id: string, serialNumber: string) => {
            set((state) => {
                const session = state.sessions.find(s => s.id === state.activeSessionId)
                if (!session) return state

                return {
                    sessions: state.sessions.map(s =>
                        s.id === state.activeSessionId
                            ? { ...s, items: s.items.map(item => item.id === id ? { ...item, serialNumber } : item) }
                            : s
                    )
                }
            })
        },

        removeAll: () => {
            set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId ? { ...s, items: [] } : s
                )
            }))
        },

        resetSession: () => {
            set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId ? {
                        ...s,
                        items: [],
                        customerId: null,
                        customerName: null,
                        clientType: 'RETAIL',
                        originalOrderId: null,
                        originalReceiptNumber: null
                    } : s
                )
            }))
        },

        total: () => {
            const { sessions, activeSessionId } = get()
            const session = sessions.find(s => s.id === activeSessionId)
            if (!session) return 0
            return session.items.reduce((total, item) => total + (item.price * item.quantity), 0)
        },

        setCustomer: (id: string, name: string) => {
            set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId ? { ...s, customerId: id, customerName: name } : s
                )
            }))
        },

        clearCustomer: () => {
            set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId ? { ...s, customerId: null, customerName: null } : s
                )
            }))
        },

        setClientType: (type: ClientType) => {
            set((state) => ({
                sessions: state.sessions.map(s => {
                    if (s.id !== state.activeSessionId) return s;
                    // Recalculate prices for existing items based on new client type
                    const updatedItems = s.items.map(item => {
                        let newPrice = item.retailPrice;
                        if (type === 'RESELLER' && item.dealerPrice != null) {
                            newPrice = item.dealerPrice;
                        } else if (type === 'WHOLESALE' && item.wholesalePrice != null) {
                            newPrice = item.wholesalePrice;
                        }
                        return { ...item, price: newPrice };
                    });
                    return { ...s, clientType: type, items: updatedItems };
                })
            }))
        },

        setOriginalOrder: (orderId: string, receiptNumber: string) => {
            set((state) => ({
                sessions: state.sessions.map(s =>
                    s.id === state.activeSessionId ? { ...s, originalOrderId: orderId, originalReceiptNumber: receiptNumber } : s
                )
            }))
        }

    }), {
        name: 'pos-storage-multi-v1', // changed name to reset storage
        storage: createJSONStorage(() => localStorage)
    })
)

