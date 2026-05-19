# Goal: Phase 5 — Missing UI Surfaces

## Charter

**Original request:** Build the 5 missing UI surfaces identified by feature-inventory-check. All features have working CLI/lib counterparts but no UI. Also verify and complete the Framework Override UI on the Prompts tab.

**Interpreted outcome:** Every user-facing feature in the spec is reachable from the browser. The feature inventory gap list goes to zero.

**Input shape:** `existing_plan` — inventory check produced a specific, verified gap list with spec section references and known file locations for all backend/lib code.

**Constraints:**
- Follow the Nothing design system: Space Grotesk/Mono/Doto fonts, `sm-*` tokens, bracket notation `[ LABEL ]`, no gradients/shadows/green/purple
- Spec is authoritative for UI behavior — read the relevant sections before implementing each feature
- tsc clean and tests green after every Worker batch
- No new dependencies unless unavoidable
- Do not refactor existing working code — build alongside it

**Non-goals:**
- New backend/API work beyond what's needed to wire existing APIs to new UI
- Rate limiting, marketplace activation, or Supabase migration
- Any feature not in the gap list

**Authority:** `approved` (user explicitly requested)

**Proof type:** `demo` — all 6 inventory items reachable and functional in the running app at localhost:3000

**Likely misfire:** Building the skill detail additions across multiple Workers and creating merge conflicts on the same file. All skill detail tab additions must happen in a single Worker.

**Blind spot:** Framework Override UI (T261) may already be built — Scout must verify before queuing a fix Worker.

## Gap Inventory (from feature-inventory-check)

| ID | Feature | Spec § | Backend/lib status | UI status |
|----|---------|--------|-------------------|-----------|
| G1 | Starter Template Browser (UI) | 3.3 | 20 starters in `skills/_starters/`, CLI `--from-template` | ❌ No browser UI |
| G2 | Budget Analysis Tab on Skill Detail | 4.2 | `/api/budget-check` route, CLI `budget-check` | ❌ No tab |
| G3 | Version History Tab on Skill Detail | 4.5 | `lib/version-history.ts`, `/api/version-history` route | ❌ No tab |
| G4 | Skill Collections UI page | 5.2 | `deploy-pack` CLI, `collections/` dir format | ❌ No page |
| G5 | Testing Results on Skill Detail | 7.3 | `lib/skill-tester.ts`, CLI `test`, `tests/<slug>/` | ❌ No UI |
| G5b | Multilingual Locale display on Skill Detail | 7.6 | `lib/i18n.ts`, `--lang` CLI flag, `SKILL.<locale>.md` | ❌ No display |
| G6 | Framework Override UI on Prompts tab | 2.3 | `/api/regen-prompt`, `FrameworkPicker.tsx` | ⚠️ Verify |

## Spec References

- G1 Starter Template Browser: spec §3.3 — "Start from Template button → template browser → preview → Wizard at Step 3"
- G2 Budget Analysis Tab: spec §4.2 — "Budget Analysis tab, agent dropdown, installed-count slider, truncation preview at 10/20/30/50"
- G3 Version History Tab: spec §4.5 — "changelog timeline, semver, semantic diff per entry, revert link"
- G4 Collections page: spec §5.2 — "curated bundles, collection.json, skills with deployment order and notes"
- G5 Testing: spec §7.3 — "test results on skill detail page (pass/fail per test case)"
- G5b Locales: spec §7.6 — "available locales shown on skill detail page"
- G6 Framework Override: spec §2.3 — "framework badge → dropdown → full 40+ library with Advanced toggle → immediate regen"
