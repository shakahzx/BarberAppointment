import { ArrowLeft, ArrowRight, MailCheck, Scissors } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'

export default function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState(location.state?.email || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Enter the six-digit code sent to your email address.')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleVerify(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await verifyEmail({ email, code })
      navigate(location.state?.from || '/book', { replace: true })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not verify this code. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setMessage('')
    setResending(true)
    try {
      const result = await resendVerification(email)
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not send another code.')
    } finally {
      setResending(false)
    }
  }

  return <main className="auth-page"><div className="auth-visual auth-visual-register"><div className="auth-visual-text"><Scissors size={22} /><span>A GOOD PLACE TO START</span><h1>One small<br />step to your<br /><em>first visit.</em></h1></div><span className="auth-visual-caption">CHECK YOUR INBOX.</span></div><section className="auth-panel"><Link className="back-link" to="/register"><ArrowLeft size={15} /> Back to registration</Link><div className="auth-form-wrap"><span className="verify-icon"><MailCheck size={23} /></span><p className="eyebrow eyebrow-dark">CHECK YOUR INBOX</p><h2>Is that really you?</h2><p className="form-intro">Verify your email to activate your account and finish signing in.</p><Feedback message={message} type="success" /><Feedback message={error} /><form className="form-stack" onSubmit={handleVerify}><label>Email address<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label><label>Six-digit code<input className="verification-code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required /></label><button className="button button-dark button-full" disabled={submitting || code.length !== 6}>{submitting ? 'Verifying…' : 'Verify email'} <ArrowRight size={16} /></button></form><button className="resend-button" type="button" onClick={handleResend} disabled={resending || !email}>{resending ? 'Sending…' : 'Didn’t receive a code? Send another'}</button><p className="auth-switch">Already verified? <Link to="/login">Sign in <ArrowRight size={14} /></Link></p></div></section></main>
}