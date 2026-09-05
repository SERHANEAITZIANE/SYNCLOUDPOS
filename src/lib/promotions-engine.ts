/**
 * Promotion Calculation Engine for POS
 * 
 * Returns a modified cart with discounts applied based on active promotions.
 */

export interface CartItem {
    id: string
    productId: string
    name: string
    quantity: number
    price: number
    cost?: number
    priceHt?: number
    tvaRate?: number
    categoryId?: string
    discountedPrice?: number
    discountLabel?: string
    discountAmount?: number
    serialNumber?: string
}

export interface ActivePromotion {
    id: string
    name?: string
    type: string // "DIRECT_DISCOUNT" | "NTH_ITEM_DISCOUNT" | "BUY_X_GET_Y_FREE" | "CART_THRESHOLD"
    targetScope: string // "ALL" | "CATEGORY" | "PRODUCT"
    scopeId: string | null
    discountType: string // "PERCENT" | "FIXED"
    discountValue: number
    triggerQty: number // Min quantity for item promos, or Min amount (DA) for CART_THRESHOLD
}

export interface CartThresholdInfo {
    id: string
    name?: string
    threshold: number
    discountType: string
    discountValue: number
    isUnlocked: boolean
    remainingAmount: number
    progressPercent: number
    savings: number
}

export interface PromotionResult {
    items: CartItem[]
    itemDiscountTotal: number
    cartDiscount: number
    totalDiscount: number
    cartThresholdInfo?: CartThresholdInfo | null
}

/**
 * Checks if a specific product has an active direct discount (from product, category, or store-wide promo)
 */
export function getProductDirectDiscount(
    product: { id: string; categoryId?: string; price: number },
    promotions: ActivePromotion[]
): {
    hasDiscount: boolean
    originalPrice: number
    discountedPrice: number
    discountPercent: number
    discountAmount: number
    label: string
} | null {
    if (!promotions || promotions.length === 0 || product.price <= 0) return null

    // Look for direct discounts (type === "DIRECT_DISCOUNT" or NTH_ITEM_DISCOUNT with triggerQty <= 1)
    const applicablePromos = promotions.filter(p => {
        const isDirect = p.type === "DIRECT_DISCOUNT" || (p.type === "NTH_ITEM_DISCOUNT" && p.triggerQty <= 1)
        if (!isDirect) return false

        if (p.targetScope === "PRODUCT") return p.scopeId === product.id
        if (p.targetScope === "CATEGORY") return p.scopeId === product.categoryId
        if (p.targetScope === "ALL") return true
        return false
    })

    if (applicablePromos.length === 0) return null

    // Select the best promotion (largest discount)
    let bestDiscountAmount = 0
    let bestDiscountPercent = 0
    let bestLabel = ""

    for (const promo of applicablePromos) {
        let discAmount = 0
        let discPct = 0

        if (promo.discountType === "PERCENT") {
            discPct = promo.discountValue
            discAmount = product.price * (promo.discountValue / 100)
        } else {
            discAmount = promo.discountValue
            discPct = Math.round((promo.discountValue / product.price) * 100)
        }

        if (discAmount > bestDiscountAmount) {
            bestDiscountAmount = Math.min(product.price, discAmount)
            bestDiscountPercent = discPct
            bestLabel = promo.discountType === "PERCENT" ? `-${promo.discountValue}%` : `-${promo.discountValue} DA`
        }
    }

    if (bestDiscountAmount <= 0) return null

    return {
        hasDiscount: true,
        originalPrice: product.price,
        discountedPrice: Math.max(0, product.price - bestDiscountAmount),
        discountPercent: bestDiscountPercent,
        discountAmount: bestDiscountAmount,
        label: bestLabel
    }
}

/**
 * Applies promotions to cart items and computes both item-level and cart-threshold discounts.
 */
