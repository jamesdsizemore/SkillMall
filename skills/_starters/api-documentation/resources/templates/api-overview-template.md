# API Reference

## Base URL

```
https://api.yourproduct.com/v1
```

All requests must use HTTPS. HTTP requests are rejected with `301 Moved Permanently`.

---

## Authentication

[Description of auth method. Be specific.]

### Getting a token

```bash
curl -X POST https://api.yourproduct.com/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"email": "you@example.com", "password": "your-password"}'
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2026-06-18T08:00:00Z"
}
```

### Using the token

```bash
curl https://api.yourproduct.com/v1/skills \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Rate limits

| Endpoint group | Limit | Window |
|----------------|-------|--------|
| All endpoints | 100 requests | 1 minute |
| POST /auth | 10 requests | 1 minute |

Rate limit headers on every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1716019200
```

When rate limited: `429 Too Many Requests`. Retry after `Retry-After` header seconds.

---

## Errors

All errors follow this format:

```json
{
  "error": "validation_error",
  "message": "Human-readable description of what went wrong",
  "details": {
    "field": "description field exceeds 150 characters (was 203)"
  }
}
```

---

## Versioning

The API version is in the URL path: `/v1/`, `/v2/`.

Breaking changes introduce a new version. Old versions are supported for [X months] after a new version is published. The current stable version is `v1`.

---

## Pagination

List endpoints return paginated results:

```json
{
  "data": [...],
  "total": 142,
  "offset": 0,
  "limit": 20
}
```

Use `?offset=20&limit=20` for the second page.
