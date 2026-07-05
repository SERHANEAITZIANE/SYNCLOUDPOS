import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  db: mockDeep<PrismaClient>(),
}))

import { db } from '@/lib/db'
import { createExpense } from '@/actions/expenses'

const mockedDb = db as any

describe('Treasury & Expenses', () => {
  beforeEach(() => {
    mockReset(mockedDb)
  })

  it('createExpense creates a DEBIT transaction and updates balance', async () => {
    mockedDb.expense.create.mockResolvedValue({
      id: 'expense-1',
      description: 'Test Expense',
      amount: 100,
    })

    mockedDb.treasuryAccount.findFirst.mockResolvedValue({
      id: 'acc-1',
      balance: 1000,
    })

    mockedDb.treasuryAccount.update.mockResolvedValue({
      id: 'acc-1',
      balance: 900,
    })

    mockedDb.treasuryTransaction.create.mockResolvedValue({
      id: 'tx-1',
    })

    mockedDb.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockedDb)
    })

    const result = await createExpense({
      description: 'Test Expense',
      amount: 100,
      categoryId: 'cat-1',
      accountId: 'acc-1',
    })

    expect(result.success).toBe(true)
    expect(result.id).toBe('expense-1')
    expect(mockedDb.expense.create).toHaveBeenCalled()
    expect(mockedDb.treasuryAccount.update).toHaveBeenCalled()
    expect(mockedDb.treasuryTransaction.create).toHaveBeenCalled()
  })
})
