#!/usr/bin/env node
/**
 * `pnpm check:docs` — audits the documentation set and the repository for the failure modes
 * that ordinary linting cannot see.
 *
 * Documentation rots silently. A broken link, a stale claim or a leaked secret does not fail
 * a build, so it survives until someone follows it and wastes an hour — or worse.
 *
 * What this checks, and why each one is here:
 *
 *   1. BROKEN RELATIVE LINKS. The documentation is heavily cross-linked; a rename breaks
 *      links in files nobody thought to open.
 *   2. OBSIDIAN PLUGIN SYNTAX. `docs/` must stay readable in GitHub, in any editor and by an
 *      AI agent. Wikilinks and Dataview queries break that (ADR-0017).
 *   3. SECRETS. A committed secret is in every clone, fork and CI cache forever. The only
 *      real fix is rotation, so catching it before the commit matters.
 *   4. FORBIDDEN ARTEFACTS. `.cursorrules`, committed Obsidian state.
 *   5. `.env` MUST BE GIT-IGNORED.
 *   6. GAMEPLAY LEAKAGE. Guards the "no gameplay before CW-0002" constraint.
 *
 * Deliberately NOT part of `pnpm verify`: this is an audit, run periodically and before a
 * release, not on every change. A gate that fails for a link in an unrelated document is a
 * gate people learn to ignore.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const EXCLUDED =
  "-not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/.next/*' -not -path '*/.turbo/*'";

function findFiles(nameExpr) {
  return execSync(`find ${ROOT} -type f ${nameExpr} ${EXCLUDED}`, { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);
}

/**
 * Strips fenced blocks and inline code spans before scanning prose.
 *
 * Without this, a document that *describes* forbidden syntax — "never use `[[wikilinks]]`" —
 * is flagged as containing it. The rule is about using them, not about naming them.
 */
function prose(content) {
  return content.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

const relative = (file) => file.replace(`${ROOT}/`, '');

// ─────────────────────────────────────────────────────────── 1. broken links
const markdownFiles = findFiles("-name '*.md'");
const brokenLinks = [];
const linkPattern = /\[[^\]]*\]\((?!https?:|mailto:|#)([^)#]+)(#[^)]*)?\)/g;

for (const file of markdownFiles) {
  for (const match of prose(readFileSync(file, 'utf8')).matchAll(linkPattern)) {
    const target = resolve(dirname(file), match[1]);
    // A link to a directory is valid when that directory has a README.
    if (!existsSync(target) && !existsSync(join(target, 'README.md'))) {
      brokenLinks.push(`${relative(file)} → ${match[1]}`);
    }
  }
}

// ──────────────────────────────────────────────── 2. Obsidian plugin syntax
const obsidianIssues = [];
for (const file of markdownFiles.filter((f) => f.includes('/docs/'))) {
  const content = prose(readFileSync(file, 'utf8'));
  if (/\[\[[^\]]+\]\]/.test(content)) obsidianIssues.push(`${relative(file)}: wikilink`);
  if (/```dataview/.test(content)) obsidianIssues.push(`${relative(file)}: dataview query`);
  if (/<%[^%]*%>/.test(content)) obsidianIssues.push(`${relative(file)}: templater syntax`);
}

// ───────────────────────────────────────────────────────── 3. secret scanning
const sourceFiles = findFiles(
  "\\( -name '*.ts' -o -name '*.tsx' -o -name '*.mjs' -o -name '*.json' -o -name '*.yml' -o -name '*.md' \\)",
);

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'private key'],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/sk_live_[A-Za-z0-9]{20,}/, 'Stripe live key'],
  [/eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\./, 'JWT'],
];

const secrets = [];
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8');
  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(content)) secrets.push(`${relative(file)}: ${label}`);
  }
}

// ─────────────────────────────────────────────────── 4. forbidden artefacts
const forbidden = ['.cursorrules', '.cursorignore'].filter((entry) => existsSync(join(ROOT, entry)));
try {
  const trackedObsidian = execSync(`git -C ${ROOT} ls-files docs/.obsidian`, { encoding: 'utf8' }).trim();
  if (trackedObsidian) forbidden.push('docs/.obsidian (tracked in git)');
} catch {
  // Ignore git command failure if not a repo
}

// ────────────────────────────────────────────── 5. .env must be git-ignored
let envIgnored = false;
try {
  execSync(`git -C ${ROOT} check-ignore .env`, { stdio: 'pipe' });
  envIgnored = true;
} catch {
  // `check-ignore` exits non-zero when the path is NOT ignored — or when .env does not
  // exist, which is equally fine.
  envIgnored = !existsSync(join(ROOT, '.env'));
}

// ───────────────────────────────────────────── 6. gameplay leakage guard
const GAMEPLAY_PATTERN =
  /\b(damageFormula|attackPower|creatureRoster|dropTable|speciesData|SEED_CREATURES|MATERIALS_LIST)\b/;

const gameplay = sourceFiles
  .filter((file) => file.includes('/packages/') || file.includes('/apps/'))
  .filter((file) => GAMEPLAY_PATTERN.test(readFileSync(file, 'utf8')))
  .map(relative);

// ─────────────────────────────────────────────────────────────────── report
function section(label, items) {
  if (items.length === 0) {
    console.log(`  ✔ ${label}`);
    return false;
  }
  console.log(`  ✖ ${label} — ${items.length}`);
  for (const item of items.slice(0, 20)) console.log(`      ${item}`);
  if (items.length > 20) console.log(`      … and ${items.length - 20} more`);
  return true;
}

console.log(`\nCollection War — documentation and repository audit`);
console.log(`  ${markdownFiles.length} markdown files, ${sourceFiles.length} source files\n`);

const failures = [
  section('No broken relative links', brokenLinks),
  section('No Obsidian plugin syntax', obsidianIssues),
  section('No secrets detected', secrets),
  section('No forbidden artefacts', forbidden),
  section('No gameplay implementation', gameplay),
  section('.env is git-ignored', envIgnored ? [] : ['.env is NOT git-ignored']),
].filter(Boolean);

if (failures.length > 0) {
  console.error(`\n✖ ${failures.length} check(s) failed.\n`);
  process.exit(1);
}

console.log('\n✔ All checks passed.\n');
