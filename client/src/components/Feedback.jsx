import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'

export function Feedback({ message, type = 'error' }) {
  if (!message) return null
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle
  return <div className={`feedback feedback-${type}`} role="status"><Icon size={17} />{message}</div>
}

export function Loading({ label = 'Loading' }) {
  return <div className="loading-line"><LoaderCircle className="spinner-icon" size={18} />{label}</div>
}

export function EmptyState({ title, text }) {
  return <div className="empty-state"><span className="empty-icon"><span aria-hidden="true">—</span></span><h3>{title}</h3><p>{text}</p></div>
}