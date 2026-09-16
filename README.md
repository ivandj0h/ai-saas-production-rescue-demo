# AI SaaS Production Rescue Demo

A practical before-and-after case study showing how an AI-built SaaS can be taken from a functional but unsafe prototype to a more production-ready application.

This repository intentionally started with several common production-readiness problems: missing authentication, weak tenant isolation, direct browser database writes, no request validation, no rate limiting, and overly broad database permissions.

The goal of this project is not to showcase a toy vulnerability scanner. It is to demonstrate a real engineering workflow:

**inspect → reproduce → harden → verify → document**

---

## Case Study Summary

### BEFORE

The initial application worked from a user-interface perspective, but the security boundary was weak.

The original state included:

- Row Level Security disabled
- Anonymous access to support-ticket data
- Cross-workspace data exposure
- Direct database writes from the browser
- Unauthenticated API access
- No request validation
- No API rate limiting
- No tenant-isolation enforcement
- Overly broad database privileges
- No automated verification of the API security behavior

The application looked functional, but the production risk was hidden behind a working UI.

---

### AFTER

The hardened version introduces:

- Supabase authentication
- Row Level Security
- Workspace membership enforcement
- Database-level tenant isolation
- Anonymous data access blocked
- Direct client-side database writes removed
- Server-only privileged database writes
- Bearer-token authentication on the API
- Request validation
- Per-user API rate limiting
- Least-privilege database permissions
- Versioned database hardening migration
- Automated API security tests
- Successful lint and production build verification

---

## Before → After

| Area | Before | After |
|---|---|---|
| Authentication | None | Supabase Auth |
| Anonymous DB access | Allowed | Blocked |
| Tenant isolation | Not enforced | Enforced with RLS |
| Cross-workspace visibility | Possible | Blocked |
| Browser DB writes | Allowed | Removed |
| Server-side writes | Not required | Required |
| API authentication | None | Bearer-token verification |
| Request validation | None | Enforced |
| Rate limiting | None | 5 requests / 60 seconds per user |
| DB permissions | Broad | Least privilege |
| Security tests | None | Automated with Vitest |
| Production build | Unverified | Passing |

---

## Example Tenant-Isolation Result

The demo contains tickets for multiple workspaces.

An authenticated user assigned to:

```text
workspace-alpha
```

can access tickets belonging to that workspace only.

For example:

```text
VISIBLE
- Sarah Miller
- Mike Johnson

BLOCKED
- Daniel Kim (workspace-beta)
```

The restriction is enforced at the database layer using Row Level Security rather than relying on frontend filtering.

---

## Hardened API Flow

The secured `POST /api/generate-reply` flow is:

```text
Browser
  ↓
Supabase session
  ↓
Bearer access token
  ↓
API authentication
  ↓
Per-user rate limit
  ↓
Request validation
  ↓
RLS-protected ticket lookup
  ↓
Server-only privileged update
  ↓
Response
```

A user cannot process a ticket belonging to another workspace because ticket access is verified through the user's RLS-scoped database session before any privileged write occurs.

---

## Database Security Model

The hardened database uses:

### Row Level Security

`support_tickets` is protected by workspace membership.

Authenticated users may only read tickets from workspaces they belong to.

### Least Privilege

Final application-facing privileges are intentionally narrow:

```text
anon
→ no table privileges

authenticated
→ SELECT only

server secret / privileged role
→ server-side operations
```

Client-side `INSERT`, `UPDATE`, and `DELETE` access is not required for the hardened flow.

---

## Rate Limiting

The API uses a PostgreSQL-backed rate-limit function.

Current demo policy:

```text
5 requests
per authenticated user
per 60-second window
per route
```

When the limit is exceeded:

```http
HTTP 429 Too Many Requests
```

The rate limiter is stored in the database rather than relying on process memory.

---

## Automated Verification

The API test suite verifies the important security paths.

```text
401 → missing authentication
400 → invalid request
429 → rate limit exceeded
200 → valid authenticated request
```

Run:

```bash
npx vitest run
```

Expected result:

```text
Test Files  1 passed
Tests       4 passed
```

---

## Production Verification

The hardened application has been verified with:

```bash
npm run lint
npm run build
npx vitest run
```

All checks pass.

---

## Versioned Database Hardening

The database changes are stored in:

```text
supabase/migrations/20260916_production_hardening.sql
```

The migration includes:

- workspace membership table
- RLS configuration
- tenant-isolation policies
- API rate-limit table
- rate-limit function
- privilege revocation
- least-privilege grants

This keeps security changes reviewable and version-controlled instead of existing only inside a hosted database dashboard.

---

## Repository Checkpoints

Two Git tags preserve the case-study states:

```text
before-rescue
after-rescue
```

Compare them directly:

https://github.com/ivandj0h/ai-saas-production-rescue-demo/compare/before-rescue...after-rescue

### `before-rescue`

Represents the functional but intentionally unsafe SaaS prototype.

### `after-rescue`

Represents the production-hardening result.

---

## Tech Stack

- Next.js
- TypeScript
- React
- Supabase
- PostgreSQL
- Tailwind CSS
- Vitest

---

## Local Development

Install dependencies:

```bash
npm install
```

Create:

```text
.env.local
```

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

Never expose `SUPABASE_SECRET_KEY` to browser code and never prefix it with `NEXT_PUBLIC_`.

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Security Notes

This repository contains an intentionally insecure historical state for demonstration purposes.

Do not use the `before-rescue` version as a production template.

The purpose of the vulnerable version is to make the engineering changes reproducible and auditable.

No real customer data should be stored in this demo project.

---

## What This Case Study Demonstrates

A working application is not necessarily a production-ready application.

The important engineering work often happens after the prototype already appears to work:

- identifying trust boundaries
- enforcing authorization at the database layer
- reducing client privileges
- moving sensitive operations server-side
- preventing cross-tenant access
- controlling expensive or abusable endpoints
- validating input
- testing failure paths
- documenting the remediation clearly

This repository is a concrete example of that process.

---

## Production Hardening / Codebase Rescue

This case study demonstrates the type of work involved in reviewing and hardening rapidly built SaaS applications, including products built with AI-assisted coding tools.

Typical review areas include:

- authentication and authorization
- tenant isolation
- API security
- database permissions
- Supabase RLS
- server/client trust boundaries
- request validation
- rate limiting
- architecture risks
- production readiness
- automated verification

Repository:

https://github.com/ivandj0h/ai-saas-production-rescue-demo
