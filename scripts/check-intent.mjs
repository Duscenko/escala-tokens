#!/usr/bin/env node
// Escala — intent check.
// Every component in spec/contracts/index.json should have an owner-approved intent file
// (spec/intent/<Key>.intent.json): what it is for, what it is not for, who sets each state, a11y promises.
// No dependencies. Exit 1 on any problem; run it through scripts/run-gates.mjs so it can start as a report.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const intentDir = join(root, "spec/intent");
const indexPath = join(root, "spec/contracts/index.json");

const problems = [];
const notes = [];

function contractKeys() {
  if (!existsSync(indexPath)) {
    notes.push("spec/contracts/index.json not found — coverage not checked");
    return null;
  }
  const raw = JSON.parse(readFileSync(indexPath, "utf8"));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.components) ? raw.components : Object.keys(raw);
  // spec/contracts/index.json lists blocks too (kind: "block"); intents are for components only.
  return new Set(
    list
      .filter((e) => typeof e === "string" || (e.kind ?? "component") === "component")
      .map((e) => (typeof e === "string" ? e : e.key ?? e.name ?? e.component))
      .filter(Boolean),
  );
}

const keys = contractKeys();
const files = existsSync(intentDir) ? readdirSync(intentDir).filter((f) => f.endsWith(".intent.json")) : [];
const seen = new Set();
const SETBY = new Set(["user", "app", "both", "component"]);

for (const file of files) {
  const where = `spec/intent/${file}`;
  let doc;
  try {
    doc = JSON.parse(readFileSync(join(intentDir, file), "utf8"));
  } catch (e) {
    problems.push(`${where}: invalid JSON (${e.message})`);
    continue;
  }
  const name = file.replace(/\.intent\.json$/, "");
  seen.add(name);
  if (doc.component !== name) problems.push(`${where}: "component" is "${doc.component}", file says "${name}"`);
  if (keys && !keys.has(name)) problems.push(`${where}: no contract "${name}" in spec/contracts/index.json`);
  if (typeof doc.purpose !== "string" || doc.purpose.length < 20) problems.push(`${where}: purpose missing or too short`);
  if (!Array.isArray(doc.notFor) || doc.notFor.length === 0) problems.push(`${where}: notFor needs at least one case`);
  for (const nf of doc.notFor ?? []) {
    if (!nf.case || !nf.use) problems.push(`${where}: each notFor needs "case" and "use"`);
    else if (nf.use !== "none" && keys && !keys.has(nf.use))
      problems.push(`${where}: notFor points to "${nf.use}", which is not an Escala component`);
  }
  const undecided = [];
  for (const [state, s] of Object.entries(doc.states ?? {})) {
    if (!SETBY.has(s.setBy)) problems.push(`${where}: state "${state}" setBy must be user | app | both | component`);
    if (!s.visual) problems.push(`${where}: state "${state}" has no visual (write NOT DECIDED if unknown)`);
    if (s.visual === "NOT DECIDED") undecided.push(state);
  }
  if (!doc.a11y?.role || !doc.a11y?.keyboard) problems.push(`${where}: a11y needs role and keyboard`);
  if (undecided.length && !(doc.openQuestions ?? []).length)
    problems.push(`${where}: ${undecided.join(", ")} NOT DECIDED but openQuestions is empty`);
  if (doc.approval?.status !== "approved") notes.push(`${name}: awaiting César's approval`);
}

if (keys) for (const k of keys) if (!seen.has(k)) problems.push(`${k}: no intent file (spec/intent/${k}.intent.json)`);

for (const n of notes) console.log(`note  ${n}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(`intent: ${seen.size} files, ${keys ? keys.size : "?"} contracts, ${problems.length} problems`);
process.exit(problems.length ? 1 : 0);
