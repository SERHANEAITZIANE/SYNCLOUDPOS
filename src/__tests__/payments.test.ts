import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  db: mockDeep<PrismaClient>(),
}))

import { db } from '@/lib/db'
import { getCustomerPayments, getSupplierPayments } from '@/actions/payments'

const mockedDb = db as any

describe.skip('Payments', () => {
  beforeEach(() => {
    mockReset(mockedDb)
  })

  it('getCustomerPayments does not return supplier loans', async () => {
    // Mock the DB returning mixed transactions (simulating a DB fetch)
    mockedDb.treasuryTransaction.findMany.mockResolvedValue([
      { id: 'tx-1', source: 'CUSTOMER_PAYMENT', referenceId: 'cust-1' },
      { id: 'tx-2', source: 'MANUAL_IN', referenceId: 'supp-1' }, // supplier loan disguised as MANUAL_IN
    ])

    // Mock supplier check: supp-1 is a supplier
    mockedDb.supplier.findMany.mockResolvedValue([{ id: 'supp-1' }])
    mockedDb.order.findMany.mockResolvedValue([])
    mockedDb.salesOrder.findMany.mockResolvedValue([])
    mockedDb.customer.findMany.mockResolvedValue([{ id: 'cust-1', name: 'Test Customer' }])
    mockedDb.cheque.findMany.mockResolvedValue([])

    const result = await getCustomerPayments()
    
    // The supplier loan (tx-2) should be filtered out
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('tx-1')
  })

  it('getSupplierPayments does not return customer loans', async () => {
    mockedDb.treasuryTransaction.findMany.mockResolvedValue([
      { id: 'tx-1', source: 'SUPPLIER_PAYMENT', referenceId: 'supp-1' },
      { id: 'tx-2', source: 'MANUAL_OUT', referenceId: 'cust-1' }, // customer loan disguised as MANUAL_OUT
    ])

    mockedDb.customer.findMany.mockResolvedValue([{ id: 'cust-1' }])
    mockedDb.purchaseOrder.findMany.mockResolvedValue([])
    mockedDb.supplier.findMany.mockResolvedValue([{ id: 'supp-1', name: 'Test Supplier' }])
    mockedDb.cheque.findMany.mockResolvedValue([])

    const result = await getSupplierPayments()
    
    // The customer loan (tx-2) should be filtered out
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('tx-1')
  })
})
