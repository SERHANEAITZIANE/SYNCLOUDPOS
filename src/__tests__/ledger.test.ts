import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  db: mockDeep<PrismaClient>(),
}))

import { db } from '@/lib/db'
import { getCustomerLedger } from '@/actions/ledger'

const mockedDb = db as any

describe('Ledger', () => {
  beforeEach(() => {
    mockReset(mockedDb)
  })

  it('getCustomerLedger includes initial balance', async () => {
    mockedDb.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      balance: 100,
      initialBalance: 50,
      createdAt: new Date('2026-01-01'),
    })
    
    mockedDb.order.findMany.mockResolvedValue([])
    mockedDb.salesOrder.findMany.mockResolvedValue([])
    mockedDb.treasuryTransaction.findMany.mockResolvedValue([])
    mockedDb.cheque.findMany.mockResolvedValue([])
    mockedDb.invoice.findMany.mockResolvedValue([])
    mockedDb.productReturn.findMany.mockResolvedValue([])

    const result = await getCustomerLedger('cust-1')

    // Expect the first line to be the initial balance
    expect(result.lines.length).toBeGreaterThan(0)
    expect(result.lines[result.lines.length - 1].category).toBe('INITIAL')
    expect(result.lines[result.lines.length - 1].debit).toBe(50)
  })

  it('getCustomerLedger handles 0 transactions with initial balance correctly', async () => {
    mockedDb.customer.findFirst.mockResolvedValue({
      id: 'cust-1',
      balance: 100,
      initialBalance: 100,
      createdAt: new Date('2026-01-01'),
    })
    
    mockedDb.order.findMany.mockResolvedValue([])
    mockedDb.salesOrder.findMany.mockResolvedValue([])
    mockedDb.treasuryTransaction.findMany.mockResolvedValue([])
    mockedDb.cheque.findMany.mockResolvedValue([])
    mockedDb.invoice.findMany.mockResolvedValue([])
    mockedDb.productReturn.findMany.mockResolvedValue([])

    const result = await getCustomerLedger('cust-1')

    // The result should not be empty even if there are no transactions
    expect(result.lines.length).toBe(1)
    expect(result.lines[0].category).toBe('INITIAL')
    expect(result.lines[0].balance).toBe(100)
  })
})
