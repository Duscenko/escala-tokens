import { useDesignStore } from '../store/useDesignStore'

export function generateTokenJSON() {
  const store = useDesignStore.getState()

  return {
    project: store.projectName,
    colors: {
      primitive: store.primaryScale,
      semantic: store.semanticTokens,
    },
    typography: store.typography,
    spacing: store.spacing,
    radius: store.radius,
    components: store.selectedComponents,
  }
}

export function downloadTokenJSON() {
  const tokens = generateTokenJSON()
  const blob = new Blob([JSON.stringify(tokens, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${tokens.project || 'scalable-designs'}-tokens.json`
  a.click()
}
