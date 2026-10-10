import { ArrowUpRight, Clock3, Scissors, Star, UserRound } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EmptyState, Feedback, Loading } from '../components/Feedback'
import api from '../services/api'

function canCancel(appointment) {
  return ['Pending', 'Confirmed'].includes(appointment.status) && new Date(`${appointment.appointmentDate}T${appointment.startTime}:00`).getTime() - Date.now() >= 24 * 60 * 60 * 1000
}

export default function AppointmentsPage() {
  const location = useLocation()
  const [appointments, setAppointments] = useState([])
  const [reviewedAppointments, setReviewedAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(location.state?.message || '')
  const [error, setError] = useState('')

  async function fetchCustomerData() {
    const [appointmentResponse, reviewResponse] = await Promise.all([api.get('/appointments/my'), api.get('/reviews/my')])
    return {
      appointments: appointmentResponse.data,
      reviewed: reviewResponse.data.map((review) => String(review.appointment)),
    }
  }

  useEffect(() => {
    let current = true
    fetchCustomerData().then(({ appointments: customerAppointments, reviewed }) => {
      if (!current) return
      setAppointments(customerAppointments)
      setReviewedAppointments(reviewed)
    })
      .catch(() => { if (current) setError('We could not load your appointments.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])

  async function cancelAppointment(id) {
    if (!window.confirm('Cancel this appointment?')) return
    setError(''); setMessage('')
    try {
      await api.put(`/appointments/${id}/cancel`)
      setMessage('Your appointment has been cancelled.')
      const { appointments: customerAppointments, reviewed } = await fetchCustomerData()
      setAppointments(customerAppointments)
      setReviewedAppointments(reviewed)
    }
    catch (requestError) { setError(requestError.response?.data?.message || 'We could not cancel this appointment.') }
  }

  return <main className="inner-page appointments-page"><div className="page-heading page-heading-row"><div><p className="eyebrow eyebrow-dark">YOUR VISITS</p><h1>On the <em>calendar.</em></h1><p>Every good cut starts with a little time set aside.</p></div><Link className="button button-dark" to="/book">Book a visit <ArrowUpRight size={16} /></Link></div><Feedback message={message} type="success" /><Feedback message={error} />{loading ? <Loading label="Loading your appointments" /> : appointments.length ? <div className="appointment-list">{appointments.map((appointment) => <article className="appointment-card" key={appointment._id}><div className="appointment-date-block"><span>{new Date(`${appointment.appointmentDate}T12:00:00`).toLocaleDateString('en-PH', { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${appointment.appointmentDate}T12:00:00`).getDate()}</strong><small>{new Date(`${appointment.appointmentDate}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' })}</small></div><div className="appointment-details"><div className="appointment-title-row"><h2>{appointment.service?.name}</h2><span className={`status-pill status-${appointment.status.toLowerCase()}`}>{appointment.status}</span></div><div className="appointment-meta"><span><Clock3 size={14} /> {appointment.startTime} – {appointment.endTime}</span><span><UserRound size={14} /> {appointment.barber?.name}</span><span><Scissors size={14} /> ₱{Number(appointment.service?.price || 0).toLocaleString('en-PH')}</span></div><div className="appointment-meta"><span>{appointment.paymentMethod === 'mock' ? 'Demo payment · no charge' : 'Pay at shop'}</span><span>{appointment.paymentStatus === 'paid' ? 'Paid (demo)' : 'Unpaid'}</span></div>{appointment.notes && <p className="appointment-notes">“{appointment.notes}”</p>}{appointment.status === 'Completed' && !reviewedAppointments.includes(String(appointment._id)) && <ReviewForm appointmentId={appointment._id} onSubmitted={(id) => setReviewedAppointments((items) => [...items, id])} />}{appointment.status === 'Completed' && reviewedAppointments.includes(String(appointment._id)) && <p className="review-thanks"><Star size={14} fill="currentColor" /> Thanks for sharing your feedback.</p>}</div>{canCancel(appointment) && <button className="quiet-button" onClick={() => cancelAppointment(appointment._id)}>Cancel</button>}</article>)}</div> : <EmptyState title="Nothing on the calendar yet" text="Your next great haircut is a few clicks away."><Link className="button button-dark" to="/book">Book your first visit <ArrowUpRight size={15} /></Link></EmptyState>}</main>
}

function ReviewForm({ appointmentId, onSubmitted }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.post('/reviews', { appointment: appointmentId, rating, comment })
      onSubmitted(String(appointmentId))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your review could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="review-form" onSubmit={handleSubmit}><span className="review-prompt">How was your visit?</span><div className="review-stars" role="group" aria-label="Choose a star rating">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} star${value === 1 ? '' : 's'}`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star size={18} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div><textarea aria-label="Your feedback" rows="2" maxLength="1000" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="A few words about your visit…" /><button className="button button-dark button-small" disabled={submitting}>{submitting ? 'Sending…' : 'Leave a review'}</button>{error && <Feedback message={error} />}</form>
}