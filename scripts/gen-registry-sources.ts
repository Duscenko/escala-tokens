// Regenerates src/lib/registry/escalaUiSources.generated.ts — the component
// sources the shadcn registry (`/r/<name>.json`) serves. Run after editing
// anything in src/components/escala-ui/.
import { writeFileSync } from 'node:fs'
import { GENERATED_PATH, readEscalaUiSources, renderGeneratedModule } from './registrySources'

const sources = readEscalaUiSources(process.cwd())
writeFileSync(GENERATED_PATH, renderGeneratedModule(sources))
console.log(`${GENERATED_PATH}: ${sources.length} files`)
