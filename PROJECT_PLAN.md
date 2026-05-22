# TaskFlow — Multi-Tenant SaaS Project Management Platform

> A learning project to practice **production / industry-standard** full-stack
> engineering, building on the existing auth + rate-limiting foundation
> (JWT access/refresh with rotation & reuse detection, Redis, Docker, MERN).

---

## 1. Vision

A team task-management SaaS (think a focused mini Trello/Asana) where:

- The **platform** hosts many independent **organizations** (tenants).
- Each organization has its own members, boards, tasks, and billing.
- Three roles govern who can do what (see §4).

The goal is **not** novel features — it's to implement every essential
production concern correctly: multi-tenancy, RBAC, caching, jobs, email,
uploads, real-time, billing, testing, CI/CD, and observability.

---

## 2. Tech Stack

**Already in place (reuse):**
- Node.js + Express (ESM)
- MongoDB (Mongoose) — MongoDB Atlas
- Redis (rate limiting today; caching + queues later)
- React + Vite frontend
- Docker Compose (frontend, backend, redis)
- JWT auth (access/refresh, rotation, reuse detection), Swagger, Helmet, CORS

**To be added (per phase):**
- BullMQ (Redis-backed job queue)
- Socket.IO (real-time)
- Nodemailer or Resend/SendGrid (email)
- AWS S3 or Cloudinary (file storage)
- Stripe (subscriptions + webhooks)
- pino (structured logging), Sentry (error tracking)
- Vitest/Jest + Supertest + Playwright (testing)
- GitHub Actions (CI/CD)

---

## 3. Multi-Tenancy Model

**Approach: shared database, shared schema, row-level isolation by `organization` reference.**

- Every tenant-scoped document (Board, List, Task, Membership, Invite) carries an
  `organization: ObjectId` field, indexed.
- Every tenant-scoped query MUST filter by the caller's current organization.
- A middleware resolves the "active organization" from the route/header and
  attaches `req.organizationId`; services never query without it.

> This is the most common SaaS approach — simpler than database-per-tenant,
> and sufficient until very large scale. The discipline to learn: **never trust
> a client-supplied org id without verifying membership.**

---

## 4. Roles & Authorization (RBAC)

### Role hierarchy

| Role | Scope | Who | Can do |
|------|-------|-----|--------|
| **Super Admin** | Platform (global) | You / platform staff | Manage ALL orgs & users, suspend/restore orgs, view platform metrics, impersonate for support. Not a member of any org by default. |
| **Org Admin** | Single organization | Org owner / promoted members | Manage members & invites, manage boards, manage org settings & billing, delete the org. |
| **Member (User)** | Single organization | Invited users | Create/edit boards, lists, tasks within the org. No member/billing management. |

### Key design rules
- **Super Admin** is a platform-level flag on the User (`platformRole: "super_admin" | "user"`), independent of any org.
- **Org Admin / Member** is **per-organization**, stored on the **Membership**
  document (`role: "admin" | "member"`), NOT on the User. → A user can be Admin
  in Org A and Member in Org B.
- The **org creator** automatically becomes the first Org Admin.
- An org must always have **at least one Org Admin** (block removing/demoting the last one).

### Permission matrix (illustrative)

| Action | Super Admin | Org Admin | Member |
|--------|:--:|:--:|:--:|
| List/suspend any organization | ✅ | ❌ | ❌ |
| View platform-wide metrics | ✅ | ❌ | ❌ |
| Invite / remove org members | ✅* | ✅ | ❌ |
| Change member roles | ✅* | ✅ | ❌ |
| Manage org billing/subscription | ✅* | ✅ | ❌ |
| Create / edit / delete boards | ✅* | ✅ | ✅ |
| Create / edit tasks | ✅* | ✅ | ✅ |
| Delete the organization | ✅ | ✅ (owner) | ❌ |

\* Super Admin acts cross-tenant for support; log every such action to the audit trail.

### Enforcement layers
1. `authenticate` — verifies access token → `req.userId` (already built).
2. `resolveOrg` — reads org id (URL param or header), loads the caller's Membership, attaches `req.membership` + `req.organizationId`. 403 if not a member.
3. `requireRole("admin")` — guards admin-only routes using `req.membership.role`.
4. `requirePlatformRole("super_admin")` — guards platform routes.

