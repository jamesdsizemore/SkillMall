# Using the Skill Creation Wizard

The Skill Creation Wizard is the browser-based interface for creating skills using the full research pipeline. It walks through 6 steps: topic input, research confirmation, metadata, preview, prompt options, and directory confirmation.

## Prerequisites

- SkillMall running locally (`npm run dev`) or deployed
- An LLM provider configured (see [Configuring Providers](configuring-providers.md))

---

## Step 1: Topic Input

Navigate to `/skills/create`.

Enter the domain, methodology, or workflow you want to create a skill for. Examples:

- Blue Ocean Strategy
- Jobs-to-Be-Done Customer Interviews
- Incident Postmortem Facilitation

**Source URLs (optional):** click `[ + ADD SOURCE URL ]` to add one or more authoritative URLs. The Research Engine fetches these and extracts tools from the actual content. Without URLs, the engine uses training knowledge and marks the result as unverified.

**Providing URLs produces significantly more accurate skills.** Use the official methodology website, documentation page, or canonical reference.

Click `[ RESEARCH TOPIC → ]` to start the research call.

---

## Step 2: Research Confirmation (non-skippable)

The Research Engine returns a list of extracted tools. Each tool card shows:

- Tool name and logical category
- Artifact type (matrix, canvas, grid, list, flowchart, analysis)
- Expand `[ DETAILS ]` to see inputs, outputs, and procedure

**Review this carefully.** No files are written until you confirm.

**Add more tools:** tools beyond the first 5 are behind `[ + ADD MORE TOOLS ]`. Click to expand.

**The Continue button (`[ CONFIRM RESEARCH → ]`) stays disabled until you have expanded DETAILS on at least one tool card.** This ensures you have reviewed the extraction before proceeding.

Click `[ CONFIRM RESEARCH → ]` to advance.

---

## Step 3: Metadata

Select the catalog category for this skill. Tags are pre-populated from the research result. Edit them as needed.

- **Category:** choose the most specific applicable category
- **Tags:** 3-6 tags, lowercase-hyphenated. These appear on skill cards and power search.

Click `[ PREVIEW SKILL → ]` to generate the `SKILL.md` preview. This runs the Skill Builder without writing files to disk. If preview generation fails or does not produce a valid `SKILL.md`, the wizard stays on Step 3 and shows the error.

---

## Step 4: SKILL.md Preview

A preview of the generated `SKILL.md` content. This is the actual generated file, shown as editable text. The `description` field is automatically generated from the research summary. The character count is shown.

You can edit the content directly in the text area. Edits are saved in wizard state, survive back/next navigation, and are sent to the later prompt preview and final create steps. If the edited `SKILL.md` fails validation, final creation stops before writing files.

Click `[ SELECT PROMPTS → ]` to continue.

---

## Step 5: Prompt Options

Select which meta prompt types to include. All 5 standard types are pre-selected:

| Type | Complexity |
|---|---|
| Comprehensive Analysis | Exhaustive |
| Quick Assessment | Quick |
| Stakeholder Presentation | Thorough |
| First Principles Exploration | Thorough |
| Competitive Response | Thorough |

Uncheck any you don't need. The estimated total prompt count updates as you adjust.

Click `[ PREVIEW DIRECTORY → ]` to run the full Skill Builder and Prompt Engine (this triggers LLM calls for each tool). The reviewed `SKILL.md` content from Step 4 is included in this request, so the directory preview reflects your edited skill file.

---

## Step 6: Directory Confirmation

A complete file list shows every file that will be written. Expand any file to preview its content.

Click `[ CREATE SKILL ]` to write all files atomically. The reviewed `SKILL.md` content from Step 4 is used for the final write. If validation fails, the wizard returns to the relevant step with the specific error highlighted and no partial files are written.

On success, you are redirected to the new skill's detail page.

---

## Browser Refresh Recovery

The wizard state is saved to `sessionStorage` on every step. If you refresh the browser mid-wizard, your progress is restored from the last saved state. If the saved state is corrupted, the wizard resets to Step 1.

---

## Troubleshooting

**"No LLM provider configured"** — Configure a provider at `/settings/providers` before creating skills.

**Research fails** — Check that your source URLs are accessible. If all URLs fail, the wizard shows an error; provide different URLs or proceed without them.

**Step 2 Continue stays disabled** — Expand the DETAILS section on at least one tool card.

**Step 4 preview is blank or fails to load** — The wizard only advances from Step 3 after the server generates a valid `SKILL.md`. If it stays on Step 3, read the error shown there and check the development server logs for the `/api/preview-skill` request.
