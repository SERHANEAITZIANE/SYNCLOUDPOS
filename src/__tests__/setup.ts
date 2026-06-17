import { vi } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(() => ({
    user: { id: 'test-user-id', tenantId: 'test-tenant-id' },
  })),
}))

// Mock subscription
vi.mock('@/lib/subscription', () => ({
  checkSubscription: vi.fn(() => true),
}))

// Mock rbac
vi.mock('@/lib/rbac', () => ({
  hasPermission: vi.fn(() => true),
}))
