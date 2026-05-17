#!/usr/bin/env bash
# Searches skills.sh for skills related to a query.
# Called by skill-creator SKILL.md via dynamic context injection.
# Usage: bash find-skills.sh "<search query>"

set -euo pipefail

QUERY="${1:-}"
API_BASE="${SKILLS_API_URL:-https://skills.sh}"
LIMIT=8

if [[ -z "$QUERY" ]]; then
  echo "## skills.sh search"
  echo ""
  echo "No query provided. Skipping skills.sh search."
  echo ""
  exit 0
fi

echo "## skills.sh: skills related to \"$QUERY\""
echo ""

# Call skills.sh search API
RESPONSE=$(curl -sf \
  --max-time 10 \
  --connect-timeout 5 \
  "${API_BASE}/api/search?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")&limit=${LIMIT}" \
  2>/dev/null) || RESPONSE=""

if [[ -z "$RESPONSE" ]]; then
  echo "skills.sh search unavailable (no network or API error). Proceeding without results."
  echo ""
  exit 0
fi

# Parse and format results
COUNT=$(echo "$RESPONSE" | python3 -c "
import json,sys
try:
    data = json.load(sys.stdin)
    skills = data.get('skills', [])
    print(len(skills))
except:
    print(0)
" 2>/dev/null || echo "0")

if [[ "$COUNT" -eq 0 ]]; then
  echo "No skills found on skills.sh for query: \"$QUERY\""
  echo ""
  echo "Proceeding with SkillMall template only."
  exit 0
fi

echo "Found $COUNT related skill(s) on skills.sh:"
echo ""

echo "$RESPONSE" | python3 -c "
import json,sys

try:
    data = json.load(sys.stdin)
    skills = data.get('skills', [])
    for i, s in enumerate(skills, 1):
        name = s.get('name', s.get('id', 'unknown'))[:60]
        source = s.get('source', '')[:80]
        installs = s.get('installs', 0)
        install_str = ''
        if installs >= 1_000_000:
            install_str = f\"{installs/1_000_000:.1f}M installs\"
        elif installs >= 1_000:
            install_str = f\"{installs/1_000:.1f}K installs\"
        elif installs > 0:
            install_str = f\"{installs} installs\"
        print(f'**{i}. {name}**')
        if source:
            print(f'   Source: \`{source}\`')
        if install_str:
            print(f'   {install_str}')
        print()
except Exception as e:
    print(f'Error parsing results: {e}')
" 2>/dev/null

echo ""
echo "---"
echo "Use the patterns and conventions from relevant results above when building the new skill."
echo ""
