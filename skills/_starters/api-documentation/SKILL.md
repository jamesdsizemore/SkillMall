---
name: api-documentation
description: "Document REST APIs: every endpoint, request/response shapes, error codes, auth flow, and curl examples."
license: MIT
metadata:
  version: "1.0.0"
  author: "[FILL-IN: github-username]"
  category: writing
  tags: "api, rest, documentation, openapi, technical-writing"
---

# API Documentation

Document REST APIs with the completeness that callers need to integrate without guessing. Every endpoint, every parameter, every error code, with real working examples.

## When to use

- Writing initial documentation for a new API
- Adding missing documentation for an undocumented endpoint
- Writing the API overview page (auth, base URL, rate limits, versioning)
- Reviewing API docs for completeness before publication

## Base URL and authentication

Your API base URL: [FILL-IN: api-base-url]

Authentication method: [FILL-IN: auth-method]

Include a complete authentication example with a working curl command. Callers should be able to authenticate without reading anything else.

## Every endpoint needs

1. **Method and path** — `POST /api/v1/skills`
2. **Short description** — what this endpoint does (one sentence, present tense)
3. **Authentication** — required, optional, or not required
4. **Request body** — field name, type, required/optional, description, example value
5. **Query parameters** — same structure as request body fields
6. **Response** — for every status code: shape, example
7. **Error codes** — what each 4xx means in your API's context, not just HTTP's
8. **Curl example** — works copy-paste, uses realistic (not `"string"`) values

## Error documentation

Document errors in the context of your API. `400 Bad Request` is not useful. `400: description field exceeds 150 characters` is useful.

Standard error shape: document this once at the top level and reference it in each endpoint.

## Rate limits

Document: requests per time window, which endpoints have separate limits, headers that return remaining quota (`X-RateLimit-Remaining`), retry behavior.

## Versioning

Document how breaking changes are introduced, how to pin a version, and how long old versions are supported.

## OpenAPI spec

Generate or maintain an OpenAPI 3.0 spec alongside the prose docs. The spec is the machine-readable version — the prose docs add context the spec cannot.
