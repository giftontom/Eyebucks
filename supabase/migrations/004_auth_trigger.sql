-- Eyebuckz LMS: Auth Trigger
-- Auto-create user profile when signing up via Supabase Auth

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_emails TEXT[];
  v_role user_role;
BEGIN
  -- Check if user email is in admin list
  -- Set admin emails via: ALTER DATABASE postgres SET app.admin_emails = 'admin@eyebuckz.com';
  v_admin_emails := string_to_array(
    COALESCE(current_setting('app.admin_emails', true), ''), ','
  );

  IF NEW.email = ANY(v_admin_emails) THEN
    v_role := 'ADMIN';
  ELSE
    v_role := 'USER';
  END IF;

  INSERT INTO users (id, name, email, avatar, google_id, role, email_verified, last_login_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    NEW.raw_user_meta_data->>'sub',
    v_role,
    NEW.email_confirmed_at IS NOT NULL,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = now(),
    email_verified = NEW.email_confirmed_at IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on new auth user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also update last_login_at on sign-in
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_login_at = now() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Supabase doesn't have a direct "on login" trigger on auth.users,
-- but we can update last_login_at from the frontend after auth state change
