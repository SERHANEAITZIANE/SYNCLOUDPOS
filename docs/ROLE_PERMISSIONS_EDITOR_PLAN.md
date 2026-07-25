# Admin Role & Permission Editor — Plan & Implementation

**Status:** Implemented
**Scope:** Give ADMINs a UI to grant or revoke **any** individual permission for **any** user in their tenant — a granular allow/deny matrix layered on top of the existing role system.
**Access:** ADMIN and Superadmin only.

---

## 1. Problem & Goal

Today permissions are **100% role-based** and hardcoded:

- `src/lib/rbac.ts` holds a static `ROLE_PERMISSIONS` map. A user's role (e.g. `CASHIER`) maps to a fixed list of `module:action` strings.
- The only per-user customization is two coarse booleans: `canEdit` / `canDelete`.
- There is **no way** for an admin to say "this specific cashier may also `treasury:read`" or "this manager may **not** `products:export`" without changing the global role definition (which affects every user with that role).

**Goal:** an admin-only interface where, for each user, the admin can toggle any `module:action` permission on/off individually. The toggles are **overrides** on top of the user's role, so:

- Changing a user's role still gives sensible defaults.
- Admin can **add** permissions the role doesn't include (grant / "allow").
- Admin can **remove** permissions the role does include (revoke / "deny").
- **Deny always wins** over any grant.

---

## 2. Current Architecture (as-is)

| Layer | File | Behavior |
|-------|------|----------|
| Permission logic | `src/lib/rbac.ts` | `hasPermission("module:action")` → `true` for ADMIN/superadmin, else checks static `ROLE_PERMISSIONS[role]`. Supports wildcards `*:*`, `module:*`. |
| User model | `prisma/schema.prisma` (`model User`) | Has `role`, `canEdit`, `canDelete`. No per-user permission list. |
| Session/JWT | `src/auth.ts` | `jwt` callback re-syncs `role`, `canEdit`, `canDelete` from DB on every call (section 2.5). `session` callback copies them onto `session.user`. |
| Types | `types/next-auth.d.ts` | `ExtendedUser` augments the session user. |
| User admin UI | `src/app/[locale]/(dashboard)/users/page.tsx` | Admin-only table. Row → `EditUserModal` (role select + canEdit/canDelete checkboxes). |
| User mutations | `src/actions/create-user.ts`, `src/actions/update-user.ts` | Zod-validated, RBAC-guarded server actions. |

Key insight: the `jwt` callback **already** does one `db.user.findUnique` per request (section 2.5). We can add the override columns to that `select` at **zero extra query cost**, so `hasPermission` stays DB-call-free (reads from the session token).

---

## 3. Design

### 3.1 Data model — override arrays

Add two string arrays to `User`:

```prisma
extraPermissions   String[]  @default([])   // granted on top of the role  (ALLOW)
deniedPermissions  String[]  @default([])   // revoked from the role       (DENY)
```

Both hold granular `"module:action"` strings only (no wildcards) so behavior is deterministic and diff-able. `@default([])` keeps every existing row valid — deployment uses `prisma db push` (see `CLAUDE.md`), so no migration file is needed.

### 3.2 Effective permission formula

For a requested `module:action`:

```
if user is ADMIN or superadmin        → ALLOW (unchanged, full access)
if deniedPermissions matches request  → DENY   (deny wins)
if roleBasePermissions matches        → ALLOW
if extraPermissions matches           → ALLOW
otherwise                             → DENY
```

This is the classic "role default + allow-list + deny-list, deny wins" model, which lets an admin "allow or deny anything".

### 3.3 Storing minimal overrides (diff against role)

The UI shows the **effective** state of every `module:action` as a checkbox. On save we diff the desired state against the **role's base** permissions and store only the differences:

- `desired && !roleHas`  → add to `extraPermissions`
- `!desired && roleHas`  → add to `deniedPermissions`
- otherwise → store nothing

