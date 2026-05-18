# SkillMall Use Cases

Six teams. Six problems. Six skills that made the work reproducible.

---

## Case Study 1: Engineering Team Standardizing Code Review

### The Team

An eight-person backend engineering team at a growth-stage SaaS company. Three senior engineers, two mid-level, three recent hires. The senior engineers had strong opinions about review quality. The junior engineers had no framework for what a good review looked like. Pull request quality was inconsistent enough that the team lead had started re-reviewing already-approved PRs before merging to main.

### Before State

Every engineer on the team wrote their own instructions to their AI coding assistant when doing code reviews — usually in the chat window, at the start of a review session, typed from memory. Senior engineers' instructions ran four or five paragraphs: correctness first, then tests, then design, then readability, never nitpick without a suggested fix, flag security concerns with a specific severity label. Junior engineers' instructions were two sentences if they wrote any at all.

The average senior engineer spent twelve minutes at the start of each review session writing or refining instructions before touching a single line of diff. Across three senior engineers doing an average of four reviews per week, that was roughly ninety minutes of instruction-writing per week — instructions that evaporated at the end of each session and had to be rewritten the next time. Junior engineers skipped this step and produced reviews that the senior engineers then had to annotate with corrections.

The team lead estimated that roughly thirty percent of approved PRs required a second look from a senior engineer before merge because the initial review missed something the team considered standard. Each second look averaged twenty-five minutes.

### The Skill They Created

The team's senior engineer used SkillMall's `code-review` starter skill as a base. The starter already covered the review loop structure from Google Engineering Practices — understand the change first, correctness before style, tests before implementation. The team's customization took forty minutes: they added their specific severity label system (BLOCKER, ISSUE, NITe), their security checklist for handling PII and authentication tokens, and three annotated examples showing a BLOCKER comment, an ISSUE comment, and a NITe comment with correct and incorrect phrasing side by side.

- **Skill name:** `engineering-code-review`
- **Category:** development
- **Source frameworks:** Google Engineering Practices, team-internal style guide
- **Tools configured:** Read, Bash (git diff, git log)
- **Template files:** `resources/templates/review-checklist.md`, `resources/samples/example-review.md`

The resulting SKILL.md was deployed to all eight engineers' Claude Code installations in under five minutes using the deploy command. The team pinned it to a versioned tag in their internal repository so everyone was running the same skill version.

### After State

Review sessions now start with a single invocation of the skill. No instruction-writing. The AI assistant applies the team's severity labels, runs through the review sequence in the defined order, and produces comments that match the team's expected format. Senior engineers spend two minutes reviewing the skill's output and adding domain context — not reconstructing the framework from scratch.

The twelve minutes of instruction-writing per session dropped to zero. The ninety minutes per week reclaimed across senior engineers translates to roughly six hours per month — the equivalent of a full working day redirected to actual engineering work.

The second-look rate on approved PRs dropped from thirty percent to nine percent over the following six weeks, measured by the team lead's tracking of post-approval re-reviews. Junior engineers' review quality became indistinguishable from mid-level output on structural and process criteria within their first month using the skill.

### Sample Skill Output

The following is representative of what the `engineering-code-review` skill produces when reviewing a pull request that adds a new payment processing endpoint:

---

**Review: Add /api/v1/payments/refund endpoint**

**Correctness — BLOCKER**
Line 47: The refund amount is read directly from `req.body.amount` without validating it against the original transaction amount stored in the database. A caller could pass any positive integer and the refund would process. Fetch the original transaction first, cap the refund amount at `transaction.amount`, and return a 422 with a descriptive error if `req.body.amount > transaction.amount`.

**Tests — ISSUE**
The test suite mocks `stripeClient.refund()` but does not test the case where Stripe returns a `charge_already_refunded` error. This is the most common real-world failure path. Add a test that mocks `stripeClient.refund()` throwing a `StripeInvalidRequestError` and asserts the endpoint returns 409 with a machine-readable error code.

**Design — NITe**
`processRefundAndNotify()` on line 89 is doing two things that have different failure modes — the refund and the notification email. If the refund succeeds but the email fails, the function throws and the caller sees an error even though the money moved. Separate these into `processRefund()` and `sendRefundNotification()` so callers can handle each failure independently.

