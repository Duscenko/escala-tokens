#!/usr/bin/env node
// Escala — report first, block later.
// Runs every check listed in governance/gates.json.
//   "report" → a failure is shown as a warning and the build stays green.
//   "gate"   → a failure turns the build red.
// A check is promoted from report to gate only when its baseline is clean AND César agrees.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const { checks } = JSON.parse(readFileSync("governance/gates.json", "utf8"));
const inCI = !!process.env.GITHUB_ACTIONS;
let failedGates = 0;
const summary = [];

for (const c of checks) {
  const run = spawnSync("npm", ["run", "--silent", c.script], { stdio: "inherit", shell: process.platform === "win32" });
  const ok = run.status === 0;
  if (!ok && c.mode === "gate") {
    failedGates++;
    if (inCI) console.log(`::error title=${c.script}::gate failed — ${c.why}`);
  } else if (!ok) {
    if (inCI) console.log(`::warning title=${c.script}::report only — ${c.why}`);
  }
  summary.push(`${ok ? "ok    " : c.mode === "gate" ? "FAIL  " : "warn  "}${c.mode.padEnd(6)} ${c.script}`);
}

console.log("\n" + summary.join("\n"));
process.exit(failedGates ? 1 : 0);
