import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Scissors, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feedback, Loading } from '../components/Feedback'
import api from '../services/api'

function localDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [service, setService] = useState(searchParams.get('service') || '')
  const [barber, setBarber] = useState(searchParams.get('barber') || '')
  const [date, setDate] = useState(searchParams.get('date') || '')
  const [availability, setAvailability] = useState({ key: '', slots: [] })
  const [time, setTime] = useState(searchParams.get('time') || '')
  const [paymentMethod, setPaymentMethod] = useState('pay-at-shop')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const availabilityKey = service && barber && date ? `${service}:${barber}:${date}` : ''
  const checking = Boolean(availabilityKey) && availability.key !== availabilityKey
  const slots = availability.key === availabilityKey ? availability.slots : []

  useEffect(() => {
    Promise.all([api.get('/services'), api.get('/barbers')])
      .then(([serviceResponse, barberResponse]) => { setServices(serviceResponse.data); setBarbers(barberResponse.data) })
      .catch(() => setError('We could not load the booking options. Please refresh and try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!availabilityKey) return undefined
    let current = true
    api.get('/appointments/availability', { params: { service, barber, date } })
      .then(({ data }) => { if (current) setAvailability({ key: availabilityKey, slots: data.slots }) })
      .catch((requestError) => {
        if (current) {
          setAvailability({ key: availabilityKey, slots: [] })
          setError(requestError.response?.data?.message || 'Could not check availability.')
        }
      })
    return () => { current = false }
  }, [availabilityKey, service, barber, date])

  const selectedService = useMemo(() => services.find((item) => item._id === service), [services, service])
  const selectedBarber = useMemo(() => barbers.find((item) => item._id === barber), [barbers, barber])
  const today = localDate(new Date())

  async function handleSubmit(event) {
    event.preventDefault()
    if (!time) return setError('Please select an available time.')
    setError('')
    setSubmitting(true)
    try {
      await api.post('/appointments', { service, barber, appointmentDate: date, startTime: time, notes, paymentMethod })
      navigate('/appointments', { state: { message: paymentMethod === 'mock' ? 'Demo checkout complete. No real payment was taken; your request is with the shop.' : 'Your appointment request is in. We’ll be in touch soon.' } })
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'We could not book that appointment.')
      setTime('')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="booking-page"><div className="booking-header"><p className="eyebrow eyebrow-dark">YOUR NEXT VISIT</p><h1>Find your <em>time.</em></h1><p>Choose a service, barber, and a time that feels right.</p></div><div className="booking-layout"><form className="booking-form" onSubmit={handleSubmit}><Feedback message={error} />{loading ? <Loading label="Preparing your booking" /> : <>
    <section className="booking-step"><span className="step-count">01</span><div className="step-content"><h2><Scissors size={18} /> Choose a service</h2><div className="choice-list">{services.map((item) => <label className={`choice-row ${service === item._id ? 'is-selected' : ''}`} key={item._id}><input type="radio" name="service" value={item._id} checked={service === item._id} onChange={() => { setService(item._id); setTime('') }} required /><span className="custom-radio" /><span className="choice-main"><strong>{item.name}</strong><small>{item.duration} minutes</small></span><strong className="choice-price">₱{Number(item.price).toLocaleString('en-PH')}</strong></label>)}</div></div></section>
    <section className="booking-step"><span className="step-count">02</span><div className="step-content"><h2><UserRound size={18} /> Choose your barber</h2><div className="barber-options">{barbers.map((item) => <label className={`barber-option ${barber === item._id ? 'is-selected' : ''}`} key={item._id}><input type="radio" name="barber" value={item._id} checked={barber === item._id} onChange={() => { setBarber(item._id); setTime('') }} required /><span className="barber-avatar">{item.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{item.name}</strong><small>{item.specialties?.slice(0, 2).join(' · ') || 'Barber'}</small></label>)}</div></div></section>
    <section className="booking-step"><span className="step-count">03</span><div className="step-content"><h2><CalendarDays size={18} /> Pick a date &amp; time</h2><label className="date-input-label">Appointment date<input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setTime('') }} required /></label>{date && <div className="time-slot-wrap"><span className="field-caption">AVAILABLE TIMES</span>{checking ? <Loading label="Checking the schedule" /> : slots.length ? <div className="time-slots">{slots.map((slot) => <button type="button" key={slot.startTime} className={`time-slot ${time === slot.startTime ? 'is-selected' : ''}`} onClick={() => setTime(slot.startTime)}>{slot.startTime}</button>)}</div> : <p className="no-slots">No times are available for this date. Try another day.</p>}</div>}</div></section>
    <section className="booking-step"><span className="step-count">04</span><div className="step-content"><h2>Choose checkout</h2><div className="choice-list"><label className={`choice-row ${paymentMethod === 'pay-at-shop' ? 'is-selected' : ''}`}><input type="radio" name="paymentMethod" value="pay-at-shop" checked={paymentMethod === 'pay-at-shop'} onChange={() => setPaymentMethod('pay-at-shop')} /><span className="custom-radio" /><span className="choice-main"><strong>Pay at the shop</strong><small>Settle after your service</small></span></label><label className={`choice-row ${paymentMethod === 'mock' ? 'is-selected' : ''}`}><input type="radio" name="paymentMethod" value="mock" checked={paymentMethod === 'mock'} onChange={() => setPaymentMethod('mock')} /><span className="custom-radio" /><span className="choice-main"><strong>Demo online checkout</strong><small>No real payment is processed</small></span></label></div>{paymentMethod === 'mock' && <p className="checkout-disclaimer">Demo mode only. No card details or real money are involved.</p>}</div></section>
    <section className="booking-step"><span className="step-count">05</span><div className="step-content"><h2>Anything we should know?</h2><label className="notes-label"><span className="sr-only">Notes for your barber</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength="500" placeholder="A style, a detail, or just say hello…" rows="3" /></label><button className="button button-dark button-full booking-submit" disabled={submitting || checking || !time}>{submitting ? 'Requesting appointment…' : 'Confirm appointment request'} <ArrowRight size={16} /></button></div></section>
  </>}</form>
  <aside className="booking-summary"><p className="eyebrow eyebrow-dark">YOUR VISIT</p><h2>Looking sharp<br /><em>already.</em></h2><div className="summary-line"><Scissors size={16} /><span>{selectedService?.name || 'Choose a service'}</span></div><div className="summary-line"><UserRound size={16} /><span>{selectedBarber?.name || 'Choose a barber'}</span></div><div className="summary-line"><CalendarDays size={16} /><span>{date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Choose a date'}</span></div>{time && <div className="summary-line"><Clock3 size={16} /><span>{time}{selectedService ? ` – ${slots.find((slot) => slot.startTime === time)?.endTime}` : ''}</span></div>}<div className="summary-total"><span>Estimated total</span><strong>{selectedService ? `₱${Number(selectedService.price).toLocaleString('en-PH')}` : '—'}</strong></div><p className="summary-note">{paymentMethod === 'mock' ? 'Demo checkout selected. No real payment is processed.' : 'Pay at the shop. Your booking will be confirmed by the team.'} You can cancel online up to 24 hours before your appointment.</p><Link className="summary-back" to="/services"><ArrowLeft size={14} /> Browse services</Link></aside></div></main>
}