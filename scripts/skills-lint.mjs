#!/usr/bin/env node
/**
 * skills-lint — validates .claude/skills/ against SKILLS_STANDARDS.md.
 *
 * Checks each skill directory:
 *   - contains a SKILL.md (not <name>.md)
 *   - frontmatter has a non-empty `name` that equals the directory name,
 *     is lowercase/hyphen/digit only, <= 64 chars, and avoids reserved words
 *   - frontmatter has a non-empty `description`
 *   - SKILL.md body is under 500 lines
 *
 * Exit code 0 = all good, 1 = violations found. No external dependencies.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = join(ROOT, '.claude', 'skills');
const RESERVED = ['anthropic', 'claude'];
const MAX_BODY_LINES = 500;
const NAME_RE = /^[a-z0-9-]{1,64}$/;

/** Extract the YAML frontmatter block (between the first two `---` lines). */
function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  const fm = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim();
  }
  return { fm, bodyLines: lines.length - end - 1 };
}

if (!existsSync(SKILLS_DIR)) {
  console.error(`skills-lint: ${SKILLS_DIR} not found`);
  process.exit(1);
}

const dirs = readdirSync(SKILLS_DIR).filter((d) => {
  const p = join(SKILLS_DIR, d);
  return statSync(p).isDirectory();
});

const violations = [];
for (const name of dirs.sort()) {
  const dir = join(SKILLS_DIR, name);
  const skillFile = join(dir, 'SKILL.md');
  const add = (msg) => violations.push(`${name}: ${msg}`);

  if (!existsSync(skillFile)) {
    const stray = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'eval.md');
    add(`missing SKILL.md${stray.length ? ` (found ${stray.join(', ')} — rename to SKILL.md)` : ''}`);
    continue;
  }

  const parsed = parseFrontmatter(readFileSync(skillFile, 'utf8'));
  if (!parsed) {
    add('missing or malformed YAML frontmatter (must start with `---`)');
    continue;
  }
  const { fm, bodyLines } = parsed;

  if (!fm.name) add('frontmatter missing `name`');
  else {
    if (fm.name !== name) add(`name "${fm.name}" != directory "${name}"`);
    if (!NAME_RE.test(fm.name)) add(`name "${fm.name}" must be lowercase letters/digits/hyphens, <=64 chars`);
    if (RESERVED.some((r) => fm.name.toLowerCase().includes(r))) add(`name "${fm.name}" contains a reserved word`);
  }
  if (!fm.description) add('frontmatter missing non-empty `description`');
  if (bodyLines > MAX_BODY_LINES) add(`body ${bodyLines} lines > ${MAX_BODY_LINES} (split into reference/*.md)`);
}

if (violations.length) {
  console.error(`\n✘ skills-lint: ${violations.length} violation(s) across ${dirs.length} skills:\n`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error('\nSee SKILLS_STANDARDS.md for the rules.\n');
  process.exit(1);
}

console.log(`✓ skills-lint: ${dirs.length} skills pass.`);
