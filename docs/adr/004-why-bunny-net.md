# ADR-004: Why Bunny.net for Video Hosting

> **Status:** Accepted
> **Date:** 2026-03-14 | **Deciders:** core maintainers
> **Superseded by:** N/A

## Context

Eyebuckz delivers course content as HLS video streams. The video hosting solution must support:
HLS adaptive streaming, a global CDN, signed URL access control, and TUS resumable uploads.
Video files can be hundreds of MB; reliable upload and fast playback are critical.

## Decision Drivers

- HLS adaptive streaming for quality switching
- Signed URL access control (prevent hotlinking / unauthorized access)
- TUS resumable upload protocol for large files
- Cost-effective CDN for Indian users
- API-driven (no manual upload UI required)

## Options Considered

### Option A: Cloudflare Stream
- Pro: Same infrastructure as our CDN (Cloudflare Pages)
- Pro: Signed URL support
- Con: Higher per-minute pricing for the expected volume
- Con: Less granular token control

### Option B: Bunny.net Stream *(chosen)*
- Pro: HLS transcoding + multi-quality output
- Pro: SHA256-signed URL tokens with expiry and IP binding
- Pro: TUS resumable upload (handles large files and network interruptions)
- Pro: Cost-effective bandwidth pricing
- Pro: Video GUID stored in DB; CDN URL is deterministic
- Con: CDN URL uses Referer-header token auth when signed URLs are not enforced
  — fallback works but is weaker than signed URLs

### Option C: Vimeo / YouTube
- Pro: No infrastructure to manage
- Con: Cannot restrict access to enrolled users
- Con: No TUS upload API; no programmatic access control

## Decision

**We chose Bunny.net** because it provides HLS streaming, SHA256-signed URL access control,
TUS resumable uploads, and cost-effective CDN — all via a clean API.

## Consequences

### Positive
- Videos are served via HLS with quality switching (`components/VideoPlayer.tsx` uses HLS.js)
- Signed URLs expire in 1 hour; the `video-signed-url` Edge Function generates them server-side
- Auto-refresh fires 5 minutes before expiry so long-running sessions stay valid
- TUS upload via `components/VideoUploader.tsx` → `admin-video-upload` Edge Function handles
  large files and network interruptions gracefully

### Negative / Trade-offs
- Bunny GUID (not a URL) is stored in the `modules.video_id` column; URL construction happens
  in `hooks/useVideoUrl.ts` — tightly coupled to Bunny's CDN hostname
  — Mitigation: CDN hostname is in `hooks/useVideoUrl.ts`; change one constant to migrate
- CDN Referer-based fallback is weaker than signed URLs
  — Mitigation: signed URL path is the primary path; fallback is a graceful degradation

### Risks
- If Bunny.net token auth is enforced without the Edge Function deploying first, all video
  playback breaks
  — Mitigation: deploy `video-signed-url` Edge Function before enabling token auth on Bunny

## Links

- `hooks/useVideoUrl.ts`
- `components/VideoPlayer.tsx`
- `components/VideoUploader.tsx`
- `supabase/functions/video-signed-url/index.ts`
- `supabase/functions/admin-video-upload/index.ts`
- [SECURITY_MODEL.md](../architecture/SECURITY_MODEL.md)