---

## 5. Data Models (Mongoose)

```
User
  name, email (unique), password (hashed, select:false)
  platformRole: "user" | "super_admin"   (default "user")
  emailVerifiedAt: Date | null
  status: "active" | "suspended"
  timestamps

RefreshToken            (already implemented)
  user, tokenHash, family, revoked, replacedByHash, expiresAt (TTL)

Organization
  name, slug (unique)
  ownerUser: ObjectId(User)
  plan: "free" | "pro"            (synced from Stripe)
  stripeCustomerId, stripeSubscriptionId
  status: "active" | "suspended"
  timestamps

Membership                       (the user↔org join + role)
  user: ObjectId(User)           indexed
  organization: ObjectId(Org)    indexed
  role: "admin" | "member"
  unique compound index (user, organization)
  timestamps

Invite
  organization, email, role, token (hashed), invitedBy
  status: "pending" | "accepted" | "expired"
  expiresAt (TTL)

Board
  organization (indexed), name, description, archived
  createdBy, timestamps

List
  organization (indexed), board (indexed), name, position

Task
  organization (indexed), board, list (indexed)
  title, description, assignee: ObjectId(User) | null
  status, priority, dueDate, position
  attachments: [{ url, key, name, size }]
  createdBy, timestamps

ActivityLog                      (audit trail)
  organization, actor: ObjectId(User), action, targetType, targetId
  metadata (mixed), createdAt
```

Indexing focus: every tenant-scoped collection indexes `organization` (and
common compound keys like `{ organization, board }`) so tenant queries stay fast.

---

## 6. API Surface (by module)

> All under `/api`. Auth routes already exist. New routes below.

**Auth (existing + extend)**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- Add: `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Organizations**
- `POST /orgs` — create org (creator becomes Org Admin)
- `GET /orgs` — orgs the caller belongs to
- `GET /orgs/:orgId` — org details (member only)
- `PATCH /orgs/:orgId` — update settings (admin)
- `DELETE /orgs/:orgId` — delete (owner/admin)

**Members & invites** (admin-only writes)
- `GET /orgs/:orgId/members`
- `PATCH /orgs/:orgId/members/:userId` — change role
- `DELETE /orgs/:orgId/members/:userId` — remove member
- `POST /orgs/:orgId/invites` — send invite (email)
- `POST /invites/accept` — accept via token

**Boards / Lists / Tasks** (member+)
- `GET/POST /orgs/:orgId/boards`, `GET/PATCH/DELETE /orgs/:orgId/boards/:boardId`
- `POST /boards/:boardId/lists`, `PATCH/DELETE /lists/:listId`
- `GET /boards/:boardId/tasks?status=&assignee=&page=&limit=&sort=`
- `POST /lists/:listId/tasks`, `PATCH/DELETE /tasks/:taskId`
- `POST /tasks/:taskId/attachments` — upload

**Billing**
- `POST /orgs/:orgId/billing/checkout` — Stripe Checkout session
- `POST /webhooks/stripe` — subscription lifecycle (raw body, signature-verified)

**Platform (Super Admin only)**
- `GET /admin/orgs`, `PATCH /admin/orgs/:orgId/suspend`
- `GET /admin/users`, `PATCH /admin/users/:userId/suspend`
- `GET /admin/metrics`

---

## 7. Phased Roadmap

Each phase is shippable and teaches a specific standard. Build in order.

### Phase 1 — Organizations + RBAC  ⭐ start here
- Models: Organization, Membership.
- Create org (creator → admin), list my orgs, switch active org.
- Middleware: `resolveOrg`, `requireRole`, `requirePlatformRole`.
- Seed a Super Admin.
- **Teaches:** multi-tenancy, authorization layering, the role model.

### Phase 2 — Core domain (Boards/Lists/Tasks)
- Full CRUD, tenant-scoped, validated.
- Pagination + filtering + sorting on task lists.
- Proper indexes.
- **Teaches:** data modeling, query design, REST conventions.

### Phase 3 — Redis caching
- Cache board/task reads; invalidate on writes.
- Cache key namespacing per org.
- **Teaches:** caching strategy, invalidation, cache stampede avoidance.

### Phase 4 — Background jobs (BullMQ)
- Queue for emails, notifications, exports.
- Worker process; retries; dead-letter handling.
- **Teaches:** async processing, queues, idempotent workers.

### Phase 5 — Email flows
- Verify email, forgot/reset password, member invites.
- Tokenized links (hashed, expiring) — mirrors the refresh-token pattern.
- **Teaches:** transactional email, secure token flows.

### Phase 6 — File uploads
- Task attachments to S3/Cloudinary via signed URLs.
- Validate type/size; store metadata on Task.
- **Teaches:** object storage, direct/presigned uploads.

### Phase 7 — Real-time (Socket.IO)
- Live task updates within a board room (per-org/per-board namespaces).
- Authenticate sockets with the access token.
- **Teaches:** WebSockets, room scoping, auth over sockets.

### Phase 8 — Billing (Stripe)
- Free vs Pro plans; Checkout; customer portal.
- Webhook handler updates `Organization.plan` (signature-verified, raw body).
- Gate features by plan (e.g., board limit on Free).
- **Teaches:** payments, webhooks, plan-based feature gating.

### Phase 9 — Testing + CI/CD
- Unit (services), integration (Supertest + test DB), e2e (Playwright happy paths).
- GitHub Actions: lint → test → build on PR.
- **Teaches:** the testing pyramid, pipelines.

### Phase 10 — Observability
- pino structured logs + request IDs (correlation).
- Centralized error handler (you have one) + Sentry.
- `/health` + readiness; basic metrics.
- **Teaches:** logging, tracing basics, error monitoring.

---

## 8. Suggested Folder Structure (backend)

```
src/
  config/        env, database, redis, swagger
  middleware/    authenticate, resolveOrg, requireRole, rateLimiter, errorHandler
  models/        User, RefreshToken, Organization, Membership, Invite, Board, List, Task, ActivityLog
  modules/
    auth/        controller, service, routes, validators
    orgs/        controller, service, routes, validators
    members/     ...
    boards/      ...
    tasks/       ...
    billing/     controller, webhook, service
    admin/       platform (super-admin) routes
  queues/        bullmq queues + workers
  realtime/      socket.io setup + handlers
  utils/         ApiError, catchAsync, authHelpers, hashToken, pagination
  jobs/          email, notifications
