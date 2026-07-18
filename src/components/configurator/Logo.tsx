// Escala brand mark — icon badge + "Escala DS" wordmark lockup.
// Two theme-specific assets ship in /public/escala-ds-logo: the light variant
// (frosted badge + dark wordmark) reads on the light-theme gradient, the dark
// variant (solid-white badge + white wordmark) reads on the dark one. We swap
// via the `.dark` class on <html> so the lockup always sits on enough contrast.
// The height comes from `className` (default h-8); width tracks the aspect ratio.
export default function Logo({ className = 'h-8' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/escala-ds-logo/escala-logo-light.svg"
        alt="Escala DS"
        className="block h-full w-auto dark:hidden"
        draggable={false}
      />
      <img
        src="/escala-ds-logo/escala-logo-dark.svg"
        alt="Escala DS"
        className="hidden h-full w-auto dark:block"
        draggable={false}
      />
    </span>
  )
}
