# `METHOD /path/to/endpoint`

**Description:** [One sentence: what this endpoint does. Present tense.]

**Authentication required:** Yes / No / Optional

---

## Request

### Path parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `param` | string | Yes | [Description] |

### Query parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 20 | Maximum number of results |
| `offset` | integer | No | 0 | Pagination offset |

### Request body

```json
{
  "field_name": "string",
  "required_number": 42,
  "optional_flag": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field_name` | string | Yes | [What this field is] |
| `required_number` | integer | Yes | [Valid range or constraints] |
| `optional_flag` | boolean | No | [Default and behavior] |

---

## Response

### 200 OK

```json
{
  "id": "sk_abc123",
  "name": "example-skill",
  "created_at": "2026-05-18T08:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | [Description] |
| `created_at` | string (ISO 8601) | Creation timestamp |

### Error responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `validation_error` | [Specific validation error for this endpoint] |
| 401 | `unauthorized` | Missing or invalid authentication token |
| 404 | `not_found` | [Resource] with the given ID does not exist |
| 429 | `rate_limited` | Exceeded [X] requests per minute |

---

## Example

```bash
curl -X METHOD https://api.example.com/v1/path/to/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field_name": "example-value",
    "required_number": 42
  }'
```

**Response:**

```json
{
  "id": "sk_abc123",
  "name": "example-value",
  "created_at": "2026-05-18T08:00:00Z"
}
```
