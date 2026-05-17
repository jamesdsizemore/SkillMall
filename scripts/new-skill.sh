#!/usr/bin/env bash
# Scaffolds a new skill from the _template directory.
# Usage: bash scripts/new-skill.sh <category> <skill-name>
# Example: bash scripts/new-skill.sh development tdd-enforcer

set -euo pipefail

ROOT="$(dirname "$0")/.."
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if [[ $# -lt 2 ]]; then
  echo "Usage: bash scripts/new-skill.sh <category> <skill-name>"
  echo "Categories: development, design, writing, research, productivity, infrastructure, ai, business"
  exit 1
fi

CATEGORY="$1"
SKILL_NAME="$2"
TEMPLATE="$ROOT/skills/_template"
DEST="$ROOT/skills/$CATEGORY/$SKILL_NAME"

VALID_CATEGORIES="development design writing research productivity infrastructure ai business"
if ! echo "$VALID_CATEGORIES" | grep -qw "$CATEGORY"; then
  echo "Unknown category: $CATEGORY"
  echo "Valid categories: $VALID_CATEGORIES"
  exit 1
fi

# Validate skill name format (lowercase, numbers, hyphens; max 64 chars)
if [[ ! "$SKILL_NAME" =~ ^[a-z0-9-]+$ ]]; then
  echo "Skill name must be lowercase letters, numbers, and hyphens only: $SKILL_NAME"
  exit 1
fi
if [[ ${#SKILL_NAME} -gt 64 ]]; then
  echo "Skill name must be 64 characters or fewer: $SKILL_NAME (${#SKILL_NAME} chars)"
  exit 1
fi

if [[ -d "$DEST" ]]; then
  echo "Skill already exists at: $DEST"
  exit 1
fi

cp -r "$TEMPLATE" "$DEST"

# Remove .gitkeep files from the copy
find "$DEST" -name ".gitkeep" -delete

# Patch SKILL.md with the skill name and category
sed -i.bak "s/^name: skill-name/name: $SKILL_NAME/" "$DEST/SKILL.md"
sed -i.bak "s/^category: development/category: $CATEGORY/" "$DEST/SKILL.md"
sed -i.bak "s/# Skill Name/# $SKILL_NAME/" "$DEST/SKILL.md"
rm -f "$DEST/SKILL.md.bak"

# Patch README.md
sed -i.bak "s/# Skill Name/# $SKILL_NAME/" "$DEST/README.md"
rm -f "$DEST/README.md.bak"

echo -e "${GREEN}Skill scaffolded at: $DEST${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit SKILL.md — fill in description (<150 chars), tags, and instructions"
echo "  2. Edit README.md — describe what the skill produces"
echo "  3. Add templates to resources/templates/"
echo "  4. Add samples to resources/samples/"
echo "  5. Run: bash scripts/validate-skill.sh $DEST"
echo "  6. Commit — AGENTS.md regenerates automatically"
echo ""
echo -e "${YELLOW}Character limits (Claude Code best practice):${NC}"
echo "  name:        max 64 chars  (${#SKILL_NAME} used)"
echo "  description: max 150 chars — put the key trigger phrase FIRST"
echo "  when_to_use: max 150 chars — appended to description in skill listing"
