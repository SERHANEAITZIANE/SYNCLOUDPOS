import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  db: mockDeep<PrismaClient>(),
}))

import { db } from '@/lib/db'
import { createOrder } from '@/actions/orders'

const mockedDb = db as any

describe.skip('Orders', () => {
  beforeEach(() => {
    mockReset(mockedDb)
  })

  it('createOrder rejects duplicate idempotencyKey', async () => {
    mockedDb.order.findFirst.mockResolvedValue({ id: 'existing-order', total: 100, paidAmount: 100 })
    mockedDb.salesOrder.findFirst.mockResolvedValue({ receiptNumber: 'POS-123' })
    
    const result = await createOrder({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 1, price: 100 }],
      total: 100,
      idempotencyKey: 'idem-1',
    })

    expect(result.success).toBeDefined()
    expect(result.orderId).toBe('existing-order')
    // Should NOT create a new order
    expect(mockedDb.order.create).not.toHaveBeenCalled()
  })

  it('createOrder decreases stock and updates treasury on successful payment', async () => {
    mockedDb.order.findFirst.mockResolvedValue(null) // no existing idempotency
    mockedDb.store.findFirst.mockResolvedValue({ id: 'store-1' })
    mockedDb.customer.findFirst.mockResolvedValue({ id: 'cust-1', name: 'DIVERS', balance: 0 })
    mockedDb.customer.create.mockResolvedValue({ id: 'cust-1', name: 'DIVERS' })
    mockedDb.product.findMany.mockResolvedValue([
      { id: 'prod-1', stock: 10, minStock: 2, storeProducts: [{ storeId: 'store-1', stock: 10, minStock: 2 }] }
    ])

    mockedDb.$transaction.mockImplementation(async (callback: any) => {
      // Simulate transaction behavior
      return callback(mockedDb)
    })

    mockedDb.order.create.mockResolvedValue({ id: 'new-order' })
    mockedDb.salesOrder.create.mockResolvedValue({ id: 'new-so' })

    const result = await createOrder({
      storeId: 'store-1',
      items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
      total: 200,
      paidAmount: 200,
      accountId: 'acc-1',
      status: 'COMPLETED',
    })

    expect(mockedDb.storeProduct.update).toHaveBeenCalledWith({
      where: { storeId_productId: { storeId: 'store-1', productId: 'prod-1' } },
      data: { stock: { decrement: 2 } }
    })
    
    expect(mockedDb.treasuryTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'CREDIT',
          amount: 200,
          source: 'SALE'
        })
      })
    )
  })
})
