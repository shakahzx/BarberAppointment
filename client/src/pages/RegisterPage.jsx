import { ArrowLeft, ArrowRight, Eye, EyeOff, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  async function handleSubmit(event) {
    event.preventDefault(); setError(''); setSubmitting(true)
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget))
      if (form.password.length < 8) throw new Error('Use at least 8 characters for your password.')
      const result = await register(form)
      navigate('/verify-email', { state: { email: result.email, from: location.state?.from }, replace: true })
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || 'Could not create your account.') }
    finally { setSubmitting(false) }
  }
  return <main className="auth-page"><div className="auth-visual auth-visual-register"><div className="auth-visual-text"><Scissors size={22} /><span>A GOOD PLACE TO START</span><h1>Your next<br />good day is<br /><em>closer.</em></h1></div><span className="auth-visual-caption">YOUR CHAIR IS WAITING.</span></div><section className="auth-panel"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the shop</Link><div className="auth-form-wrap"><p className="eyebrow eyebrow-dark">FIRST VISIT?</p><h2>Come on in.</h2><p className="form-intro">Create an account to book your first appointment.</p><Feedback message={error} /><form className="form-stack" onSubmit={handleSubmit}><label>Your name<input name="name" autoComplete="name" placeholder="First and last name" maxLength="80" required /></label><label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label><label>Phone <span className="optional-label">OPTIONAL</span><input name="phone" type="tel" autoComplete="tel" placeholder="+63 912 345 6789" /></label><label>Password<span className="password-field"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="8" placeholder="At least 8 characters" required /><button className="password-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button className="button button-dark button-full" disabled={submitting}>{submitting ? 'Creating account…' : 'Create account'} <ArrowRight size={16} /></button></form><p className="auth-switch">Already a regular? <Link to="/login">Sign in <ArrowRight size={14} /></Link></p></div></section></main>
}