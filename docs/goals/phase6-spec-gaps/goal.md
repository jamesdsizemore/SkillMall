# Goal: Phase 6 — Spec Gap Closure

## Charter

**Original request:** Close all remaining gaps found by the second feature-inventory-check run.

**Interpreted outcome:** Every feature in the spec is implemented at the fidelity the spec describes. The inventory gap list goes to zero.

**Input shape:** `existing_plan` — gaps are specific with file references and spec section citations.

**Constraints:**
- Nothing design system: `sm-*` tokens, Space Grotesk/Mono/Doto, bracket notation, no gradients/green/purple
- tsc clean and tests green after every Worker batch
- No new dependencies unless unavoidable (react-tooltip or similar is acceptable for N5)
- Spec is the implementation source of truth — read the relevant spec section before implementing each gap

**Non-goals:**
- Supabase migration (backend stays SQLite)
- Rate limiting implementation
- Any feature not in the gap list

**Authority:** `approved`

**Proof type:** `demo` — all 8 gaps (N1–N8) are reachable and functional in the running app.

**Likely misfire:** Implementing N3 (budget analyzer agent-specific behavior) at surface level without reading `lib/budget-analyzer.ts` first and understanding the character-to-agent mapping needed.

## Gap Inventory

| ID | Feature | Spec § | Priority | Files |
|----|---------|--------|----------|-------|
| N1 | Wizard Step 4 — Inline field editing + char counter | 3.1 | Blocking | `components/skill-mall/wizard/Step4Preview.tsx` |
| N2 | Wizard Step 6 — Expand file to preview content | 3.1 | Blocking | `components/skill-mall/wizard/Step6Confirm.tsx` |
| N3 | Budget Analyzer — Agent dropdown + skill-count thresholds (10/20/30/50) | 4.2 | Blocking | `lib/budget-analyzer.ts`, `components/skill-mall/skill-detail/SkillTabs.tsx` |
| N4 | Dependency Graph — Category filter controls | 4.3 | Required | `components/skill-mall/graph/DependencyGraph.tsx`, `app/graph/page.tsx` |
| N5 | Dependency Graph — Hover tooltip with skill description | 4.3 | Required | `components/skill-mall/graph/GraphNode.tsx`, `components/skill-mall/graph/DependencyGraph.tsx` |
| N6 | Dependency Graph — Cluster detection and surfacing | 4.3 | Required | `lib/graph.ts`, `components/skill-mall/graph/DependencyGraph.tsx` |
| N7 | Skill detail — "Most Forked" indicator at threshold | 5.3 | Polish | `app/skills/[category]/[slug]/page.tsx` |
| N8 | Framework Override — Artifact-type-specific defaults | 2.3 | Polish | `components/skill-mall/skill-detail/FrameworkPicker.tsx` |

## Spec References

- N1: §3.1 Step 4 — "user may edit any field inline — preview re-renders in real time. Editing description shows live character count against 1024-char limit."
- N2: §3.1 Step 6 — "user may expand any file to preview its content."
- N3: §4.2 — "user selects target agent from dropdown; sets installed skill count with slider; previews at 10/20/30/50 installed skills; agent-specific budget behavior."
- N4: §4.3 — "filter controls allow isolating nodes by category."
- N5: §4.3 — "hover a node to show a tooltip with the skill description."
- N6: §4.3 — "clusters — groups of 5+ tightly connected skills with few external edges. Surfaced automatically as candidates for Skill Collection."
- N7: §5.3 — "'Most Forked' indicator when fork count exceeds a threshold."
- N8: §2.3 — "default view shows frameworks appropriate for that artifact type."

## Implementation Notes

### N3 Budget Analyzer
The spec describes agent-specific character budgets at 10/20/30/50 installed skill counts. Implementation: define a per-agent budget table (chars available at each skill count level), replace the raw chars slider with: agent dropdown + skill-count slider, run analysis at all four thresholds and show a multi-row output table. The existing `analyzeDescription()` function in `lib/budget-analyzer.ts` can be called four times with the computed char budgets.

### N6 Cluster Detection
A cluster is a group of 5+ skills where every node in the group has more connections to other nodes in the group than to nodes outside it. Implementation: after computing the graph, run a simple connected-components scan for groups of 5+ with high internal connectivity. Surface them as a legend entry and distinct node styling (e.g., subtle background fill grouping).