```

---

## 9. Cross-Cutting Standards Checklist

- [ ] Tenant isolation enforced on **every** query (`organization` filter)
- [ ] Authorization checked at route level (role + platform role)
- [ ] Input validation on every write (express-validator)
- [ ] Consistent error shape `{ success, message, errors }` (you have this)
- [ ] Rate limiting on auth + sensitive routes (done) + per-org limits later
- [ ] Secrets via env only; never commit `.env`
- [ ] Pagination defaults + max page size caps
- [ ] Indexes for all hot query paths
- [ ] Audit log for admin/cross-tenant actions
- [ ] Idempotent webhook + job handlers
- [ ] Structured logs with request IDs
- [ ] Tests per layer + green CI before merge

---

## 10. Standards → Phase Coverage Map

| Industry Standard | Covered in |
|---|---|
| Multi-tenancy & data isolation | Phase 1 |
| RBAC / authorization | Phase 1 |
| Data modeling, indexing, pagination | Phase 2 |
| Caching & invalidation | Phase 3 |
| Background jobs / queues | Phase 4 |
| Transactional email & token flows | Phase 5 |
| File uploads / object storage | Phase 6 |
| Real-time / WebSockets | Phase 7 |
| Payments & webhooks | Phase 8 |
| Testing (unit/integration/e2e) | Phase 9 |
| CI/CD | Phase 9 |
| Observability / logging / monitoring | Phase 10 |
| AuthN: JWT access/refresh, rotation, reuse detection | ✅ already done |
| Rate limiting (Redis) | ✅ already done |
| Containerization (Docker) | ✅ already done |
| API docs (Swagger) | ✅ already done |

---

## Next step

Start with **Phase 1 (Organizations + RBAC)**. When ready, the first slice is:
1. `Organization` + `Membership` models
2. `POST /orgs` (creator becomes admin) + `GET /orgs`
3. `resolveOrg` + `requireRole` middleware
4. Seed one Super Admin

> This document is a plan only. No application code has been written yet.
