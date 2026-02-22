#!/usr/bin/env node

/**
 * Bauspec — zero-dependency installer
 * 
 * Usage:
 *   npx bauspec init          # Install templates into ./specs
 *   npx bauspec init --dir custom-dir
 *   npx bauspec add feature-name  # Scaffold a new feature
 */

import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, appendFileSync, statSync } from 'fs';
import { join, resolve, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PKG_ROOT = resolve(__dirname, '..');
const TEMPLATES_DIR = join(PKG_ROOT, 'templates');

// ─── Colors (no dependencies) ───────────────────────────────────────────────

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function success(msg) { log(`  ${c.green('✓')} ${msg}`); }
function warn(msg) { log(`  ${c.yellow('⚠')} ${msg}`); }
function info(msg) { log(`  ${c.cyan('ℹ')} ${msg}`); }
function error(msg) { log(`  ${c.red('✗')} ${msg}`); }

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function fileExists(path) {
  return existsSync(path);
}

// ─── Stack Detection ────────────────────────────────────────────────────────

function detectStack(projectRoot) {
  const detected = {
    stack: [],
    language: null,
    framework: null,
    styling: null,
    database: null,
    auth: null,
    deployment: null,
    packageManager: null,
  };

  // Package manager
  if (fileExists(join(projectRoot, 'bun.lockb'))) detected.packageManager = 'bun';
  else if (fileExists(join(projectRoot, 'pnpm-lock.yaml'))) detected.packageManager = 'pnpm';
  else if (fileExists(join(projectRoot, 'yarn.lock'))) detected.packageManager = 'yarn';
  else if (fileExists(join(projectRoot, 'package-lock.json'))) detected.packageManager = 'npm';

  // Read package.json if it exists
  const pkgPath = join(projectRoot, 'package.json');
  let pkg = {};
  if (fileExists(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {}
  }

  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Language
  if (fileExists(join(projectRoot, 'tsconfig.json')) || allDeps['typescript']) {
    detected.language = 'TypeScript';
    // Check strict mode
    try {
      const tsconfig = JSON.parse(readFileSync(join(projectRoot, 'tsconfig.json'), 'utf-8'));
      if (tsconfig.compilerOptions?.strict) detected.stack.push('TypeScript strict mode');
    } catch {}
  } else if (fileExists(join(projectRoot, 'package.json'))) {
    detected.language = 'JavaScript';
  } else if (fileExists(join(projectRoot, 'requirements.txt')) || fileExists(join(projectRoot, 'pyproject.toml'))) {
    detected.language = 'Python';
  } else if (fileExists(join(projectRoot, 'go.mod'))) {
    detected.language = 'Go';
  } else if (fileExists(join(projectRoot, 'Cargo.toml'))) {
    detected.language = 'Rust';
  }

  // Framework detection (JS/TS ecosystem)
  if (allDeps['next']) detected.framework = `Next.js${allDeps['next'] ? ' ' + allDeps['next'].replace('^', '').replace('~', '') : ''}`;
  else if (allDeps['nuxt']) detected.framework = 'Nuxt';
  else if (allDeps['@remix-run/node'] || allDeps['remix']) detected.framework = 'Remix';
  else if (allDeps['svelte'] || allDeps['@sveltejs/kit']) detected.framework = 'SvelteKit';
  else if (allDeps['astro']) detected.framework = 'Astro';
  else if (allDeps['express']) detected.framework = 'Express';
  else if (allDeps['fastify']) detected.framework = 'Fastify';
  else if (allDeps['react'] && !allDeps['next']) detected.framework = 'React (CRA/Vite)';
  else if (allDeps['vue'] && !allDeps['nuxt']) detected.framework = 'Vue';

  // Python frameworks
  if (detected.language === 'Python') {
    const reqPath = join(projectRoot, 'requirements.txt');
    let reqs = '';
    if (fileExists(reqPath)) reqs = readFileSync(reqPath, 'utf-8');
    if (reqs.includes('django') || fileExists(join(projectRoot, 'manage.py'))) detected.framework = 'Django';
    else if (reqs.includes('fastapi')) detected.framework = 'FastAPI';
    else if (reqs.includes('flask')) detected.framework = 'Flask';
  }

  // Styling
  if (allDeps['tailwindcss'] || fileExists(join(projectRoot, 'tailwind.config.js')) || fileExists(join(projectRoot, 'tailwind.config.ts'))) {
    detected.styling = 'Tailwind CSS';
  } else if (allDeps['styled-components']) detected.styling = 'styled-components';
  else if (allDeps['@emotion/react']) detected.styling = 'Emotion';

  // Database
  if (allDeps['@supabase/supabase-js']) detected.database = 'Supabase (Postgres)';
  else if (allDeps['@prisma/client'] || fileExists(join(projectRoot, 'prisma/schema.prisma'))) detected.database = 'Prisma';
  else if (allDeps['drizzle-orm']) detected.database = 'Drizzle ORM';
  else if (allDeps['mongoose']) detected.database = 'MongoDB (Mongoose)';
  else if (allDeps['pg']) detected.database = 'PostgreSQL (pg)';
  else if (allDeps['better-sqlite3']) detected.database = 'SQLite';

  // Auth
  if (allDeps['@supabase/ssr'] || allDeps['@supabase/auth-helpers-nextjs']) detected.auth = 'Supabase Auth';
  else if (allDeps['next-auth'] || allDeps['@auth/core']) detected.auth = 'NextAuth / Auth.js';
  else if (allDeps['@clerk/nextjs']) detected.auth = 'Clerk';
  else if (allDeps['lucia']) detected.auth = 'Lucia Auth';
  else if (allDeps['passport']) detected.auth = 'Passport.js';

  // Deployment hints
  if (fileExists(join(projectRoot, 'vercel.json')) || fileExists(join(projectRoot, '.vercel'))) detected.deployment = 'Vercel';
  else if (fileExists(join(projectRoot, 'netlify.toml'))) detected.deployment = 'Netlify';
  else if (fileExists(join(projectRoot, 'fly.toml'))) detected.deployment = 'Fly.io';
  else if (fileExists(join(projectRoot, 'Dockerfile'))) detected.deployment = 'Docker';
  else if (fileExists(join(projectRoot, 'railway.json'))) detected.deployment = 'Railway';

  // Validation
  if (allDeps['zod']) detected.stack.push('Zod');
  if (allDeps['joi']) detected.stack.push('Joi');

  // Testing
  if (allDeps['vitest']) detected.stack.push('Vitest');
  else if (allDeps['jest']) detected.stack.push('Jest');
  if (allDeps['@playwright/test']) detected.stack.push('Playwright');
  if (allDeps['cypress']) detected.stack.push('Cypress');

  return detected;
}

function prefillConstitution(templatePath, detected, outputPath) {
  let content = readFileSync(templatePath, 'utf-8');

  // Fill in detected values
  if (detected.framework && detected.language) {
    const stackParts = [detected.framework, detected.language, detected.styling, detected.database].filter(Boolean);
    content = content.replace(
      /- \*\*Stack:\*\* \[e\.g\..*?\]/,
      `- **Stack:** ${stackParts.join(', ')}`
    );
  }

  if (detected.language === 'TypeScript') {
    content = content.replace(
      /- \*\*Language rules:\*\* \[e\.g\..*?\]/,
      `- **Language rules:** TypeScript strict mode, no \`any\` types`
    );
  }

  if (detected.database) {
    content = content.replace(
      /- \*\*Data layer:\*\* \[e\.g\..*?\]/,
      `- **Data layer:** ${detected.database}`
    );
  }

  if (detected.auth) {
    content = content.replace(
      /- \*\*Auth:\*\* \[e\.g\..*?\]/,
      `- **Auth:** ${detected.auth}`
    );
  }

  if (detected.deployment) {
    content = content.replace(
      /- \*\*Deployment:\*\* \[e\.g\..*?\]/,
      `- **Deployment:** ${detected.deployment}`
    );
  }

  if (detected.framework) {
    content = content.replace(
      /- \*\*Architecture pattern:\*\* \[e\.g\..*?\]/,
      `- **Architecture pattern:** [Fill in — e.g., server components, MVC, hexagonal]`
    );
  }

  writeFileSync(outputPath, content);
}

// ─── Agent Config Detection ─────────────────────────────────────────────────

function detectAgentConfigs(projectRoot) {
  const configs = [];

  const checks = [
    { path: 'CLAUDE.md', agent: 'Claude Code', type: 'instructions' },
    { path: '.claude/settings.json', agent: 'Claude Code', type: 'settings' },
    { path: '.claude/skills', agent: 'Claude Code', type: 'skills directory' },
    { path: '.cursorrules', agent: 'Cursor', type: 'rules' },
    { path: '.cursor/rules', agent: 'Cursor', type: 'rules directory' },
    { path: '.windsurfrules', agent: 'Windsurf', type: 'rules' },
    { path: '.github/copilot-instructions.md', agent: 'GitHub Copilot', type: 'instructions' },
    { path: '.github/agents', agent: 'GitHub Copilot', type: 'agents directory' },
    { path: 'AGENTS.md', agent: 'Gemini / Antigravity', type: 'instructions' },
    { path: '.gemini', agent: 'Gemini', type: 'config directory' },
    { path: '.antigravity', agent: 'Antigravity', type: 'config directory' },
    { path: 'agent-os', agent: 'Agent OS', type: 'installation' },
    { path: '.agent-os', agent: 'Agent OS (legacy)', type: 'installation' },
    { path: '.specify', agent: 'GitHub Spec Kit', type: 'installation' },
    { path: 'openspec', agent: 'OpenSpec', type: 'installation' },
    { path: '.bmad', agent: 'BMAD-METHOD', type: 'installation' },
    { path: '.roomodes', agent: 'Roo Code', type: 'config' },
    { path: '.continuerules', agent: 'Continue', type: 'rules' },
  ];

  for (const check of checks) {
    if (fileExists(join(projectRoot, check.path))) {
      configs.push(check);
    }
  }

  return configs;
}

function generateAgentSuggestions(configs, specsDir) {
  const suggestions = [];
  const relativeSpecs = specsDir.replace(process.cwd() + '/', '');

  for (const config of configs) {
    switch (config.agent) {
      case 'Claude Code':
        if (config.type === 'instructions') {
          suggestions.push({
            agent: 'Claude Code',
            file: config.path,
            action: 'Add Bauspec context to CLAUDE.md',
            snippet: `\n# Bauspec Specs\nProject specifications live in \`${relativeSpecs}/\`. Always read \`${relativeSpecs}/constitution.md\` before making changes. When implementing features, follow the stories in \`${relativeSpecs}/04-stories.md\` or the relevant feature folder under \`${relativeSpecs}/features/\`.`,
          });
        }
        if (config.type === 'skills directory') {
          suggestions.push({
            agent: 'Claude Code',
            file: config.path,
            action: 'Consider adding a Bauspec skill',
            snippet: `Create \`.claude/skills/bauspec.md\` that teaches Claude to read and follow your specs directory structure.`,
          });
        }
        break;

      case 'Cursor':
        suggestions.push({
          agent: 'Cursor',
          file: config.path,
          action: `Add Bauspec awareness to ${config.path}`,
          snippet: `\nAlways read \`${relativeSpecs}/constitution.md\` for project principles before generating code. Implementation stories are in \`${relativeSpecs}/04-stories.md\`.`,
        });
        break;

      case 'GitHub Copilot':
        suggestions.push({
          agent: 'GitHub Copilot',
          file: config.path,
          action: `Add Bauspec context to ${config.path}`,
          snippet: `\nProject specs and architecture decisions are documented in \`${relativeSpecs}/\`. Refer to \`${relativeSpecs}/constitution.md\` for coding standards and constraints.`,
        });
        break;

      case 'Gemini / Antigravity':
        suggestions.push({
          agent: config.agent,
          file: config.path,
          action: `Add Bauspec context to ${config.path}`,
          snippet: `\n# Project Specifications\nAll product requirements, architecture decisions, and implementation stories are in \`${relativeSpecs}/\`. Start with \`${relativeSpecs}/constitution.md\` for project principles.`,
        });
        break;

      case 'Agent OS':
      case 'Agent OS (legacy)':
        suggestions.push({
          agent: config.agent,
          file: config.path,
          action: 'Bauspec can coexist with Agent OS',
          snippet: `Agent OS manages coding standards; Bauspec manages product specs and stories. They complement each other. Consider adding your Bauspec constitution principles as Agent OS standards.`,
        });
        break;

      case 'GitHub Spec Kit':
      case 'OpenSpec':
      case 'BMAD-METHOD':
        suggestions.push({
          agent: config.agent,
          file: config.path,
          action: `Existing SDD framework detected: ${config.agent}`,
          snippet: `You already have ${config.agent} installed. Bauspec can replace it (simpler, lighter) or coexist alongside it. If replacing, you may want to migrate any existing specs into the Bauspec format.`,
        });
        break;

      default:
        suggestions.push({
          agent: config.agent,
          file: config.path,
          action: `Add Bauspec reference to ${config.path}`,
          snippet: `Add a note pointing to \`${relativeSpecs}/constitution.md\` for project principles and constraints.`,
        });
    }
  }

  return suggestions;
}

// ─── .gitignore Update ──────────────────────────────────────────────────────

function updateGitignore(projectRoot, specsDir) {
  const gitignorePath = join(projectRoot, '.gitignore');
  const relativeDrafts = specsDir.replace(projectRoot + '/', '') + '/drafts';
  const entry = `\n# Bauspec drafts (braindumps before review)\n${relativeDrafts}/\n`;

  if (fileExists(gitignorePath)) {
    const content = readFileSync(gitignorePath, 'utf-8');
    if (content.includes(relativeDrafts)) {
      return false; // Already present
    }
    appendFileSync(gitignorePath, entry);
    return true;
  } else {
    writeFileSync(gitignorePath, entry.trimStart());
    return true;
  }
}

// ─── Commands ───────────────────────────────────────────────────────────────

function commandInit(args) {
  const projectRoot = process.cwd();
  const dirFlag = args.indexOf('--dir');
  const specsName = dirFlag !== -1 && args[dirFlag + 1] ? args[dirFlag + 1] : 'specs';
  const specsDir = resolve(projectRoot, specsName);

  log('');
  log(c.bold('  Bauspec'));
  log(c.dim('  Zero-dependency spec-driven development'));
  log('');

  // 1. Check if specs dir already exists
  if (fileExists(specsDir)) {
    warn(`Directory ${c.bold(specsName + '/')} already exists.`);
    info('Use a different name with --dir <name>, or delete the existing directory.');
    log('');
    process.exit(1);
  }

  // 2. Copy templates
  log(c.bold('  Setting up templates...'));
  copyDir(TEMPLATES_DIR, specsDir);
  mkdirSync(join(specsDir, 'features'), { recursive: true });
  mkdirSync(join(specsDir, 'drafts'), { recursive: true });
  success(`Created ${c.bold(specsName + '/')} with all templates`);
  success(`Created ${c.bold(specsName + '/features/')} for future feature specs`);
  success(`Created ${c.bold(specsName + '/drafts/')} for work-in-progress braindumps`);

  // 3. Detect stack and pre-fill constitution
  log('');
  log(c.bold('  Detecting project stack...'));
  const detected = detectStack(projectRoot);

  const detectedItems = [
    detected.language && `Language: ${detected.language}`,
    detected.framework && `Framework: ${detected.framework}`,
    detected.styling && `Styling: ${detected.styling}`,
    detected.database && `Database: ${detected.database}`,
    detected.auth && `Auth: ${detected.auth}`,
    detected.deployment && `Deploy: ${detected.deployment}`,
    detected.packageManager && `Package manager: ${detected.packageManager}`,
    ...detected.stack.map(s => `Tool: ${s}`),
  ].filter(Boolean);

  if (detectedItems.length > 0) {
    for (const item of detectedItems) {
      success(item);
    }
    prefillConstitution(
      join(specsDir, 'constitution.md'),
      detected,
      join(specsDir, 'constitution.md')
    );
    success('Pre-filled constitution.md with detected stack');
  } else {
    info('No project files detected — constitution.md left as blank template');
  }

  // 4. Update .gitignore
  log('');
  log(c.bold('  Updating .gitignore...'));
  if (updateGitignore(projectRoot, specsDir)) {
    success(`Added ${c.bold(specsName + '/drafts/')} to .gitignore`);
  } else {
    info('Already in .gitignore');
  }

  // 5. Detect agent configs
  log('');
  log(c.bold('  Scanning for AI agent configurations...'));
  const agentConfigs = detectAgentConfigs(projectRoot);

  if (agentConfigs.length === 0) {
    info('No AI agent configs found. Bauspec works with any agent — just point it at your specs/ folder.');
  } else {
    log('');
    const agents = [...new Set(agentConfigs.map(c => c.agent))];
    success(`Found ${agents.length} agent config(s): ${agents.join(', ')}`);

    const suggestions = generateAgentSuggestions(agentConfigs, specsDir);

    log('');
    log(c.bold('  Recommended agent config updates:'));
    log('');

    for (const suggestion of suggestions) {
      log(`  ${c.cyan('─')} ${c.bold(suggestion.agent)} ${c.dim(`(${suggestion.file})`)}`);
      log(`    ${suggestion.action}`);
      if (suggestion.snippet.includes('\n')) {
        log('');
        for (const line of suggestion.snippet.split('\n')) {
          log(`    ${c.dim(line)}`);
        }
      } else {
        log(`    ${c.dim(suggestion.snippet)}`);
      }
      log('');
    }
  }

  // 6. Print next steps
  log('');
  log(c.bold('  ─────────────────────────────────────'));
  log(c.bold('  Next steps:'));
  log('');
  log(`  1. ${c.green('Fill in')} ${c.bold(specsName + '/constitution.md')} — your project's non-negotiable rules`);
  log(`  2. ${c.green('Braindump')} into ${c.bold(specsName + '/01-braindump.md')} — messy is fine`);
  log(`  3. ${c.green('Hand off')} to your AI agent to generate the PRD, architecture, and stories`);
  log('');
  log(c.dim('  For new features:'));
  log(`     npx bauspec add ${c.dim('feature-name')}`);
  log('');
}

function commandAdd(args) {
  const projectRoot = process.cwd();
  const featureName = args[0];

  if (!featureName) {
    error('Please provide a feature name: npx bauspec add <feature-name>');
    process.exit(1);
  }

  // Find the specs dir
  let specsDir = null;
  for (const candidate of ['specs', 'spec', 'specifications']) {
    if (fileExists(join(projectRoot, candidate, 'constitution.md'))) {
      specsDir = join(projectRoot, candidate);
      break;
    }
  }

  if (!specsDir) {
    error('No specs directory found. Run `npx bauspec init` first.');
    process.exit(1);
  }

  const featureDir = join(specsDir, 'features', featureName);

  if (fileExists(featureDir)) {
    error(`Feature ${c.bold(featureName)} already exists at ${featureDir}`);
    process.exit(1);
  }

  log('');
  log(c.bold(`  Adding feature: ${featureName}`));
  log('');

  mkdirSync(featureDir, { recursive: true });

  // Copy only the templates needed for a feature (not architecture — use project-level)
  const featureTemplates = ['01-braindump.md', '02-prd.md', '04-stories.md'];
  for (const tmpl of featureTemplates) {
    copyFileSync(join(TEMPLATES_DIR, tmpl), join(featureDir, tmpl));
  }

  success(`Created ${c.bold(`features/${featureName}/`)}`);
  success('Copied: 01-braindump.md, 02-prd.md, 04-stories.md');
  info('Architecture doc skipped — use the project-level one.');
  log('');
  log(`  Start by filling in ${c.bold(`features/${featureName}/01-braindump.md`)}`);
  log('');
}

function commandHelp() {
  log('');
  log(c.bold('  Bauspec') + c.dim(' — zero-dependency spec-driven development'));
  log('');
  log('  Usage:');
  log('');
  log(`    npx bauspec ${c.cyan('init')}                  Set up specs/ in current project`);
  log(`    npx bauspec ${c.cyan('init')} --dir <name>     Use a custom directory name`);
  log(`    npx bauspec ${c.cyan('add')} <feature-name>    Scaffold a new feature`);
  log(`    npx bauspec ${c.cyan('help')}                  Show this help`);
  log('');
  log('  The pipeline:');
  log('');
  log(`    ${c.dim('Braindump')} → ${c.bold('PRD')} → ${c.bold('Architecture')} → ${c.bold('Stories')} → ${c.dim('Agent executes')}`);
  log(`    ${c.dim('(messy)')}     ${c.dim('(what)')}   ${c.dim('(how)')}           ${c.dim('(do it)')}`);
  log('');
  log(c.dim('  https://github.com/riggd/bauspec'));
  log('');
}

// ─── Main ───────────────────────────────────────────────────────────────────

const [,, command, ...args] = process.argv;

switch (command) {
  case 'init':
    commandInit(args);
    break;
  case 'add':
    commandAdd(args);
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    commandHelp();
    break;
  default:
    error(`Unknown command: ${command}`);
    commandHelp();
    process.exit(1);
}
