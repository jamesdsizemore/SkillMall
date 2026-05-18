---
name: technical-documentation
description: "Write technical docs using the Divio system: tutorials (learning), how-tos (tasks), reference (lookup), explanation (why)."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: writing
  tags: "documentation, technical-writing, divio, tutorials, how-to"
---

# Technical Documentation (Divio System)

Write documentation using the Divio four-quadrant model. Each documentation type serves a different reader need — mixing types produces docs that serve none well.

## The four types

**Tutorials (learning-oriented):** Teaching a beginner to use the product for the first time. The goal is a successful outcome on their first attempt. No decision-making required from the reader — every step is prescribed.

**How-to guides (task-oriented):** Helping a competent user accomplish a specific goal. Assumes familiarity with the product. "How to set up authentication with GitHub OAuth" — not "learn about authentication."

**Reference (information-oriented):** Structured factual information for lookup. API endpoints, configuration keys, CLI flags, error codes. Comprehensive and consistent — all of the same thing in the same format.

**Explanation (understanding-oriented):** Context, background, and reasoning. "Why does the skill description have a 150-character limit?" Explores alternatives, explains trade-offs, gives history.

## Which type to write

- New user, first time: tutorial
- Competent user, specific goal: how-to
- Looking up a parameter: reference
- Understanding the design: explanation

## Product being documented

[FILL-IN: product-name]

## Primary audience

[FILL-IN: primary-audience]

## Tutorial principles

- Reader does real work, not toy exercises
- Every step produces an observable output
- Never ask the reader to make a decision
- Start with the simplest possible case
- Acknowledge when you are simplifying ("we will skip error handling here")

## How-to guide principles

- Title starts with "How to..."
- Assumes the reader knows the product
- Skips the why (reader came here to accomplish something)
- Each step is a complete action with a command or code sample
- Ends with "What you have done" and a list of related guides

## Reference principles

- Same structure for every item in a category
- No tutorials or explanations mixed in
- Comprehensive: describes every parameter, not just the common ones
- Auto-generated from source where possible (OpenAPI, docstrings)
