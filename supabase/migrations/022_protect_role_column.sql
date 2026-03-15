-- Migration 022: Block self-promotion via role column update
-- Closes RLS gap: users_update_own policy allowed updating the `role` column,
-- enabling a user to escalate their own privileges to ADMIN.

CREATE OR REPLACE FUNCTION prevent_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins may change another user's role
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Changing your own role is not permitted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_change ON users;
CREATE TRIGGER trg_prevent_role_change
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_change();
