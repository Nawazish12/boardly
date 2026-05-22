# Super Admin API

Platform-level endpoints for the **Super Admin** role. These sit *above* all
organizations (cross-tenant) and are used to monitor and moderate the platform.

> Status: **Implemented & tested.** Frontend integration documented at the end.

---

## Concepts

- **Super Admin** is a platform-level role stored on the `User` document as
  `platformRole: "super_admin"` (regular users have `platformRole: "user"`).
- It is independent of organization membership (Org Admin / Member live on the
  `Membership` document — a separate concern).
- A super admin is created/promoted via a seed script (see bottom).

## Authentication & authorization

Every endpoint below requires **both**:

1. A valid **access token** → `Authorization: Bearer <accessToken>`
2. The caller's `platformRole === "super_admin"`

Enforced by middleware chain on all `/api/admin/*` routes:

```
authenticate  →  requirePlatformRole("super_admin")
```

The role/status is re-checked **against the database on every request**, so
demotion or suspension takes effect immediately (not after token expiry).

### Error responses

| Status | When |
|--------|------|
| `401 Unauthorized` | Missing/invalid/expired access token, or account not active |
| `403 Forbidden` | Authenticated but not a super admin (`Insufficient permissions`) |
| `400 Bad Request` | Validation error (bad id, invalid `status`, self-suspend) |
| `404 Not Found` | Target organization/user does not exist |

Standard error shape:
```json
{ "success": false, "message": "Insufficient permissions", "errors": [] }
```

---

## Endpoints

Base path: `/api/admin`

### 1. Platform metrics

```
GET /api/admin/metrics
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "users":         { "total": 42, "active": 40, "suspended": 2 },
    "organizations": { "total": 8,  "active": 7,  "suspended": 1 }
  }
}
```
> Uses parallel `countDocuments` queries (no document scan) — cheap and scalable.

---

### 2. List users (paginated, searchable, filterable)

```
GET /api/admin/users
```

**Query params**

| Param | Type | Notes |
|-------|------|-------|
| `page` | int | default `1` |
| `limit` | int | default `20`, **max `100`** (hard cap) |
| `search` | string | case-insensitive match on name **or** email |
| `status` | enum | `active` \| `suspended` |
| `role` | enum | `user` \| `super_admin` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "6a0e...b72b",
      "name": "Normal User",
      "email": "user@example.com",
      "platformRole": "user",
      "status": "active",
      "createdAt": "2026-05-21T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1, "limit": 20, "total": 42,
    "totalPages": 3, "hasNextPage": true, "hasPrevPage": false
  }
}
```
> `search` input is regex-escaped (no ReDoS/injection). Results sorted by
> `createdAt` desc; `_id` is normalized to `id`.

---

### 3. Suspend / reactivate a user

```
PATCH /api/admin/users/:userId/status
```

**Body**
```json
{ "status": "suspended" }   // or "active"
```

**Response 200**
```json
{ "success": true, "message": "User updated",
  "data": { "id": "...", "name": "...", "email": "...", "platformRole": "user", "status": "suspended", "createdAt": "..." } }
```

**Rules**
- `status` must be `active` or `suspended` → else `400`.
- `:userId` must be a valid Mongo id → else `400`.
- A super admin **cannot change their own status** → `400`.
- Unknown user → `404`.

**Effect of suspension:** the user can no longer **log in**
(`POST /auth/login` returns `403`: *"Your account has been suspended…"*).

---

### 4. List organizations (paginated, searchable, filterable)

```
GET /api/admin/organizations
```

**Query params**

| Param | Type | Notes |
|-------|------|-------|
| `page` | int | default `1` |
| `limit` | int | default `20`, max `100` |
| `search` | string | case-insensitive match on org name |
| `status` | enum | `active` \| `suspended` |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "6a0f...c0a9",
      "name": "Acme Inc",
      "slug": "acme-inc",
      "plan": "free",
      "status": "active",
      "createdAt": "2026-05-21T10:00:00.000Z",
      "owner": { "id": "...", "name": "Owner", "email": "owner@example.com" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 8, "totalPages": 1, "hasNextPage": false, "hasPrevPage": false }
}
```

---

### 5. Suspend / reactivate an organization

```
PATCH /api/admin/organizations/:orgId/status
```

**Body**
```json
{ "status": "suspended" }   // or "active"
```

**Response 200**
```json
{ "success": true, "message": "Organization updated", "data": { "...": "..." } }
```

**Rules:** same validation as user status (`400` invalid id/status, `404` unknown org).

---

## Super Admin flow (end-to-end)

```
1. Seed a super admin           (one-time)
       npm run seed:admin
2. Log in                       POST /api/auth/login   → access + refresh tokens
       (user.platformRole === "super_admin" in the response)
3. Frontend detects super_admin → shows the Admin area
4. Dashboard                    GET  /api/admin/metrics
5. Manage users                 GET  /api/admin/users?search=&status=&page=
       suspend / reactivate     PATCH /api/admin/users/:id/status
6. Manage organizations         GET  /api/admin/organizations?...
       suspend / reactivate     PATCH /api/admin/organizations/:id/status
7. A suspended user is locked out at login (403) until reactivated.
```

---

## Frontend integration

| Concern | Implementation |
|---|---|
| Detect role | `user.platformRole` from `GET /auth/me` / login response (now in `sanitizeUser`) |
| Route guard | `AdminRoute` — redirects non-super-admins away from `/admin/*` |
| API client | `frontend/src/api/admin.js` — `getMetrics`, `listUsers`, `setUserStatus`, `listOrganizations`, `setOrganizationStatus` (all `auth: true`) |
| Pages | `/admin` (metrics), `/admin/users`, `/admin/organizations` |
| Token handling | reuses the existing access/refresh auto-refresh interceptor |

---

## Seeding a super admin

Set in `backend/.env`:
```
SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=superadmin@example.com
SUPER_ADMIN_PASSWORD=change-me-strong-password
```
Then:
```
# locally
npm run seed:admin
# with docker
docker compose exec backend npm run seed:admin
```
The script **creates** the user if missing, or **promotes** an existing user to
`super_admin` (and marks them `active`).

---

## Notes / future work

- **Audit logging** of every super-admin action (suspend/reactivate) → `ActivityLog`
  collection (planned in PROJECT_PLAN.md).
- **Suspended org** should also block its members' access at the org-resolution
  layer — wired when the org/membership middleware lands (Phase 1 proper).
- Consider revoking a suspended user's active refresh tokens immediately
  (`RefreshToken.updateMany({ user }, { revoked: true })`) so existing sessions
  die at once, not just at next access-token expiry.
