# Troubleshooting SkillMall

This guide covers the most common problems encountered when running SkillMall — from initial provider configuration through skill creation, deployment, authentication, and local development. Each entry describes the exact symptom, explains the root cause, and gives numbered steps to fix it.

If your problem is not listed here, check the [GitHub Issues](https://github.com/skill-mall/skill-mall/issues) page or open a new issue with the full error output.

---

## Table of Contents

1. [Provider / LLM Problems](#1-provider--llm-problems)
2. [Wizard Problems](#2-wizard-problems)
3. [CLI Problems](#3-cli-problems)
4. [Authentication Problems](#4-authentication-problems)
5. [Build and Development Problems](#5-build-and-development-problems)

---

## 1. Provider / LLM Problems

The research pipeline and skill builder both depend on a configured LLM provider. Problems in this section prevent any AI-powered feature from working.

---

**Problem:** `No LLM provider configured. Run: npx skill-mall configure`

**What it means:** The CLI checked two places for provider configuration — the environment variable `SKILL_MALL_PROVIDER` and the file `~/.skill-mall/config.json` — and found neither. This error appears when you run any command that calls the LLM (such as `create`, `confirm-research`, `extract`, or `optimize-prompt`) without having configured a provider first.

**Fix:**
1. Run the interactive configuration wizard:
   ```
   npx skill-mall configure
   ```
2. Select your provider from the menu (OpenAI, Claude Code CLI, Google Gemini, Groq, or Ollama). For OpenAI, Gemini, and Groq, enter your API key when prompted. For Claude Code and Ollama, no key is required.
3. Verify the config was written correctly:
   ```
   cat ~/.skill-mall/config.json
   ```
   You should see a JSON object with at minimum a `provider` and `model` field.
4. Run your original command again. If it still fails, confirm the file path is correct for your home directory — some systems use a non-standard `HOME` path. Set it explicitly: `SKILL_MALL_PROVIDER=claude-code npx skill-mall create "your topic"`.

**If none work:** Delete `~/.skill-mall/config.json` and run `configure` again. If the file write fails due to permissions, check whether your home directory is writable.

---

**Problem:** `Provider 'claude-code' does not support embeddings`

**What it means:** A component in the pipeline called the embeddings API on a client that does not implement it. The `ClaudeCodeClient` in `lib/providers/claude-code.ts` wraps the `claude` CLI and only supports text completion — it has no embeddings method. This typically surfaces in the `retrieve` feature or any workflow that attempts semantic search over a local index.

**Fix:**
1. Switch to a provider that supports embeddings for any retrieval-dependent features. OpenAI is the recommended option:
   ```
   npx skill-mall configure --provider openai --key sk-...
   ```
2. If you want to keep Claude Code as your main provider for skill creation, set a separate `SKILL_MALL_EMBEDDINGS_PROVIDER` environment variable in `.env.local`:
   ```
   SKILL_MALL_PROVIDER=claude-code
   SKILL_MALL_EMBEDDINGS_PROVIDER=openai
   SKILL_MALL_API_KEY=sk-...
   ```
3. Restart the development server after editing `.env.local`.

**If none work:** The retrieval feature requires a provider that offers an embeddings endpoint. If you cannot use OpenAI, you can disable the retrieval feature in settings at `http://localhost:3000/settings/providers` and use the research pipeline without local indexing.

---

**Problem:** API key rejected with a `401 Unauthorized` error from OpenAI, Gemini, or Groq

**What it means:** The provider's API received your request but rejected the key. The most common causes are: the key was pasted with extra whitespace, the key has been revoked or expired, the key does not have permission for the model you selected, or the key belongs to a different account than you expected.

**Fix:**
1. Verify the key in your config file has no leading or trailing whitespace:
   ```
   cat ~/.skill-mall/config.json
   ```
   The `apiKey` value should be a bare string with no spaces.
2. Test the key directly against the provider's API to isolate the issue from SkillMall:
   - OpenAI: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"`
   - Gemini: `curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"`
   - Groq: `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer YOUR_KEY"`
   If these return `401`, the key itself is invalid — generate a new one from the provider's dashboard.
3. Reconfigure with the new key:
   ```
   npx skill-mall configure --provider openai --key sk-NEW_KEY_HERE
   ```
4. For Groq, make sure the selected model is available in your Groq account tier. The default `llama-3.3-70b-versatile` requires an active Groq account.

**If none work:** Check the provider's status page for outages. OpenAI status is at `status.openai.com`, Groq status is at `status.groq.com`. If the provider is healthy and the key is valid but requests still fail, open an issue with the full HTTP response (redact your key before sharing).

---

**Problem:** Ollama connection refused — `connect ECONNREFUSED 127.0.0.1:11434` or similar

**What it means:** The Ollama client in `lib/providers/ollama.ts` connects to `http://localhost:11434/v1` (the Ollama OpenAI-compatible endpoint). A connection refused error means Ollama is not running on that port. Either the `ollama serve` process has not been started, it crashed, or it is bound to a different address.

**Fix:**
1. Check whether Ollama is running:
   ```
   curl http://localhost:11434
   ```
   If this returns `Ollama is running`, the server is up and the problem is elsewhere. If it fails, proceed to step 2.
2. Start the Ollama server:
   ```
   ollama serve
   ```
   Leave this terminal open, or run it in the background. On macOS, the Ollama menubar app starts the server automatically when the app is open.
3. Confirm the model you configured is pulled locally. The default is `llama3.1`:
   ```
   ollama list
   ```
   If `llama3.1` does not appear, pull it:
   ```
   ollama pull llama3.1
   ```
4. If Ollama is running on a non-default port, set `SKILL_MALL_BASE_URL` in `.env.local`:
   ```
   SKILL_MALL_BASE_URL=http://localhost:YOUR_PORT/v1
   ```

**If none work:** Run `ollama run llama3.1` in a terminal to test that the model itself is working. If that succeeds but SkillMall still cannot connect, check whether a firewall or security software is blocking loopback connections on port 11434.

---

**Problem:** `LLM extraction failed after retry` or `Research error: Extraction failed: invalid JSON response`

**What it means:** The research engine called `extractWithRetry` in `lib/research-engine.ts`, which attempts the LLM extraction twice. Both attempts returned a response that failed Zod schema validation — either the model returned malformed JSON, wrapped its response in markdown fences despite being instructed not to, or returned a partial response that was cut off at the token limit. This error most often occurs with smaller models (Groq's `llama-3.1-8b-instant`, Ollama's `llama3.1:7b`) that struggle to produce valid structured JSON for complex topics.

**Fix:**
1. Switch to a more capable model. The extraction prompt requires strict JSON compliance and a response up to 4096 tokens. Upgrade your model:
   ```
   npx skill-mall configure --provider openai --model gpt-4o
   ```
   or
   ```
   npx skill-mall configure --provider groq --model llama-3.3-70b-versatile
   ```
2. Simplify your topic. Overly broad topics ("all of marketing") extract more tools, which increases output length and the chance of truncation. Narrow the topic: `"Porter's Five Forces"` instead of `"competitive strategy"`.
3. Reduce the number of URLs. Providing 5+ URLs may push the extraction context past what the model handles well. Start with one canonical URL.
4. For Ollama, make sure you are using a model with sufficient parameter count. Models below 13B parameters often fail structured JSON tasks reliably. Pull a larger model:
   ```
   ollama pull llama3.1:70b
   ```
   Then reconfigure:
   ```
   npx skill-mall configure --provider ollama --model llama3.1:70b
   ```

**If none work:** Run the create command with verbose output to capture the raw model response:
```
DEBUG=skill-mall:* npx skill-mall create "your topic" --urls https://example.com
```
Inspect what the model actually returned. If it returned content but not valid JSON, the model does not support `json_object` response format reliably — switch to OpenAI or Claude Code.

---

**Problem:** `Error: model not found` or the provider returns a `404` for the model name

**What it means:** The model string in your configuration does not match any model the provider recognizes. This most often happens when a model name is typed incorrectly during configuration, when a model has been deprecated by the provider, or when a model name from one provider is used with a different provider (for example, `gpt-4o` configured with the Groq provider).

**Fix:**
1. Check your current configuration:
   ```
   cat ~/.skill-mall/config.json
   ```
2. Confirm the valid model names for your provider:
   - OpenAI: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`
   - Claude Code: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`
   - Gemini: `gemini-2.0-flash-exp`, `gemini-1.5-pro`
   - Groq: `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`
   - Ollama: whatever you have pulled locally — run `ollama list` to see
3. Reconfigure with the correct model name:
   ```
   npx skill-mall configure --provider openai --model gpt-4o
   ```
4. For Claude Code, confirm the `claude` CLI is installed and authenticated by running `claude --version`. A missing CLI returns a spawn error, not a model-not-found error — but a misconfigured model name produces the 404 you are seeing.

**If none work:** Check whether the provider has retired the model you configured. Model names change more often than documentation reflects. Consult the provider's current model list and use one of the models listed in the providers catalog at `http://localhost:3000/settings/providers`.

---

## 2. Wizard Problems

The browser-based creation wizard at `http://localhost:3000/skills/create` runs the same research pipeline as the CLI but through the Next.js API routes. Problems here may stem from provider configuration, network access, or how the wizard interprets results.

---

**Problem:** Research step completes but returns `0 tools extracted`

**What it means:** The research engine successfully fetched the URLs and called the LLM, but the model's JSON response contained an empty `tools` array. This means the content on the page did not contain any explicitly named tools, frameworks, or methodologies that the extraction prompt could identify — or the model treated all the content as background prose and found nothing to name.

**Fix:**
1. Check the source URL. The extraction engine is literal: it extracts tools that are explicitly named in the text. Landing pages, blog posts, and news articles typically have zero extractable tools. Point to a documentation page, methodology reference, or structured guide that names specific frameworks. For example, `https://blueoceanstrategy.com/tools/` (lists ERRC, Strategy Canvas, etc.) extracts 5+ tools. `https://blueoceanstrategy.com/` (marketing homepage) extracts zero.
2. If you do not have a canonical URL, omit URLs entirely and let the pipeline use training knowledge. Uncheck the URL field in the wizard and proceed — the research engine will call the LLM with the topic alone. The result is marked as `researchUnverified` but still contains tools.
3. Narrow your topic. Broad topics like "productivity" return general principles rather than specific named tools. Try "Getting Things Done methodology" instead, which surfaces GTD's specific components: Capture, Clarify, Organize, Reflect, Engage.
4. Switch to a stronger model. The `llama-3.1-8b-instant` on Groq sometimes returns an empty tools array for moderately complex content that `gpt-4o` handles correctly. Switch in the settings panel, then retry.

**If none work:** Click "View Raw JSON" in the research review step if available, or check the browser's network tab for the POST to `/api/research`. Inspect the full response body. If `tools` is present but empty, the content genuinely has no named tools. If `tools` is missing, the schema validation rejected the response — this is an extraction failure (see the previous entry).

---

**Problem:** Research step takes more than 5 minutes and appears to hang

**What it means:** The research pipeline has two serial phases: URL fetching (15-second timeout per URL) and LLM extraction (up to 120 seconds). A hang longer than 5 minutes usually means the LLM call is waiting for a response from an overloaded or unavailable provider endpoint, or the Ollama server stopped responding mid-request.

**Fix:**
1. Check your provider's status page for outages before assuming the local setup is broken.
2. For Ollama: open a separate terminal and run `ollama run llama3.1 "say hello"`. If Ollama itself hangs, the model is being loaded from disk for the first time (which can take 1–3 minutes for 7B+ models). Wait for that first load to complete, then retry.
3. Reduce the number of source URLs. Each URL adds a fetch step before the LLM call. Start with one URL to isolate whether the hang is in fetching or extraction.
4. Switch to a faster provider for testing. Groq with `llama-3.3-70b-versatile` typically returns extraction results in under 10 seconds. If the wizard works with Groq but not your primary provider, the issue is provider-side latency.
5. Hard-refresh the wizard page (Cmd+Shift+R / Ctrl+Shift+R) if the UI appears frozen. The API call may have completed but the UI state got stuck.

**If none work:** Kill and restart `npm run dev`, clear the browser cache, and retry with a single short URL. If the hang persists beyond 3 minutes with a fast provider and a single URL, check the Next.js server output for unhandled promise rejections or timeout errors.

---

**Problem:** `Skill already exists: skills/<category>/<slug>` when the wizard or CLI tries to write the skill

**What it means:** The `atomicWrite` function in `lib/pipeline.ts` checks whether the target directory exists before writing. If `skills/<category>/<slug>/` already exists on disk, the write is rejected to prevent accidental overwrites of existing skills, especially important in a shared repository.

**Fix:**
1. If you want to overwrite the existing skill, delete the directory first:
   ```
   rm -rf skills/<category>/<slug>
   ```
   Then rerun `confirm-research` or the wizard's build step.
2. If the existing skill is a different one than you intended, choose a different slug. In the wizard, go back to the research review step and edit the slug field. In the CLI, re-run `create` with a different topic string that generates a different slug, or run `confirm-research` after manually editing `skill-builder-output/<slug>/research-result.json` and renaming the directory.
3. If you want to update an existing skill rather than replace it, use `fork` instead:
   ```
   npx skill-mall fork <category>/<slug> --name <new-slug>
   ```
   This creates a new copy with `forked_from` set in frontmatter.

**If none work:** Check that the path displayed in the error is exactly what you expect. A slug generation edge case (special characters, very long topics) may have produced an unexpected path. Run `ls skills/<category>/` to see what actually exists.

---

**Problem:** Build succeeds but the quality score shown in the wizard is below 50

**What it means:** The quality score estimates resource richness using a simple heuristic in `confirm-research.ts`: 20 points for scripts, 30 points for templates, 30 points for samples, and up to 20 points for tags. A score below 50 means the generated skill has fewer than two of these three resource types, or very few tags were suggested by the research engine.

**Fix:**
1. The quality score shown immediately after `confirm-research` is an estimate. The final score computed by `lib/quality-score.ts` also evaluates description quality, frontmatter health, and content depth — it may score higher than the estimate. Run `npx skill-mall validate skills/<category>/<slug>` to see the full breakdown.
2. Improve the score by adding resources. Templates are the highest-value addition (30 points). Open the skill directory and add a blank template file:
   ```
   mkdir -p skills/<category>/<slug>/resources/templates
   # Add a template file — e.g., errc-grid-template.md
   ```
3. Re-run the optimization step from the wizard's post-build panel, or run:
   ```
   npx skill-mall optimize-prompt <category>/<slug>
   ```
   This generates additional prompt files that improve the resource score.
4. Add samples. A concrete worked example in `resources/samples/` adds 30 points:
   ```
   mkdir -p skills/<category>/<slug>/resources/samples
   # Add a filled-in example file
   ```

**If none work:** Check `docs/guide/understanding-quality.md` for the full rubric. A score below 50 does not prevent the skill from working — it only affects catalog contribution eligibility (70+ required for PR merge). You can deploy and use the skill locally regardless of score.

---

**Problem:** `Validation failed: description exceeds 150 characters`

**What it means:** The validator in `cli/src/commands/validate.ts` enforces a 150-character maximum on the `description` field. The AgentSkills spec allows up to 1024 characters, but all coding agents implement skill listing budgets and silently truncate long descriptions. SkillMall enforces 150 characters as a hard limit to match the universal best practice. This error fires from both `validate` and `confirm-research` if the generated or user-provided description is too long.

**Fix:**
1. Open the `SKILL.md` file in the failing skill and find the `description` field.
2. Count the current character length. The error message includes the count: `description too long: 182 chars (max 150)`.
3. Edit the description to 150 characters or fewer. The description should be a single sentence starting with an action verb. Everything else belongs in the skill body. Example — instead of:
   ```
   description: "Apply Blue Ocean Strategy to identify uncontested market spaces, eliminate competitive factors, reduce cost drivers, raise differentiating factors, and create new sources of value that make competition irrelevant."
   ```
   Use:
   ```
   description: "Apply Blue Ocean Strategy: ERRC grid, Strategy Canvas, and non-customer analysis."
   ```
4. Re-run validation to confirm the fix:
   ```
   npx skill-mall validate skills/<category>/<slug>
   ```

**If none work:** If the description was generated by the research engine and is consistently over 150 characters, the model used a long summary as the description. Edit `skill-builder-output/<slug>/research-result.json` before running `confirm-research`, update the `summary` field to be under 150 characters, and re-run.

---

## 3. CLI Problems

These problems occur when running `npx skill-mall` commands or the locally built CLI.

---

**Problem:** `skill-mall: command not found` when running `npx skill-mall`

**What it means:** `npx` cannot find the `skill-mall` package. This happens when the package has not been published to npm and `npx` is being run outside the local repository, or when Node.js is not in the shell's `PATH`, or when an older version of npm is being used that handles `npx` differently.

**Fix:**
1. If you are running from within the `skill-mall` repository itself (for development or contribution), use the local CLI directly rather than `npx`:
   ```
   node cli/dist/index.js list
   ```
   Or build the CLI first if the dist directory is missing:
   ```
   cd cli && npm install && npm run build && cd ..
   ```
2. If you installed the package globally and it is not found, reinstall:
   ```
   npm install -g skill-mall
   ```
   Then verify with `which skill-mall`.
3. Check that Node.js is installed and the correct version:
   ```
   node --version
   ```
   SkillMall requires Node.js 18 or later. If you get a version below 18, update Node.js via your version manager (`nvm use 18`, `fnm use 18`) or download from `nodejs.org`.
4. On Windows, ensure Node.js was added to the system PATH during installation. Reopen the terminal after installing Node.js.

**If none work:** Run `npm config get prefix` to find where global packages are installed, and confirm that directory is in your PATH. For permission issues on macOS/Linux with global npm installs, see the npm documentation on fixing permissions.

---

**Problem:** `Dynamic require of 'fs' is not supported` when running the CLI

**What it means:** The CLI distribution in `cli/dist/` was built with a bundler configuration that does not correctly externalize Node.js built-in modules. This error surfaces in older builds where the bundler attempted to inline Node's `fs` module rather than leaving it as a runtime `require`. It also appears if the dist was built for a browser target rather than Node.js.

**Fix:**
1. Rebuild the CLI from source:
   ```
   cd cli
   npm install
   npm run build
   cd ..
   ```
2. Confirm the build succeeded and `cli/dist/index.js` was updated (check the modification timestamp).
3. Test the rebuilt CLI:
   ```
   node cli/dist/index.js --version
   ```
4. If the error persists after rebuilding, check `cli/package.json` for the build script. The build must target Node.js (`platform: 'node'` in the bundler config). If you see `browser` or `neutral` as the platform, correct the bundler config and rebuild.

**If none work:** Run `node --version` to confirm you are on Node.js 18+. Dynamic `require` errors can also appear if the CLI is loaded in a Jest/Vitest test environment that transforms modules. In that case, add the CLI to the test environment's external list.

---

**Problem:** `Skill not found: <category>/<slug>` when running `npx skill-mall deploy`

**What it means:** The `deploy` command calls `resolveSkillDir` in `cli/src/commands/deploy.ts`, which looks for `skills/<category>/<slug>/` inside the repository root. If neither the `<category>/<slug>` path nor a matching skill name in any category is found, the command exits with this error. The three most common causes are: a typo in the slug, running the command from outside the repository, or the skill was created in a different category than the one specified.

**Fix:**
1. List all available skills to confirm the exact path:
   ```
   npx skill-mall list
   ```
   The output shows `CATEGORY / SKILL NAME`. Use exactly that combination.
2. Confirm you are running the command from inside the `skill-mall` repository root. The `requireRepoRoot` function in `utils.js` walks up the directory tree looking for a `skills/` directory. If you are in a different directory, it cannot find the repo:
   ```
   ls skills/
   ```
   If this returns `No such file or directory`, change to the repository root first.
3. Check whether the skill exists at the exact path you specified:
   ```
   ls skills/<category>/<slug>/SKILL.md
   ```
4. If you created the skill with the wizard or `confirm-research`, check the category that was assigned. The research engine suggests a category automatically — it may have placed the skill in `business` when you expected `development`. Run `npx skill-mall list` to find the actual category.

**If none work:** Try deploying by skill name only (without category), which triggers a full search:
```
npx skill-mall deploy <slug>
```
The resolver searches all categories for a matching directory name.

---

**Problem:** `Permission denied` when deploying to `~/.claude/skills/`

**What it means:** The deploy command calls `fs.mkdirSync` and `fs.copyFileSync` targeting `~/.claude/skills/`. A permission denied error means the process does not have write access to that directory or its parents. This can happen when `~/.claude/` was created by a different user (for example, during a root-level installation), when the directory has restrictive permissions, or when a security tool is blocking file system writes.

**Fix:**
1. Check the permissions on the directory:
   ```
   ls -la ~/.claude/
   ```
   The owner should be your current user. If it is `root` or another user, that is the problem.
2. Fix ownership:
   ```
   sudo chown -R $(whoami) ~/.claude/
   ```
3. Fix permissions if the directory exists but is not writable:
   ```
   chmod 755 ~/.claude/skills/
   ```
4. If `~/.claude/skills/` does not exist, create it manually before deploying:
   ```
   mkdir -p ~/.claude/skills/
   ```
5. Use project-scoped deployment as an alternative — this deploys to `.claude/skills/` relative to the current directory instead of the user-level directory:
   ```
   npx skill-mall deploy <category>/<slug> --scope project
   ```

**If none work:** Check whether macOS System Integrity Protection or an MDM policy is blocking writes to `~/.claude/`. Try deploying manually by copying the skill directory:
```
cp -r skills/<category>/<slug> ~/.claude/skills/
```
If even that fails, the restriction is OS-level and not specific to SkillMall.

---

**Problem:** `No research found for slug: <slug>` when running `confirm-research`

**What it means:** The `confirm-research` command looks for `skill-builder-output/<slug>/research-result.json` relative to the current working directory. This file is created by the `create` command's pipeline step. If the file is missing, either `create` was not run first, it ran but exited before writing the file (e.g., the LLM extraction failed), or you are running `confirm-research` from a different directory than where `create` was run.

**Fix:**
1. Confirm the research file exists:
   ```
   ls skill-builder-output/<slug>/research-result.json
   ```
   If it does not exist, run `create` first:
   ```
   npx skill-mall create "your topic" --urls https://example.com
   ```
2. If the file exists but `confirm-research` still cannot find it, you are running from the wrong directory. `confirm-research` uses the current working directory — run it from the repository root:
   ```
   ls skill-builder-output/
   ```
   This should list the slug directory. If it does not, change to the directory where `create` was run.
3. Check whether the research file is valid JSON. A truncated write (due to a disk-full condition or a force-kill during `create`) produces a corrupted file:
   ```
   node -e "JSON.parse(require('fs').readFileSync('skill-builder-output/<slug>/research-result.json', 'utf-8'))"
   ```
   If this throws, delete the file and re-run `create`.
4. If the slug name contains characters that the shell interprets (spaces, special characters), quote it:
   ```
   npx skill-mall confirm-research "blue-ocean-strategy"
   ```

**If none work:** Inspect `skill-builder-output/` to see what slugs are available. The slug is derived from your topic string by lowercasing, removing non-alphanumeric characters, and replacing spaces with hyphens. If your topic was `"Blue Ocean Strategy!"`, the slug is `blue-ocean-strategy`. Pass exactly that string to `confirm-research`.

---

## 4. Authentication Problems

The web catalog uses GitHub OAuth for user authentication. The authentication layer is required for leaving reviews, tracking your created skills, and accessing the dashboard. Skills can be browsed, deployed, and created without authentication.

---

**Problem:** The Sign In button loads a blank page or shows a generic error page

**What it means:** The Next.js authentication route at `/api/auth` is not configured. GitHub OAuth requires a `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the environment. If these variables are missing, the auth handler cannot start the OAuth flow and returns an error immediately.

**Fix:**
1. Create a GitHub OAuth App. Go to `https://github.com/settings/applications/new` and fill in:
   - Application name: `SkillMall (local)`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
2. After creating the app, copy the Client ID and generate a Client Secret.
3. Add the credentials to `.env.local` in the repository root:
   ```
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   NEXTAUTH_SECRET=any_random_string_at_least_32_chars
   NEXTAUTH_URL=http://localhost:3000
   ```
4. Restart the development server:
   ```
   npm run dev
   ```
5. Try signing in again. You should be redirected to GitHub's authorization page.

**If none work:** Confirm `.env.local` is in the repository root (the same directory as `package.json`), not inside `app/` or another subdirectory. Next.js only reads `.env.local` from the project root.

---

**Problem:** `OAuth callback URL mismatch` error from GitHub

**What it means:** The URL that GitHub redirected to after authorization does not match any URL registered in your OAuth app's settings. GitHub enforces exact URL matching, including protocol, host, port, and path. If you registered `http://localhost:3000/api/auth/callback/github` but are accessing the app at `http://127.0.0.1:3000` or on a different port, the callback URL will not match.

**Fix:**
1. Go to your GitHub OAuth App settings: `https://github.com/settings/applications` and click your SkillMall app.
2. Check the `Authorization callback URL` field. It must exactly match what your running instance uses. The default is `http://localhost:3000/api/auth/callback/github`.
3. If you changed the development port (for example, because port 3000 was in use and Next.js moved to 3001), update the callback URL in GitHub to match:
   ```
   http://localhost:3001/api/auth/callback/github
   ```
   Also update `NEXTAUTH_URL` in `.env.local`:
   ```
   NEXTAUTH_URL=http://localhost:3001
   ```
4. Save the GitHub OAuth App settings. Changes take effect immediately — no restart required on the GitHub side.
5. Restart the development server to pick up the updated `NEXTAUTH_URL`.

**If none work:** Add multiple callback URLs to the GitHub OAuth App — GitHub allows up to 10 callback URLs per app. Add entries for both port 3000 and 3001 to handle both cases.

---

**Problem:** Signed out unexpectedly after a period of time — session disappeared without warning

**What it means:** Sessions in SkillMall expire after 7 days. This is the default NextAuth session duration. When a session expires, the next page load or API call returns a 401, and the auth layer redirects to the sign-in page. This is expected behavior — it is not a bug.

**Fix:**
1. Sign in again with GitHub. Your account, reviews, and created skills are persistent in the database — signing back in restores everything.
2. If you want a longer session for local development, extend the session duration in the auth configuration. In `app/api/auth/[...nextauth]/route.ts` (or equivalent), add:
   ```typescript
   session: {
     maxAge: 30 * 24 * 60 * 60, // 30 days
   }
   ```
3. Restart the development server after changing the session configuration.

**If none work:** If you are being signed out much more frequently than 7 days (within minutes or hours), the `NEXTAUTH_SECRET` in `.env.local` may be changing between server restarts. Ensure `NEXTAUTH_SECRET` is a stable, fixed value — not generated at runtime. Set it explicitly in `.env.local` and do not change it.

---

**Problem:** `state mismatch` error during GitHub OAuth — the sign-in fails partway through

**What it means:** OAuth 2.0 uses a `state` parameter as CSRF protection. NextAuth generates a random state value, stores it in a cookie, and then verifies it matches when GitHub redirects back. A mismatch means the cookie was not preserved between the start of the OAuth flow and the callback. This typically happens when cookies are blocked by the browser, when the app is accessed through multiple origins (localhost vs 127.0.0.1), or when the browser is in private/incognito mode with strict cookie settings.

**Fix:**
1. Ensure you are accessing the app consistently through `http://localhost:3000` — not `http://127.0.0.1:3000`. The two are treated as different origins for cookie purposes. If you started the flow on one and the callback arrived on the other, the state cookie will not be found.
2. Check your browser's cookie settings. In Chrome: Settings > Privacy and Security > Cookies > make sure third-party cookies are not blocking same-site cookies for localhost.
3. Try in a standard browser window rather than incognito/private mode. Incognito windows often block session cookies.
4. Clear browser cookies for `localhost` and try signing in again with a fresh session.
5. Confirm `NEXTAUTH_URL` in `.env.local` matches exactly the URL you are using in the browser address bar, including port.

**If none work:** Open the browser's developer tools and go to the Application tab, then Cookies. Start the OAuth flow and watch whether a `next-auth.csrf-token` and `next-auth.callback-url` cookie are set immediately. If they are not being set, the issue is browser-level cookie rejection. Try a different browser.

---

## 5. Build and Development Problems

These problems occur when running `npm run dev`, `npm run build`, or during TypeScript compilation after pulling updates.

---

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000` when starting `npm run dev`

**What it means:** Port 3000 is already bound to another process — either a previous Next.js instance that was not stopped cleanly, another development server, or a different application using the same port.

**Fix:**
1. Find what process is using port 3000:
   - macOS/Linux:
     ```
     lsof -i :3000
     ```
   - Windows:
     ```
     netstat -ano | findstr :3000
     ```
2. Stop the conflicting process. If it is a previous Next.js instance:
   ```
   kill -9 <PID>
   ```
3. If you want to run SkillMall on a different port instead of stopping the other process:
   ```
   npm run dev -- --port 3001
   ```
   Then update `NEXTAUTH_URL` in `.env.local` to `http://localhost:3001` and update your GitHub OAuth App callback URL accordingly.
4. On macOS, Control Panel > System Preferences > Sharing sometimes enables services on port 3000. Check for AirPlay Receiver (uses port 7000 in newer macOS but occasionally conflicts) or other sharing services.

**If none work:** Restart your computer. Some zombie processes do not respond to `kill` and only clear on reboot.

---

**Problem:** `Module not found: Can't resolve 'better-sqlite3'` when starting the dev server or running the build

**What it means:** The `better-sqlite3` native module was not built for your Node.js version or architecture. `better-sqlite3` includes a precompiled C++ addon, and if it was installed on a different machine, a different Node.js version, or a different CPU architecture than the current environment, it will not load. This commonly occurs after pulling the repository on a new machine, switching Node.js versions with `nvm`, or running on Apple Silicon after a project was previously set up on Intel.

**Fix:**
1. Delete the existing installation and reinstall from scratch:
   ```
   rm -rf node_modules
   npm install
   ```
2. If the error persists after reinstalling, force a rebuild of native addons:
   ```
   npm install --build-from-source better-sqlite3
   ```
3. On Apple Silicon Macs, confirm you are running the native `arm64` Node.js binary (not the Rosetta x86 version):
   ```
   node -e "console.log(process.arch)"
   ```
   It should print `arm64`. If it prints `x64`, you are running Node.js under Rosetta. Install a native Apple Silicon Node.js binary via `nvm install --lts` (nvm defaults to native architecture).
4. Confirm you have Python and C++ build tools installed, which `better-sqlite3` requires to compile:
   - macOS: `xcode-select --install`
   - Linux: `sudo apt install python3 make g++`

**If none work:** Check your Node.js version with `node --version`. `better-sqlite3` version 12 (used in this project) requires Node.js 18 or later. If you are on Node 16, upgrade.

---

**Problem:** TypeScript errors after pulling the latest code — `TS2345`, `TS2339`, or similar type errors that were not present before

**What it means:** A recent commit changed a type definition, added a new required field to an interface, or updated a dependency whose types changed. This is a normal consequence of pulling changes that include type-level breaking changes or dependency updates. The errors are compile-time only — they do not mean the code is wrong, but they do need to be resolved before `npm run build` succeeds.

**Fix:**
1. Delete node_modules and reinstall to pick up any updated dependency types:
   ```
   rm -rf node_modules
   npm install
   ```
2. Run TypeScript compilation to see the full error list:
   ```
   npx tsc --noEmit
   ```
3. Read each error carefully. The message includes the file path, line number, and a description of the type mismatch. Most errors after a pull are either:
   - A new required field on an interface that you need to add to your call site
   - A changed return type on a function
   - A dependency update that changed an exported type
4. If you did not modify any code and these are new errors introduced by the pull, open a GitHub issue with the `tsc` output. Include your Node.js version and the commit hash.
5. If you have local changes that conflict with the new types, stash your changes, verify the base commit compiles, then reapply your changes and fix the conflicts:
   ```
   git stash
   npx tsc --noEmit
   git stash pop
   ```

**If none work:** Check the git log for recent commits that changed types:
```
git log --oneline --diff-filter=M -- "**/*.ts" | head -10
```
Find the commit that introduced the errors and read its description — it may include migration instructions.

---

**Problem:** `npm run build` fails with `Can't resolve '@/lib/...'` — path alias resolution fails during production build

**What it means:** The `@/` path alias maps to the repository root (the same directory as `package.json`). During `npm run build`, Next.js resolves these aliases using `tsconfig.json`. If `tsconfig.json` is missing, malformed, or the `paths` configuration has been removed, the `@/` alias is undefined and every import using it fails.

**Fix:**
1. Confirm `tsconfig.json` exists in the repository root:
   ```
   ls tsconfig.json
   ```
2. Open `tsconfig.json` and verify the `paths` configuration is present:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"]
       }
     }
   }
   ```
   If `paths` or `baseUrl` is missing, add them.
3. Confirm `next.config.js` (or `next.config.ts`) does not override path resolution in a way that conflicts with `tsconfig.json`. The recommended setup is to let Next.js pick up path aliases automatically from `tsconfig.json` without additional configuration.
4. Delete `.next/` and rebuild from scratch:
   ```
   rm -rf .next
   npm run build
   ```
   The `.next` cache can sometimes preserve stale module resolution data.

**If none work:** Add the `@/` alias explicitly to `next.config.js` as a fallback:
```js
const path = require('path');
module.exports = {
  webpack(config) {
    config.resolve.alias['@'] = path.resolve(__dirname);
    return config;
  },
};
```
This is a workaround — the underlying `tsconfig.json` issue should still be fixed.

---

**Problem:** `Dynamic require of 'fs' is not supported` when building or running the Next.js app — different from the CLI version of this error

**What it means:** A server-side module that uses Node.js built-ins (`fs`, `path`, `os`) was accidentally imported into a client component or a module that gets bundled for the browser. Next.js separates server and client bundles — client bundles cannot use Node.js APIs. This error means a file like `lib/skills.ts`, `lib/providers/index.ts`, or a utility that uses `fs` was imported (directly or transitively) by a client-side component.

**Fix:**
1. Find where the import chain introduces the `fs`-using module into a client bundle. The build error usually includes a module trace — read it from the bottom up to find the original import.
2. Add the `"use server"` directive to any file that uses `fs` directly, to explicitly mark it as server-only:
   ```typescript
   "use server";
   import fs from "fs";
   ```
   Or use the `server-only` npm package:
   ```typescript
   import "server-only";
   ```
3. If you added a new component, confirm it does not have `"use client"` at the top while also importing a server-side module. Move the data-fetching logic to a server component or a `page.tsx` file that passes data as props.
4. For the CLI specifically (not the Next.js app), see the earlier CLI entry on this error — the cause and fix are different.

**If none work:** Add `"use server"` to all files in `lib/` that use `fs`, `path`, or `os`. This forces Next.js to treat them as server modules and prevents them from being included in any client bundle. Then identify which client component triggered the import chain and extract the server-dependent logic into a server action or API route.

---

## Getting Further Help

If none of the fixes in this guide resolve your problem:

1. **Check the GitHub Issues page** — search for your error message. Many problems have been reported and fixed before.
2. **Open a new issue** — include the full error output (not just the last line), your Node.js version (`node --version`), your npm version (`npm --version`), your operating system, and the exact command you ran.
3. **Include your config** — run `cat ~/.skill-mall/config.json` and redact your API key before sharing. Include the relevant sections of `.env.local` with secrets redacted.
4. **Include the server output** — if the error is in the web app, include the Next.js server terminal output from the moment the error occurred, not just the browser error.

The more context you provide, the faster the issue can be diagnosed and fixed.
