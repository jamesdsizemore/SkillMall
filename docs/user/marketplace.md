# Skill Marketplace

The **SkillMall Marketplace** lets skill authors monetize premium skills through Stripe payments. The marketplace has three tiers, a 70/20/10 revenue split, and enforced launch conditions — the marketplace UI is hidden until all conditions are met.

## Skill tiers

| Tier | Description | Price |
|------|-------------|-------|
| `free` | Standard open-source skills | $0 |
| `sponsored` | Skills with corporate sponsorship — free to use | $0 |
| `premium` | Paid skills with one-time purchase | Set by author |

Most skills in the catalog are `free`. Tier assignments are stored in the `skill_tiers` table. A skill with no tier entry defaults to `free`.

## Revenue split

When a premium skill is purchased, revenue is split:

- **70%** to the skill author
- **20%** to SkillMall (platform fee)
- **10%** to the open-source fund (donated to tools SkillMall depends on)

## Launch conditions

The marketplace UI and checkout are **code-gated** — they appear only when all four launch conditions are met simultaneously. The gate is enforced at runtime by `checkMarketplaceReady()`, which runs on every marketplace-related request.

| Condition | Threshold | Current |
|-----------|-----------|---------|
| Catalog size | ≥ 200 skills | Check /api/marketplace/status |
| Community members | ≥ 500 unique reviewers | Check /api/marketplace/status |
| Ratings active | ≥ 3 months | Check /api/marketplace/status |
| Skills with tests | ≥ 50 skills | Check /api/marketplace/status |

Check the current status:

```
GET /api/marketplace/status
```

Response when not ready:
```json
{
  "ready": false,
  "conditions": {
    "catalogSize": 48,
    "catalogRequired": 200,
    "communitySize": 3,
    "communityRequired": 500,
    "ratingsMonthsActive": 0,
    "ratingsMonthsRequired": 3,
    "skillsWithTests": 24,
    "skillsWithTestsRequired": 50
  }
}
```

When `ready` is `false`, the marketplace UI does not render anywhere in the application — no checkout buttons, no premium skill teasers (beyond a "coming soon" message), and no Stripe API calls.

## Stripe integration

Payments use Stripe in test mode. Stripe live mode is blocked until marketplace launch conditions are met.

### Configuration

Add these to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Get test keys from: dashboard.stripe.com/test/apikeys

### Checkout flow

1. User clicks purchase on a premium skill
2. `POST /api/marketplace/checkout` creates a Stripe Checkout Session
3. User is redirected to Stripe's hosted checkout page
4. On successful payment, Stripe sends a webhook to `POST /api/webhooks/stripe`
5. The webhook verifies the `Stripe-Signature` header (400 on failure — payload is never processed without a valid signature)
6. On `checkout.session.completed`, the purchase is stored in SQLite (idempotent — duplicate sessions are silently ignored)

### Testing the webhook locally

Use the Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

The `--forward-to` URL must match your local server. The Stripe CLI prints a webhook signing secret — use this as `STRIPE_WEBHOOK_SECRET` in `.env.local` when testing locally.

## Entitlement checking

To check whether a user has access to a premium skill:

```
GET /api/marketplace/entitlement?skillSlug=my-premium-skill
```

Response:
```json
{
  "entitlement": "purchased",
  "skillSlug": "my-premium-skill"
}
```

Possible values: `free` (all users), `purchased` (has bought it), `none` (premium but not purchased).

## For skill authors

To mark your skill as premium, update its tier in the database:

```javascript
import { setSkillTier } from '@/lib/marketplace/gate'
setSkillTier('my-skill', 'premium', 999) // $9.99
```

The UI will show the tier badge on the skill detail page and a premium teaser to unpurchased users.
