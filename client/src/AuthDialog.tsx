import { useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, HardHat, UsersRound, X } from 'lucide-react'

type AccountRole = 'worker' | 'employer'
type AuthenticatedRole = AccountRole | 'admin'

type AuthDialogProps = {
  defaultRole: AccountRole
  onClose: () => void
  onAuthenticated: (role: AuthenticatedRole) => void
}

type AuthResponse = {
  error?: string
  developmentOtp?: string
  user?: { role: AuthenticatedRole }
}

export default function AuthDialog({ defaultRole, onClose, onAuthenticated }: AuthDialogProps) {
  const [purpose, setPurpose] = useState<'register' | 'login'>('login')
  const [role, setRole] = useState<AccountRole>(defaultRole)
  const [step, setStep] = useState<'details' | 'verification'>('details')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          purpose,
          ...(purpose === 'register' ? { name, role } : {}),
        }),
      })
      const payload = await response.json() as AuthResponse
      if (!response.ok) throw new Error(payload.error ?? 'Could not request a verification code')
      setDevelopmentOtp(payload.developmentOtp ?? '')
      setStep('verification')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not request a verification code')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      })
      const payload = await response.json() as AuthResponse
      if (!response.ok || !payload.user) {
        throw new Error(payload.error ?? 'Could not verify the code')
      }
      onAuthenticated(payload.user.role)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Could not verify the code')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="auth-dialog-title">
        <button className="dialog-close icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button>
        <span className="dialog-icon">{role === 'employer' ? <HardHat size={22} /> : <UsersRound size={22} />}</span>
        <span className="section-kicker">PHONE VERIFICATION</span>
        <h2 id="auth-dialog-title">{step === 'details' ? 'Sign in or create an account' : 'Enter your verification code'}</h2>
        <p className="dialog-description">
          {step === 'details'
            ? purpose === 'register' ? 'Create an account with your mobile number.' : 'Sign in with your registered mobile number.'
            : `We sent a verification code to ${phone}.`}
        </p>
        {step === 'details' ? (
          <form className="dialog-form" onSubmit={requestCode}>
            <div className="auth-mode-switch" aria-label="Authentication mode">
              <button type="button" className={purpose === 'login' ? 'is-selected' : ''} onClick={() => setPurpose('login')}>Sign in</button>
              <button type="button" className={purpose === 'register' ? 'is-selected' : ''} onClick={() => setPurpose('register')}>Create account</button>
            </div>
            {purpose === 'register' && <>
              <label>Your account type
                <select value={role} onChange={(event) => setRole(event.target.value === 'employer' ? 'employer' : 'worker')}>
                  <option value="worker">Worker</option>
                  <option value="employer">Employer</option>
                </select>
              </label>
              <label>Your name
                <input name="name" autoComplete="name" minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} required />
              </label>
            </>}
            <label>Phone number
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" required />
            </label>
            <button className="button button-primary dialog-submit" type="submit" disabled={busy}>
              {busy ? 'Requesting code…' : 'Send verification code'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form className="dialog-form" onSubmit={verifyCode}>
            {developmentOtp && <p className="demo-note">Local development code: <strong>{developmentOtp}</strong></p>}
            <label>6-digit code
              <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required />
            </label>
            <button className="button button-primary dialog-submit" type="submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify and continue'} <ArrowRight size={16} />
            </button>
            <button className="text-link" type="button" onClick={() => { setStep('details'); setCode(''); setError('') }}>Change number or account type</button>
          </form>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="demo-note"><BadgeCheck size={14} /> Local OTP mode is for development only; production SMS delivery is not configured.</p>
      </section>
    </div>
  )
}
