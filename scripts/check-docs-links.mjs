#!/usr/bin/env node
// Escala — docs link check.
// Every relative link and every repo path written in backticks inside the repo's Markdown must exist.
// Catches references that silently break when a file moves. No dependencies.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, extname } from "node:path";

const root = process.cwd();
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "storybook-static", ".next", ".turbo", "coverage", "worktrees"]);
// History and test goldens quote old paths on purpose; they are records, not live docs.
const SKIP_PATHS = ["docs/history/", "src/lib/__tests__/__snapshots__/"];
// Short forms the docs use for repo folders: `lib/x.ts` = src/lib/x.ts, `recipes/x.ts` = src/lib/recipes/x.ts, ...
const SHORT_ROOTS = ["src", "src/lib", "src/components", "src/components/escala-ui", "governance", "spec"];
// Paths written in docs as targets that do not exist YET (escala-governance §1 "Repo reality").
const PLANNED = ["tokens/", "packages/ui"];
const FILE_EXT = /\.(md|mdx|json|ya?ml|ts|tsx|js|mjs|cjs|css|html)$/;

function* markdownFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = join(dir, entry.name);
    if (SKIP_PATHS.some((s) => relative(root, p).startsWith(s))) continue;
    if (entry.isDirectory()) yield* markdownFiles(p);
    else if (/\.mdx?$/.test(entry.name)) yield p;
  }
}

const isPlaceholder = (s) => /[<>*{}$|]|\.\.\.|YYYY|<[A-Z]/.test(s) || s.includes(" ");
const isPlanned = (s) => PLANNED.some((p) => s === p || s.startsWith(p.endsWith("/") ? p : p + "/"));

function exists(fromFile, target) {
  const clean = target.split("#")[0].split("?")[0];
  if (!clean) return true;
  const candidates = clean.startsWith("/")
    ? [join(root, clean)]
    : [join(dirname(fromFile), clean), join(root, clean), ...SHORT_ROOTS.map((r) => join(root, r, clean))];
  return candidates.some((c) => existsSync(c));
}

const broken = [];
let checked = 0;

for (const file of markdownFiles(root)) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, ""); // ignore fenced code
  const targets = new Set();

  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const t = m[1];
    if (/^(https?:|mailto:|#)/.test(t)) continue;
    targets.add(t);
  }
  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const t = m[1].trim();
    if (isPlaceholder(t) || /^(https?:|npm |npx |git |claude )/.test(t)) continue;
    // A Figma group name (`Spacing/`, `Radius/`) or a token path is not a file path.
    const figmaName = /^[A-Z][A-Za-z ]*\//.test(t);
    const looksLikePath = !figmaName && t.includes("/") && (FILE_EXT.test(t) || t.endsWith("/"));
    if (looksLikePath && !t.startsWith("~")) targets.add(t);
  }

  for (const t of targets) {
    if (isPlanned(t)) continue;
    checked++;
    if (!exists(file, t)) broken.push(`${rel}: ${t}`);
  }
}

for (const b of broken) console.log(`FAIL  ${b}`);
console.log(`docs links: ${checked} checked, ${broken.length} broken`);
process.exit(broken.length ? 1 : 0);