---

## Case Study 2: Product Manager Doing Competitive Analysis

### The Individual

A product manager at a twelve-person B2B software company. Responsible for a project management tool targeting mid-market professional services firms. Her company had been watching a larger competitor add features at a pace that was making differentiation harder to articulate. The founder wanted a competitive analysis delivered to the board before a fundraising conversation. The PM had run competitive analyses before but had never applied a formal strategic framework — her previous work was a feature comparison matrix in a spreadsheet.

### Before State

The PM's previous competitive analyses took four to five hours: an hour of research across competitor websites, G2 reviews, and LinkedIn job postings to infer roadmap direction, then two hours building a feature comparison spreadsheet, then another two hours writing a narrative summary and recommendations. The output was thorough on features but weak on strategic positioning — it described what competitors were doing without explaining why certain moves were structurally attractive.

Her manager's feedback on the last competitive analysis: "This tells me what they have. It doesn't tell me where we should go." The board had asked the same question three months earlier.

She had tried asking her AI coding assistant to run a competitive analysis, but without a framework she just got back a more organized version of the same feature comparison she could have built herself. The output looked structured but had no analytical spine.

### The Skill She Created

The PM found SkillMall's `blue-ocean-strategy` starter skill. The starter already contained the Four Actions Framework (ERRC grid — Eliminate, Reduce, Raise, Create), the Strategy Canvas plotting methodology, and the three-tier non-customer analysis. Her customization took twenty minutes: she filled in the industry (B2B project management software for professional services), listed four competitors to plot on the strategy canvas, and added a constraint — the final output must include a recommended value curve for her company that is visibly different from all four competitor curves, not just higher on every dimension.

- **Skill name:** `ps-market-competitive-analysis`
- **Category:** business
- **Source frameworks:** Blue Ocean Strategy (Kim and Mauborgne), Porter's Five Forces
- **Tools configured:** WebFetch (competitor websites, G2 review pages), Read
- **Template files:** `resources/templates/errc-grid.md`, `resources/templates/strategy-canvas.md`

### After State

The PM ran the skill before a board prep session. The skill executed the full framework: it fetched competitor positioning pages, mapped each competitor's offering level across nine competing factors, built the ERRC grid, and drafted a recommended value curve for her company with justification for each cell. Total time from invocation to a draft she could edit: forty-five minutes of AI-assisted work versus her previous four-to-five-hour manual process.

More importantly, the output answered the question her manager and board had been asking. The framework forced an answer to "where should we go" rather than just "what do competitors have." The board presentation used the strategy canvas directly. The founder called it the clearest competitive framing the company had produced.

The PM now runs this skill quarterly, with consistent output format across each cycle. Comparing ERRC grids quarter-over-quarter has become a meeting agenda item.

### Sample Skill Output

The following excerpt is representative of the ERRC grid the skill produces for a B2B project management tool analysis:

---

**ERRC Grid — Professional Services Project Management**

**Eliminate**
- Per-seat licensing tiers that penalize team growth (industry-standard but zero differentiation value for buyers making an adoption decision)
- Gantt chart views (present in every tool, used by fewer than 20% of professional services teams according to G2 reviewer data, high maintenance cost)

**Reduce**
- Feature depth in resource allocation (competitors over-invest here; professional services PMs need basic allocation, not workforce management)
- Onboarding complexity (industry average time-to-first-project is 11 days; reduce to under 3)

**Raise**
- Client-facing reporting (competitors treat this as an export feature; professional services firms bill on visibility — make it a first-class product surface)
- Template library for service delivery archetypes (consulting, audit, implementation, retainer — none of the four competitors have done this)

**Create**
- Deliverable sign-off workflow (clients need to approve deliverables; currently done in email outside every tool on the market)
- Revenue recognition export for accounting integration (not a project management feature — a professional services operational feature that removes a manual step every firm does today)

---

## Case Study 3: Technical Writer Producing API Documentation Consistently

### The Individual

A technical writer at a developer tools company with a six-person engineering team and no other dedicated writing staff. She was responsible for all external documentation: guides, tutorials, and the API reference for a REST API with forty-three endpoints across nine resource groups. The engineering team shipped new endpoints on a two-week cycle. Documentation lagged by an average of three weeks after a new endpoint shipped.

