#!/usr/bin/env bash
# Regenerates AGENTS.md by scanning all SKILL.md files in skills/.
# Called automatically by the Husky pre-commit hook when skills/ changes.
# Run manually: bash scripts/sync-agents.sh

set -euo pipefail

SKILLS_DIR="$(dirname "$0")/../skills"
OUTPUT="$(dirname "$0")/../AGENTS.md"

# Read frontmatter value for a given key from a SKILL.md file
get_field() {
  local file="$1" key="$2"
  sed -n "/^---$/,/^---$/p" "$file" | grep "^${key}:" | head -1 | sed "s/^${key}: *//" | tr -d '"'
}

# Build a markdown list of tags from SKILL.md frontmatter
get_tags() {
  local file="$1"
  awk '/^---$/{f++} f==1 && /^  - /{print "  "$0}' "$file" | sed 's/^  - /`/' | sed 's/$/`/' | paste -sd ' ' -
}

# Collect all SKILL.md paths, sorted by category then name
mapfile -t skill_files < <(find "$SKILLS_DIR" -name "SKILL.md" ! -path "*/_template/*" | sort)

if [[ ${#skill_files[@]} -eq 0 ]]; then
  skill_count=0
else
  skill_count=${#skill_files[@]}
fi

declare -A categories

for file in "${skill_files[@]}"; do
  category=$(get_field "$file" "category")
  category="${category:-uncategorized}"
  categories["$category"]+="$file "
done

# Write header
cat > "$OUTPUT" << 'HEADER'
<!-- AUTO-GENERATED — do not edit manually. Run `bash scripts/sync-agents.sh` or commit a skill to regenerate. -->

# AGENTS.md — SkillMall Skill Catalog

This file is the agent-readable index of every skill in SkillMall.
Load the SKILL.md for any skill listed here to activate it in Claude Code.

## How to Use a Skill

```
# In Claude Code, invoke any skill by name:
/skill-name

# Or reference the SKILL.md path directly:
~/.claude/skills/<category>/<skill-name>/SKILL.md
```

## Skill Categories

HEADER

# Add category list
for cat in $(echo "${!categories[@]}" | tr ' ' '\n' | sort); do
  count=$(echo "${categories[$cat]}" | tr ' ' '\n' | grep -c "SKILL.md" || true)
  echo "- [\`$cat\`](#$cat) — $count skill(s)" >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Add per-category sections
for cat in $(echo "${!categories[@]}" | tr ' ' '\n' | sort); do
  echo "## $cat" >> "$OUTPUT"
  echo "" >> "$OUTPUT"

  for file in ${categories[$cat]}; do
    name=$(get_field "$file" "name")
    description=$(get_field "$file" "description")
    version=$(get_field "$file" "version")
    author=$(get_field "$file" "author")
    rel_path=$(echo "$file" | sed "s|$(dirname "$0")/../||")

    echo "### \`$name\`" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "$description" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    echo "| Field | Value |" >> "$OUTPUT"
    echo "|-------|-------|" >> "$OUTPUT"
    echo "| Version | $version |" >> "$OUTPUT"
    echo "| Author | $author |" >> "$OUTPUT"
    echo "| Path | \`$rel_path\` |" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  done
done

# Write footer
cat >> "$OUTPUT" << FOOTER

---

*Generated $(date -u "+%Y-%m-%d %H:%M UTC") — $skill_count skill(s) indexed.*
FOOTER

echo "AGENTS.md regenerated: $skill_count skill(s) across ${#categories[@]} categories."
