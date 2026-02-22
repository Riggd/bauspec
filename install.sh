#!/bin/bash

# Bauspec — Shell installer (no npm required)
# Usage: curl -sSL https://raw.githubusercontent.com/riggd/bauspec/main/install.sh | bash
# Or:    ./install.sh [target-dir]

set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

SPECS_DIR="${1:-specs}"
REPO_URL="https://github.com/riggd/bauspec"

success() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
info() { echo -e "  ${CYAN}ℹ${NC} $1"; }

echo ""
echo -e "  ${BOLD}Bauspec${NC}"
echo -e "  ${DIM}Zero-dependency spec-driven development${NC}"
echo ""

# Check if target exists
if [ -d "$SPECS_DIR" ]; then
  warn "Directory ${BOLD}${SPECS_DIR}/${NC} already exists."
  info "Pass a different name: ./install.sh my-specs"
  echo ""
  exit 1
fi

# Try degit first (fastest, no .git directory)
if command -v degit &> /dev/null; then
  echo -e "  ${BOLD}Installing via degit...${NC}"
  degit "$REPO_URL/templates" "$SPECS_DIR" --force
  success "Templates installed to ${BOLD}${SPECS_DIR}/${NC}"

# Try git clone with sparse checkout (only templates/)
elif command -v git &> /dev/null; then
  echo -e "  ${BOLD}Installing via git...${NC}"
  TEMP_DIR=$(mktemp -d)
  git clone --depth 1 --filter=blob:none --sparse "$REPO_URL.git" "$TEMP_DIR" 2>/dev/null
  cd "$TEMP_DIR"
  git sparse-checkout set templates 2>/dev/null
  cd - > /dev/null
  cp -r "$TEMP_DIR/templates" "$SPECS_DIR"
  rm -rf "$TEMP_DIR"
  success "Templates installed to ${BOLD}${SPECS_DIR}/${NC}"

# Fallback: curl individual files
else
  echo -e "  ${BOLD}Installing via curl...${NC}"
  mkdir -p "$SPECS_DIR"
  BASE="https://raw.githubusercontent.com/riggd/bauspec/main/templates"
  
  for file in constitution.md 01-braindump.md 02-prd.md 03-architecture.md 04-stories.md; do
    curl -sSL "$BASE/$file" -o "$SPECS_DIR/$file"
    success "Downloaded $file"
  done
fi

# Create directories
mkdir -p "$SPECS_DIR/features"
mkdir -p "$SPECS_DIR/drafts"
success "Created ${BOLD}${SPECS_DIR}/features/${NC}"
success "Created ${BOLD}${SPECS_DIR}/drafts/${NC}"

# Update .gitignore
if [ -f ".gitignore" ]; then
  if ! grep -q "${SPECS_DIR}/drafts" .gitignore 2>/dev/null; then
    echo -e "\n# Bauspec drafts (braindumps before review)\n${SPECS_DIR}/drafts/" >> .gitignore
    success "Added ${BOLD}${SPECS_DIR}/drafts/${NC} to .gitignore"
  fi
else
  echo -e "# Bauspec drafts (braindumps before review)\n${SPECS_DIR}/drafts/" > .gitignore
  success "Created .gitignore with drafts exclusion"
fi

# Detect agent configs
echo ""
echo -e "  ${BOLD}Scanning for AI agent configurations...${NC}"
echo ""

FOUND_AGENTS=0

if [ -f "CLAUDE.md" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}CLAUDE.md${NC} — add Bauspec context:"
  echo -e "  ${DIM}  # Bauspec Specs"
  echo -e "  Project specs live in \`${SPECS_DIR}/\`. Always read"
  echo -e "  \`${SPECS_DIR}/constitution.md\` before making changes.${NC}"
  echo ""
fi

if [ -f ".cursorrules" ] || [ -d ".cursor/rules" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}Cursor rules${NC} — add Bauspec awareness:"
  echo -e "  ${DIM}  Always read \`${SPECS_DIR}/constitution.md\` for project"
  echo -e "  principles before generating code.${NC}"
  echo ""
fi

if [ -f "AGENTS.md" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}AGENTS.md${NC} (Gemini/Antigravity) — add Bauspec context:"
  echo -e "  ${DIM}  # Project Specifications"
  echo -e "  All specs are in \`${SPECS_DIR}/\`. Start with"
  echo -e "  \`${SPECS_DIR}/constitution.md\` for project principles.${NC}"
  echo ""
fi

if [ -f ".github/copilot-instructions.md" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}GitHub Copilot instructions${NC} — add Bauspec reference"
  echo ""
fi

if [ -d "agent-os" ] || [ -d ".agent-os" ]; then
  FOUND_AGENTS=1
  info "Found ${BOLD}Agent OS${NC} — Bauspec complements it (specs vs standards)"
  echo ""
fi

if [ -d ".specify" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}GitHub Spec Kit${NC} — Bauspec can coexist or replace it"
  echo ""
fi

if [ -d "openspec" ]; then
  FOUND_AGENTS=1
  warn "Found ${BOLD}OpenSpec${NC} — Bauspec can coexist or replace it"
  echo ""
fi

if [ $FOUND_AGENTS -eq 0 ]; then
  info "No AI agent configs found. Point any agent at ${BOLD}${SPECS_DIR}/${NC} to get started."
fi

# Next steps
echo ""
echo -e "  ${BOLD}─────────────────────────────────────${NC}"
echo -e "  ${BOLD}Next steps:${NC}"
echo ""
echo -e "  1. ${GREEN}Fill in${NC} ${BOLD}${SPECS_DIR}/constitution.md${NC}"
echo -e "  2. ${GREEN}Braindump${NC} into ${BOLD}${SPECS_DIR}/01-braindump.md${NC}"
echo -e "  3. ${GREEN}Hand off${NC} to your AI agent for PRD → Architecture → Stories"
echo ""
