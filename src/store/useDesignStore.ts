import { create } from 'zustand'

interface ColorScale {
  [key: number]: string // 1–12 tones
}

interface TypographyTokens {
  fontFamily: string
  sizes: Record<string, string>
  weights: Record<string, number>
}

// ── Fixed neutral scales from the Figma design system ─────────────────────
// These are the foundational gray scales. Everything in UI (text, fields,
// backgrounds, dividers) maps to one of these two neutral palettes.
export const GRAY_LIGHT_SCALE: ColorScale = {
  1: '#fdfdfd', 2: '#fafafa', 3: '#f5f5f5',  4: '#e9eaeb',
  5: '#d5d7da', 6: '#a4a7ae', 7: '#717680',  8: '#535862',
  9: '#414651', 10: '#252b37', 11: '#181d27', 12: '#0a0d12',
}

export const GRAY_DARK_SCALE: ColorScale = {
  1: '#fafafa', 2: '#f7f7f7', 3: '#f0f0f1',  4: '#ececed',
  5: '#cecfd2', 6: '#94979c', 7: '#85888e',  8: '#61656c',
  9: '#373a41', 10: '#22262f', 11: '#13161b', 12: '#0c0e12',
}
// ──────────────────────────────────────────────────────────────────────────

interface DesignStore {
  // Step 1
  projectName: string
  setProjectName: (name: string) => void

  // Step 2 — Brand / accent color (user-defined, generates 12-tone scale)
  primaryColor: string
  primaryScale: ColorScale
  setPrimaryColor: (hex: string) => void
  setPrimaryScale: (scale: ColorScale) => void

  // Step 2 — Semantic state scales (user-adjustable, default from Figma DS)
  errorColor: string
  errorScale: ColorScale
  setErrorColor: (hex: string) => void
  setErrorScale: (scale: ColorScale) => void

  warningColor: string
  warningScale: ColorScale
  setWarningColor: (hex: string) => void
  setWarningScale: (scale: ColorScale) => void

  successColor: string
  successScale: ColorScale
  setSuccessColor: (hex: string) => void
  setSuccessScale: (scale: ColorScale) => void

  infoColor: string
  infoScale: ColorScale
  setInfoColor: (hex: string) => void
  setInfoScale: (scale: ColorScale) => void

  // Step 3 — Semantic tokens
  semanticTokens: Record<string, string>
  setSemanticToken: (key: string, value: string) => void

  // Step 4 — Typography
  typography: TypographyTokens
  setTypography: (t: TypographyTokens) => void

  // Step 5 — Spacing & Radius
  spacing: Record<string, string>
  radius: Record<string, string>
  setSpacing: (s: Record<string, string>) => void
  setRadius: (r: Record<string, string>) => void

  // Step 6 — Style direction
  styleDirection: 'brutalist' | 'organic' | 'material' | null
  setStyleDirection: (s: 'brutalist' | 'organic' | 'material') => void

  // Step 7 — Selected atoms
  selectedAtoms: string[]
  toggleAtom: (atom: string) => void

  // Current step
  currentStep: number
  setCurrentStep: (step: number) => void
}

