import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Camera, Scissors, ShieldCheck, Sparkles, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Feedback, Loading } from '../components/Feedback'
import api from '../services/api'

const shapes = [
  ['oval', 'Oval'], ['round', 'Round'], ['square', 'Square'], ['heart', 'Heart'], ['oblong', 'Oblong'],
]

export default function StyleMatcherPage() {
  const [faceShape, setFaceShape] = useState('oval')
  const [photoUrl, setPhotoUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  function previewPhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      setError('Choose an image under 5 MB.')
      return
    }
    setError('')
    setPhotoUrl(URL.createObjectURL(file))
  }

  async function getMatch() {
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await api.post('/ai/style-match', { faceShape })
      setResult(data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load style suggestions.')
    } finally { setLoading(false) }
  }

  return <main className="inner-page style-matcher-page"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to the shop</Link><div className="page-heading"><p className="eyebrow eyebrow-dark">A LITTLE INSPIRATION</p><h1>Find your <em>next cut.</em></h1><p>Choose the face shape that feels closest and explore a few styles to discuss with your barber.</p></div><div className="matcher-layout"><section className="matcher-form"><div className="privacy-note"><ShieldCheck size={18} /><span>Private by design. Any photo preview stays in this browser tab and is never uploaded or stored.</span></div><label className="upload-reference"><span className="upload-icon"><Camera size={20} /></span><span><strong>Optional reference photo</strong><small>Preview only · JPG/PNG · up to 5 MB</small></span><span className="upload-button"><Upload size={15} /> Choose photo<input type="file" accept="image/*" capture="user" onChange={previewPhoto} /></span></label>{photoUrl && <img className="matcher-photo-preview" src={photoUrl} alt="Private local photo preview" />}<fieldset className="shape-picker"><legend>Which face shape looks most like yours?</legend><div className="shape-options">{shapes.map(([value, label]) => <label className={faceShape === value ? 'is-selected' : ''} key={value}><input type="radio" name="faceShape" value={value} checked={faceShape === value} onChange={() => setFaceShape(value)} /><span className={`shape-illustration shape-${value}`} /><strong>{label}</strong></label>)}</div></fieldset><p className="matcher-disclaimer">This is a style guide, not facial recognition. No photo analysis is performed, and suggested styles are starting points rather than guarantees.</p><button className="button button-dark" onClick={getMatch} disabled={loading}>{loading ? 'Finding a direction…' : 'Suggest a few styles'} <Sparkles size={16} /></button><Feedback message={error} /></section><aside className="matcher-result">{loading ? <Loading label="Looking through the style book" /> : result ? <><p className="eyebrow eyebrow-dark">YOUR STYLE NOTES</p><h2>Worth a <em>try.</em></h2><p className="matcher-method">Suggestions for a {result.faceShape} face shape</p><div className="suggestion-list">{result.styles.map((style, index) => <article key={style}><span>0{index + 1}</span><strong>{style}</strong><Scissors size={17} /></article>)}</div><p className="matcher-method">Try these words with your barber; bring a reference you like.</p><Link className="button button-dark" to="/book">Book a consultation <ArrowRight size={15} /></Link></> : <div className="matcher-empty"><Sparkles size={23} /><h2>A good cut<br /><em>starts with a conversation.</em></h2><p>Your suggestions will show here.</p></div>}</aside></div></main>
}
