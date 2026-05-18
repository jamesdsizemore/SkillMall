# Goal: UI & Auth Fixes

## Charter

**Original request:** Three user-reported issues: (1) nothing happens after GitHub login, (2) skill cards go to 404, (3) need a settings page gated behind auth.

**Interpreted outcome:** Login works end-to-end with clear feedback, skill cards navigate correctly, settings page exists and is auth-gated with provider config, theming, and user preferences.

**Input shape:** `specific` — bugs are diagnosed, files identified.

**Constraints:**
- Follow existing Nothing design system tokens (sm-bg, sm-surface, sm-border, sm-display etc.)
- Space Grotesk + Space Mono fonts, monospaced bracket label pattern `[ LABEL ]`
- Keep all existing functionality working (tsc clean, tests green)
- No new dependencies unless unavoidable

**Non-goals:**
- Full marketplace UI
- Rate limiting implementation
- New authentication providers beyond GitHub

**Authority:** `approved`

**Proof type:** `demo` — dev server running, can click login → land on dashboard, click skill cards without 404, navigate to settings and change theme.

## Root Cause Diagnoses

### Bug 1: Auth — "nothing happens after login"
- OAuth flow works (session exists in DB). Bug is UX: callback redirects to `/` where nothing visibly changes (tiny username swap in nav).
- **Fix:** Redirect to `/dashboard` after successful OAuth callback.
- **File:** `app/api/auth/callback/github/route.ts:30`

### Bug 2: Skill cards → 404
- `skill.category` in `parseSkill` prefers frontmatter `metadata.category` over directory name.
- `getSkill(category, slug)` looks up `skills/{category}/{slug}/SKILL.md` on disk.
- If frontmatter category ≠ directory name → path mismatch → `notFound()`.
- **Fix:** Use `dirCategory` (filesystem truth) as the authoritative URL segment.
  Also ensure `dynamicParams = true` is explicit on the skill page.
- **File:** `lib/skills.ts:91`, `app/skills/[category]/[slug]/page.tsx`

### Bug 3: Missing search_clicks table
- Migration 005 SQL exists but no runner was ever implemented.
- `logSearchClickEvent` silently fails (try/catch) but analytics are broken.
- **Fix:** Apply migration 005 at DB init time in `getDb()`.
- **File:** `lib/db/client.ts`

### Feature: Settings page (auth-gated)
- Only `/settings/providers` exists; no hub, no auth gate.
- **Build:**
  - `/settings` hub page with sidebar nav linking to sections
  - `/settings/appearance` — dark/light/system theme toggle (CSS tokens already defined)
  - `/settings/providers` — existing page, cleaned up + auth-gated
  - Nav: add Settings link when logged in
  - All settings routes redirect to login if no session

## Fix Inventory

| ID | Severity | File(s) | Description |
|----|----------|---------|-------------|
| F1 | Blocking | `app/api/auth/callback/github/route.ts` | Redirect to /dashboard after login |
| F2 | Blocking | `lib/skills.ts` | Use dirCategory as canonical URL category |
| F3 | Required | `app/skills/[category]/[slug]/page.tsx` | Add `export const dynamicParams = true` |
| F4 | Required | `lib/db/client.ts`, `db/migrations/` | Run pending migrations at DB init |
| F5 | Feature | `app/settings/page.tsx` (new) | Settings hub with sidebar nav |
| F6 | Feature | `app/settings/appearance/page.tsx` (new) | Theme toggle (dark/light/system) |
| F7 | Feature | `app/settings/providers/page.tsx` | Auth-gate existing providers page |
| F8 | Feature | `app/layout.tsx` | Add Settings nav link (auth-gated) |
| F9 | Feature | `components/skill-mall/theme-provider.tsx` (new) | Client-side theme persistence via localStorage |
