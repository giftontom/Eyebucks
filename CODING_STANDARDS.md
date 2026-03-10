# Coding Standards - Eyebuckz LMS

**Version:** 2.0.0
**Last Updated:** March 6, 2026

---

## Overview

Coding standards for the Eyebuckz LMS platform. The project uses React 19 + TypeScript on the frontend with Supabase (PostgreSQL, Auth, Edge Functions, RLS) as the backend.

---

## General Principles

- **DRY** - Extract reusable functions, avoid duplicating logic
- **KISS** - Prefer simple, readable code over clever abstractions
- **Single Responsibility** - Each function/component does one thing
- **Early Returns** - Guard clauses over nested conditionals
- **No `any`** - Use proper types; `unknown` if truly uncertain

---

## File Organization

### Frontend Structure

```
components/          # Shared UI components (PascalCase.tsx)
pages/               # Route-level page components
  admin/             # Admin sub-pages + admin-specific components
context/             # React context providers
hooks/               # Custom React hooks (useXxx.ts)
services/            # API layer
  api/               # Typed Supabase query modules (xxx.api.ts) — canonical layer
  supabase.ts        # Supabase client singleton
types/               # TypeScript type definitions
  index.ts           # Business types
  api.ts             # API request/response types
  supabase.ts        # Auto-generated DB types
utils/               # Utility functions
```

### Supabase Backend Structure

```
supabase/
  config.toml        # Project config
  seed.sql           # Seed data
  migrations/        # Sequential SQL migrations (NNN_description.sql)
  functions/         # Edge Functions (Deno, one directory per function)
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React Components | PascalCase | `VideoPlayer.tsx` |
| Hooks | camelCase with `use` prefix | `useAccessControl.ts` |
| API Modules | camelCase with `.api` suffix | `courses.api.ts` |
| ~~Services~~ | ~~camelCase with `Service` suffix~~ | ~~`enrollmentService.ts`~~ (deprecated) |
| Types | PascalCase | `Course`, `EnrollmentStatus` |
| Constants | SCREAMING_SNAKE_CASE | `COMPLETION_THRESHOLD` |
| SQL Migrations | NNN_description.sql | `001_initial_schema.sql` |
| Edge Functions | kebab-case directory | `checkout-verify/` |
| Tests | Match source + `.test` | `Layout.test.tsx` |

---

## React Standards

### Component Structure

```tsx
// 1. External imports
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal imports
import { coursesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// 3. Component imports
import { StarRating } from '../components/StarRating';

// 4. Type imports
import type { Course } from '../types';

// 5. Types/interfaces for this component
interface CourseCardProps {
  course: Course;
  onEnroll?: (courseId: string) => void;
}

// 6. Component
export const CourseCard: React.FC<CourseCardProps> = ({ course, onEnroll }) => {
  // Hooks first
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Effects
  useEffect(() => {
    // ...
  }, [course.id]);

  // Event handlers
  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      await onEnroll?.(course.id);
    } finally {
      setIsLoading(false);
    }
  };

  // Render
  return (
    <div className="course-card">
      <h3>{course.title}</h3>
      <StarRating rating={course.rating} />
      <button onClick={handleEnroll} disabled={isLoading}>
        {isLoading ? 'Enrolling...' : 'Enroll'}
      </button>
    </div>
  );
};
```

### Hook Rules

- Always include cleanup in `useEffect` for subscriptions, timers, and event listeners
- Specify complete dependency arrays (enable `react-hooks/exhaustive-deps` rule)
- Use proper types for state: `useState<Course | null>(null)` not `useState<any>(null)`
- Extract complex logic into custom hooks

### Conditional Rendering

```tsx
// Simple presence check
{isLoading && <Spinner />}
{error && <ErrorMessage message={error} />}

// Either/or
{user ? <Dashboard /> : <LoginPrompt />}
```

---

## UI Primitives (Design System)

Prefer the shared primitive components over raw HTML elements. This enforces consistent styling, light/dark mode support, loading states, and accessible label/error patterns.

| Instead of... | Use... | Import |
|---------------|--------|--------|
| `<button className="bg-brand-...">` | `<Button variant="primary" size="md">` | `import { Button } from '../components'` |
| `<label>...<input className="...">` | `<Input label="..." error={err}>` | `import { Input } from '../components'` |
| Inline status class logic | `<Badge variant={statusToVariant(s)}>` | `import { Badge, statusToVariant } from '../components'` |
| `<div className="bg-white/5 ...">` | `<Card variant="glass" radius="2xl">` | `import { Card } from '../components'` |

For full variant/prop reference, see [Design System](docs/reference/DESIGN_SYSTEM.md).

---

## Supabase Query Standards

### API Module Pattern

All database queries go through typed API modules in `services/api/`.

```typescript
// services/api/courses.api.ts
import { supabase } from '../supabase';
import type { Course } from '../../types';

