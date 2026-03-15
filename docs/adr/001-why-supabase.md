# ADR-001: Why Supabase over Custom Express Backend

> **Status:** Accepted
> **Date:** 2026-03-14 | **Deciders:** core maintainers
> **Supersedes:** N/A | **Superseded by:** N/A

## Context

The original Eyebuckz backend was a custom Express + Prisma + JWT stack. The project needed
authentication, a relational database, real-time subscriptions, and server-side secret handling
(Razorpay, Bunny.net, Resend). Maintaining a separate Node.js server alongside the React
frontend added operational overhead for a small team.

The `archive/` directory in this repository preserves the original Express server code.

## Decision Drivers

- Reduce operational overhead (no server to maintain, patch, or scale)
- Native PostgreSQL with row-level security for data access control
- Built-in Google OAuth without a custom auth server
- Real-time subscriptions for notifications without a separate WebSocket server
- Edge Functions for server-side secrets without a full backend deployment

## Options Considered

### Option A: Keep Express + Prisma + JWT
- Pro: Full control over auth and business logic
- Pro: Familiar Node.js ecosystem
- Con: Separate server to deploy, maintain, and scale
- Con: Custom JWT rotation, refresh token storage, session management
- Con: No built-in real-time; would need Socket.io or similar

### Option B: Supabase *(chosen)*
- Pro: PostgreSQL with RLS replaces Express middleware auth checks
- Pro: Built-in Google OAuth with session management
- Pro: Realtime subscriptions via WebSocket without extra infrastructure
- Pro: Edge Functions (Deno) for server-side secrets
- Pro: PostgREST auto-generates a REST API from the schema
- Con: Lock-in to Supabase's hosted platform
- Con: PostgREST filter syntax differs from SQL (introduces injection risk)
- Con: RLS policies require PostgreSQL expertise to write correctly

### Option C: Firebase
- Pro: Managed, scalable
- Con: NoSQL — poor fit for relational data (enrollments, progress, payments)
- Con: No row-level security model

## Decision

**We chose Supabase** because it eliminates the custom backend while retaining PostgreSQL's
relational model and RLS for security enforcement. The Edge Functions handle server-side
secrets without a separate server.

## Consequences

### Positive
- Frontend-only deployment (Cloudflare Pages)
- Auth, database, real-time, and edge compute in one platform
- RLS enforces access control at the DB level — frontend bugs cannot leak data

### Negative / Trade-offs
- Platform lock-in: migrating away requires rewriting RLS policies, auth, and Edge Functions
  — Mitigation: the `services/api/` layer isolates Supabase calls; migration would touch that layer only
- PostgREST filter syntax enables injection if user input is interpolated unsanitized
  — Mitigation: see [Known Issue #6](../../docs/project/KNOWN_ISSUES.md); escape input before `.or()` calls

### Risks
- **RLS gap:** `users_update_own` policy allows updating the `role` column; a user could
  self-promote to ADMIN via a direct API call
  — Mitigation: [Known Issue #5](../../docs/project/KNOWN_ISSUES.md); add a BEFORE UPDATE trigger blocking role changes

## Links

- [SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md)
- [Known Issue #5 — RLS role column gap](../../docs/project/KNOWN_ISSUES.md)
- [Known Issue #6 — PostgREST filter injection](../../docs/project/KNOWN_ISSUES.md)
