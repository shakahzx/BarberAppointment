import { ArrowLeft, ArrowRight, Eye, EyeOff, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [verificationEmail, setVerificationEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setVerificationEmail(''); setSubmitting(true)
    try {
      const user = await login(Object.fromEntries(new FormData(event.currentTarget)))
      navigate(user.role === 'admin' ? '/admin' : user.role === 'barber' ? '/barber' : location.state?.from || '/appointments', { replace: true })
    }
    catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not sign in. Check your connection and try again.')
      if (requestError.response?.status === 403) setVerificationEmail(String(new FormData(event.currentTarget).get('email') || ''))
    }
    finally { setSubmitting(false) }
  }
  return <main className="auth-page"><div className="auth-visual"><div className="auth-visual-text"><Scissors size={22} /><span>THE CHAIR IS YOURS</span><h1>A better cut<br />starts <em>here.</em></h1></div><span className="auth-visual-caption">TAKE YOUR TIME. WE DO.</span></div><section className="auth-panel"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the shop</Link><div className="auth-form-wrap"><p className="eyebrow eyebrow-dark">WELCOME BACK</p><h2>Good to see you.</h2><p className="form-intro">Sign in to manage your next visit.</p><Feedback message={error} />{verificationEmail && <Link className="verify-prompt" to="/verify-email" state={{ email: verificationEmail }}>Verify your email or resend its code <ArrowRight size={14} /></Link>}<form className="form-stack" onSubmit={handleSubmit}><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Password<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button className="button button-dark button-full" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} /></button></form><p className="auth-switch">New around here? <Link to="/register">Create an account <ArrowRight size={14} /></Link></p></div></section></main>
}