function mapCourse(row: any): Course {
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    status: row.status,
    // ... map all fields
  };
}

export const coursesApi = {
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*)')
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapCourse);
  },

  async getCourse(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules(*)')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ? mapCourse(data) : null;
  },
};
```

### Query Best Practices

```typescript
// Use .select() to limit returned columns
const { data } = await supabase
  .from('users')
  .select('id, name, email')  // Only what's needed
  .eq('id', userId)
  .single();

// Use pagination
const { data, count } = await supabase
  .from('courses')
  .select('*', { count: 'exact' })
  .range(offset, offset + limit - 1);

// Use RPC for complex operations
const { data } = await supabase.rpc('get_admin_stats');

// Always handle errors
const { data, error } = await supabase.from('courses').select('*');
if (error) throw new Error(error.message);
```

### Edge Function Pattern

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { jsonResponse, errorResponse } from '../_shared/response.ts';

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth (returns user or error response)
    const auth = await verifyAuth(req, corsHeaders);
    if ('errorResponse' in auth) return auth.errorResponse;
    const { user } = auth;

    // Business logic here...
    return jsonResponse({ success: true }, corsHeaders);
  } catch (error) {
    console.error('[FunctionName] Error:', error);
    return errorResponse('Internal server error', corsHeaders, 500);
  }
});
```

### `_shared/` Utilities

Edge Functions share common utilities in `supabase/functions/_shared/`:

| Module | Purpose |
|--------|---------|
| `cors.ts` | `getCorsHeaders(req)` — origin-restricted CORS headers |
| `supabaseAdmin.ts` | `createAdminClient()` — service_role Supabase client |
| `auth.ts` | `verifyAuth(req, corsHeaders)` — JWT auth verification |
| `response.ts` | `jsonResponse()`, `errorResponse()` — JSON response helpers |
| `hmac.ts` | `hmacSha256()`, `timingSafeEqual()` — HMAC + timing-safe comparison |
| `email.ts` | `sendEmail()` — Resend email helper |
| `certificates.ts` | `generateCertificateNumber()` — certificate number generator |

### SQL Migration Standards

```sql
-- Use IF NOT EXISTS for idempotent migrations
CREATE TABLE IF NOT EXISTS public.my_table (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Always enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- Create policies with descriptive names
CREATE POLICY "my_table_user_read" ON public.my_table
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "my_table_admin_all" ON public.my_table
  FOR ALL USING (is_admin());

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_my_table_user_id ON public.my_table(user_id);
```

---

## Error Handling

### Frontend

```typescript
// API calls - throw and let callers handle
async getCourse(id: string): Promise<Course> {
  const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
  if (error) throw new Error(`Failed to fetch course: ${error.message}`);
  return mapCourse(data);
}

// Page components - catch and show UI
useEffect(() => {
  coursesApi.getCourse(id)
    .then(setCourse)
    .catch((err) => {
      console.error('Failed to load course:', err);
      setError('Could not load course. Please try again.');
    })
    .finally(() => setIsLoading(false));
}, [id]);
```

### Edge Functions

```typescript
// Return structured JSON errors with appropriate status codes
if (!user) {
  return new Response(
    JSON.stringify({ success: false, error: 'Unauthorized' }),
    { status: 401, headers: corsHeaders }
  );
}

// Log errors with context
catch (error) {
  console.error(`[checkout-verify] Error for user ${user.id}:`, error);
  return new Response(
    JSON.stringify({ success: false, error: 'Internal server error' }),
    { status: 500, headers: corsHeaders }
  );
}
```

---

## Import Organization

Enforced by ESLint `import/order` rule:

```typescript
// 1. Built-in / external dependencies
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Internal modules (services, hooks, context)
import { coursesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// 3. Components
import { StarRating } from '../components/StarRating';

// 4. Types (use `import type`)
import type { Course, Module } from '../types';
```

---

## Performance Guidelines

- Use `React.memo` for expensive list items
- Use `useCallback` / `useMemo` for derived data passed as props
- Lazy-load heavy pages with `React.lazy` + `Suspense`
- Paginate API queries (never fetch unbounded result sets)
- Clean up subscriptions, timers, and event listeners in useEffect returns

---

## Code Review Checklist

- [ ] No `any` types (use proper types or `unknown`)
- [ ] All async functions have error handling
- [ ] No `console.log` (use `logger` utility or `console.error`/`warn`)
- [ ] Supabase queries use `.select()` with specific columns where practical
- [ ] RLS policies cover new tables
- [ ] Edge Functions validate auth and input
- [ ] Imports organized per convention
- [ ] Tests added for new functionality
- [ ] No hardcoded magic numbers (use constants)
- [ ] Accessibility: buttons have labels, forms have associated labels

---

**Last Updated:** March 6, 2026
