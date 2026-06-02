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
  const { currentStep, setCurrentStep, projectName, styleDirection } = useDesignStore()

  const canContinue =
    currentStep === 1 ? projectName.trim().length > 0 :
    currentStep === 6 ? styleDirection !== null :
    true

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step indicator */}
      <div className="flex gap-2 mb-12">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              step.id <= currentStep ? 'bg-blue-500' : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-neutral-500 text-sm mb-2">
        Step {currentStep} of {STEPS.length}
      </p>
      <h1 className="text-3xl font-semibold mb-10">
        {STEPS[currentStep - 1].label}
      </h1>

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

      {/* Navigation */}
      <div className="flex justify-between mt-12">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6 py-2 rounded-lg border border-neutral-800 text-neutral-400 disabled:opacity-30 hover:border-neutral-600 transition"
        >
          Back
        </button>
        {currentStep < STEPS.length && (
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
            disabled={!canContinue}
            className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
