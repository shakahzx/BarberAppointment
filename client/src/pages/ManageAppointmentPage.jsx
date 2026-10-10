import { ArrowLeft, CalendarDays, Clock3, Scissors, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Feedback, Loading } from '../components/Feedback'
import api from '../services/api'

function todayValue() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function ManageAppointmentPage() {
  const [query] = useSearchParams()
  const token = query.get('token') || ''
  const [appointment, setAppointment] = useState(null)
  const [barbers, setBarbers] = useState([])
  const [barber, setBarber] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [availability, setAvailability] = useState({ key: '', slots: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const slotKey = appointment && date && barber ? `${appointment.service._id}:${barber}:${date}` : ''
  const checking = slotKey !== '' && availability.key !== slotKey
  const serviceId = appointment?.service?._id

  useEffect(() => {
    let current = true
    Promise.all([
      api.get(`/appointments/manage/${encodeURIComponent(token)}`),
      api.get('/barbers'),
    ]).then(([appointmentResponse, barberResponse]) => {
      if (!current) return
      const details = appointmentResponse.data.appointment
      setAppointment(details)
      setBarbers(barberResponse.data)
      setBarber(details.barber._id)
      setDate(details.appointmentDate)
    }).catch((requestError) => {
      if (current) setError(requestError.response?.data?.message || 'This appointment link could not be opened.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [token])

  useEffect(() => {
    if (!slotKey) return undefined
    let current = true
    api.get('/appointments/availability', { params: { service: serviceId, barber, date } })
      .then(({ data }) => { if (current) setAvailability({ key: slotKey, slots: data.slots }) })
      .catch((requestError) => { if (current) setError(requestError.response?.data?.message || 'Could not load available times.') })
    return () => { current = false }
  }, [slotKey, serviceId, barber, date])

  const selectedBarber = useMemo(() => barbers.find((item) => item._id === barber), [barbers, barber])
  const slots = availability.key === slotKey ? availability.slots : []

  async function cancelAppointment() {
    if (!window.confirm('Cancel this appointment? This secure link can only be used once.')) return
    setSaving(true); setError(''); setMessage('')
    try {
      const { data } = await api.post(`/appointments/manage/${encodeURIComponent(token)}/cancel`)
      setAppointment((current) => ({ ...current, status: 'Cancelled' }))
      setMessage(data.message)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not cancel this appointment.')
    } finally { setSaving(false) }
  }

  async function reschedule(event) {
    event.preventDefault()
    if (!time) return setError('Select an available time first.')
    setSaving(true); setError(''); setMessage('')
    try {
      const { data } = await api.post(`/appointments/manage/${encodeURIComponent(token)}/reschedule`, { barber, appointmentDate: date, startTime: time })
      setMessage(data.message)
      setAppointment((current) => ({ ...current, appointmentDate: date, startTime: time, barber: selectedBarber, status: 'Pending' }))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not reschedule. Choose another time.')
    } finally { setSaving(false) }
  }

  return <main className="inner-page manage-appointment-page"><Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Still / Form</Link><div className="page-heading"><p className="eyebrow eyebrow-dark">PRIVATE APPOINTMENT LINK</p><h1>Manage your <em>visit.</em></h1><p>This one-use link expires after 48 hours. You do not need to sign in.</p></div><Feedback message={message} type="success" /><Feedback message={error} />{loading ? <Loading label="Loading your appointment" /> : appointment && <div className="manage-layout"><section className="manage-details"><p className="eyebrow eyebrow-dark">CURRENT BOOKING</p><h2>{appointment.service.name}</h2><div className="summary-line"><UserRound size={16} /><span>{appointment.barber.name}</span></div><div className="summary-line"><CalendarDays size={16} /><span>{appointment.appointmentDate}</span></div><div className="summary-line"><Clock3 size={16} /><span>{appointment.startTime}–{appointment.endTime}</span></div><span className={`status-pill status-${appointment.status.toLowerCase()}`}>{appointment.status}</span></section>{['Pending', 'Confirmed'].includes(appointment.status) && <section className="manage-reschedule"><p className="eyebrow eyebrow-dark">CHANGE YOUR TIME</p><h2>Find another slot.</h2><form className="form-stack" onSubmit={reschedule}><label>Barber<select value={barber} onChange={(event) => { setBarber(event.target.value); setTime('') }} required>{barbers.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label>Date<input type="date" min={todayValue()} value={date} onChange={(event) => { setDate(event.target.value); setTime('') }} required /></label><div className="time-slot-wrap"><span className="field-caption">AVAILABLE TIMES</span>{checking ? <Loading label="Checking schedule" /> : slots.length ? <div className="time-slots">{slots.map((slot) => <button type="button" key={slot.startTime} className={`time-slot ${time === slot.startTime ? 'is-selected' : ''}`} onClick={() => setTime(slot.startTime)}>{slot.startTime}</button>)}</div> : <p className="no-slots">No times available for this date.</p>}</div><button className="button button-dark" disabled={saving || checking || !time}><Scissors size={15} /> {saving ? 'Saving…' : 'Request new time'}</button></form><p className="manage-note">The new time returns to Pending until the shop confirms it. This link is consumed when you reschedule.</p><button className="quiet-button manage-cancel" disabled={saving} onClick={cancelAppointment}>Cancel appointment instead</button></section>}</div>}</main>
}