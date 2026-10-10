import { useEffect, useState } from 'react'
import { CalendarDays, Check, Clock3, LogOut, Scissors, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Feedback, Loading } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

export default function BarberDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let current = true
    api.get('/barber/appointments').then(({ data }) => { if (current) setAppointments(data) })
      .catch((requestError) => { if (current) setError(requestError.response?.data?.message || 'Could not load your schedule.') })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])
  async function completeAppointment(id) {
    setError(''); setMessage('')
    try {
      await api.put(`/barber/appointments/${id}/complete`)
      setAppointments((items) => items.map((item) => item._id === id ? { ...item, status: 'Completed' } : item))
      setMessage('Appointment marked completed.')
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not update appointment.') }
  }

  function signOut() { logout(); navigate('/') }

  return <main className="inner-page barber-dashboard"><div className="barber-dashboard-top"><a className="wordmark" href="/"><span className="brand-mark"><Scissors size={18} /></span><span>STILL<span className="wordmark-light"> / </span>FORM</span></a><button className="text-action" onClick={signOut}><LogOut size={15} /> Sign out</button></div><div className="page-heading"><p className="eyebrow eyebrow-dark">YOUR CHAIR, YOUR DAY</p><h1>Hello, <em>{user.name.split(' ')[0]}.</em></h1><p>Only appointments assigned to your barber profile appear here.</p></div><Feedback message={message} type="success" /><Feedback message={error} />{loading ? <Loading label="Loading your schedule" /> : appointments.length ? <div className="barber-appointment-list">{appointments.map((appointment) => <article className="barber-appointment" key={appointment._id}><div className="appointment-date-block"><span>{new Date(`${appointment.appointmentDate}T12:00:00`).toLocaleDateString('en-PH', { month: 'short' }).toUpperCase()}</span><strong>{new Date(`${appointment.appointmentDate}T12:00:00`).getDate()}</strong><small>{new Date(`${appointment.appointmentDate}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' })}</small></div><div className="appointment-details"><div className="appointment-title-row"><h2>{appointment.service?.name}</h2><span className={`status-pill status-${appointment.status.toLowerCase()}`}>{appointment.status}</span></div><div className="appointment-meta"><span><Clock3 size={14} /> {appointment.startTime} – {appointment.endTime}</span><span><UserRound size={14} /> {appointment.customer?.name}</span><span><CalendarDays size={14} /> {appointment.appointmentDate}</span></div></div>{appointment.status === 'Confirmed' && <button className="button button-dark button-small" onClick={() => completeAppointment(appointment._id)}><Check size={14} /> Complete</button>}</article>)}</div> : <div className="empty-state"><span className="empty-icon"><CalendarDays size={19} /></span><h3>Your schedule is clear</h3><p>New assigned appointments will show here.</p></div>}</main>
}
