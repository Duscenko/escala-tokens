You are running one iteration of an unattended refactor loop in the Escala repo (`escala-tokens`).

1. Read `refactor/QUEUE.md`. If the "Project commands" block is empty, read `package.json` (root and `apps/*`), fill in the real script names, commit that alone, and stop this iteration.
2. Take the FIRST `- [ ]` task only. Do not start a second task.
3. Before writing code:
   - Load the `escala-architecture` skill if it is available. Components read roles, never primitives, hex or free px. Names are identical in Figma, React and Storybook (PascalCase components, `size` / `state` / `variant` props).
   - If the Figma MCP is available, read the Development annotation of the matching component set in file `7j5zukN5HpihGVJMmyjA20` and follow its "Refactor in code" line. The Figma file wins over the code.
4. Implement the task with the smallest change that satisfies it. Keep public component names and props stable; add a story or update the existing one for every component you touch.
5. Run lint, typecheck, test and the Storybook build from the Project commands block. Fix failures caused by your change. Never disable a rule or skip a test to get green.
6. If green: tick the task (`- [x]`, append the short commit hash after committing), then `git add -A && git commit -m "refactor(escala-ui): <task id> <summary>"`. If a task is too big for one iteration, finish a coherent part, tick it and add a new `- [ ]` task right below it with what is left.
7. If you cannot get green after two attempts, or the task needs a decision that is not in the queue, the Figma annotation or the architecture skill: revert your changes for this task (`git checkout -- .`), mark it `- [!]` with one line saying why, commit only `refactor/QUEUE.md`, and stop.
8. Flag in the commit body any place where the request departs from scalable design-system practice.
9. Never push, never touch `main`, never edit files outside the repo.
