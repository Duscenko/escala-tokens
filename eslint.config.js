import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // `.claude/worktrees` holds nested git worktrees — full checkouts of this
  // repo, each with its own tsconfig. Linting them makes typescript-eslint see
  // several candidate roots and fail to parse every file in the project.
  // `test-fixtures/upstream-generate-radix-colors.ts` is vendored upstream code
  // (see NOTICE). Its `let`s and `@ts-nocheck` are deliberate: satisfying lint
  // would make it no longer upstream's algorithm, which is the only thing it is
  // here to be.
  globalIgnores([
    'dist',
    'cli/dist',
    '.claude/worktrees',
    'test-fixtures/upstream-generate-radix-colors.ts',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['src/cli/**/*.ts', 'scripts/**/*.{ts,mjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
