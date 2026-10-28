import { useEffect, useState } from 'react'
import { LogoIcon } from '../components/Icons.jsx'
import { prefetchSalt } from '../lib/auth/api.ts'
import { passwordProblem } from '../lib/auth/crypto.ts'
import { useAuth } from '../state/AuthContext.tsx'

// One screen for every way in: first-time setup (no accounts yet), sign-in, and
// the forced new password after a temp one. Same card, so the step feels continuous.
const COPY = {
  setup: { eyebrow: 'ATLAS · FIRST RUN', title: 'Set up Atlas', text: 'Create the first Admin account. You can add everyone else from Admin > Users.', button: 'Create admin and sign in' },
  signedOut: { eyebrow: 'ATLAS', title: 'Sign in', text: 'Use the email and password your Atlas admin gave you.', button: 'Sign in' },
  mustChange: { eyebrow: 'ATLAS · NEW PASSWORD', title: 'Choose your password', text: 'You signed in with a temp password. Pick your own to continue.', button: 'Save and continue' },
}

function PasswordField({ label, value, onChange, autoComplete, autoFocus, id }) {
  const [shown, setShown] = useState(false)
  return (
    <label className="atlas-field" htmlFor={id}>
      <span className="atlas-eyebrow">{label}</span>
      <span className="atlas-signin-password">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className="atlas-input"
          required
        />
        <button type="button" className="atlas-signin-reveal atlas-link-quiet" aria-pressed={shown} onClick={() => setShown((s) => !s)}>
          {shown ? 'Hide' : 'Show'}
        </button>
      </span>
    </label>
  )
}

export default function SignInView() {
  const { stage, user, local, signIn, changePassword, setUp, signOut } = useAuth()
  const copy = COPY[stage] ?? COPY.signedOut
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(0)

  useEffect(() => { document.title = `Atlas | ${copy.title}` }, [copy.title])
  // A new step starts empty.
  useEffect(() => { setPassword(''); setNext(''); setConfirm(''); setError(null) }, [stage])

  const fail = (message) => { setError(message); setShake((n) => n + 1) }

  // Start the salt lookup while the password is being typed (one Auth call saved on Sign in).
  useEffect(() => {
    if (stage !== 'signedOut') return undefined
    const t = setTimeout(() => prefetchSalt(email), 400)
    return () => clearTimeout(t)
  }, [email, stage])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const fresh = stage === 'setup' ? password : next
    if (stage !== 'signedOut') {
      const problem = passwordProblem(fresh, stage === 'setup' ? email : user?.email ?? '')
      if (problem) return fail(problem)
      if (fresh !== confirm) return fail('The two new passwords don’t match.')
      if (stage === 'mustChange' && fresh === password) return fail('Pick a password different from the temp one.')
    }
    setBusy(true)
    setError(null)
    try {
      if (stage === 'setup') await setUp(email, name.trim(), password)
      else if (stage === 'mustChange') await changePassword(password, next)
      else await signIn(email, password)
    } catch (err) {
      fail(err?.message || 'That didn’t work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="atlas-signin">
      <form
        key={`${stage}-${shake}`}
        className={`atlas-signin-card atlas-raised atlas-view-enter${shake ? ' atlas-shake' : ''}`}
        onSubmit={submit}
        noValidate
      >
        <div className="atlas-signin-brand">
          <span className="atlas-signin-logo atlas-well-sm"><LogoIcon label="Centific" /></span>
          <span className="atlas-eyebrow">{copy.eyebrow}</span>
        </div>
        <h1 className="atlas-signin-title">{copy.title}</h1>
        <p className="atlas-signin-text">{stage === 'mustChange' && user ? `Hi ${user.displayName.split(' ')[0]}. ${copy.text}` : copy.text}</p>

        <div className="atlas-signin-fields">
          {stage === 'setup' && (
            <label className="atlas-field">
              <span className="atlas-eyebrow">Your name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="atlas-input" autoFocus required />
            </label>
          )}
          {stage !== 'mustChange' && (
            <label className="atlas-field">
              <span className="atlas-eyebrow">Email</span>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={stage === 'signedOut'}
                className="atlas-input"
                required
              />
            </label>
          )}
          <PasswordField
            id="atlas-password"
            label={stage === 'mustChange' ? 'Temp password' : 'Password'}
            value={password}
            onChange={setPassword}
            autoComplete={stage === 'setup' ? 'new-password' : 'current-password'}
            autoFocus={stage === 'mustChange'}
          />
          {stage === 'mustChange' && (
            <PasswordField id="atlas-new-password" label="New password" value={next} onChange={setNext} autoComplete="new-password" />
          )}
          {stage !== 'signedOut' && (
            <PasswordField id="atlas-confirm-password" label="Type it again" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          )}
          {stage !== 'signedOut' && <p className="atlas-signin-hint">At least 10 characters. A short sentence is easy to remember.</p>}
        </div>

        <p className="atlas-signin-error" role="alert" aria-live="assertive">{error ?? ''}</p>

        <button type="submit" className="atlas-btn-primary" disabled={busy} aria-busy={busy}>
          {busy ? 'One moment…' : copy.button}
        </button>
        {stage === 'mustChange' && (
          <button type="button" className="atlas-signin-alt atlas-link-quiet" onClick={() => { void signOut() }}>Not you? Sign out</button>
        )}
        {local && (
          <p className="atlas-signin-local">Test mode: accounts live in this browser only until the sign-in flow is connected.</p>
        )}
      </form>
    </main>
  )
}
