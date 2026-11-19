// Demo wiring of the two Auth setup blocks: a mocked platform authenticator and a mocked authenticator app. The Storybook
// `Flow` stories and the platform's "open the dialog" both play these. They are not part of the blocks: a product gives the
// hooks its own `navigator.credentials.create()` and its own code check.
import * as React from 'react'
import { Toaster, showToast } from '../toast'
import { AuthPasskeySetup, AuthTwoFactorSetup, useAuthPasskeySetup, useAuthTwoFactorSetup, type AuthSetupBlockProps } from './authSetup'

// Stand-ins for the network, not motion: how long the mocked server takes to save a credential or check a code.
const SAVE_DELAY = 1200
const CHECK_DELAY = 900
/** A TOTP code lives 30 seconds. */
const PERIOD = 30
/** The codes the mocked app shows, one per period (the first is the file's). */
const APP_CODES = ['440 912', '318 205', '907 164']

const wait = (delay: number) => new Promise<void>((resolve) => { setTimeout(resolve, delay) })

export interface AuthPasskeySetupDemoProps extends AuthSetupBlockProps {
  /** `error`: the first request is cancelled, as a dismissed platform prompt would be; Try again then succeeds. */
  outcome?: 'success' | 'error'
  onDone?: (name: string) => void
}

/** AuthPasskeySetup with a mocked WebAuthn request: it stays pending until the sensor is clicked. */
export function AuthPasskeySetupDemo({ outcome = 'success', onDone, ...shell }: AuthPasskeySetupDemoProps) {
  const prompt = React.useRef<{ resolve: (credential: unknown) => void; reject: (reason: Error) => void } | null>(null)
  const attempts = React.useRef(0)
  const flow = useAuthPasskeySetup({
    create: (signal) => new Promise<unknown>((resolve, reject) => {
      attempts.current += 1
      prompt.current = { resolve, reject }
      signal.addEventListener('abort', () => reject(new DOMException('The request was aborted.', 'AbortError')))
    }),
    save: () => wait(SAVE_DELAY),
  })
  const answer = () => {
    if (outcome === 'error' && attempts.current === 1) prompt.current?.reject(new DOMException('The request was cancelled.', 'NotAllowedError'))
    else prompt.current?.resolve({ id: 'demo-credential' })
  }
  const inline = shell.inline ?? true
  const restart = () => { attempts.current = 0; flow.reset() }
  // A dialog that closes starts over the next time it opens.
  const { open } = shell
  React.useEffect(() => { if (open === false) restart() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <AuthPasskeySetup
      {...shell}
      type={flow.type}
      status={flow.status}
      onCancel={inline ? restart : undefined}
      onCreate={flow.start}
      onRetry={flow.retry}
      onBack={flow.back}
      onSensor={answer}
      onDone={(name) => { onDone?.(name); shell.onOpenChange?.(false); if (inline) restart() }}
    />
  )
}

export interface AuthTwoFactorSetupDemoProps extends AuthSetupBlockProps {
  /** Mounts a Toaster for the confirmation (a product has its own, once, at the root). */
  toaster?: boolean
  onTurnOn?: () => void
}

/** AuthTwoFactorSetup with a mocked authenticator app: its code rotates every 30 seconds and only the current one passes. */
export function AuthTwoFactorSetupDemo({ toaster = true, onTurnOn, ...shell }: AuthTwoFactorSetupDemoProps) {
  // Seconds since the mocked app started: it opens 16 seconds into a period, so the row reads 14s as the file draws it.
  const [clock, setClock] = React.useState(16)
  const current = APP_CODES[Math.floor(clock / PERIOD) % APP_CODES.length]
  const valid = React.useRef(current)
  valid.current = current
  const flow = useAuthTwoFactorSetup({ verify: async (code) => { await wait(CHECK_DELAY); return code === valid.current.replace(/\D/g, '') } })
  React.useEffect(() => {
    if (flow.type !== 'verify') return
    const id = setInterval(() => setClock((seconds) => seconds + 1), 1000)
    return () => clearInterval(id)
  }, [flow.type])
  const left = PERIOD - (clock % PERIOD)
  const inline = shell.inline ?? true
  const { open } = shell
  React.useEffect(() => { if (open === false) flow.reset() }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <AuthTwoFactorSetup
        {...shell}
        type={flow.type}
        status={flow.status}
        code={flow.code}
        onCodeChange={flow.changeCode}
        authenticatorCode={current}
        countdown={`${left}s`}
        countdownProgress={(left / PERIOD) * 100}
        onCancel={inline ? flow.reset : undefined}
        onContinue={flow.next}
        onBack={flow.back}
        onVerify={flow.submit}
        onAcknowledge={flow.acknowledge}
        onTurnOn={() => {
          onTurnOn?.()
          shell.onOpenChange?.(false)
          showToast({ variant: 'success', title: 'Two-factor authentication is on', description: 'We will ask for a code from your app the next time you sign in.' })
          if (inline) flow.reset()
        }}
      />
      {toaster && <Toaster position="bottom-right" />}
    </>
  )
}
