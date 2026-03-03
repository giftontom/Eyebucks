# Contributing to Eyebuckz LMS

Thank you for your interest in contributing! This guide covers setup, workflow, and standards.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Git** 2.40+
- **Supabase CLI** ([install guide](https://supabase.com/docs/guides/cli/getting-started))
- **VS Code** (recommended)

---

## Development Setup

### 1. Clone and Install

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/eyebuckz.git
cd eyebuckz

# Add upstream remote
git remote add upstream https://github.com/eyebuckz/eyebuckz.git

# Install dependencies
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase project credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx

# Optional
VITE_MOCK_PAYMENT=true
VITE_DEBUG_MODE=true
```

### 3. Local Supabase (Optional)

For a fully local development environment:

```bash
supabase start          # Start local Supabase (Docker required)
supabase db reset       # Run migrations + seed data
```

This gives you a local PostgreSQL, Auth, and Edge Functions runtime.

### 4. Start Development

```bash
npm run dev             # Frontend at http://localhost:3000
```

### 5. Verify Setup

```bash
npm run type-check      # TypeScript check
npm run lint            # ESLint check
npm test                # Run tests
```

---

## Development Workflow

### 1. Create a Branch

```bash
git checkout main
git pull upstream main
git checkout -b feat/your-feature-name
```

### Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feat/` | New feature | `feat/course-search` |
| `fix/` | Bug fix | `fix/video-playback` |
| `refactor/` | Code refactor | `refactor/admin-split` |
| `docs/` | Documentation | `docs/update-readme` |
| `test/` | Test additions | `test/checkout-flow` |

### 2. Make Changes

- Follow [CODING_STANDARDS.md](./CODING_STANDARDS.md)
- Follow [SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md)
- Add tests for new features
- Update documentation as needed

### 3. Quality Checks

```bash
npm run lint:fix        # Fix lint issues
npm run format          # Format code
npm run type-check      # TypeScript check
npm test                # Run tests
```

### 4. Commit

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git add <files>
git commit -m "feat(courses): add search and filter functionality

- Add SearchBar component with debounced input
- Add CourseFilters component with price/rating filters
- Update coursesApi to support query parameters

Closes #42"
```

**Commit prefixes:** `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`

### 5. Push and Create PR

```bash
git push origin feat/your-feature-name
```

Open a Pull Request on GitHub using the PR template.

---

## Pull Request Checklist

- [ ] **Code:** Follows coding standards, no `any` types
- [ ] **Types:** No TypeScript errors (`npm run type-check`)
- [ ] **Lint:** No ESLint errors (`npm run lint`)
- [ ] **Format:** Code formatted (`npm run format:check`)
- [ ] **Tests:** All tests pass, new tests for new features
- [ ] **Docs:** Updated if adding new APIs, components, or patterns
- [ ] **Git:** Meaningful commit messages, rebased on latest main
- [ ] **PR:** Clear description, linked issues, screenshots for UI changes

---

## Project Structure Quick Reference

| Directory | Purpose |
|-----------|---------|
| `components/` | Shared UI components |
| `pages/` | Route page components |
| `pages/admin/` | Admin sub-pages and components |
| `context/` | React context providers (AuthContext) |
| `hooks/` | Custom React hooks |
| `services/api/` | Typed Supabase query modules |
| `services/supabase.ts` | Supabase client singleton |
| `types/` | TypeScript type definitions |
| `utils/` | Utility functions (logger, data export) |
| `supabase/migrations/` | SQL migrations (sequential) |
| `supabase/functions/` | Edge Functions (Deno) |
| `src/__tests__/` | Test files |

---

## Useful Commands

```bash
# Development
npm run dev                     # Start frontend (port 3000)
supabase start                  # Start local Supabase
supabase functions serve        # Serve Edge Functions locally

# Database
supabase db reset               # Reset DB + run migrations + seed
supabase db push                # Push migrations to remote
supabase gen types typescript   # Regenerate types/supabase.ts

# Edge Functions
supabase functions deploy       # Deploy all Edge Functions
supabase secrets set KEY=value  # Set Edge Function secrets

# Quality
npm run lint                    # Check lint
npm run lint:fix                # Fix lint
npm run format                  # Format code
npm run type-check              # TypeScript check
npm test                        # Run tests
npm run test:coverage           # Tests with coverage
```

---

## VS Code Extensions

- ESLint
- Prettier
- TypeScript
- Tailwind CSS IntelliSense
- GitLens

---

## Code of Conduct

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Gracefully accept constructive criticism
- Focus on what is best for the project

---

## Getting Help

- **Docs:** Check this file and `docs/` folder
- **Issues:** Search [GitHub Issues](https://github.com/eyebuckz/eyebuckz/issues)
- **Standards:** Read [CODING_STANDARDS.md](./CODING_STANDARDS.md) and [SECURITY_STANDARDS.md](./SECURITY_STANDARDS.md)

---

**Last Updated:** February 27, 2026
