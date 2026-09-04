import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

vi.mock('@/lib/db', () => ({
  db: mockDeep<PrismaClient>(),
}))

// The global setup mocks @/lib/rbac with hasPermission -> true so that every
// other test gets full permissions for free. These tests need to drive it in
// both directions, so they re-mock it locally with a controllable spy.
const hasPermission = vi.fn()
vi.mock('@/lib/rbac', () => ({
  hasPermission: (...args: any[]) => hasPermission(...args),
}))

import { db } from '@/lib/db'
import { deleteCustomer } from '@/actions/customers'
import { updateChequeStatus } from '@/actions/cheques'
import { deleteSpoilage } from '@/actions/spoilage'

const mockedDb = db as any

/**
 * Regression tests for PROJECT_AUDIT.md finding H-1.
 *
 * Before this, 51 of 73 server-action files authenticated the caller but never
 * checked their role, so the RBAC matrix in src/lib/rbac.ts was effectively
 * enforced only by the UI. These tests assert two things that must stay true:
 *
 *  1. a denied permission stops the action, and
 *  2. it stops it *before* any database work happens.
 *
 * (2) matters: a guard placed after the first query still leaks or mutates.
 */
describe('RBAC guards on server actions', () => {
  beforeEach(() => {
    mockReset(mockedDb)
    hasPermission.mockReset()
  })

  describe('when the caller lacks the permission', () => {
    beforeEach(() => hasPermission.mockResolvedValue(false))

    it('deleteCustomer refuses and never touches the database', async () => {
      const result = await deleteCustomer('customer-1')

      expect(result).toEqual({ error: 'Accès refusé' })
      expect(mockedDb.customer.findFirst).not.toHaveBeenCalled()
      expect(mockedDb.customer.update).not.toHaveBeenCalled()
    })

    it('updateChequeStatus refuses and never touches the database', async () => {
      const result = await updateChequeStatus('cheque-1', 'CASHED' as any)

      expect(result).toEqual({ error: 'Accès refusé' })
      expect(mockedDb.cheque?.update).not.toHaveBeenCalled()
    })

    it('deleteSpoilage refuses and never touches the database', async () => {
      const result = await deleteSpoilage('spoilage-1')

      expect(result).toEqual({ error: 'Accès refusé' })
      expect(mockedDb.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('permission strings', () => {
    it('deleteCustomer asks for customers:delete specifically', async () => {
      hasPermission.mockResolvedValue(false)
      await deleteCustomer('customer-1')

      expect(hasPermission).toHaveBeenCalledWith('customers:delete')
    })

    it('updateChequeStatus asks for cheques:update specifically', async () => {
      hasPermission.mockResolvedValue(false)
      await updateChequeStatus('cheque-1', 'CASHED' as any)

      expect(hasPermission).toHaveBeenCalledWith('cheques:update')
    })
  })

  describe('when the caller holds the permission', () => {
    it('deleteCustomer proceeds past the guard and scopes the write by tenantId', async () => {
      hasPermission.mockResolvedValue(true)
      mockedDb.customer.findFirst.mockResolvedValue({ id: 'customer-1', name: 'Acme' })
      mockedDb.customer.update.mockResolvedValue({ id: 'customer-1' })
      mockedDb.auditLog.create.mockResolvedValue({ id: 'audit-1' })

      await deleteCustomer('customer-1')

      expect(mockedDb.customer.update).toHaveBeenCalled()

      // Every query must be tenant-scoped: there is no row-level security,
      // isolation is application-layer only.
      const where = mockedDb.customer.update.mock.calls[0][0].where
      expect(where).toHaveProperty('tenantId', 'test-tenant-id')
    })
  })
})