export const useDesignStore = create<DesignStore>((set) => ({
  projectName: '',
  setProjectName: (name) => set({ projectName: name }),

  // Brand
  primaryColor: '#7f56d9',
  primaryScale: {},
  setPrimaryColor: (hex) => set({ primaryColor: hex }),
  setPrimaryScale: (scale) => set({ primaryScale: scale }),

  // Error (Figma base: error-500 = #f04438)
  errorColor: '#f04438',
  errorScale: {},
  setErrorColor: (hex) => set({ errorColor: hex }),
  setErrorScale: (scale) => set({ errorScale: scale }),

  // Warning (Figma base: warning-500 = #f79009)
  warningColor: '#f79009',
  warningScale: {},
  setWarningColor: (hex) => set({ warningColor: hex }),
  setWarningScale: (scale) => set({ warningScale: scale }),

  // Success (Figma base: success-500 = #17b26a)
  successColor: '#17b26a',
  successScale: {},
  setSuccessColor: (hex) => set({ successColor: hex }),
  setSuccessScale: (scale) => set({ successScale: scale }),

  // Info (Figma base: blue-500 = #2e90fa)
  infoColor: '#2e90fa',
  infoScale: {},
  setInfoColor: (hex) => set({ infoColor: hex }),
  setInfoScale: (scale) => set({ infoScale: scale }),

  semanticTokens: {
    // ── Text ──────────────────────────────────────────────────
    'text-primary': '', 'text-primary_on-brand': '',
    'text-secondary': '', 'text-secondary_hover': '', 'text-secondary_on-brand': '',
    'text-tertiary': '', 'text-tertiary_hover': '', 'text-tertiary_on-brand': '',
    'text-quaternary': '', 'text-quaternary_on-brand': '',
    'text-white': '', 'text-disabled': '',
    'text-placeholder': '', 'text-placeholder_subtle': '',
    'text-brand-primary': '',
    'text-brand-secondary': '', 'text-brand-secondary_hover': '',
    'text-brand-tertiary': '', 'text-brand-tertiary_alt': '',
    'text-error-primary': '', 'text-warning-primary': '', 'text-success-primary': '', 'text-info-primary': '',
    // ── Border ────────────────────────────────────────────────
    'border-primary': '',
    'border-secondary': '', 'border-secondary_alt': '',
    'border-tertiary': '',
    'border-disabled': '', 'border-disabled_subtle': '',
    'border-brand': '', 'border-brand_alt': '',
    'border-error': '', 'border-error_subtle': '',
    // ── Foreground ────────────────────────────────────────────
    'fg-primary': '',
    'fg-secondary': '', 'fg-secondary_hover': '',
    'fg-tertiary': '', 'fg-tertiary_hover': '',
    'fg-quaternary': '', 'fg-quaternary_hover': '',
    'fg-white': '', 'fg-disabled': '', 'fg-disabled_subtle': '',
    'fg-brand-primary': '', 'fg-brand-primary_alt': '',
    'fg-brand-secondary': '', 'fg-brand-secondary_alt': '',
    'fg-error-primary': '', 'fg-error-secondary': '',
    'fg-warning-primary': '', 'fg-warning-secondary': '',
    'fg-success-primary': '', 'fg-success-secondary': '',
    'fg-info-primary': '', 'fg-info-secondary': '',
    // ── Background ────────────────────────────────────────────
    'bg-primary': '', 'bg-primary_alt': '', 'bg-primary_hover': '',
    'bg-primary-solid': '',
    'bg-secondary': '', 'bg-secondary_alt': '', 'bg-secondary_hover': '', 'bg-secondary_subtle': '',
    'bg-secondary-solid': '',
    'bg-tertiary': '', 'bg-quaternary': '',
    'bg-active': '', 'bg-disabled': '', 'bg-disabled_subtle': '', 'bg-overlay': '',
    'bg-brand-primary': '', 'bg-brand-primary_alt': '',
    'bg-brand-secondary': '',
    'bg-brand-solid': '', 'bg-brand-solid_hover': '',
    'bg-brand-section': '', 'bg-brand-section_subtle': '',
    'bg-error-primary': '', 'bg-error-secondary': '', 'bg-error-solid': '',
    'bg-warning-primary': '', 'bg-warning-secondary': '', 'bg-warning-solid': '',
    'bg-success-primary': '', 'bg-success-secondary': '', 'bg-success-solid': '',
    'bg-info-primary': '', 'bg-info-secondary': '', 'bg-info-solid': '',
  },
  setSemanticToken: (key, value) =>
    set((state) => ({
      semanticTokens: { ...state.semanticTokens, [key]: value },
    })),

  typography: {
    fontFamily: 'Inter',
    sizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '24px', '2xl': '32px' },
    weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  },
  setTypography: (t) => set({ typography: t }),

  spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '6': '24px', '8': '32px' },
  radius: { none: '0px', sm: '4px', md: '8px', lg: '12px', full: '9999px' },
  setSpacing: (s) => set({ spacing: s }),
  setRadius: (r) => set({ radius: r }),

  styleDirection: null,
  setStyleDirection: (s) => set({ styleDirection: s }),

  selectedAtoms: [],
  toggleAtom: (atom) =>
    set((state) => ({
      selectedAtoms: state.selectedAtoms.includes(atom)
        ? state.selectedAtoms.filter((a) => a !== atom)
        : [...state.selectedAtoms, atom],
    })),

  currentStep: 1,
  setCurrentStep: (step) => set({ currentStep: step }),
}))
