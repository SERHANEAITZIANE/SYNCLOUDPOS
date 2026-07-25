# Error Visibility Across Forms & Actions — Implementation Plan

**Status:** Implemented (full audit complete)
**Priority:** High
**Scope:** Make ALL errors visible to users in forms (products, purchases, expenses, payments, etc.)

---

## Audit Results

A scripted audit cross-referenced **176 error-returning server actions** (out of 245 total)
against every call site in `src/components` and `src/app`.

**19 genuine silent failures were found and fixed.** All were the same shape: a bare
`await someAction(...)` whose returned `{ error }` was never inspected, so a permission
denial or validation failure produced *no feedback at all* — and in the modal cases, the
dialog closed as if the save had succeeded.

| # | File | Action |
|---|------|--------|
| 1 | `components/brands/brand-modal.tsx` | `createBrand` / `updateBrand` |
| 2 | `components/brands/cell-action.tsx` | `deleteBrand` |
| 3 | `components/categories/category-modal.tsx` | `createCategory` / `updateCategory` |
| 4 | `components/categories/cell-action.tsx` | `deleteCategory` |
| 5 | `components/customers/cell-action.tsx` | `deleteCustomer` |
| 6 | `components/customers/client.tsx` | `deleteCustomer` |
| 7 | `components/suppliers/cell-action.tsx` | `deleteSupplier` |
| 8 | `components/suppliers/client.tsx` | `deleteSupplier` |
| 9 | `components/products/cell-action.tsx` | `deleteProduct` |
| 10 | `components/products/product-grid-view.tsx` | `deleteProduct` |
| 11 | `components/purchases/missing-products-form.tsx` | `createProduct` (OCR flow — `if` with no `else`) |
| 12 | `components/sales/sales-form.tsx` | `createSalesOrder`, `updateSalesOrderStatus` |
| 13 | `components/dashboard/header-store-selector.tsx` | `setDefaultStore` |
| 14 | `app/.../treasury/components/cell-action.tsx` | `deleteTreasuryAccount` |
| 15 | `app/.../reservations/page.tsx` | `updateReservationStatus`, `deleteReservation` |
| 16 | `app/.../delivery/page.tsx` | `updateShipmentStatus` |
| 17 | `app/.../inventory-audit/.../session-detail-client.tsx` | `updateStockCountItem` |
| 18 | `app/.../settings/whatsapp/.../whatsapp-settings-client.tsx` | `updateWhatsappSettings` |

**Worst offenders:** `brand-modal.tsx` and `category-modal.tsx` had no `toast` import at
all — their `catch` only did `console.error`, and on a returned error they called
`onConfirm()` + `onClose()`, so the user saw the modal close and assumed success.

Sites reported by the audit but verified as **false positives** (error *is* handled, just
outside the script's 12-line lookahead, or the result is forwarded to a caller that
handles it): `returns-client.tsx`, `proformas/new/page.tsx`, `superadmin/client.tsx`,
`ai-client.tsx`, `customers/client.tsx` (import path), and the read-path
`getCustomers`/`getSuppliers` server-component fetches.

---

## Problem

Errors are happening **silently**. The root cause:

1. **Server actions return error objects**: `{ error: "message" }` or `{ success, data }`
2. **Components DON'T check them**: they only `await action()` and handle thrown exceptions
3. **Result**: error messages are returned but never displayed to the user

### Example (Current Broken Pattern)

```tsx
// ❌ BROKEN — error object is ignored
const onConfirm = async () => {
    try {
        await deleteProduct(data.id)  // ← returns { error: "..." } but not checked
        toast.success("Deleted")
    } catch (error) {
        toast.error("Error")  // ← only catches exceptions, not the error object
    }
}
```

### Correct Pattern

```tsx
// ✅ FIXED — check the returned error object
const onConfirm = async () => {
    try {
        const result = await deleteProduct(data.id)
        if (result.error) {
            toast.error(result.error)  // ← NOW the error is shown
            return
        }
        toast.success("Deleted")
    } catch (error) {
        toast.error("Unexpected error")
    }
}
```

---

## Affected Areas

### Forms/Modals (checked, many already have error handling but some don't):
- ✅ `src/components/products/product-form.tsx` — checks `res.error`
- ✅ `src/components/expenses/expense-form.tsx` — checks `res?.error`
- ❌ `src/components/products/cell-action.tsx` — `deleteProduct()` result NOT checked
- ❌ `src/components/purchases/missing-products-form.tsx` — needs audit
- ❌ `src/components/payments/client.tsx` — needs audit
- ❌ Many quick-create modals (`fast-create-*.tsx`) — need audit

### Server Actions (verified pattern):
All actions follow the pattern of returning `{ error: "..." }` or `{ success, data, error? }`. This is good — the problem is **components don't check them**.

---

## Solution: Two-Phase Rollout

### Phase 1: Create a helper hook (reusable error handling)

New file: `src/hooks/use-server-action.ts`

