# Eyebuckz LMS Documentation

Eyebuckz is a full-stack learning management system built with React, TypeScript, and Supabase. It supports course enrollment, video streaming via Bunny.net, Razorpay payments, certificate generation, and a full admin panel.

---

## Quick Links

| Task | Document |
|------|----------|
| Set up local development | [Development Setup](guides/DEVELOPMENT_SETUP.md) |
| Understand the API layer | [Service Modules](api/SERVICE_MODULES.md) |
| Debug a problem | [Troubleshooting](guides/TROUBLESHOOTING.md) |

---

## Table of Contents

### Architecture

High-level system design, database structure, and security model.

| Document | Description |
|----------|-------------|
| [System Overview](architecture/SYSTEM_OVERVIEW.md) | System architecture, tech stack, and data flows |
| [Database Schema](architecture/DATABASE_SCHEMA.md) | Tables, relationships, RLS policies, and database functions |
| [Security Model](architecture/SECURITY_MODEL.md) | Authentication, RLS enforcement, payment security, and video URL signing |
| [Access Control](architecture/ACCESS_CONTROL.md) | Route protection, role-based access, and auth guards |

### API Reference

Documentation for the frontend service layer and Supabase Edge Functions.

| Document | Description |
|----------|-------------|
| [Service Modules](api/SERVICE_MODULES.md) | All 13 API service modules (courses, enrollments, progress, checkout, admin, notifications, payments, certificates, siteContent, reviews, users, coupons, wishlist) |
| [Edge Functions](api/EDGE_FUNCTIONS.md) | All 11 Edge Functions and shared utilities (checkout, video signing, uploads, certificates, progress, refunds, session-enforce, coupon-apply, video-cleanup) |

### Guides

Step-by-step instructions for development, deployment, and day-to-day operations.

| Document | Description |
|----------|-------------|
| [Development Setup](guides/DEVELOPMENT_SETUP.md) | Local environment setup, dependencies, and running the dev server |
| [Deployment](guides/DEPLOYMENT.md) | Deploying to Cloudflare Pages (frontend) and Supabase (backend, Edge Functions) |
| [Testing](guides/TESTING.md) | Vitest configuration, writing tests, and running the test suite |
| [Admin Panel](guides/ADMIN_PANEL.md) | Admin panel features, workflows, and page-by-page usage guide |
| [Troubleshooting](guides/TROUBLESHOOTING.md) | Common issues, error messages, and their solutions |
| [JSDoc Guide](guides/JSDOC_GUIDE.md) | When and how to write JSDoc comments for this codebase |
| [Testing Strategy](guides/TESTING_STRATEGY.md) | Testing pyramid, hook/component/E2E patterns, coverage targets |
| [Performance Guide](guides/PERFORMANCE_GUIDE.md) | Bundle profile, code splitting, query optimization, video strategy |

### Reference

Component catalog, hooks reference, and user flow diagrams.

| Document | Description |
|----------|-------------|
| [Components](reference/COMPONENTS.md) | All shared and admin components with props and usage |
| [Design System](reference/DESIGN_SYSTEM.md) | CSS token reference and UI primitive components (Badge, Button, Input, Card) |
| [Hooks](reference/HOOKS.md) | All shared and admin hooks with signatures and examples |
| [User Flows](reference/USER_FLOWS.md) | End-to-end user journey diagrams (enrollment, checkout, learning, certification) |

### Architecture Decision Records

Why key technologies and patterns were chosen.

| Document | Description |
|----------|-------------|
| [ADR Index](adr/README.md) | All ADRs with index and template |
| [ADR-001: Why Supabase](adr/001-why-supabase.md) | Supabase over Express + Prisma |
| [ADR-002: Why HashRouter](adr/002-why-hashrouter.md) | HashRouter over BrowserRouter |
| [ADR-003: Why Razorpay](adr/003-why-razorpay.md) | Razorpay for Indian payments |
| [ADR-004: Why Bunny.net](adr/004-why-bunny-net.md) | Bunny.net for HLS video |
| [ADR-005: Why Tailwind v4](adr/005-why-tailwind-v4.md) | Tailwind CSS v4 with @theme |

### Operations

Step-by-step runbooks for administrative and incident response tasks.

| Document | Description |
|----------|-------------|
| [Admin Runbook](operations/ADMIN_RUNBOOK.md) | User management, course ops, payments, coupons, content |
| [Incident Response](operations/INCIDENT_RESPONSE.md) | Severity levels, runbooks by symptom, rollback procedures |

### Project

Current project status and known issues.

| Document | Description |
|----------|-------------|
| [Known Issues](project/KNOWN_ISSUES.md) | Bugs, security concerns, and technical debt |

---

## Archive

The following documents describe the **pre-Supabase architecture** (Express + Prisma backend). They are retained for historical reference but do not reflect the current system.

| Document | Description |
|----------|-------------|
| [Access Control v1](archive/ACCESS_CONTROL_v1.md) | Original Express middleware-based access control |
| [Data Architecture v1](archive/DATA_ARCHITECTURE_v1.md) | Original Prisma schema and data layer |
| [Implementation Guide v1](archive/IMPLEMENTATION_GUIDE_v1.md) | Original backend implementation guide |
| [User Flows v1](archive/USER_FLOWS_v1.md) | Original user flow documentation |
| [Storefront Update Guide](archive/STOREFRONT_UPDATE_GUIDE.md) | Storefront redesign guide from the Express era |

---

*Last updated: March 14, 2026*
