#!/usr/bin/env bash
# Validates SKILL.md frontmatter against SkillMall character limits and required fields.
# Usage:
#   bash scripts/validate-skill.sh                   # validate all skills
#   bash scripts/validate-skill.sh skills/dev/foo   # validate one skill directory
#   bash scripts/validate-skill.sh --strict          # exit 1 on any warning

set -euo pipefail

STRICT=false
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=true ;;
    *) TARGET="$arg" ;;
  esac
done

SKILLS_DIR="$(dirname "$0")/../skills"
ERRORS=0
WARNINGS=0

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

# Character limits
# AgentSkills spec: name ≤ 64, description ≤ 1024
# Claude Code best practice: description ≤ 150 (skillListingBudgetFraction truncation)
NAME_MAX=64          # AgentSkills spec hard limit
DESC_MAX=1024        # AgentSkills spec hard limit
DESC_WARN=150        # Claude Code efficiency threshold — warn if exceeded
WHEN_MAX=150         # Claude Code when_to_use limit (CC-only field)

get_field() {
  local file="$1" key="$2"
  awk -v key="$key" '
    /^---$/ { count++; next }
    count == 1 && $0 ~ "^"key":" {
      sub("^"key":[[:space:]]*", ""); print; exit
    }
    count == 2 { exit }
  ' "$file" | tr -d '"'
}

validate_file() {
  local file="$1"
  local rel="${file#"$SKILLS_DIR/"}"
  local file_errors=0
  local file_warnings=0

  # Check required fields
  local name; name=$(get_field "$file" "name")
  local description; description=$(get_field "$file" "description")
  local version; version=$(get_field "$file" "version")
  local category; category=$(get_field "$file" "category")
  local author; author=$(get_field "$file" "author")

  if [[ -z "$name" ]]; then
    echo -e "${RED}ERROR${NC} $rel: missing required field 'name'"
    ((ERRORS++)); ((file_errors++))
  else
    local name_len=${#name}
    if [[ $name_len -gt $NAME_MAX ]]; then
      echo -e "${RED}ERROR${NC} $rel: 'name' is $name_len chars (max $NAME_MAX): \"$name\""
      ((ERRORS++)); ((file_errors++))
    fi
    # Validate format: lowercase, numbers, hyphens only
    if [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
      echo -e "${RED}ERROR${NC} $rel: 'name' must be lowercase letters, numbers, and hyphens only: \"$name\""
      ((ERRORS++)); ((file_errors++))
    fi
  fi

  if [[ -z "$description" ]]; then
    echo -e "${YELLOW}WARN${NC}  $rel: missing required field 'description' (AgentSkills spec)"
    ((WARNINGS++)); ((file_warnings++))
  else
    local desc_len=${#description}
    if [[ $desc_len -gt $DESC_MAX ]]; then
      echo -e "${RED}ERROR${NC} $rel: 'description' is $desc_len chars (spec max $DESC_MAX)"
      echo -e "       \"${description:0:80}...\""
      ((ERRORS++)); ((file_errors++))
    elif [[ $desc_len -gt $DESC_WARN ]]; then
      echo -e "${YELLOW}WARN${NC}  $rel: 'description' is $desc_len chars — Claude Code may truncate above $DESC_WARN"
      ((WARNINGS++)); ((file_warnings++))
    fi
  fi

  local when_to_use; when_to_use=$(get_field "$file" "when_to_use")
  if [[ -n "$when_to_use" ]]; then
    local when_len=${#when_to_use}
    if [[ $when_len -gt $WHEN_MAX ]]; then
      echo -e "${RED}ERROR${NC} $rel: 'when_to_use' is $when_len chars (max $WHEN_MAX)"
      ((ERRORS++)); ((file_errors++))
    fi
  fi

  if [[ -z "$version" ]]; then
    echo -e "${YELLOW}WARN${NC}  $rel: missing field 'version'"
    ((WARNINGS++)); ((file_warnings++))
  fi

  if [[ -z "$category" ]]; then
    echo -e "${YELLOW}WARN${NC}  $rel: missing field 'category'"
    ((WARNINGS++)); ((file_warnings++))
  fi

  if [[ -z "$author" ]]; then
    echo -e "${YELLOW}WARN${NC}  $rel: missing field 'author'"
    ((WARNINGS++)); ((file_warnings++))
  fi

  # Check README exists
  local dir; dir=$(dirname "$file")
  if [[ ! -f "$dir/README.md" ]]; then
    echo -e "${YELLOW}WARN${NC}  $rel: missing README.md"
    ((WARNINGS++)); ((file_warnings++))
  fi

  if [[ $file_errors -eq 0 && $file_warnings -eq 0 ]]; then
    echo -e "${GREEN}OK${NC}    $rel"
  fi
}

# Collect skill files
if [[ -n "$TARGET" ]]; then
  if [[ -f "$TARGET/SKILL.md" ]]; then
    skill_files=("$TARGET/SKILL.md")
  elif [[ -f "$TARGET" ]]; then
    skill_files=("$TARGET")
  else
    echo "No SKILL.md found at: $TARGET"
    exit 1
  fi
else
  mapfile -t skill_files < <(find "$SKILLS_DIR" -name "SKILL.md" ! -path "*/_template/*" | sort)
fi

if [[ ${#skill_files[@]} -eq 0 ]]; then
  echo -e "${CYAN}No skills found to validate.${NC}"
  exit 0
fi

echo ""
echo -e "${CYAN}Validating ${#skill_files[@]} skill(s)...${NC}"
echo ""

for file in "${skill_files[@]}"; do
  validate_file "$file"
done

echo ""
echo -e "Results: ${GREEN}$(( ${#skill_files[@]} - ERRORS ))${NC} valid · ${RED}$ERRORS error(s)${NC} · ${YELLOW}$WARNINGS warning(s)${NC}"
echo ""

if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}Validation failed. Fix errors before publishing.${NC}"
  exit 1
fi

if [[ $STRICT == true && $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}Strict mode: warnings treated as errors.${NC}"
  exit 1
fi

echo -e "${GREEN}All skills valid.${NC}"
