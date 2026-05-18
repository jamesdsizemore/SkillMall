# Deployment

This guide covers everything required to deploy SkillMall to production: Vercel, Railway, and VPS. It includes step-by-step instructions, a complete environment variable reference, SQLite production configuration, GitHub OAuth setup, and CLI usage in production environments.

---

## CRITICAL: Vercel Has a Read-Only Filesystem

**Read this before choosing a deployment target.** This is the most common source of confusion when deploying SkillMall.

Vercel runs your Next.js API routes as serverless functions. Serverless function environments have a **read-only filesystem** — your code is deployed as a snapshot that cannot write new files to disk during runtime. This is a fundamental property of the Vercel platform, not a SkillMall limitation.

**Features that WORK on Vercel** (read-only operations only):

- Catalog browsing, search, and filtering
- Skill detail pages
- User reviews and ratings (stored in SQLite, which must be pre-seeded and deployed as a static file — see below)
- MCP tool listing
- GitHub OAuth sign-in (session data is stored in SQLite)

**Features that DO NOT WORK on Vercel** (require a writable filesystem):

- Skill creation (`POST /api/create-skill`, `npx skill-mall create`)
- Skill forking (`POST /api/skills/[slug]/fork`)
- Prompt regeneration (`POST /api/skills/[slug]/regen-prompt`)
- Chain building (writes chain configuration files to disk)
- The research pipeline, which stages files in `skill-builder-output/` before finalizing them into `skills/`
- RAG knowledge attachment (`POST /api/retrieve`, writes embedding blobs to `data/skillmall.db`)
- Any feature that calls `fs.writeFile`, `fs.mkdirSync`, or `better-sqlite3` in write mode

**If you need skill creation, forking, chain building, or RAG, deploy to Railway or a VPS.** Only catalog browsing, search, and reviews work on Vercel.

This limitation cannot be worked around by adding environment variables or configuration. It is structural to the serverless model. Teams that want the full feature set on Vercel would need to externalize all write operations to a separate API server — which is a significant architectural change not currently implemented.

---

## Vercel Deployment

Use Vercel when you need the catalog as a fast, globally distributed read-only reference. This is appropriate for public documentation sites, team skill directories where skills are authored locally and committed to git, and demos.

### Step 1: Prepare your repository

Vercel deploys directly from GitHub. The `skills/` directory must be committed — it is the catalog.

```bash
# Confirm skills are committed
git status skills/
# Should show clean or only untracked/modified files you intend to commit

# Confirm AGENTS.md is current
bash scripts/sync-agents.sh
git add AGENTS.md
git commit -m "chore: sync AGENTS.md before deploy"
git push
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI if you don't have it
npm install -g vercel

# From the project root
vercel
```

Follow the interactive prompts:
- Link to your GitHub repository when asked
- Accept the auto-detected Next.js framework settings
- Do not override the build command (`next build`) or output directory

