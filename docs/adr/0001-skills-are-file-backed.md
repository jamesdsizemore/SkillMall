# Skills are file-backed repository artifacts

SkillMall stores Skills as directories under `skills/<category>/<slug>/`, with `SKILL.md` as the canonical instruction file. We keep the Skill Catalog file-backed so skills are reviewable in Git, deployable by copying files, and usable by multiple AgentSkills-compatible Agents without a package manager or runtime daemon.

**Status:** accepted

**Consequences:** The Skill Catalog module should treat the filesystem as the source of truth. Database rows may add community state and analytics, but they must not become the canonical definition of a Skill.
