import { ArrowRight, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Feedback } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault(); setMessage(''); setError(''); setSaving(true)
    const form = Object.fromEntries(new FormData(event.currentTarget))
    try { await updateProfile(form); setMessage('Your details have been updated.') }
    catch (requestError) { setError(requestError.response?.data?.message || 'Could not save your details.') }
    finally { setSaving(false) }
  }

  return <main className="inner-page profile-page"><div className="page-heading"><p className="eyebrow eyebrow-dark">YOUR DETAILS</p><h1>A little <em>about you.</em></h1><p>Keep your contact details and optional style preferences up to date.</p></div><div className="profile-panel"><div className="profile-portrait"><UserRound size={24} /><span>{user.name.slice(0, 1).toUpperCase()}</span></div><form className="form-stack profile-form" onSubmit={handleSubmit}><Feedback message={message} type="success" /><Feedback message={error} /><label>Full name<input name="name" defaultValue={user.name} maxLength="80" required /></label><label>Email address<input value={user.email} disabled /><small className="field-hint">Email address cannot be changed.</small></label><label>Phone number<input name="phone" type="tel" defaultValue={user.phone || ''} placeholder="+63 912 345 6789" maxLength="30" /></label><label>Hair type <span className="optional-label">OPTIONAL · USED FOR STYLE SUGGESTIONS</span><select name="hairType" defaultValue={user.preferences?.hairType || ''}><option value="">Not set</option><option value="straight">Straight</option><option value="wavy">Wavy</option><option value="curly">Curly</option><option value="coily">Coily</option></select></label><label>Style preference <span className="optional-label">OPTIONAL</span><select name="styleGoal" defaultValue={user.preferences?.styleGoal || ''}><option value="">Not set</option><option value="classic">Classic</option><option value="low-maintenance">Low maintenance</option><option value="textured">Textured</option><option value="formal">Formal</option></select></label><button className="button button-dark" disabled={saving}>{saving ? 'Saving…' : 'Save changes'} <ArrowRight size={16} /></button></form></div></main>
}