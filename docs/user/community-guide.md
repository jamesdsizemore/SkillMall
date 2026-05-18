# Community Guide

SkillMall Phase 2 adds community features: ratings, reviews, trending analytics, and contributor dashboards. This guide explains how they work and how to participate.

## Ratings and Reviews

### Submitting a Review

To submit a review, you must:

1. **Authenticate with GitHub** — click "Sign in with GitHub" in the header. Only `read:user` scope is requested — SkillMall cannot read your repositories, emails, or private data.

2. **Have an install signal** — the skill you're reviewing must have at least one recorded install event. This helps ensure reviews come from people who have actually used the skill.

3. **Write a specific review** — the body must be 1–150 characters. Generic phrases like "great skill" or "very useful" are accepted but displayed below more specific reviews.

### Rating Scale

| Stars | Meaning |
|---|---|
| 5 | Excellent — used in production, works exactly as described |
| 4 | Good — works well, minor gaps |
| 3 | Adequate — functional but needs improvement |
| 2 | Disappointing — significant gaps or inaccuracies |
| 1 | Poor — did not work as described |

### One Review Per Skill

Each GitHub account can submit one review per skill. You cannot edit a submitted review in Phase 2 — if you need to update your rating after additional use, contact the skill author.

---

## Effectiveness Score

The effectiveness score is the quality-weighted average of all ratings for a skill. It is computed as:

```
score = Σ(rating × weight) / Σ(weight)

Where:
- weight = 2.0 for specific reviews (is_generic = 0)
- weight = 1.0 for generic reviews (is_generic = 1)
```

This means a skill with two 5-star specific reviews and one 1-star generic review scores:
```
(5×2 + 5×2 + 1×1) / (2+2+1) = 21/5 = 4.2
```

The effectiveness score is always displayed **separately** from the install count. These are two different signals:
- **Effectiveness score** — how well the skill works (from reviews)
- **Install count** — how popular the skill is (from deployment events)

A skill can be widely deployed without being highly rated. These metrics are never combined.

---

## Generic Reviews

Reviews matching these phrases are classified as generic and deprioritized in the display feed (shown below the fold, never at the top):

- "great skill", "very useful", "good skill", "nice", "awesome", "love it", "excellent"

Generic reviews are accepted — they contribute to the effectiveness score (at half weight) and the review count. They are never deleted. Only the display ordering is affected.

To write a review that appears at the top of the feed, reference a specific use case, outcome, or experience: "Used this to analyze our SaaS pricing strategy in 45 minutes. The Strategy Canvas output was immediately useful in a board presentation."

---

## Trending Analytics

### What "Trending" Means

A skill is trending when it has a high number of install events in the past 7 days. Install events are logged when any user deploys a skill via the CLI (`npx skill-mall deploy`) or the web UI deploy button.

No user identity is associated with install events — only the skill slug and agent type are recorded.

### Rising Skills

Rising skills have at least 50% more installs in the past 7 days compared to the prior 7 days. This identifies skills gaining momentum.

### Trending Page

Navigate to `/trending` to see:
- **Top 10** — highest 7-day install velocity
- **Rising** — skills with >50% velocity acceleration

---

## Contributor Dashboard

Navigate to `/dashboard` (requires sign-in) to see analytics for skills where your GitHub username matches the `author` field in SKILL.md.

The dashboard shows:
- Total install count per skill (all time)
- Install breakdown by agent type (claude-code, cursor, codex, etc.)

No personally identifiable user data is ever shown — all analytics are aggregate counts.

To appear in your dashboard, add your GitHub username to your skills' SKILL.md frontmatter:

```yaml
metadata:
  author: your-github-username
```

---

## Privacy

SkillMall Phase 2 is designed with aggregate-only analytics:

- **Reviews:** your GitHub username and review body are stored. Rating and username appear publicly on the skill detail page.
- **Install events:** zero user identity. Only the skill slug and agent type are recorded.
- **Sessions:** your GitHub user ID and username are stored in the sessions table and expire after 7 days. No OAuth tokens are stored after the authentication flow completes.

SkillMall does not track pages you visit, search queries you run, or any behavior beyond explicit user actions (deploying skills, submitting reviews, signing in).
