# Migrations — Local Conventions

## Naming
`{NNN}_{snake_case_description}.sql` where NNN is zero-padded 3 digits.

**Next migration number: 022**

21 migrations exist (001–021). Review the most recent ones before adding to understand current patterns.

## Rules
- Migrations are **permanent** — never edit an existing migration file
- Each runs in order at `supabase db reset` and `supabase migration up`
- Seed data lives in `supabase/seed.sql` — update if new required rows are needed

## Required on Every New Table
```sql
-- Always enable RLS
ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

-- User-scoped read
CREATE POLICY "{table}_select_own" ON {table}
  FOR SELECT USING (user_id = auth.uid());

-- Admin override (add to any policy needing admin access)
CREATE POLICY "{table}_admin_all" ON {table}
  FOR ALL USING (is_admin());
```

## RLS Patterns
| Pattern | USING clause |
|---------|-------------|
| User-scoped | `user_id = auth.uid()` |
| Admin override | `user_id = auth.uid() OR is_admin()` |
| Public read | `status = 'PUBLISHED'` (no auth check) |

`is_admin()` is a **SECURITY DEFINER** function — use it in all admin RLS policies.

## ENUMs
Define before the table that uses them:
```sql
CREATE TYPE my_enum AS ENUM ('VALUE_A', 'VALUE_B');
```

Existing ENUMs: `user_role`, `course_type`, `course_status`, `enrollment_status`, `certificate_status`, `notification_type`

## After Creating a New Table
Run `/rls-test {table}` to verify anon/user/admin access matrix is correct.

## Workflow
```bash
# Apply locally
supabase db reset              # full reset + all migrations + seed
supabase migration up          # apply new migrations only

# Create via skill (auto-numbers)
# Invoking /new-migration <description>
```