### Before State

Each new endpoint documentation page took between sixty and ninety minutes to write from scratch. The writer started from a blank page, pulled the endpoint from the codebase or a Postman collection, and manually constructed the parameter table, the error code list, the request/response examples, and the curl command. The format drifted across pages written weeks or months apart — some pages had examples before the parameter table, some after, some had the authentication note at the top, some buried it in the request body section. The engineering team had stopped linking to the API docs in their changelogs because callers reported the docs were unreliable.

The writer estimated she spent forty-five minutes per endpoint on format decisions alone — figuring out the right order for sections, which error codes to include, how to phrase the curl example — work that had nothing to do with whether the documentation was technically correct.

### The Skill She Created

She deployed SkillMall's `api-documentation` starter and spent thirty minutes on customization: she specified her company's base URL, the authentication method (Bearer token in the Authorization header), the standard error shape that all endpoints return, and the specific sections every page must include in order. She added her company's rate limit headers and a note about version pinning. She included two completed example pages as samples — a simple GET endpoint and a complex POST with nested request body — so the skill had reference output to match.

- **Skill name:** `devtools-api-docs`
- **Category:** writing
- **Source frameworks:** Divio documentation system (reference quadrant), OpenAPI 3.0 spec
- **Tools configured:** Read (codebase, Postman collection exports), WebFetch
- **Template files:** `resources/templates/endpoint-page.md`, `resources/samples/get-endpoint-example.md`, `resources/samples/post-endpoint-example.md`

### After State

New endpoint documentation now takes fifteen minutes. The skill reads the endpoint definition from the codebase, populates the template, generates the curl example with realistic values, lists every error code with API-context descriptions rather than generic HTTP descriptions, and formats the authentication note in the defined location. The writer reviews for technical accuracy and adds any context the code alone cannot provide — about twenty minutes of human judgment on top of the skill's draft.

From ninety minutes per endpoint to thirty-five minutes total. Across the two-week cycle's average of three new endpoints, that is roughly three and a half hours reclaimed per release cycle. The documentation lag dropped from three weeks to four days. The engineering team resumed linking to the API docs in changelogs after the first month of consistent formatting.

### Sample Skill Output

The following is representative of what the skill produces for a new `GET /api/v1/skills/{skill_id}` endpoint:

---

**GET /api/v1/skills/{skill_id}**

Returns a single skill by ID.

**Authentication:** Required. Pass a Bearer token in the `Authorization` header.

**Path Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| skill_id | string | Yes | The unique identifier of the skill. Format: `skl_[alphanumeric]`. |

**Response — 200 OK**

```json
{
  "id": "skl_a1b2c3d4",
  "name": "code-review",
  "description": "Review pull requests using Google's Engineering Practices.",
  "category": "development",
  "version": "1.0.0",
  "created_at": "2026-03-15T09:00:00Z"
}
```

**Error Codes**

| Status | Code | Description |
|--------|------|-------------|
| 401 | `unauthorized` | Bearer token is missing or expired. Re-authenticate and retry. |
| 404 | `skill_not_found` | No skill exists with the provided ID. Check the ID against GET /api/v1/skills. |
| 429 | `rate_limit_exceeded` | You have exceeded 100 requests per minute. Retry after the value in `Retry-After`. |

**Curl Example**