Benefits: overrides stay small, and if the admin later changes the role, the un-overridden permissions follow the new role automatically.

### 3.4 Permission catalog

A single source of truth (`getPermissionCatalog()` in `rbac.ts`) lists every module with a French label and the actions it supports, so the UI matrix and server-side validation share one definition. Unknown permission strings are rejected by the server action.

---

## 4. Implementation Checklist

1. **Prisma** — add `extraPermissions` / `deniedPermissions` `String[]` to `User`. Run `prisma generate` + `prisma db push`.
2. **`src/lib/rbac.ts`**
   - Add `PERMISSION_CATALOG` + `getPermissionCatalog()` (modules, labels, actions).
   - Add `getRoleBasePermissions(role)` and `roleGrants(role, permission)` helpers.
   - Update `hasPermission` to apply deny-list → role → allow-list (deny wins). Reads overrides from the session user.
   - Update `getUserPermissions` to return effective granular permissions.
3. **`src/auth.ts`** — include `extraPermissions` / `deniedPermissions` in the section 2.5 `select`, put them on the token, and copy them onto `session.user` (all three code paths: initial sign-in, session callback, legacy fallback). Admin/superadmin get `[]` (they bypass anyway).
4. **`types/next-auth.d.ts`** — add `extraPermissions: string[]` and `deniedPermissions: string[]` to `ExtendedUser`.
5. **Server action** `src/actions/update-user-permissions.ts`
   - Guarded by `hasPermission("users:update")` **and** an explicit ADMIN/superadmin check.
   - Tenant-scoped (target user must be in the caller's tenant).
   - Validates every incoming permission against the catalog.
   - Diffs desired-vs-role, writes `extraPermissions` / `deniedPermissions`, `revalidatePath("/users")`.
   - Also exposes a read helper `getUserEffectivePermissions(userId)` for the UI.
6. **UI**
   - `src/components/users/permissions-matrix.tsx` — client grid: rows = modules, columns = actions (read/create/update/delete/export), checkboxes, "select all / none" per module, reset-to-role button. ADMIN target is shown as fully locked ("full access").
   - `src/components/users/manage-permissions-modal.tsx` — dialog wrapper calling the server action.
   - Wire a "Permissions" (shield) button into the users table row in `users/page.tsx`.

---

## 5. Security Notes

- **Two guards** on the write path: the `users:update` permission **and** a hard ADMIN/superadmin gate, so a role that happens to carry `users:update` still can't reach the permission editor unless it's ADMIN.
- **Tenant isolation:** target user is loaded and verified to share the caller's `tenantId` before any write.
- **No privilege escalation via unknown strings:** only catalog permissions are accepted; anything else is dropped/rejected.
- **ADMIN target is immutable** here — admins always have `*:*`; the UI locks it and the action refuses to write overrides for an ADMIN user.
- Overrides propagate within ~one request because the `jwt` callback re-reads them from the DB each call (same mechanism already used for `role`).

---

## 6. Files Touched

| File | Change |
|------|--------|
| `prisma/schema.prisma` | +2 fields on `User` |
| `src/lib/rbac.ts` | catalog + effective-permission logic |
| `src/auth.ts` | carry overrides through JWT/session |
| `types/next-auth.d.ts` | type the new session fields |
| `src/actions/update-user-permissions.ts` | **new** — read + write actions |
| `src/components/users/permissions-matrix.tsx` | **new** — matrix UI |
| `src/components/users/manage-permissions-modal.tsx` | **new** — dialog |
| `src/app/[locale]/(dashboard)/users/page.tsx` | add Permissions button |
| `docs/ROLE_PERMISSIONS_EDITOR_PLAN.md` | this document |

---

## 7. How to Use (after deploy)

1. Sign in as an ADMIN.
2. Go to **Users**.
3. Click the **shield / Permissions** icon on a non-admin user's row.
4. Toggle any `module:action` on/off (or use per-module select-all). "Reset to role" clears all overrides.
5. Save. The change takes effect on the user's next request.
