import { describe, it, expect } from 'vitest'
import {
    applyPromotionsToCart,
    getProductDirectDiscount,
    ActivePromotion,
    CartItem
} from '@/lib/promotions-engine'

describe('Promotions Engine', () => {
    const mockPromotions: ActivePromotion[] = [
        {
            id: 'promo-direct-1',
            name: 'Réduction 20% sur Produit A',
            type: 'DIRECT_DISCOUNT',
            targetScope: 'PRODUCT',
            scopeId: 'prod-1',
            discountType: 'PERCENT',
            discountValue: 20,
            triggerQty: 1
        },
        {
            id: 'promo-cart-12k',
            name: 'Réduction 20% dès 12000 DA',
            type: 'CART_THRESHOLD',
            targetScope: 'ALL',
            scopeId: null,
            discountType: 'PERCENT',
            discountValue: 20,
            triggerQty: 12000
        }
    ]

    it('identifies direct product discount and calculates 1000 DA -> 800 DA', () => {
        const product = { id: 'prod-1', categoryId: 'cat-1', price: 1000 }
        const discountInfo = getProductDirectDiscount(product, mockPromotions)

        expect(discountInfo).not.toBeNull()
        expect(discountInfo?.hasDiscount).toBe(true)
        expect(discountInfo?.originalPrice).toBe(1000)
        expect(discountInfo?.discountedPrice).toBe(800)
        expect(discountInfo?.discountPercent).toBe(20)
        expect(discountInfo?.discountAmount).toBe(200)
        expect(discountInfo?.label).toBe('-20%')
    })

    it('applies direct discount to cart items (1000 DA -> 800 DA)', () => {
        const items: CartItem[] = [
            {
                id: 'item-1',
                productId: 'prod-1',
                name: 'Produit Test',
                quantity: 1,
                price: 1000
            }
        ]

        const result = applyPromotionsToCart(items, mockPromotions)

        expect(result.items[0].discountAmount).toBe(200)
        expect(result.items[0].discountedPrice).toBe(800)
        expect(result.items[0].discountLabel).toBe('-20%')
        expect(result.itemDiscountTotal).toBe(200)
        expect(result.totalDiscount).toBe(200)
    })

    it('computes cart threshold progress when below 12000 DA', () => {
        const items: CartItem[] = [
            {
                id: 'item-2',
                productId: 'prod-2',
                name: 'Produit B',
                quantity: 8,
                price: 1000 // total 8000 DA
            }
        ]

        const result = applyPromotionsToCart(items, mockPromotions)

        expect(result.cartThresholdInfo).not.toBeNull()
        expect(result.cartThresholdInfo?.threshold).toBe(12000)
        expect(result.cartThresholdInfo?.isUnlocked).toBe(false)
        expect(result.cartThresholdInfo?.remainingAmount).toBe(4000) // 12000 - 8000
        expect(result.cartThresholdInfo?.progressPercent).toBe(67) // 8000/12000 = 67%
        expect(result.cartDiscount).toBe(0)
    })

    it('unlocks cart threshold discount when >= 12000 DA (20% off)', () => {
        const items: CartItem[] = [
            {
                id: 'item-3',
                productId: 'prod-3',
                name: 'Produit C',
                quantity: 12,
                price: 1000 // total 12000 DA
            }
        ]

        const result = applyPromotionsToCart(items, mockPromotions)

        expect(result.cartThresholdInfo).not.toBeNull()
        expect(result.cartThresholdInfo?.isUnlocked).toBe(true)
        expect(result.cartThresholdInfo?.remainingAmount).toBe(0)
        expect(result.cartThresholdInfo?.progressPercent).toBe(100)
        expect(result.cartDiscount).toBe(2400) // 20% of 12000 = 2400 DA
        expect(result.totalDiscount).toBe(2400)
    })
})
