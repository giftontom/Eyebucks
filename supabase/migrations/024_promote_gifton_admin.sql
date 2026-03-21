-- Promote giftontombiju@gmail.com to ADMIN for testing
-- This bypasses the trigger by disabling it temporarily (superuser context during migration)
ALTER TABLE users DISABLE TRIGGER trg_prevent_role_change;
UPDATE users SET role = 'ADMIN' WHERE email = 'giftontombiju@gmail.com';
ALTER TABLE users ENABLE TRIGGER trg_prevent_role_change;
