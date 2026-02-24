-- Eyebuckz LMS: Storage Buckets and Policies

-- Create certificates bucket (private - requires auth to download)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  false,
  5242880,  -- 5MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Users can download their own certificates
CREATE POLICY cert_download ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Service role can upload certificates (Edge Functions use service_role key)
CREATE POLICY cert_upload ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'certificates');

-- Service role can delete certificates
CREATE POLICY cert_delete ON storage.objects FOR DELETE
  USING (bucket_id = 'certificates');
