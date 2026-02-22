#!/bin/bash

# Bauspec — GitHub repo setup
# Usage: ./setup-repo.sh <github-username> [repo-name]
#
# Prerequisites:
#   - gh CLI installed and authenticated (gh auth login)
#   - git installed

set -e

USERNAME="${1:?Usage: ./setup-repo.sh <github-username> [repo-name]}"
REPO_NAME="${2:-bauspec}"

echo ""
echo "Creating GitHub repo: $USERNAME/$REPO_NAME"
echo ""

# 1. Initialize git
git init
git add .
git commit -m "Initial commit — Bauspec v1.0.0"

# 2. Create the GitHub repo (public, with description)
gh repo create "$REPO_NAME" \
  --public \
  --description "Zero-dependency spec-driven development. Turn brainstorms into agent-executable specs." \
  --source . \
  --remote origin \
  --push

# 3. Mark as a template repo (for the "Use this template" button)
gh api -X PATCH "repos/$USERNAME/$REPO_NAME" \
  -f is_template=true \
  --silent

# 4. Set topics
gh repo edit "$USERNAME/$REPO_NAME" \
  --add-topic spec-driven-development \
  --add-topic ai-coding \
  --add-topic developer-tools \
  --add-topic prd \
  --add-topic claude-code \
  --add-topic cursor \
  --add-topic sdd

echo ""
echo "✓ Repo created: https://github.com/$USERNAME/$REPO_NAME"
echo "✓ Marked as template repo"
echo "✓ Topics added"
echo ""
echo "Next steps:"
echo "  1. Replace YOUR_USERNAME with $USERNAME in README.md, install.sh, package.json"
echo "     sed -i 's/YOUR_USERNAME/$USERNAME/g' README.md install.sh package.json bin/bauspec.mjs"
echo "  2. npm publish (when ready)"
echo ""