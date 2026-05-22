# Deployment Plan (Plan of Record)

> **Status:** Planning document. This describes *what* we will build and *why* — not the
> code/config itself. No Dockerfiles, Terraform, or YAML here by design.
>
> **Goal:** Practice a real, industry-standard DevOps setup (containers, automated GitFlow
> pipeline, security, multi-environment isolation) on AWS while staying at **$0** for a
> short (~10-day) learning window.

---

## 1. Objectives & Constraints

| Item | Decision |
|---|---|
| Purpose | Learning project — exercise full GitFlow + CI/CD + ECS, single developer |
| Usage window | ~10 days of active use, then **tear everything down** |
| Cost target | **$0** — must stay inside AWS Free Tier (12-month window must be active) |
| Compute | AWS **ECS, EC2 launch type** (NOT Fargate — Fargate is not free) |
| Topology | **Two separate t3.micro instances** — one Staging, one Production |
| Why it stays free | 10 days × 2 instances = ~480 instance-hours < 750 free hrs/month |
| Hard rule | **No NAT Gateway, no Fargate, no Secrets Manager** (all incur cost) |

> ⚠️ **The thing that actually costs money:** AWS bills for *resources that exist*, not for
> traffic. An idle instance/ALB/EBS volume still bills once the 12-month free window ends.
> "No traffic" ≠ "no bill." See [§10 Cost Safety & Teardown](#10-cost-safety--teardown).

---

## 2. Application Components

The same four-service stack we run locally, deployed per environment:

| Service | Role | Network exposure |
|---|---|---|
| **frontend** | Vite/React SPA | Public, via **CloudFront + S3** (HTTPS) |
| **backend** | Node REST API | Via **CloudFront `/api/*` → backend ALB** (HTTPS) |
| **worker** | BullMQ job processor | **None** — internal only |
| **redis** | Queue + cache backing BullMQ | **None** — internal Docker network only |

External managed services:
- **MongoDB Atlas** — one free M0 cluster per environment (fully isolated).
- **Resend** — transactional email (separate API keys per environment).

### 2.1 Repository Strategy — single monorepo, path-filtered deploys

- **One Git repository (monorepo)** — `frontend/`, `backend/`, and shared root files
  (`docker-compose*`, docs) live together. **Not** split into separate frontend/backend repos.
  Rationale: atomic cross-cutting commits (API + UI in one PR), one GitFlow + branch-protection
  setup, one CI/CD config, lowest overhead for a single developer.
- **You always commit and push from the repo root** — git tracks the whole repository, not a
  folder. There is no "cd into a folder to push it separately."
- **Per-service deploys are independent via *path filters*, not separate repos.** The pipeline
  inspects which paths changed in a push and deploys only the affected service(s):

  | Changed paths | Deploys |
  |---|---|
  | `frontend/**` only | frontend build → **S3 sync + CloudFront invalidation** |
  | `backend/**` only | backend **and** worker (worker reuses the backend image) → **ECS** |
  | both | both |

- **Independent deploys per service, via different artifacts:** the **backend** ships a Docker
  image to its own **ECR** repo (run by ECS); the **frontend** ships a built static bundle to
  its **S3 bucket** (served by CloudFront). There is **no frontend image / ECR**. Path filters
  plus separate artifacts give independent deploys; the single git repo does not couple them.
- *Tag-triggered prod deploys* don't carry changed-path info as directly as branch pushes; the
  release promotes the images built for that release (resolved in the pipeline design, §7 /
  Phase 6). This does not change the monorepo decision.

---

## 3. Environment Isolation

Two completely separate environments, **Staging** and **Production**, sharing one AWS
account but isolated at every layer:

| Layer | Staging | Production |
|---|---|---|
| Frontend hosting | S3 `…-staging-web` + CloudFront dist | S3 `…-prod-web` + CloudFront dist |
| EC2 instance (backend/worker/redis) | Instance A (t3.micro) | Instance B (t3.micro) |
| ECS service (backend only) | `staging` service | `prod` service |
| Load balancer (backend only, CloudFront's `/api` origin) | Staging ALB | Production ALB |
| Database | Atlas cluster `staging_db` | Atlas cluster `prod_db` |
| Secrets path | `/staging/*` | `/prod/*` |
| Domain | `staging.<your-domain>` → CloudFront | `<your-domain>` → CloudFront |
| Deploy trigger | merge to `develop` | merge to `main` + version tag (with approval) |

> **Single account, not two.** We deliberately do **not** create a second "free" AWS account
> to dodge billing — that violates AWS Free Tier terms and doubles operational overhead.
> Isolation is achieved through separate instances, security groups, databases, and secret
> namespaces instead.

---

## 4. Network & Security Topology ("No NAT Gateway" pattern)

The core security idea: instances live in a **public subnet** (free internet access for
pulling images and reaching Atlas), but **all inbound access is locked down by Security
Groups** so they behave as if private — without paying for a NAT Gateway (~$32/mo saved).

**Ingress path**
1. Public HTTPS (443) hits the per-environment **CloudFront distribution**.
2. CloudFront serves the SPA from its **S3 origin** for `/*`, and routes `/api/*` to the
   **backend ALB** origin — so the browser stays **same-origin** (no CORS).
3. The backend **ALB** (CloudFront's `/api` origin) forwards to the ECS backend on the
   instance. HTTP→HTTPS is enforced at CloudFront.

**Security Group rules (the firewall core)**
- **ALB SG:** inbound 443 — ideally restricted to **CloudFront only** (AWS-managed
  `com.amazonaws.global.cloudfront.origin-facing` prefix list + a secret origin header the ALB
  verifies), rather than `0.0.0.0/0`. This stops the ALB being hit directly, bypassing CloudFront.
- **Instance SG:** inbound **only from the ALB's Security Group** (referenced by SG ID, not
  IP). App ports (5000 / 6379) are **never** exposed to the internet. (Frontend no longer runs
  on the instance — it's static on S3.)
- **S3 bucket:** **private** (no public access); reachable only by CloudFront via Origin Access
  Control (OAC).
- **Egress:** open, so the box can pull ECR images and reach Atlas + Resend.

**No SSH — use AWS SSM Session Manager.**
Port 22 stays closed and we manage no key pairs. Admin shell access goes through **Systems
Manager Session Manager** (free, fully audited). This removes the single most common AWS
breach vector — an exposed/brute-forced SSH port.

**Redis hardening**
- No published host ports. Reachable only over an internal Docker network by `backend` and
  `worker`. Port 6379 is invisible from the host and the internet.
- `appendonly` persistence mapped to a volume so queued BullMQ jobs survive redeploys.

**Application layer**
- Helmet security headers, CORS restricted to known origins, rate limiting, input validation,
  HTTPS-only cookies.

---

## 5. Secrets Management

**Never** in source, Docker images, CI logs, build artifacts, or task definitions in plaintext.

### Where each kind of config lives

| Type | Examples | Home | Per-env? |
|---|---|---|---|
| **Application secrets** | `MONGO_URI`, `REDIS_URL`, `RESEND_API_KEY`, `JWT_SECRET` | **AWS SSM Parameter Store** (`SecureString`, KMS-encrypted), `/staging/*` and `/prod/*` | ✅ |
| **Non-secret runtime config** | `NODE_ENV`, `LOG_LEVEL`, `PORT`, CORS origins, feature flags | ECS task-definition `environment` block | ✅ |
| **Local dev** | everything | gitignored `.env` (verify with `git check-ignore`) | n/a |

> **SSM is the single source of truth for secrets** — free (Secrets Manager would cost
> $0.40/secret/mo), encrypted at rest, IAM-access-controlled.

### Secrets do NOT go to GitHub — at all

The pipeline's job is *build image → push to ECR → tell ECS to deploy*. **None of those steps
need a database URL or any app secret.** The container receives secrets from SSM at startup,
*after* GitHub's work is done. Therefore:

- Application secrets are **never** stored as GitHub Actions/Environment secrets.
- Thanks to OIDC (§6), GitHub stores **nothing sensitive** — at most a non-secret AWS
  account/role ARN.
- Secrets enter the system **once**, by hand, straight to AWS: `aws ssm put-parameter`.
  They never pass through the repo, the pipeline, or CI logs.

### Injection: Option A (`valueFrom`) only — never the `environment` block

ECS offers two ways to give a container a value; only one is safe for secrets:

- ✅ **Option A — `secrets` + `valueFrom` (REQUIRED for secrets).** The task definition stores
  **only the SSM ARN**; ECS fetches and injects the value at container launch. The plaintext
  never appears in the task def, its revision history, or `describe-task-definition`.
- ❌ **Option B — `environment` block with a literal `value` (FORBIDDEN for secrets).** Stores
  the plaintext **inside the task definition**, frozen into every revision and readable by
  anyone with `ecs:DescribeTaskDefinition`. The `environment` block is for **non-secrets only**.

### Secret-handling guardrails (do-not-do list)

The design is safe *only if* no step reintroduces a secret. Enforce:

- ❌ Never `echo` / `env` / `printenv` a secret in a workflow step.
- ❌ Never pass a secret via `docker build --build-arg` (build args are recoverable from image history).
- ❌ Never `console.log(process.env)` — even behind a debug flag.
- ❌ Never put a secret value in the task-def `environment` block (use `valueFrom`).
- ✅ Secrets enter only via `aws ssm put-parameter`, straight to AWS.
- ✅ `.env` stays gitignored.

### No release-time config edits

Secrets are set in SSM **once** (or when rotated). A release does **not** involve editing DB
strings or any config: the staging task def is permanently wired to `/staging/*`, the prod
task def to `/prod/*`. Promoting an image SHA to prod automatically picks up prod config —
removing the #1 human-error risk of pointing prod at the wrong database.

---

## 6. IAM & Access (least privilege)

- **GitHub Actions → AWS via OIDC federation.** GitHub assumes a scoped IAM role at runtime;
  **no `AWS_ACCESS_KEY_ID`/secret is ever stored in GitHub.** This is the current industry
  standard and removes the risk of leaked static keys.
- **Two distinct ECS roles — and the distinction matters for secrets:**
  - *Task **Execution** Role* — used by **ECS itself at container launch** to pull the ECR
    image **and fetch/inject SSM secrets**. This is the role that reads the `valueFrom` ARNs,
    so the **SSM read permission lives here**.
  - *Task Role* — credentials the **application code** uses at runtime for its own AWS API
    calls. The app reads secrets from `process.env` (already injected), **not** from SSM, so
    this role needs **no** SSM secret access.
- **Per-environment IAM boundary (real isolation):** the **prod** execution role is scoped to
  read **`/prod/*` only**; the **staging** execution role to **`/staging/*` only**. The intent
  is that a compromised staging instance cannot use *its own role* to read prod secrets. This
  is a genuine boundary — but it is only as strong as the IAM policy that defines it: it holds
  **provided the scoped policies are applied correctly and not widened** (e.g. no `ssm:*` on
  `*`, no shared role across environments). It mitigates lateral movement; it is not an
  absolute guarantee independent of configuration.
- **Instance role** — `AmazonSSMManagedInstanceCore` for Session Manager access.
- **Repo branch protection** — no direct pushes to `main` / `develop`; PR + passing status
  checks required.

---

## 7. CI/CD — GitFlow (industry standard)

### Branch model

```
feature/*  ──PR──►  develop  ──►  release/x.y.0  ──┐
   (work)         (integration)   (stabilize)      ├─►  main  ──►  PROD
                       ▲                            │  (tag vX.Y.Z)
                       └──────────back-merge────────┘
                                                hotfix/x.y.z  ──► main + develop
```

| Branch | Cut from | Merges into | Deploys to | CI/CD trigger |
|---|---|---|---|---|
| `feature/*` | `develop` | `develop` (via PR) | — | CI checks only |
| `develop` | — | `release/*` | **Staging** | on merge |
| `release/x.y.0` | `develop` | `main` **and** back into `develop` | Staging (release candidate) | on branch push |
| `main` | `release/*` / `hotfix/*` | — | **Production** | on merge + tag, **manual approval** |
| `hotfix/x.y.z` | `main` | `main` **and** `develop` | Production (fast path) | on branch push |

### Pipeline stages

1. **CI (every PR into / push to `develop`/`main`):** per changed service (monorepo path
   filter, §2.1) → `npm ci` → lint/test (`--if-present`; not defined yet, so currently no-op)
   → `npm audit --omit=dev --audit-level=high` → build the **prod-target** image → Trivy scan.
   **Security-gate policy:** hard-fail on **CRITICAL** only (`--ignore-unfixed`); **HIGH** is
   reported but **non-blocking** — base images carry fixable HIGH CVEs that we patch where we
   can (`apk upgrade` at build time) but can't always eliminate without upstream rebuilds.
   Trivy runs via the official `aquasec/trivy` image (no action-version dependency).
   **No deploy, no AWS credentials in this workflow.**
2. **Deploy to Staging (`develop` / `release/*`):** build the production image **once** →
   push to **ECR** → record its **immutable digest** (`sha256:…`) → register a staging
   task-definition revision pinned to that digest → ECS rolling update of the staging service.
3. **Deploy to Production (`main` + `vX.Y.Z` tag):** **promote the artifact already tested in
   staging by referencing its digest** (no rebuild) → register a prod task-definition revision
   pinned to the same digest → ECS rolling update of the prod service. Gated by a **GitHub
   `production` Environment approval** (you click approve).

### Frontend deploy — S3 + CloudFront (no image)
Stages 2–3 above describe the **backend** path (Docker image → ECR → ECS). The **frontend**
does not ship an image:

- **Build** the SPA once (`npm run build`) on `develop`. The bundle is **env-agnostic** — it
  calls relative `/api`, which CloudFront routes per environment — so the *same* bundle is
  promoted to staging then prod (build-once-promote preserved).
- **Deploy** = `aws s3 sync dist/ s3://…-web` → **CloudFront invalidation** (`/index.html` and
  changed paths). Static assets are content-hashed so they're immutable; `index.html` is
  invalidated so new deploys appear immediately.
- **Rollback** = re-sync the previous bundle and invalidate (keep the prior build artifact).

### Image identity — promote by digest, tag for humans
Two identifiers, with different guarantees:

- **Git-SHA tag** (e.g. `backend:a1b2c3d`) and **SemVer tag** (`vX.Y.Z`) — *human-readable*
  traceability. Tags are **mutable** — they can be repointed — so they are **not** a sufficient
  identity guarantee on their own.
- **Image digest** (`sha256:…`) — the *cryptographically immutable* identity. This is what we
  pin task definitions to, so "staging == prod" is a verifiable fact, not a naming convention.

> Enable **ECR tag immutability** as a defense-in-depth measure so a tag cannot be silently
> overwritten; promotion still resolves and pins the **digest**.

### Build lifecycle — one artifact per commit (not per stage, not per environment)
"Build once" means **one production image is built per commit** (identified by its digest) and
that same artifact flows to every environment. To avoid ambiguity:

- *Docker build **stages*** (multi-stage `dev`/`prod` targets) are **internal to producing that
  one artifact** — they are not separate deployable images.
- The artifact is **not** rebuilt for staging vs prod; prod re-uses staging's digest.
- A new artifact is produced **only when a new commit** changes the prod target.

### Image / registry
- **Amazon ECR**, scan-on-push enabled (free basic scanning), **tag immutability on**.
- Multi-stage builds, slim base image, **non-root container user**, `.dockerignore`, lifecycle
  policy to expire old untagged digests (stay under the **500 MB** free ECR storage).

### Task definitions — family reused, revisions accumulate
- Each environment has its **own task-definition family** (`app-staging`, `app-prod`) — they
  are never shared, because their secret paths, env vars, and resource sizes differ.
- A deploy does **not** mutate a task definition in place; it **registers a new revision** of
  that family, pinned to the promoted image digest. Revisions accumulate.
- This accumulation **is** the rollback mechanism (below).

### Rollback
ECS retains previous task-definition revisions. Rollback = redeploy the prior revision (which
is already pinned to the prior digest) — no rebuild needed. This is the documented recovery
path. Note it restores the **application image**, not data; schema/data changes should stay
backward-compatible (§8) so a rollback doesn't strand the database.

---

## 8. Data Tier & State

- **MongoDB Atlas M0** — free forever, one isolated cluster per environment.
  - **Connection string: use the standard `mongodb+srv://` form in staging/prod.** SRV is the
    stable abstraction — DNS `SRV`/`TXT` records discover the replica-set members and options,
    so the connection survives Atlas rotating M0 node hostnames (which it can on the shared
    tier).
  - ⚠️ **The local `mongodb://` (non-SRV) string is a *dev-only DNS workaround*, not a
    production decision.** It was adopted locally because the dev network/container couldn't
    resolve SRV/`TXT` lookups (hence the `dns: 8.8.8.8` pin in `docker-compose`). A pinned
    non-SRV string lists literal node hostnames and **breaks when M0 rotates them** — so it
    must **not** carry into the cloud. In a normal VPC the EC2 instance resolves SRV fine, so
    this workaround is unnecessary there. (Same class of dev-only hack as the Resend
    `extra_hosts` IP pin — strip it from staging/prod, per §5/§7 build-hygiene rules.)
- **Redis** — runs as a container *on the same instance* (no managed ElastiCache needed at
  this scale). Internal-only, persisted via volume so BullMQ jobs survive **container
  redeploys**.
  - ⚠️ **Durability is best-effort, by deliberate choice.** The `appendonly` volume lives on
    the instance's local EBS. If the **instance itself is replaced** (not just the container),
    that volume — and any in-flight BullMQ jobs — is lost unless a dedicated EBS volume is
    pinned and re-attached. For this project that risk is **accepted**: Redis holds only a
    cache + short-lived job queue, and durable EBS re-attachment is complexity that doesn't
    pay off at a 10-day, low-traffic scale. Jobs should be **idempotent / re-runnable** so a
    rare loss is harmless. (Revisit only if Redis ever holds data that must survive instance
    replacement.)
- **BullMQ worker** — separate ECS container, no public exposure, shares the internal network
  with Redis.

---

## 9. DNS & TLS

- Custom domain: `staging.<domain>` → Staging **CloudFront**, `<domain>` → Production CloudFront.
- **ACM certs:** CloudFront requires its certificate in **`us-east-1`** (one per environment).
  The backend **ALB** (CloudFront's `/api` origin) uses a **regional** ACM cert in the
  deployment region. HTTP→HTTPS is enforced at CloudFront.

---

## 10. Cost Safety & Teardown

**Staying at $0 (10-day window, two instances + two ALBs):**

| Resource | Free cap / month | 10 days × 2 | Result |
|---|---|---|---|
| EC2 t3.micro | 750 hrs | 480 hrs | ✅ free |
| ALB (backend only) | 750 hrs | 480 hrs | ✅ free |
| S3 storage | 5 GB | tiny SPA bundle | ✅ free |
| CloudFront | 1 TB egress + 10M req (12 mo) | negligible | ✅ free |
| EBS storage | 30 GB | small | ✅ free |
| ECR storage (backend only) | 500 MB | keep image slim | ✅ free |
| Data egress | 100 GB | negligible | ✅ free |

> If usage stretches toward **30 days**, two of everything 24/7 exceeds the 750-hour caps
> (~$22/mo). To extend free: run **one instance hosting both stacks** + drop ALBs for
> Caddy/Cloudflare TLS, or stop instances when idle.

**Teardown checklist (run when the ~10 days are done):**
1. **Disable then delete the CloudFront distributions** (disable first; deletion needs the
   distribution disabled)
2. **Empty + delete the S3 buckets** (frontend bundles)
3. Delete ECS services + cluster (stops tasks)
4. Delete ALBs + target groups
5. Terminate EC2 instances
6. **Delete EBS volumes** (they survive instance termination — easy to forget)
7. **Release any Elastic IPs** (an *unattached* EIP is billed even in free tier)
8. Delete ECR images / repo (backend)
9. Delete Atlas clusters (free, but keep it clean)

---

## 11. Execution Phases (build order)

1. **Dockerize** all four services for production (multi-stage, non-root); verify the stack
   runs against a local Redis container.
2. **Provision data tier** — two isolated Atlas M0 clusters; capture connection strings.
3. **AWS foundation** — VPC/subnets, Security Groups (ALB locked to CloudFront), two
   ECS-optimized t3.micro instances (backend/worker/redis), two **backend ALBs**, two **S3
   buckets + CloudFront distributions** (frontend), ACM certs (CloudFront in `us-east-1`, ALB
   regional), domain records, SSM access.
4. **ECS (backend only)** — cluster + task definitions + `staging`/`prod` services (secrets via
   Parameter Store references). Frontend is static on S3 — no ECS service.
5. **Secrets & IAM** — populate Parameter Store; configure GitHub OIDC role + Environments.
6. **Pipelines** — CI workflow, staging deploy, prod deploy (approval-gated); enable branch
   protection.
7. **Verify the flow** — feature → develop → staging test → release/main → prod verify;
   rehearse a hotfix and a rollback.
8. **Teardown** — execute the §10 checklist.

---

*This document is the plan of record. Implementation (Dockerfiles, IAM policies, workflow
YAML, task definitions) will be produced in later steps and should conform to the decisions
above.*