```bash
curl -X GET "https://api.skill-mall.com/api/v1/skills/skl_a1b2c3d4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Case Study 4: DevOps Engineer Running Incident Postmortems

### The Individual

A senior DevOps engineer at a mid-size e-commerce company. On-call rotation member. The company had a stated commitment to blameless postmortems — it was in the engineering handbook. In practice, postmortems were written inconsistently, often took two to three days to finalize, and action items routinely had no owners or due dates. The VP of Engineering had flagged the postmortem process as a trust issue with the wider organization: product and customer success teams had stopped reading postmortems because the format changed every time and action items rarely closed.

### Before State

Writing a postmortem after a significant incident took the lead responder four to six hours across two or three sessions. The first session was pulling the timeline from Datadog, PagerDuty, and Slack. The second was drafting the narrative and the five-whys. The third was writing action items, which often turned into a twenty-minute debate with the team about what actually constituted a root cause versus a contributing factor. The inconsistency came partly from format drift and partly from the lead responder's emotional state immediately after an incident — a 2 AM on-call response followed by a postmortem draft produces different output than a Tuesday afternoon postmortem for a minor issue.

The DevOps engineer estimated he spent ninety minutes of each postmortem session on format decisions — deciding what sections to include, how to phrase the five-whys, how to scope action items — rather than on the analysis itself.

### The Skill He Created

He used SkillMall's `incident-postmortem` starter. Customization took one hour: he filled in the company's severity matrix (SEV1 through SEV4 with definitions), added the on-call rotation tool (PagerDuty), specified that action items must have an owner, a due date, and a Jira ticket number before the postmortem can be marked complete, and added a section for the "contributing conditions" separate from the root cause — a distinction his team had been arguing about for months that the skill now defined explicitly. He included a completed postmortem from a past incident as a sample.

- **Skill name:** `sre-incident-postmortem`
- **Category:** development
- **Source frameworks:** Google SRE Book (postmortem culture chapter), company severity matrix
- **Tools configured:** Read (log files, PagerDuty exports), Bash (git log for deployment timeline)
- **Template files:** `resources/templates/postmortem.md`, `resources/samples/completed-postmortem-example.md`

### After State

Postmortems now take ninety minutes from incident close to draft-complete, down from four to six hours. The skill consumes the timeline inputs — log excerpts, PagerDuty timeline, Slack thread export — and produces a structured draft with the five-whys completed, contributing conditions separated from root cause, and action items formatted with owner, due date, and Jira ticket placeholders. The engineer reviews, fills the Jira tickets, and publishes.

The format is now identical across every postmortem regardless of who writes it or when. Product and customer success teams resumed reading postmortems in the month after the skill deployed. Action item closure rate — tracked in a Jira dashboard — went from forty-one percent within the agreed deadline to seventy-eight percent, because items were now created with owner and due date at postmortem publication rather than three days later when someone remembered to follow up.

### Sample Skill Output

The following is a representative excerpt from the skill's postmortem draft for a payment service outage:

---

**Incident Postmortem — Payment Service Degradation**
**Severity:** SEV2
**Duration:** 47 minutes (14:22 UTC to 15:09 UTC)
**Author:** [on-call engineer]
**Status:** Draft — action items pending Jira tickets

**Impact**
Approximately 340 checkout transactions failed with a 503 error. Estimated revenue impact: $12,400. No data loss. No customer data exposure.

**Timeline (UTC)**
- 14:19 — Deployment of `payments-service v2.3.1` to production
- 14:22 — P95 checkout latency exceeds 8s; first 503s appear in logs
- 14:28 — PagerDuty alert fires; on-call engineer paged
- 14:31 — On-call engineer identifies deployment as likely cause; rollback initiated
- 14:44 — Rollback to `payments-service v2.3.0` complete
- 15:09 — Error rate returns to baseline; incident resolved

**Five Whys**
1. Users received 503 errors on checkout. Why?
2. The payment service connection pool was exhausted. Why?
3. A new database query in v2.3.1 executed a full table scan on the transactions table. Why?
4. The query lacked an index on `created_at` + `status`, which v2.3.1 used for the first time. Why?
5. Database query plan review was not part of the pre-deployment checklist. **Root cause.**

**Action Items**
| Item | Owner | Due Date | Jira |
|------|-------|----------|------|
| Add query plan review step to deployment checklist | [name] | 2026-06-01 | [TBD] |
| Add missing index on transactions(created_at, status) | [name] | 2026-05-25 | [TBD] |
| Add connection pool exhaustion alert at 70% capacity | [name] | 2026-06-08 | [TBD] |

---

## Case Study 5: Consultant Switching Context Between Three Client Projects

### The Individual

An independent software consultant working three simultaneous client engagements: a fintech startup building a payments API in Go and PostgreSQL, a healthcare company migrating a legacy Java monolith to a microservices architecture on AWS, and a retail e-commerce company running a Next.js storefront with a custom Shopify integration. Each client had different coding conventions, different infrastructure constraints, different security requirements, and different levels of tolerance for opinionated technical suggestions.

### Before State

Context switching between client engagements was the consultant's single largest source of lost time. Each new coding session required manually re-establishing the rules for that client: the fintech client's error handling conventions, the healthcare client's HIPAA data handling requirements and their preference for verbose logging over concise logging, the retail client's Shopify API version pinning and their specific ESLint configuration. The consultant kept a notes file for each client with these rules, but translating them into instructions for an AI coding assistant took ten to fifteen minutes per session — re-reading the notes, deciding which rules were relevant to the current task, and typing them into the session context.

Across three clients with an average of two coding sessions per client per week, this amounted to sixty to ninety minutes per week of pure context-restoration overhead. The consultant also made frequent cross-client errors — using the healthcare client's verbose logging pattern in the fintech client's codebase, or suggesting an AWS-native solution to the retail client who was on GCP. These were embarrassing, not catastrophic, but they created a perception of inattentiveness that the consultant worked hard to correct.

### The Skills She Created

The consultant created three separate skills — one per client — using SkillMall's `_template` as a base. Each skill required one hour to build the first time: documenting the client's tech stack, their conventions, their constraints, and their communication preferences. Each skill was stored locally and never committed to any shared repository.

**Client A — Fintech payments API:**
- **Skill name:** `client-fintech-payments`
- **Category:** development
- **Contents:** Go error wrapping conventions (`fmt.Errorf("context: %w", err)`), PostgreSQL transaction pattern, PCI DSS data field handling rules, list of approved third-party packages
- **Tools configured:** Read (codebase), Bash (go test, go vet)

**Client B — Healthcare microservices migration:**
- **Skill name:** `client-healthcare-migration`
- **Category:** infrastructure
- **Contents:** HIPAA data classification rules, Java package naming conventions, AWS service preferences (Fargate over EC2, RDS over Aurora for this client), logging verbosity standard, migration phase constraints (which services have been migrated, which are still monolith)
- **Tools configured:** Read, Bash (mvn test)

**Client C — Retail Next.js storefront:**
- **Skill name:** `client-retail-storefront`
- **Category:** development
- **Contents:** Shopify API version pin (2025-01), Next.js App Router conventions, ESLint configuration summary, GCP deployment targets, client's preference for Tailwind over CSS modules
- **Tools configured:** Read, Bash (npm run lint, npm run build)

### After State

Context switching now takes two minutes: open the new coding session, invoke the client-specific skill, confirm the skill has loaded the right context. No re-reading notes. No translating conventions into ad-hoc instructions. The AI assistant opens each session already knowing which client's rules apply.

The sixty to ninety minutes of weekly context-restoration overhead dropped to approximately ten minutes — six minutes per week of skill invocations and four minutes of confirming the loaded context looks right. Cross-client convention errors have not occurred since the skills deployed.

The consultant has started using the skill files as living documentation of each client engagement — when a new convention is established with a client, she updates the relevant skill file. The skills have become the authoritative record of each client relationship's technical ground rules, more current and more accessible than the notes file they replaced.

### Sample Skill Output

The following is representative of what the `client-fintech-payments` skill produces at the start of a session when the consultant asks for help adding a new reconciliation endpoint:

---

**Client context loaded: Fintech Payments API**

**Stack:** Go 1.22, PostgreSQL 16, deployed on GCP Cloud Run
**Current task scope:** Payments reconciliation endpoint

**Applying client conventions:**
- Error handling: wrap all errors with `fmt.Errorf("reconciliation: %w", err)` at each layer boundary; never use `errors.New` for errors that will propagate
- Database transactions: use `pgx/v5` transaction pattern with explicit `defer tx.Rollback(ctx)` before the commit call
- PCI DSS scope: the `amount`, `card_last_four`, and `transaction_id` fields are in-scope; never log these values even at DEBUG level
- Approved packages: `pgx/v5`, `chi`, `zap` — any new dependency requires explicit client approval before import

**What I will not do without flagging:**
- Suggest a package not on the approved list
- Log a PCI in-scope field
- Use `panic` or `log.Fatal` (client convention: return errors, always)

Ready. Describe the reconciliation endpoint.

---

## Case Study 6: Open-Source Maintainer Handling Contributor Questions

### The Individual

The sole maintainer of an open-source CLI tool with 2,400 GitHub stars and an active issues queue. The tool had 340 open issues and a CONTRIBUTING.md that had not been updated in eight months. New contributors opened issues asking the same twelve questions repeatedly: how to set up the development environment, how to run the test suite, what the PR title format should be, whether a feature was in scope, how to handle a failing integration test in CI, and six others. The maintainer answered these questions from memory, often with slightly different wording each time, which created downstream confusion when contributors searched past issues for guidance.

### Before State

The maintainer spent an average of thirty-five minutes per day responding to contributor questions — not because each question was hard, but because writing a clear, accurate, helpful response from scratch took five to eight minutes per question, and there were four to seven new questions on most days. The responses were inconsistent: a contributor who found a six-month-old answer to "how do I run integration tests" got different instructions than a contributor who asked the same question last week, because the test runner had changed and the maintainer had not updated the old answer.

The maintainer had tried writing a FAQ document twice. Both times, the FAQ was out of date within three months and took two hours to update when it got out of sync. The FAQ also did not help with novel questions — ones that were not on the list but were variations of questions that were.

### The Skill He Created

The maintainer built a custom skill for contributor onboarding and question-answering. The skill did not use any starter as a base — it was written from scratch to fit a use case none of the starters directly covered. It took ninety minutes to write, primarily because it required writing out the development environment setup, the test runner commands, the PR title convention, and the feature scope criteria in enough detail to produce consistent answers without the maintainer reviewing every response.

- **Skill name:** `cli-tool-contributor-support`
- **Category:** productivity
- **Source material:** CONTRIBUTING.md, README.md, GitHub issue history (top 50 issues by comment count)
- **Tools configured:** Read (CONTRIBUTING.md, test files, CI configuration), WebFetch (GitHub issues API)
- **Template files:** `resources/templates/contributor-response.md` (standard response format with setup steps, links, and next-action)
- **Special configuration:** the skill includes a "scope check" section — a decision tree the AI uses to determine whether a proposed feature is in scope before the maintainer reviews it

### After State

The maintainer now invokes the skill when responding to contributor questions rather than writing responses from scratch. The skill produces a complete, accurate response — environment setup steps current as of last week's README update, the correct test command, the PR title format — in under a minute. The maintainer reviews for accuracy and posts. Response time from question to answer dropped from four to eight minutes per question to ninety seconds.

Total daily contributor response time dropped from thirty-five minutes to eight minutes. The maintainer reclaimed over two hours per week that had been going to repetitive response writing.

The scope check section has been the unexpected winner: the maintainer invokes it before responding to feature requests to give contributors a clear, consistent answer about whether their idea fits the project's direction. The answer is still the maintainer's judgment — the skill does not make the decision — but it ensures the framing is consistent and the criteria are applied each time rather than varying based on the maintainer's energy level that day.

### Sample Skill Output

The following is representative of what the skill produces when a new contributor opens an issue asking how to set up the development environment:

---

**Contributor response draft — Development environment setup**

Thanks for contributing. Here is the setup sequence that gets you to a passing test run:

**Prerequisites**
- Go 1.22 or later (`go version` to check)
- Make (`make --version` to check; on macOS install via `brew install make`)
- Docker (integration tests only — you can skip Docker for unit tests)

**Setup**
```bash
git clone https://github.com/[org]/cli-tool
cd cli-tool
make deps          # installs Go module dependencies
make build         # compiles the binary to ./bin/cli-tool
make test-unit     # runs unit tests, no Docker required (~30 seconds)
```

**If you want to run integration tests**
```bash
make test-integration   # requires Docker; pulls a test container on first run
```

Integration tests run on every PR in CI. If you are iterating on a feature, `make test-unit` is faster for local development.

**Common setup issues**
- `make: command not found` — install Make via your package manager
- `go: module lookup disabled by GONOSUMCHECK` — run `go env -w GONOSUMCHECK=""` to reset
- Integration tests failing locally but passing in CI — check that Docker is running and has at least 2GB of available memory

If you hit something not on this list, drop a comment here and I will update the list.

---

*Word counts: press-kit.md ~1,800 words, use-cases.md ~3,900 words*
