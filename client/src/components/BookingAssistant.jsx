import { useEffect, useState } from 'react'
import { ArrowRight, Bot, MessageCircle, Send, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Feedback } from './Feedback'

export default function BookingAssistant() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Tell me the service and day you have in mind. I can check availability, but you’ll confirm the booking yourself.' }])
  const [proposal, setProposal] = useState(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [languageModelAvailable, setLanguageModelAvailable] = useState(false)
  const [useLanguageModel, setUseLanguageModel] = useState(false)

  useEffect(() => {
    api.get('/ai/config').then(({ data }) => setLanguageModelAvailable(data.externalLanguageModelAvailable)).catch(() => {})
  }, [])

  async function submit(event) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || sending) return
    setDraft('')
    setProposal(null)
    setError('')
    setMessages((items) => [...items, { role: 'customer', text: message }])
    setSending(true)
    try {
      const { data } = await api.post('/ai/chat', { message, useLanguageModel })
      setMessages((items) => [...items, { role: 'assistant', text: data.message }])
      setProposal(data.proposal || null)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The assistant is unavailable right now.')
    } finally {
      setSending(false)
    }
  }

  const bookingUrl = proposal && `/book?service=${proposal.serviceId}&barber=${proposal.barberId}&date=${proposal.date}&time=${proposal.startTime}`

  return <div className="assistant-widget">
    {open && <section className="assistant-panel" aria-label="Booking assistant">
      <header className="assistant-header"><span className="assistant-avatar"><Bot size={18} /></span><div><strong>Booking assistant</strong><small>Availability-aware · booking requires your confirmation</small></div><button className="icon-button" aria-label="Close assistant" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div className="assistant-messages" aria-live="polite">{messages.map((item, index) => <p className={`assistant-message message-${item.role}`} key={`${item.role}-${index}`}>{item.text}</p>)}{sending && <p className="assistant-message message-assistant">Checking services and barber schedules…</p>}{proposal && bookingUrl && <Link className="button button-dark assistant-proposal" to={bookingUrl} onClick={() => setOpen(false)}>Review this time <ArrowRight size={14} /></Link>}{error && <Feedback message={error} />}</div>
      <form className="assistant-compose" onSubmit={submit}><label className="sr-only" htmlFor="assistant-message">Ask about a booking</label><input id="assistant-message" value={draft} maxLength="500" onChange={(event) => setDraft(event.target.value)} placeholder="Try “Haircut tomorrow”" /><button className="icon-button" aria-label="Send message" disabled={sending || !draft.trim()}><Send size={17} /></button></form>
      {languageModelAvailable && <label className="assistant-consent"><input type="checkbox" checked={useLanguageModel} onChange={(event) => setUseLanguageModel(event.target.checked)} /> Use external AI to understand this message</label>}
      <p className="assistant-disclaimer">{useLanguageModel ? 'Your message, with email addresses and phone numbers removed, is sent to the configured AI provider. It never books automatically.' : 'Local schedule helper. Messages stay on this server and are not stored.'}</p>
    </section>}
    <button className="assistant-launcher" aria-label={open ? 'Close booking assistant' : 'Open booking assistant'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <MessageCircle size={21} />}<span>{open ? 'Close' : 'Ask about a booking'}</span></button>
  </div>
}
