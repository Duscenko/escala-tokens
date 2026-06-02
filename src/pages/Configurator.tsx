import { useDesignStore } from '../store/useDesignStore'
import Step1_ProjectName from '../components/configurator/Step1_ProjectName'
import Step2_ColorPalette from '../components/configurator/Step2_ColorPalette'
import Step3_SemanticTokens from '../components/configurator/Step3_SemanticTokens'
import Step4_Typography from '../components/configurator/Step4_Typography'
import Step5_SpacingRadius from '../components/configurator/Step5_SpacingRadius'
import Step6_StyleDirection from '../components/configurator/Step6_StyleDirection'
import Step7_AtomSelector from '../components/configurator/Step7_AtomSelector'
import Step8_Export from '../components/configurator/Step8_Export'

const STEPS = [
  { id: 1, label: 'Project Name' },
  { id: 2, label: 'Color Palette' },
  { id: 3, label: 'Semantic Tokens' },
  { id: 4, label: 'Typography' },
  { id: 5, label: 'Spacing & Radius' },
  { id: 6, label: 'Style Direction' },
  { id: 7, label: 'Select Atoms' },
  { id: 8, label: 'Export' },
]

export default function Configurator() {
  const { currentStep, setCurrentStep, projectName, styleDirection, selectedAtoms } = useDesignStore()

  const canContinue =
    currentStep === 1 ? projectName.trim().length > 0 :
    currentStep === 6 ? styleDirection !== null :
    currentStep === 7 ? selectedAtoms.length > 0 :
    true

  const nextStep = STEPS[currentStep] // index = currentStep since STEPS is 1-indexed in .id but 0-indexed in array

  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-32">

      {/* Step indicator — clickable for completed steps */}
      <div className="flex gap-1.5 mb-10">
        {STEPS.map((step) => {
          const isCompleted = step.id < currentStep
          const isCurrent = step.id === currentStep
          return (
            <button
              key={step.id}
              title={step.label}
              onClick={() => isCompleted && setCurrentStep(step.id)}
              disabled={!isCompleted}
              aria-label={`${step.label}${isCompleted ? ' — click to return' : ''}`}
              className={[
                'h-1 flex-1 rounded-full transition-all duration-300',
                isCompleted
                  ? 'bg-violet-500 hover:bg-violet-400 cursor-pointer'
                  : isCurrent
                  ? 'bg-violet-500'
                  : 'bg-neutral-800',
              ].join(' ')}
            />
          )
        })}
      </div>

      {/* Step counter + label */}
      <div className="flex items-baseline gap-3 mb-3 overflow-hidden">
        <span className="text-xs font-mono text-neutral-500 tabular-nums tracking-wider uppercase whitespace-nowrap shrink-0">
          {currentStep} / {STEPS.length}
        </span>
        <span className="text-xs text-neutral-700 truncate">
          {STEPS.slice(currentStep).map(s => s.label).join('  ·  ')}
        </span>
      </div>
      <h1 className="text-3xl font-semibold mb-10 text-white">
        {STEPS[currentStep - 1].label}
      </h1>

      {/* Intro banner — only on step 1 */}
      {currentStep === 1 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-5 py-4 mb-8 flex flex-col gap-2">
          <p className="text-sm text-neutral-300 leading-relaxed">
            Generate a complete design token system — colors, semantic roles, typography, spacing, and component atoms.
            Outputs <code className="text-violet-400 text-xs px-1 py-0.5 rounded bg-neutral-800">tokens.json</code>,{' '}
            <code className="text-violet-400 text-xs px-1 py-0.5 rounded bg-neutral-800">variables.css</code>, and{' '}
            <code className="text-violet-400 text-xs px-1 py-0.5 rounded bg-neutral-800">README.md</code>.
          </p>
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span>8 steps</span>
            <span>·</span>
            <span>~10 min</span>
            <span>·</span>
            <span>Progress saved automatically</span>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="min-h-[300px]">
        {currentStep === 1 && <Step1_ProjectName />}
        {currentStep === 2 && <Step2_ColorPalette />}
        {currentStep === 3 && <Step3_SemanticTokens />}
        {currentStep === 4 && <Step4_Typography />}
        {currentStep === 5 && <Step5_SpacingRadius />}
        {currentStep === 6 && <Step6_StyleDirection />}
        {currentStep === 7 && <Step7_AtomSelector />}
        {currentStep === 8 && <Step8_Export />}
      </div>

      {/* Navigation — sticky at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800/60 bg-neutral-950/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-5 py-2 rounded-lg border border-neutral-800 text-neutral-400 disabled:opacity-30 hover:border-neutral-600 hover:text-neutral-300 transition text-sm"
          >
            ← Back
          </button>

          {currentStep === 7 && selectedAtoms.length === 0 && (
            <span className="text-xs text-neutral-600">Select at least one atom to continue</span>
          )}

          {currentStep < STEPS.length && (
            <button
              onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
              disabled={!canContinue}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
            >
              {canContinue && nextStep
                ? `Continue → ${nextStep.label}`
                : 'Continue'}
            </button>
          )}

          {currentStep === STEPS.length && (
            <button
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2 rounded-lg border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300 transition text-sm"
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
