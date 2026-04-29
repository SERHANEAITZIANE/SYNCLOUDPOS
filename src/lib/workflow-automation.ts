/*
 * Workflow Automation Service
 * Implements intelligent business rules and suggestions
 */

import { db } from "@/lib/db"
import { getSalesData } from "@/actions/analytics"

// Types for workflow automation
export interface PricingRule {
  id: string
  name: string
  description: string
  priority: number
  condition: (product: ProductData, context: AutomationContext) => boolean
  action: (product: ProductData, context: AutomationContext) => PricingAction
}

export interface RestockingRule {
  id: string
  name: string
  description: string
  priority: number
  condition: (product: ProductData, context: AutomationContext) => boolean
  action: (product: ProductData, context: AutomationContext) => RestockingAction
}

export interface SuggestionRule {
  id: string
  name: string
  description: string
  priority: number
  condition: (context: AutomationContext) => boolean
  action: (context: AutomationContext) => SuggestionAction
}

type PricingAction = {
  type: 'price_adjustment'
  field: 'retailPrice' | 'wholesalePrice' | 'dealerPrice'
  delta: number // Percentage change, e.g. -10 for 10% discount
  reason: string
}

type RestockingAction = {
  type: 'restock_suggestion'
  quantity: number
  reason: string
}

type SuggestionAction = {
  type: 'product_suggestion' | 'bundle_suggestion' | 'cross_sell'
  productId: string
  message: string
  confidence: number
}

interface ProductData {
  id: string
  name: string
  price: number
  cost: number
  wholesalePrice?: number
  dealerPrice?: number
  stock: number
  minStock: number
  categoryId: string
  category: string
  tvaRate: number
}

interface AutomationContext {
  products: ProductData[]
  salesData: { date: string; sales: number }[]
  tenantId: string
  date: Date
}

// Helper function to calculate sales trend
function calculateSalesTrend(salesData: { date: string; sales: number }[], days: number = 7): number {
  if (salesData.length < days + 1) return 0

  const recentSales = salesData.slice(-days).reduce((sum, day) => sum + day.sales, 0)
  const previousSales = salesData.slice(-days*2, -days).reduce((sum, day) => sum + day.sales, 0)

  return previousSales === 0 ? (recentSales > 0 ? 100 : 0) : ((recentSales - previousSales) / previousSales) * 100
}

// Helper function to calculate stock turnover rate
function calculateTurnoverRate(salesVolume: number, averageStock: number): number {
  return averageStock === 0 ? 0 : salesVolume / averageStock
}

// Pricing Rules
export const pricingRules: PricingRule[] = [
  {
    id: 'slow_moving_discount',
    name: 'Slow Moving Items Discount',
    description: 'Apply discount to items not sold in 30 days',
    priority: 1,
    condition: (product, context) => {
      // Check if product has low sales velocity
      const salesLast30Days = context.salesData
        .slice(-30)
        .reduce((sum, day) => sum + (day.sales * 0.1), 0) // Rough estimate based on store sales
      return salesLast30Days < 2 && product.stock > product.minStock * 2
    },
    action: (product, context) => ({
      type: 'price_adjustment',
      field: 'retailPrice',
      delta: -15,
      reason: 'Clear slow-moving inventory'
    })
  },
  {
    id: 'high_demand_price_increase',
    name: 'High Demand Price Increase',
    description: 'Increase price for high-demand items with low stock',
    priority: 2,
    condition: (product, context) => {
      const salesTrend = calculateSalesTrend(context.salesData)
      return salesTrend > 20 && product.stock < product.minStock * 1.5
    },
    action: (product, context) => ({
      type: 'price_adjustment',
      field: 'retailPrice',
      delta: 10,
      reason: 'High demand with limited supply'
    })
  },
  {
    id: 'seasonal_pricing',
    name: 'Seasonal Pricing',
    description: 'Adjust prices based on seasonality',
    priority: 3,
    condition: (product, context) => {
      const month = context.date.getMonth()
      // Example: Increase prices for seasonal items (e.g., cooling products in summer)
      if (product.category === 'Electronics' && [5, 6, 7, 8].includes(month)) { // June-August
        return true
      }
      return false
    },
    action: (product, context) => ({
      type: 'price_adjustment',
      field: 'retailPrice',
      delta: 15,
      reason: 'Seasonal demand increase'
    })
  }
]

// Restocking Rules
export const restockingRules: RestockingRule[] = [
  {
    id: 'low_stock_restock',
    name: 'Low Stock Restock',
    description: 'Suggest restocking when inventory is below threshold',
    priority: 1,
    condition: (product, context) => {
      return product.stock <= product.minStock
    },
    action: (product, context) => ({
      type: 'restock_suggestion',
      quantity: Math.max(product.minStock * 2 - product.stock, product.minStock),
      reason: 'Stock below minimum threshold'
    })
  },
  {
    id: 'fast_moving_restock',
    name: 'Fast Moving Item Restock',
    description: 'Aggressive restocking for high-velocity items',
    priority: 2,
    condition: (product, context) => {
      const salesTrend = calculateSalesTrend(context.salesData, 7)
      const turnoverRate = calculateTurnoverRate(
        context.salesData.slice(-7).reduce((sum, day) => sum + day.sales, 0) * 0.1, // Rough estimate
        product.stock
      )
      return salesTrend > 15 && turnoverRate > 2
    },
    action: (product, context) => ({
      type: 'restock_suggestion',
      quantity: product.minStock * 3,
      reason: 'Fast-moving item with high turnover'
    })
  }
]