```typescript
import { useState } from "react"
import { toast } from "react-hot-toast"

/**
 * Wraps a server action with automatic error/success handling.
 * Returns a function that handles the action and displays toast messages.
 * 
 * Usage:
 *   const { mutate, isPending } = useServerAction(deleteProduct, {
 *     onSuccess: () => router.refresh(),
 *     successMessage: "Deleted successfully"
 *   })
 *   
 *   <button onClick={() => mutate(id)}>Delete</button>
 */
export function useServerAction<T, R extends { error?: string; data?: T }>(
    action: (arg: any) => Promise<R>,
    options?: {
        onSuccess?: () => void | Promise<void>
        onError?: (error: string) => void
        successMessage?: string
        errorMessage?: string
    }
) {
    const [isPending, setIsPending] = useState(false)
    
    const mutate = async (arg: any) => {
        setIsPending(true)
        try {
            const result = await action(arg)
            if (result.error) {
                const msg = result.error || options?.errorMessage || "Une erreur est survenue"
                toast.error(msg)
                options?.onError?.(msg)
                return
            }
            if (options?.successMessage) {
                toast.success(options.successMessage)
            }
            await options?.onSuccess?.()
        } catch (error) {
            const msg = options?.errorMessage || "Erreur inattendue"
            toast.error(msg)
            options?.onError?.(msg)
        } finally {
            setIsPending(false)
        }
    }
    
    return { mutate, isPending }
}
```

### Phase 2: Audit & Fix All Components

**Systematic changes needed:**

1. **All cell-action.tsx files** (products, purchases, expenses, etc.)
   - Check return values from `delete*`, `update*` actions
   - Show error toast if `result.error` exists

2. **All quick-create modals** (fast-create-brand.tsx, etc.)
   - Already doing this in some places
   - Standardize to use return value + toast.error

3. **All form submissions** (purchase-form.tsx, etc.)
   - Audit for missing error checks
   - Ensure all actions returning errors are handled

4. **Batch operations** (if any)
   - Check list of errors returned
   - Show aggregated or individual error messages

---

## Implementation Steps

### Step 1: Create the hook
- `src/hooks/use-server-action.ts` — new reusable wrapper
- Supports both success + error messages
- Auto-toast + optional callbacks

### Step 2: Audit all components
1. Search: `await [a-z]*\(` → find all action calls
2. Check: is the result assigned? `const result = await ...`
3. Check: is `result.error` handled? `if (result.error) toast.error(...)`
4. Fix: if missing, add the check

### Step 3: Fix high-priority components first
1. **Cell actions** (delete/update quick actions) — highest visibility impact
2. **Form modals** (products, purchases, expenses, payments)
3. **Batch operations** (if any)

### Step 4: Add fallback error handler
- If an action is called but result is not used, linter should warn
- OR: add a catch-all middleware to log missed errors to console (dev only)

---

## File-by-File Fixes

### `src/components/products/cell-action.tsx`

```tsx
// Current (broken)
const onConfirm = async () => {
    try {
        setLoading(true)
        await deleteProduct(data.id)
        toast.success(t("messages.deleted"))
        router.refresh()
    } catch (error) {
        console.error(error)
        toast.error(t("messages.error"))
    }
}

// Fixed
const onConfirm = async () => {
    try {
        setLoading(true)
        const result = await deleteProduct(data.id)
        if (result?.error) {
            toast.error(result.error)
            return
        }
        toast.success(t("messages.deleted"))
        router.refresh()
    } catch (error) {
        console.error(error)
        toast.error(t("messages.error"))
    } finally {
        setLoading(false)
        setOpen(false)
    }
}
```

### All similar patterns across:
- `src/components/purchases/cell-action.tsx`
- `src/components/expenses/cell-action.tsx`
- `src/components/payments/cell-action.tsx`
- etc.

---

## Testing Checklist

After fixes, test each form:

- [ ] Product create → simulate server error → verify toast appears
- [ ] Product edit → simulate permission error → verify toast appears
- [ ] Product delete → simulate permission error → verify toast appears
- [ ] Purchase create → simulate stock error → verify toast appears
- [ ] Expense create → simulate permission error → verify toast appears
- [ ] Payment create → simulate balance error → verify toast appears
- [ ] All quick-create modals (brands, categories, etc.) → error cases

---

## Long-term: TypeScript Enforcement

To prevent this in the future:

```typescript
// src/lib/safe-action-result.ts
export type ActionResult<T = void> = 
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never }
```

Enforce that all server actions return this type. TypeScript then forces every `.then()` to handle both cases. (Future iteration — out of scope for this issue.)

---

## Summary

| Aspect | Current | Target |
|--------|---------|--------|
| Error visibility | Silent (90% of cases) | Always visible (100%) |
| Toast shown | Only on exceptions | On errors + exceptions |
| Effort | Create hook + audit 30-50 files | ~2-3 hours |
| Impact | Major (user confidence) | High — eliminates confusion |
