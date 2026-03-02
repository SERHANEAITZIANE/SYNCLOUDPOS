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
    priceHt?: number
    tvaRate?: number
    categoryId?: string
    discountedPrice?: number
    discountLabel?: string
    discountAmount?: number
}

export interface ActivePromotion {
    id: string
    type: string
    targetScope: string
    scopeId: string | null
    discountType: string
    discountValue: number
    triggerQty: number
}

/**
 * Applies promotions to cart items.
 * Returns a new array of cart items with discount info attached to qualifying items.
 * Also returns a total discount amount.
 */
export function applyPromotionsToCart(
    items: CartItem[],
    promotions: ActivePromotion[]
): { items: CartItem[]; totalDiscount: number } {
    if (!promotions || promotions.length === 0) {
        return { items, totalDiscount: 0 }
    }

    // Work on a copy of items with discounts reset
    let result: CartItem[] = items.map(item => ({
        ...item,
        discountedPrice: undefined,
        discountLabel: undefined,
        discountAmount: undefined
    }))

    let totalDiscount = 0

    for (const promo of promotions) {
        // Find matching items for this promotion's scope
        const matchingItems = result.filter(item => {
            if (promo.targetScope === "ALL") return true
            if (promo.targetScope === "CATEGORY") return item.categoryId === promo.scopeId
            if (promo.targetScope === "PRODUCT") return item.productId === promo.scopeId
            return false
        })

        for (const item of matchingItems) {
            if (item.quantity < promo.triggerQty) continue

            // How many times does the discount trigger?
            const triggerCount = Math.floor(item.quantity / promo.triggerQty)
            let discountPerTrigger = 0

            if (promo.type === "BUY_X_GET_Y_FREE") {
                // 1 free item per trigger = full price of 1 unit
                discountPerTrigger = item.price
            } else if (promo.type === "NTH_ITEM_DISCOUNT") {
                // Nth item gets a discount
                if (promo.discountType === "PERCENT") {
                    discountPerTrigger = item.price * (promo.discountValue / 100)
                } else {
                    discountPerTrigger = promo.discountValue
                }
            }

            const totalItemDiscount = discountPerTrigger * triggerCount
            totalDiscount += totalItemDiscount

            // Attach discount info to the item
            const idx = result.findIndex(i => i.id === item.id)
            if (idx >= 0) {
                const discountLabel = promo.type === "BUY_X_GET_Y_FREE"
                    ? `1 acheté = 1 offert`
                    : `${promo.triggerQty}ème article -${promo.discountType === "PERCENT" ? `${promo.discountValue}%` : `${promo.discountValue} DA`}`

                result[idx] = {
                    ...result[idx],
                    discountAmount: totalItemDiscount,
                    discountLabel
                }
            }
        }
    }

    return { items: result, totalDiscount }
}