export function applyPromotionsToCart(
    items: CartItem[],
    promotions: ActivePromotion[]
): PromotionResult {
    if (!promotions || promotions.length === 0) {
        return {
            items,
            itemDiscountTotal: 0,
            cartDiscount: 0,
            totalDiscount: 0,
            cartThresholdInfo: null
        }
    }

    // Work on a copy of items with discounts reset
    const result: CartItem[] = items.map(item => ({
        ...item,
        discountedPrice: undefined,
        discountLabel: undefined,
        discountAmount: undefined
    }))

    let itemDiscountTotal = 0

    // 1. Process item-level promotions
    const itemPromos = promotions.filter(p => p.type !== "CART_THRESHOLD")

    for (const promo of itemPromos) {
        // Find matching items for this promotion's scope
        const matchingItems = result.filter(item => {
            if (promo.targetScope === "ALL") return true
            if (promo.targetScope === "CATEGORY") return item.categoryId === promo.scopeId
            if (promo.targetScope === "PRODUCT") return item.productId === promo.scopeId
            return false
        })

        for (const item of matchingItems) {
            const minQty = promo.type === "DIRECT_DISCOUNT" ? 1 : promo.triggerQty
            if (item.quantity < minQty) continue

            let triggerCount = 0
            let discountPerTrigger = 0
            let promoLabel = ""

            if (promo.type === "BUY_X_GET_Y_FREE") {
                triggerCount = Math.floor(item.quantity / promo.triggerQty)
                discountPerTrigger = item.price
                const buyQty = Math.max(1, promo.triggerQty - 1)
                promoLabel = `${buyQty} acheté${buyQty > 1 ? 's' : ''} = 1 offert`
            } else if (promo.type === "DIRECT_DISCOUNT" || (promo.type === "NTH_ITEM_DISCOUNT" && promo.triggerQty <= 1)) {
                // Direct discount applies to every unit
                triggerCount = item.quantity
                if (promo.discountType === "PERCENT") {
                    discountPerTrigger = item.price * (promo.discountValue / 100)
                    promoLabel = `-${promo.discountValue}%`
                } else {
                    discountPerTrigger = promo.discountValue
                    promoLabel = `-${promo.discountValue} DA`
                }
            } else if (promo.type === "NTH_ITEM_DISCOUNT") {
                triggerCount = Math.max(0, item.quantity - (promo.triggerQty - 1))
                if (promo.discountType === "PERCENT") {
                    discountPerTrigger = item.price * (promo.discountValue / 100)
                    promoLabel = `${promo.triggerQty}ème article -${promo.discountValue}%`
                } else {
                    discountPerTrigger = promo.discountValue
                    promoLabel = `${promo.triggerQty}ème article -${promo.discountValue} DA`
                }
            }

            const idx = result.findIndex(i => i.id === item.id)
            if (idx >= 0 && triggerCount > 0) {
                const currentItem = result[idx]
                const existingDiscount = currentItem.discountAmount || 0
                const maxPossibleDiscount = currentItem.price * currentItem.quantity - existingDiscount
                const lineDiscount = Math.min(maxPossibleDiscount, discountPerTrigger * triggerCount)

                if (lineDiscount > 0) {
                    itemDiscountTotal += lineDiscount
                    const newTotalDiscount = existingDiscount + lineDiscount
                    const newLabel = currentItem.discountLabel
                        ? `${currentItem.discountLabel}, ${promoLabel}`
                        : promoLabel

                    const unitDiscount = currentItem.quantity > 0 ? newTotalDiscount / currentItem.quantity : 0

                    result[idx] = {
                        ...currentItem,
                        discountAmount: newTotalDiscount,
                        discountedPrice: Math.max(0, currentItem.price - unitDiscount),
                        discountLabel: newLabel
                    }
                }
            }
        }
    }

    // 2. Process Cart-Threshold promotions (e.g. 20% off when cart >= 12,000 DA)
    const cartThresholdPromos = promotions.filter(p => p.type === "CART_THRESHOLD")
    let cartThresholdInfo: CartThresholdInfo | null = null
    let cartDiscount = 0

    if (cartThresholdPromos.length > 0) {
        // Calculate items subtotal after item-level discounts
        const subtotalAfterItemDiscounts = result.reduce(
            (acc, item) => acc + (item.price * item.quantity - (item.discountAmount || 0)),
            0
        )

        // Select the most advantageous threshold promo or the nearest active one
        // Sort by threshold ascending
        const sortedThresholdPromos = [...cartThresholdPromos].sort((a, b) => a.triggerQty - b.triggerQty)
        
        // Find highest unlocked promo or next promo to reach
        const unlockedPromos = sortedThresholdPromos.filter(p => subtotalAfterItemDiscounts >= p.triggerQty)
        const targetPromo = unlockedPromos.length > 0
            ? unlockedPromos[unlockedPromos.length - 1] // highest tier unlocked
            : sortedThresholdPromos[0] // nearest upcoming tier

        if (targetPromo) {
            const threshold = targetPromo.triggerQty
            const isUnlocked = subtotalAfterItemDiscounts >= threshold
            const remainingAmount = Math.max(0, threshold - subtotalAfterItemDiscounts)
            const progressPercent = threshold > 0 ? Math.min(100, Math.round((subtotalAfterItemDiscounts / threshold) * 100)) : 100

            if (isUnlocked) {
                if (targetPromo.discountType === "PERCENT") {
                    cartDiscount = subtotalAfterItemDiscounts * (targetPromo.discountValue / 100)
                } else {
                    cartDiscount = Math.min(subtotalAfterItemDiscounts, targetPromo.discountValue)
                }
            }

            cartThresholdInfo = {
                id: targetPromo.id,
                name: targetPromo.name,
                threshold,
                discountType: targetPromo.discountType,
                discountValue: targetPromo.discountValue,
                isUnlocked,
                remainingAmount,
                progressPercent,
                savings: cartDiscount
            }
        }
    }

    return {
        items: result,
        itemDiscountTotal,
        cartDiscount,
        totalDiscount: itemDiscountTotal + cartDiscount,
        cartThresholdInfo
    }
}