Alternatively, connect the repository from the Vercel dashboard at [vercel.com/new](https://vercel.com/new) and import the GitHub repo directly.

### Step 3: Configure environment variables

In the Vercel dashboard, go to your project → Settings → Environment Variables. Add the following.

**Required for catalog to function at all:**

```
NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
```

Replace `your-project.vercel.app` with your actual Vercel domain or custom domain.

**Required for GitHub OAuth (reviews, sign-in):**

```
GITHUB_CLIENT_ID     = (from GitHub OAuth App settings)
GITHUB_CLIENT_SECRET = (from GitHub OAuth App settings)
NEXTAUTH_SECRET      = (generate with: openssl rand -hex 32)
```

See the [GitHub OAuth in Production](#github-oauth-in-production) section below for how to create the OAuth App with the correct callback URL.

**LLM provider (skill creation will fail on Vercel, but set these if you have other uses):**

```
SKILL_MALL_PROVIDER  = openai
SKILL_MALL_API_KEY   = sk-...
SKILL_MALL_MODEL     = gpt-4o
```

**Do not set Stripe keys on Vercel** unless you have implemented a separate API server for checkout. The Stripe webhook handler requires a writable SQLite database — the webhook will fail on Vercel's read-only filesystem.

### Step 4: SQLite on Vercel

SQLite on Vercel requires pre-building the database and committing it. This is a significant constraint:

- `data/skillmall.db` is gitignored by default. You must explicitly unignore it for Vercel deployments.
- The database is read-only after deployment. User reviews, sessions, and install counts written during the Vercel deployment lifetime are lost on the next deploy (the database is reset from the committed snapshot).
- This is acceptable for static-catalog use cases where all data is in committed files.

To commit the database for Vercel:

```bash
# Run migrations locally to create and populate the database
npm run db:migrate

# Remove the gitignore exception
echo '!data/skillmall.db' >> .gitignore

# Add and commit
git add data/skillmall.db
git commit -m "chore: include pre-built SQLite database for Vercel deployment"
git push
```

For Vercel deployments that need persistent sessions and reviews, the correct solution is migrating to Turso — see [SQLite in Production](#sqlite-in-production).

### Step 5: Verify the deployment

After Vercel builds and deploys:

1. Open your Vercel URL
2. Confirm the catalog loads and skills are visible
3. Try searching — the catalog search is static and should work
4. If you configured GitHub OAuth, try signing in — the callback should redirect correctly
5. Do not attempt to create a skill from the UI — it will fail with a filesystem error

### Vercel build command customization

If your database migrations need to run during the Vercel build (for pre-seeding the SQLite snapshot), add a build command override in `package.json`:

```json
{
  "scripts": {
    "vercel-build": "npm run db:migrate && next build"
  }
}
```

Then set the Vercel build command to `npm run vercel-build` in the dashboard under Settings → Build & Development Settings.

---

## Railway Deployment

Railway provides persistent disk storage, long-running Node.js processes, and a writable filesystem. This is the recommended deployment target when you need the full SkillMall feature set: skill creation, forking, chain building, RAG, and Stripe marketplace.

### What is different from Vercel

- The application runs as a persistent Node.js process (`npm start`), not serverless functions
- The filesystem is writable — `data/skillmall.db` persists between requests and deployments (with a mounted volume)
- `skills/` can be written to at runtime — skill creation and forking work
- SQLite WAL mode works correctly in a persistent process
- You must configure a Railway volume to persist `data/` between deployments
- Cold starts do not apply — the process is always running

### Step 1: Create a Railway project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Log in
railway login

# Initialize from your project root
railway init
```

Select "Empty project" and give it a name. Railway will detect Next.js automatically.

### Step 2: Configure the start command

Railway needs to know how to start your application. In the Railway dashboard, under your service → Settings → Deploy, set:

- **Build command**: `npm run db:migrate && npm run build`
- **Start command**: `npm start`
- **Watch paths**: `/` (default)

The build command runs migrations before building, ensuring the database schema is current before the server starts.

### Step 3: Add a persistent volume for the database

The database at `data/skillmall.db` must survive deployments. Without a volume, the database resets on every deploy.

In the Railway dashboard:
1. Go to your service → Volumes
2. Click "Add Volume"
3. Set Mount Path to `/app/data`
4. Set size to at least 1 GB (SQLite with embeddings can grow)

Railway will mount this volume at `/app/data` inside the container. Your `data/skillmall.db` path resolves correctly because `scripts/migrate.js` uses `path.join(process.cwd(), 'data', 'skillmall.db')`.

### Step 4: Configure environment variables

In the Railway dashboard, go to your service → Variables. Add all of the following:

```
NODE_ENV                       = production
NEXT_PUBLIC_APP_URL            = https://your-app.up.railway.app
SKILL_MALL_PROVIDER            = openai
SKILL_MALL_API_KEY             = sk-...
SKILL_MALL_MODEL               = gpt-4o
SKILL_MALL_EMBEDDING_PROVIDER  = openai
OPENAI_API_KEY                 = sk-...
GITHUB_CLIENT_ID               = (from GitHub OAuth App)
GITHUB_CLIENT_SECRET           = (from GitHub OAuth App)
NEXTAUTH_SECRET                = (openssl rand -hex 32)
STRIPE_SECRET_KEY              = sk_live_...
STRIPE_PUBLISHABLE_KEY         = pk_live_...
STRIPE_WEBHOOK_SECRET          = whsec_...
PORT                           = 3000
```

The `NEXT_PUBLIC_APP_URL` must be your Railway domain or custom domain — it is used to construct the GitHub OAuth callback URL.

### Step 5: Set up the Stripe webhook endpoint

Railway's persistent server can receive webhooks. In the Stripe dashboard:
1. Go to Webhooks → Add endpoint
2. Endpoint URL: `https://your-app.up.railway.app/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`

### Step 6: Deploy

```bash
railway up
```

Railway builds the Docker container, runs migrations, builds Next.js, and starts the server. Watch the deployment logs in the dashboard or with `railway logs`.

**Verify the deployment:**

```bash
# Check server is running
curl https://your-app.up.railway.app/api/providers

# Should return: {"configured": true, "provider": "openai", ...}
```

### VPS deployment (any Linux server)

Railway and VPS deployment are nearly identical. On a VPS (DigitalOcean, Hetzner, Linode, Fly.io, etc.):

```bash
# On the server
git clone https://github.com/yourfork/skill-mall .
npm install
cd cli && npm install && cd ..

# Copy and populate environment variables
cp /dev/stdin .env.local << 'EOF'
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
# ... all other vars
EOF

# Run migrations and build
npm run db:migrate
npm run build

# Start with a process manager
npm install -g pm2
pm2 start "npm start" --name skill-mall
pm2 save
pm2 startup
```

For nginx as a reverse proxy:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

The `data/` directory will persist on disk as long as you do not wipe the server. Back it up regularly — see [SQLite in Production](#sqlite-in-production).

---

## Complete Environment Variable Reference

Every environment variable SkillMall reads, what it does, whether it is required, and what breaks if it is missing.

| Variable | Required | Where to get it | What breaks if missing |
|---|---|---|---|
| `SKILL_MALL_PROVIDER` | Yes — for skill creation | `npx skill-mall configure`, or set manually | Skill creation pipeline fails: "No LLM provider configured" |
| `SKILL_MALL_API_KEY` | Yes — unless using `ollama` or `claude-code` | Your LLM provider's API dashboard | Authentication fails for OpenAI, Gemini, Groq — all LLM calls return 401 |
| `SKILL_MALL_MODEL` | No | Auto-set by `npx skill-mall configure` | Provider falls back to its default model |
| `SKILL_MALL_EMBEDDING_PROVIDER` | No — for RAG only | Same options as `SKILL_MALL_PROVIDER` | RAG knowledge attachment (`/api/retrieve`) fails: "No embedding provider configured" |
| `OPENAI_API_KEY` | Yes — if using OpenAI embeddings | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | OpenAI embedding calls fail; RAG attach-knowledge returns 500 |
| `GEMINI_API_KEY` | Yes — if using Gemini embeddings | [aistudio.google.com](https://aistudio.google.com) | Gemini embedding calls fail |
| `OLLAMA_BASE_URL` | No | Default: `http://localhost:11434` | Ollama calls fail if Ollama is running on a non-default port or host |
| `GITHUB_CLIENT_ID` | Yes — for GitHub sign-in | [github.com/settings/developers](https://github.com/settings/developers) | Sign In button fails: "OAuth App not configured" |
| `GITHUB_CLIENT_SECRET` | Yes — for GitHub sign-in | [github.com/settings/developers](https://github.com/settings/developers) | OAuth token exchange fails with 500 |
| `NEXTAUTH_SECRET` | Yes — for GitHub sign-in | `openssl rand -hex 32` | Session cookie cannot be signed; all authenticated routes return 401 |
| `NEXT_PUBLIC_APP_URL` | Yes — for GitHub sign-in and OAuth callback | Your app's base URL (no trailing slash) | OAuth redirect URI mismatch; GitHub refuses to redirect back to your app |
| `STRIPE_SECRET_KEY` | Yes — for Stripe marketplace | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) | Marketplace checkout creation fails: "STRIPE_SECRET_KEY is not configured" |
| `STRIPE_PUBLISHABLE_KEY` | Yes — for Stripe marketplace | [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys) | Checkout UI fails to initialize the Stripe.js client |
| `STRIPE_WEBHOOK_SECRET` | Yes — for Stripe marketplace | `stripe listen --forward-to <url>` (dev) or Stripe dashboard (prod) | Webhook signature verification fails; successful payments are not recorded |
| `NODE_ENV` | No | Set automatically by Next.js | Defaults to `development`; affects cookie `secure` flag and error verbosity |
| `PORT` | No | Railway/VPS only | Defaults to `3000` |

### Variable notes

**`SKILL_MALL_PROVIDER` valid values:** `openai`, `claude-code`, `gemini`, `groq`, `ollama`. The `claude-code` provider spawns `claude -p` subprocesses using the authenticated Claude Code CLI session — it does not require an API key but does require Claude Code to be installed and authenticated on the server.

**`SKILL_MALL_EMBEDDING_PROVIDER`:** Can differ from `SKILL_MALL_PROVIDER`. A common pattern is `SKILL_MALL_PROVIDER=groq` (fast, cheap text generation) with `SKILL_MALL_EMBEDDING_PROVIDER=openai` (best embedding quality). The `claude-code` provider does not support embeddings — setting `SKILL_MALL_EMBEDDING_PROVIDER=claude-code` will cause RAG commands to fail with a descriptive error.

**`NEXT_PUBLIC_APP_URL`:** The `NEXT_PUBLIC_` prefix means this value is inlined into the client-side JavaScript bundle at build time. Set it before running `next build`. Changing it after build requires a rebuild. In local development it defaults to `http://localhost:3000` — you only need to set it explicitly in production.

**`NEXTAUTH_SECRET`:** SkillMall does not use the NextAuth.js library — the variable name follows the same convention for familiarity. It is used to sign the `sm_session` cookie. Generate with `openssl rand -hex 32`. Keep it secret and do not rotate it without invalidating all active sessions.

**Stripe keys:** Use test keys (`sk_test_...`, `pk_test_...`) for staging and live keys (`sk_live_...`, `pk_live_...`) for production. Never commit either to version control.

### Minimum .env.local for each deployment type

**Catalog-only (Vercel, no auth):**

```bash
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

**Catalog with GitHub auth (Vercel):**

```bash
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
```

**Full-featured (Railway or VPS):**

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
SKILL_MALL_PROVIDER=openai
SKILL_MALL_API_KEY=sk-...
SKILL_MALL_MODEL=gpt-4o
SKILL_MALL_EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## SQLite in Production

SkillMall uses SQLite via `better-sqlite3`. The database is stored at `data/skillmall.db`. This section covers how WAL mode works, how to back up the database, and when to migrate to Turso.

### WAL mode

WAL (Write-Ahead Logging) mode is enabled automatically when the database is created. In `scripts/migrate.js`:

```javascript
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
```

WAL mode provides:
- **Concurrent readers:** Multiple simultaneous read transactions do not block each other and do not block writers.
- **Non-blocking writes:** Writers do not block readers. A write in progress does not stall an incoming page request.
- **Crash safety:** WAL mode is ACID-compliant. A crash during a write does not corrupt the database — the WAL file is replayed on the next open.

You will see three files in `data/`:
- `skillmall.db` — the main database file
- `skillmall.db-shm` — shared memory file (WAL index)
- `skillmall.db-wal` — the write-ahead log

All three must be present together. Never copy only `skillmall.db` without the `-wal` and `-shm` files — you may lose recent writes. When taking a backup, either use the `VACUUM INTO` method below or stop the server first.

### Running migrations

Migrations run via `npm run db:migrate` (which calls `scripts/migrate.js`). The runner applies migrations in alphabetical order and records each one in a `schema_migrations` table. Re-running is always safe — already-applied migrations are skipped.

```bash
# Apply any pending migrations
npm run db:migrate

# Expected output after first deploy:
# Applied: 001_initial.sql
# Applied: 002_phase3.sql
# Applied: 003_fork_events.sql
# Applied: 004_rag_embedding_column.sql
# 4 migration(s) applied.

# Expected output on subsequent runs:
# No new migrations.
```

On Railway, the build command `npm run db:migrate && npm run build` runs migrations before each deploy. New migration files added to `db/migrations/` are applied automatically on the next deploy.

### Backup strategy

**Option 1: VACUUM INTO (online backup, no downtime)**

SQLite supports online backup via `VACUUM INTO`. This creates a consistent snapshot while the database is live:

```bash
# Run from the server, with the app running
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/skillmall.db');
db.exec(\"VACUUM INTO 'data/skillmall-backup-\$(date +%Y%m%d-%H%M%S).db'\");
db.close();
console.log('Backup complete');
"
```

**Option 2: File copy (requires server stop or WAL checkpoint)**

Before copying the file, checkpoint the WAL to ensure consistency:

```bash
# Checkpoint the WAL (flush writes to the main database file)
node -e "
const Database = require('better-sqlite3');
const db = new Database('data/skillmall.db');
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
db.close();
"

# Now copy the main file (not the -wal or -shm files)
cp data/skillmall.db "backups/skillmall-$(date +%Y%m%d-%H%M%S).db"
```

**Automated daily backups (cron, on VPS):**

```bash
# Add to crontab: crontab -e
0 2 * * * node /app/scripts/backup-db.js >> /var/log/skillmall-backup.log 2>&1
```

Where `scripts/backup-db.js` is:

```javascript
#!/usr/bin/env node
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const src = path.join(process.cwd(), 'data', 'skillmall.db')
const backup = path.join(process.cwd(), 'data', `skillmall-${new Date().toISOString().slice(0, 10)}.db`)

const db = new Database(src)
db.exec(`VACUUM INTO '${backup}'`)
db.close()
console.log(`Backup created: ${backup}`)

// Keep only last 7 backups
const files = fs.readdirSync('data').filter(f => f.match(/^skillmall-\d{4}-\d{2}-\d{2}\.db$/)).sort()
while (files.length > 7) {
  fs.unlinkSync(path.join('data', files.shift()))
}
```

### Migration path to Turso

Turso is the recommended upgrade path when you need:
- **Read replicas** for global low-latency catalog access
- **HTTP-based SQLite** that works in edge runtimes and Vercel serverless
- **Scale beyond a single server** without changing the SQL schema

Turso uses libSQL, a SQLite-compatible protocol over HTTP. The migration is a driver swap — the schema, migrations, and queries are unchanged.

**Steps to migrate to Turso:**

1. Install the Turso CLI and create a database:

   ```bash
   brew install tursodatabase/tap/turso
   turso auth login
   turso db create skill-mall
   turso db show skill-mall  # Note the URL
   turso db tokens create skill-mall  # Note the auth token
   ```

2. Export the existing SQLite database and import into Turso:

   ```bash
   turso db shell skill-mall < data/skillmall.db
   ```

   Or use `turso db push` if your data is large.

3. Install the libSQL driver:

   ```bash
   npm install @libsql/client
   ```

4. Replace `better-sqlite3` usage in `lib/db/client.ts` with the libSQL client. The query API (`db.prepare().run()`, `db.prepare().get()`, `db.prepare().all()`) has an async equivalent in libSQL. This requires converting synchronous database calls to `await` — the most significant change in the migration.

5. Add Turso environment variables:

   ```bash
   TURSO_DATABASE_URL=libsql://skill-mall-yourorg.turso.io
   TURSO_AUTH_TOKEN=...
   ```

6. Remove `SKILL_MALL_DB_PATH` (or equivalent) and update `scripts/migrate.js` to use the libSQL migration API.

This migration unlocks Vercel deployment with full write support, since libSQL connections are HTTP-based and not filesystem-dependent.

---

## GitHub OAuth in Production

GitHub OAuth requires a registered OAuth App whose callback URL matches your production domain exactly. A mismatch causes a `redirect_uri_mismatch` error from GitHub and a failed login.

### Creating the OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name:** SkillMall (or your deployment name)
   - **Homepage URL:** `https://your-app.up.railway.app` (or your domain)
   - **Authorization callback URL:** `https://your-app.up.railway.app/api/auth/callback/github`
4. Click "Register application"
5. On the next screen, copy the **Client ID**
6. Click "Generate a new client secret" and copy it immediately — it is only shown once

### Setting the callback URL correctly

The callback URL is constructed at runtime from `NEXT_PUBLIC_APP_URL`:

```typescript
// lib/auth/github.ts
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

// The callback URL GitHub receives:
redirect_uri: `${APP_URL}/api/auth/callback/github`
```

`NEXT_PUBLIC_APP_URL` must exactly match the Homepage URL registered with GitHub, without a trailing slash. If your Vercel domain is `skill-mall-abc123.vercel.app`, set:

```
NEXT_PUBLIC_APP_URL=https://skill-mall-abc123.vercel.app
```

And register the OAuth callback as `https://skill-mall-abc123.vercel.app/api/auth/callback/github`.

If you add a custom domain, you must update both the GitHub OAuth App settings and `NEXT_PUBLIC_APP_URL`. The old callback URL ceases to work immediately.

### The secure cookie flag

The session cookie (`sm_session`) is set with `secure: process.env.NODE_ENV === "production"`:

```typescript
// app/api/auth/callback/github/route.ts
response.cookies.set("sm_session", sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60,
  path: "/",
})
```

When `NODE_ENV=production`, the cookie is only sent over HTTPS. This means:
- Your production deployment must serve over HTTPS. Railway and Vercel do this automatically.
- If you are running a local test with `NODE_ENV=production` on `http://localhost:3000`, the cookie will not be set and OAuth will appear to fail silently. Use `NODE_ENV=development` for local testing.
- On a VPS behind nginx with SSL termination, ensure nginx forwards `X-Forwarded-Proto: https` — Next.js uses this header to determine the protocol.

### Testing OAuth before going live

Use a separate GitHub OAuth App for local testing:
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

Keep separate Client IDs and secrets for local, staging, and production. Never reuse production credentials in development.

### Session lifetime

Sessions are stored in SQLite with a 7-day expiry (`expires_at`). There is no session renewal — users must re-authenticate after 7 days. Sessions are validated on every authenticated request by checking `expires_at > datetime('now')` in SQLite.

On Vercel with a committed SQLite snapshot, sessions written during runtime are lost on the next deploy. If auth persistence matters on Vercel, migrate to Turso as described in the SQLite section.

---

## CLI in Production Environments

The `npx skill-mall` CLI can be used on production servers to manage the skill catalog without the web UI. This is useful for scripted skill creation, batch operations, and CI/CD pipelines that create skills from documentation.

### CLI on Railway and VPS

The CLI reads the same environment variables as the web app. On the server:

```bash
# SSH into the server
ssh user@your-server

# Navigate to the app directory
cd /app  # or wherever you deployed

# Run any CLI command — it uses .env.local or environment variables
npx skill-mall list
npx skill-mall create "Kubernetes pod scheduling" --urls https://kubernetes.io/docs/concepts/scheduling-eviction/
npx skill-mall validate
```

The CLI resolves `SKILL_MALL_PROVIDER`, `SKILL_MALL_API_KEY`, and all other variables from the process environment. On Railway, variables set in the dashboard are available automatically. On VPS, they come from `.env.local` or the shell environment.

**Important:** The CLI writes files to the `skills/` directory on the server. For these changes to survive a Railway deploy, either:
1. Commit the new skills to git and push — the next deploy picks them up from the repository
2. Or configure Railway's persistent volume to include `skills/` (mount at `/app/skills`)

Option 1 is the standard workflow: use the CLI to draft skills on your local machine, commit, push, and Railway deploys the updated catalog.

### CLI in CI/CD pipelines

You can automate skill creation from documentation in GitHub Actions:

```yaml
# .github/workflows/create-skills.yml
name: Create skill from documentation

on:
  workflow_dispatch:
    inputs:
      topic:
        description: Skill topic
        required: true
      url:
        description: Documentation URL
        required: true

jobs:
  create:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install dependencies
        run: npm install

      - name: Create skill
        env:
          SKILL_MALL_PROVIDER: openai
          SKILL_MALL_API_KEY: ${{ secrets.SKILL_MALL_API_KEY }}
        run: |
          npx skill-mall create "${{ inputs.topic }}" --urls "${{ inputs.url }}"
          # Confirm the research result (runs second stage of pipeline)
          npx skill-mall confirm-research $(ls skill-builder-output/ | head -1)

      - name: Validate new skill
        run: bash scripts/validate-skill.sh skills/

      - name: Create pull request
        uses: peter-evans/create-pull-request@v6
        with:
          commit-message: "feat: add ${{ inputs.topic }} skill"
          title: "Add ${{ inputs.topic }} skill"
          body: "Skill created automatically from ${{ inputs.url }}"
```

This workflow creates the skill, validates it, and opens a pull request for human review before merging into the catalog.

### CLI on Vercel (not supported)

The `npx skill-mall create` command requires writing to `skill-builder-output/` and then to `skills/`. Both operations fail on Vercel's read-only runtime. Do not use the create, confirm-research, fork, or regen-prompt CLI commands against a Vercel deployment.

The read-only CLI commands — `list`, `find`, `validate`, `deploy` — do not hit the server at all. They operate locally on your filesystem and work regardless of where the web app is deployed.

---

## Troubleshooting

### Skill creation returns "filesystem is read-only"

You are deploying on Vercel. Skill creation is not supported on Vercel. Deploy to Railway or a VPS for the full feature set.

### GitHub OAuth fails with "redirect_uri_mismatch"

The callback URL registered in your GitHub OAuth App does not match `${NEXT_PUBLIC_APP_URL}/api/auth/callback/github`. Check:
1. `NEXT_PUBLIC_APP_URL` in your environment variables (no trailing slash)
2. The Authorization callback URL in your GitHub OAuth App settings
3. That these two values, combined as `${url}/api/auth/callback/github`, are identical character-for-character

### Session cookie is set but immediately lost

`NODE_ENV=production` is set but the app is running on HTTP. The `secure` cookie flag requires HTTPS. Either:
- Configure HTTPS on your server
- Or temporarily set `NODE_ENV=development` for testing (not for production use)

### Migrations fail on Railway deploy

Railway's volume may not be mounted yet when the build command runs. Ensure the volume mount path is `/app/data` and that the build command is set under the Deploy settings (which runs after the volume is attached), not under the Build settings (which runs in the build container where volumes are not available).

If migrations still fail, run them manually via Railway's shell access:
```bash
railway run npm run db:migrate
```

### SQLite "database is locked" errors

This indicates multiple processes are trying to write simultaneously to the same database file, or a previous process crashed without releasing the lock. On Railway with a single-instance deployment this should not occur. If it does:

```bash
# Remove stale lock (requires stopping the server first)
rm -f data/skillmall.db-shm data/skillmall.db-wal
npm run db:migrate
```

Do not remove these files while the server is running — only after a clean stop.

---

## Next Steps

- **[Architecture](./architecture.md)** — internal system design, provider abstraction, database schema
- **[Getting Started](./getting-started.md)** — local development setup
- **[Environment Variable Reference](#complete-environment-variable-reference)** — full table above
- **[Extending SkillMall](./extending.md)** — adding providers, CLI commands, and API routes
