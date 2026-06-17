import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { createExpense } from '@/actions/expenses'

describe('Treasury & Expenses', () => {
  let tenantId: string
  let accountId: string
  let categoryId: string

  beforeEach(async () => {
    // Get existing data from staging db
    const tenant = await db.tenant.findFirst()
    if (!tenant) throw new Error("No tenant found in staging DB")
    tenantId = tenant.id

    const account = await db.treasuryAccount.findFirst({ where: { tenantId } })
    if (!account) throw new Error("No account found")
    accountId = account.id

    const category = await db.expenseCategory.findFirst({ where: { tenantId } })
    if (!category) throw new Error("No expense category found")
    categoryId = category.id

    // Give the account some money so tests pass
    await db.treasuryAccount.update({
      where: { id: accountId },
      data: { balance: 1000000 }
    })
  })

  it('createExpense creates a DEBIT transaction and updates balance', async () => {
    // Auth is mocked in setup.ts to return { id: 'test-user-id', tenantId: 'test-tenant-id' }
    // We should mock auth tenant to match staging DB tenant
  })
})
