import { useTheme, toggleTheme } from '../../lib/theme'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.00004 1.33334V2.66668M8.00004 13.3333V14.6667M2.66671 8.00001H1.33337M4.20945 4.20942L3.26664 3.26661M11.7906 4.20942L12.7334 3.26661M4.20945 11.7933L3.26664 12.7362M11.7906 11.7933L12.7334 12.7362M14.6667 8.00001H13.3334M11.3334 8.00001C11.3334 9.84096 9.84099 11.3333 8.00004 11.3333C6.15909 11.3333 4.66671 9.84096 4.66671 8.00001C4.66671 6.15906 6.15909 4.66668 8.00004 4.66668C9.84099 4.66668 11.3334 6.15906 11.3334 8.00001Z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1.33333L12.4119 2.15705C12.5889 2.51104 12.6774 2.68803 12.7956 2.8414C12.9005 2.9775 13.0225 3.09951 13.1586 3.20442C13.312 3.32264 13.489 3.41114 13.843 3.58813L14.6667 3.99999L13.843 4.41186C13.489 4.58885 13.312 4.67735 13.1586 4.79557C13.0225 4.90048 12.9005 5.02249 12.7956 5.15859C12.6774 5.31196 12.5889 5.48895 12.4119 5.84294L12 6.66666L11.5882 5.84294C11.4112 5.48895 11.3227 5.31196 11.2045 5.15859C11.0996 5.02249 10.9775 4.90048 10.8414 4.79557C10.6881 4.67735 10.5111 4.58885 10.1571 4.41186L9.33337 3.99999L10.1571 3.58813C10.5111 3.41114 10.6881 3.32264 10.8414 3.20442C10.9775 3.09951 11.0996 2.9775 11.2045 2.8414C11.3227 2.68803 11.4112 2.51104 11.5882 2.15705L12 1.33333Z" />
      <path d="M14 8.92619C13.126 10.4593 11.4764 11.493 9.58534 11.493C6.78076 11.493 4.50721 9.21944 4.50721 6.41488C4.50721 4.52369 5.54103 2.87395 7.07437 1.99999C3.85324 2.30541 1.33337 5.01794 1.33337 8.31902C1.33337 11.8247 4.17532 14.6667 7.68104 14.6667C10.982 14.6667 13.6944 12.1471 14 8.92619Z" />
    </svg>
  )
}

export default function ThemeToggle() {
  const theme = useTheme()
  return (
    <>
      {/* Phones: single compact toggle */}
      <button
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        className="sm:hidden p-1.5 rounded-full border border-line bg-app/70 backdrop-blur-sm text-fg-muted hover:text-fg transition-colors"
      >
        {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
      </button>

      {/* sm+: segmented sun | moon pill */}
      <div className="hidden sm:flex items-center gap-0.5 p-1 rounded-full border border-line bg-app/70 backdrop-blur-sm">
        <button
          onClick={() => theme === 'dark' && toggleTheme()}
          aria-label="Light theme"
          aria-pressed={theme === 'light'}
          className={`p-1.5 rounded-full transition-all ${theme === 'light' ? 'bg-elevated shadow-sm text-fg' : 'text-fg-faint hover:text-fg-muted'}`}
        >
          <SunIcon />
        </button>
        <button
          onClick={() => theme === 'light' && toggleTheme()}
          aria-label="Dark theme"
          aria-pressed={theme === 'dark'}
          className={`p-1.5 rounded-full transition-all ${theme === 'dark' ? 'bg-elevated shadow-sm text-fg' : 'text-fg-faint hover:text-fg-muted'}`}
        >
          <MoonIcon />
        </button>
      </div>
    </>
  )
}
