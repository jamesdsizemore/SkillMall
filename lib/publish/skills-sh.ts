// skills.sh publisher
// TODO: Full OAuth flow implementation blocked pending public documentation of skills.sh OAuth endpoints.
// The pre-publish validation and SKILL.md frontmatter update are fully implemented.
// The OAuth flow is stubbed with a clear error message.

import { computeQualityScore } from "../quality-score";
import type { Skill } from "../skills";
import path from "path";
import fs from "fs";

export interface PublishValidationResult {
  valid: boolean;
  errors: Array<{ check: string; message: string }>;
}

/** Run all pre-publish validation checks. All 4 must pass before OAuth flow opens. */
export function validateForPublish(
  skill: Skill,
  allSkillSlugs: Set<string>
): PublishValidationResult {
  const errors: Array<{ check: string; message: string }> = [];

  // 1. Quality score >= 70
  const score = computeQualityScore(skill, allSkillSlugs);
  if (score.total < 70) {
    errors.push({
      check: "quality_score",
      message: `Quality score ${score.total}/100 is below the minimum 70 required for publishing`,
    });
  }

  // 2. Description <= 1024 chars
  if (skill.description.length > 1024) {
    errors.push({
      check: "description_length",
      message: `Description is ${skill.description.length} chars (max 1024)`,
    });
  }

  // 3. Skill name matches directory name
  const dirName = path.basename(path.dirname(skill.path));
  if (skill.name !== dirName) {
    errors.push({
      check: "name_matches_dir",
      message: `Skill name "${skill.name}" does not match directory name "${dirName}"`,
    });
  }

  // 4. License field present
  if (!skill.license) {
    errors.push({
      check: "license_present",
      message: 'metadata.license field is required for publishing (e.g., "MIT")',
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Update SKILL.md frontmatter with skills.sh metadata after successful publish. */
export function updateFrontmatterAfterPublish(
  skillPath: string,
  fullPath: string,
  skillsShId: string,
  skillsShUrl: string
): void {
  const content = fs.readFileSync(fullPath, "utf-8");

  const updated = content.includes("metadata:")
    ? content.replace(
        /^(metadata:\n)/m,
        `$1  skills_sh_id: "${skillsShId}"\n  skills_sh_url: "${skillsShUrl}"\n`
      )
    : content;

  fs.writeFileSync(fullPath, updated, "utf-8");
}

/** Open the skills.sh OAuth flow. */
export async function openSkillsShOAuth(): Promise<string> {
  // TODO: Implement when skills.sh OAuth endpoints are publicly documented.
  // Expected flow:
  // 1. GET https://skills.sh/oauth/authorize?client_id=...&redirect_uri=...&state=...
  // 2. Open in browser
  // 3. Listen on local redirect URI for callback
  // 4. Exchange code for token at POST https://skills.sh/oauth/token
  // 5. Return access token
  throw new Error(
    "skills.sh OAuth flow not yet implemented. " +
      "The skills.sh OAuth endpoint documentation is required to complete this feature. " +
      "Pre-publish validation passes — resume this command once the OAuth integration is implemented."
  );
}

/** Publish a skill to skills.sh. */
export async function publishToSkillsSh(
  skill: Skill,
  accessToken: string
): Promise<{ id: string; url: string }> {
  // TODO: Implement POST to skills.sh publish API when endpoints are documented.
  void skill;
  void accessToken;
  throw new Error("skills.sh publish API not yet implemented.");
}