// Suggestion Rules
export const suggestionRules: SuggestionRule[] = [
  {
    id: 'frequently_bought_together',
    name: 'Frequently Bought Together',
    description: 'Suggest products frequently purchased together',
    priority: 1,
    condition: (context) => {
      // This would be based on actual order data analysis
      // For now, we'll use a simple check on overall sales patterns
      return context.salesData.length > 7
    },
    action: (context) => {
      // In a real implementation, this would analyze actual co-purchase patterns
      // For demo purposes, we'll return a sample suggestion
      return {
        type: 'product_suggestion',
        productId: context.products[0]?.id || '',
        message: 'Customers who bought this also bought [Product Name]',
        confidence: 0.7
      }
    }
  }
]

// Main automation engine
export class WorkflowAutomationEngine {
  private tenantId: string

  constructor(tenantId: string) {
    this.tenantId = tenantId
  }

  async run(): Promise<AutomationResults> {
    // Get current context
    const context = await this.getContext()

    // Run all automation rules
    const pricingSuggestions = this.evaluatePricingRules(context)
    const restockingSuggestions = this.evaluateRestockingRules(context)
    const productSuggestions = this.evaluateSuggestionRules(context)

    return {
      pricing: pricingSuggestions,
      restocking: restockingSuggestions,
      suggestions: productSuggestions,
      timestamp: new Date()
    }
  }

  private async getContext(): Promise<AutomationContext> {
    // Get products
    const rawProducts = await db.product.findMany({
      where: { tenantId: this.tenantId },
      include: { category: true, storeProducts: true }
    })

    const products = rawProducts.map(p => {
      const storeProduct = p.storeProducts[0] // Assuming single store for now
      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        cost: Number(p.cost || 0),
        wholesalePrice: Number(p.wholesalePrice || p.price),
        dealerPrice: Number(p.dealerPrice || p.price),
        stock: storeProduct?.stock || 0,
        minStock: storeProduct?.minStock || 0,
        categoryId: p.categoryId || '',
        category: p.category?.name || 'Uncategorized',
        tvaRate: Number(p.tvaRate),
      }
    })

    // Get sales data
    const salesData = await getSalesData(this.tenantId, 60) // Last 60 days

    return {
      products,
      salesData,
      tenantId: this.tenantId,
      date: new Date()
    }
  }

  private evaluatePricingRules(context: AutomationContext) {
    const suggestions: PricingSuggestion[] = []

    // Sort rules by priority
    const sortedRules = [...pricingRules].sort((a, b) => b.priority - a.priority)

    for (const product of context.products) {
      for (const rule of sortedRules) {
        if (rule.condition(product, context)) {
          const action = rule.action(product, context)
          suggestions.push({
            productId: product.id,
            ruleId: rule.id,
            ruleName: rule.name,
            action,
            timestamp: new Date()
          })
          break // Only apply highest priority rule
        }
      }
    }

    return suggestions
  }

  private evaluateRestockingRules(context: AutomationContext) {
    const suggestions: RestockingSuggestion[] = []

    const sortedRules = [...restockingRules].sort((a, b) => b.priority - a.priority)

    for (const product of context.products) {
      for (const rule of sortedRules) {
        if (rule.condition(product, context)) {
          const action = rule.action(product, context)
          suggestions.push({
            productId: product.id,
            ruleId: rule.id,
            ruleName: rule.name,
            action,
            timestamp: new Date()
          })
          break
        }
      }
    }

    return suggestions
  }

  private evaluateSuggestionRules(context: AutomationContext) {
    const suggestions: SuggestionResult[] = []

    const sortedRules = [...suggestionRules].sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      if (rule.condition(context)) {
        const action = rule.action(context)
        suggestions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          action,
          timestamp: new Date()
        })
      }
    }

    return suggestions
  }
}

// Result types
export interface PricingSuggestion {
  productId: string
  ruleId: string
  ruleName: string
  action: PricingAction
  timestamp: Date
}

export interface RestockingSuggestion {
  productId: string
  ruleId: string
  ruleName: string
  action: RestockingAction
  timestamp: Date
}

export interface SuggestionResult {
  ruleId: string
  ruleName: string
  action: SuggestionAction
  timestamp: Date
}

export interface AutomationResults {
  pricing: PricingSuggestion[]
  restocking: RestockingSuggestion[]
  suggestions: SuggestionResult[]
  timestamp: Date
}