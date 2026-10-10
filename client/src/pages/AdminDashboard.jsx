import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, CalendarDays, Check, CircleCheck, Clock3, LayoutDashboard, LogOut, Plus, Search, Scissors, Settings2, Users, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Feedback, Loading } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'
import api from '../services/api'

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays },
  { id: 'barbers', label: 'Barbers', icon: Scissors },
  { id: 'services', label: 'Services', icon: Settings2 },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function todayString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function appointmentDateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status.toLowerCase()}`}>{status}</span>
}

function appointmentMatches(appointment, search) {
  const text = [appointment.customer?.name, appointment.customer?.email, appointment.service?.name, appointment.barber?.name].join(' ').toLowerCase()
  return text.includes(search.toLowerCase())
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [appointments, setAppointments] = useState([])
  const [services, setServices] = useState([])
  const [barbers, setBarbers] = useState([])
  const [customers, setCustomers] = useState([])
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [modal, setModal] = useState('')

  useEffect(() => {
    let current = true
    Promise.all([
      api.get('/appointments'), api.get('/services/manage'), api.get('/barbers/manage'), api.get('/customers'),
    ]).then(([appointmentResponse, serviceResponse, barberResponse, customerResponse]) => {
      if (!current) return
      setAppointments(appointmentResponse.data)
      setServices(serviceResponse.data)
      setBarbers(barberResponse.data)
      setCustomers(customerResponse.data)
    }).catch((requestError) => {
      if (current) setError(requestError.response?.data?.message || 'Could not load dashboard data. Check the API connection.')
    }).finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [])

  useEffect(() => {
    if (section !== 'insights' || insights) return
    let current = true
    Promise.all([api.get('/ai/insights/peak-hours'), api.get('/ai/insights/reviews')])
      .then(([peakResponse, reviewResponse]) => {
        if (current) setInsights({ peaks: peakResponse.data, reviews: reviewResponse.data })
      })
      .catch((requestError) => { if (current) setError(requestError.response?.data?.message || 'Could not load shop insights.') })
    return () => { current = false }
  }, [section, insights])

  const today = todayString()
  const pending = appointments.filter((item) => item.status === 'Pending')
  const confirmed = appointments.filter((item) => item.status === 'Confirmed')
  const completed = appointments.filter((item) => item.status === 'Completed')
  const todayAppointments = appointments.filter((item) => item.appointmentDate === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const visibleAppointments = useMemo(() => appointments.filter((item) => (
    (statusFilter === 'All statuses' || item.status === statusFilter) && appointmentMatches(item, search)
  )), [appointments, statusFilter, search])
  const visibleCustomers = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone || ''}`.toLowerCase().includes(search.toLowerCase())), [customers, search])

  function clearFeedback() { setNotice(''); setError('') }

  async function updateAppointment(appointment, status) {
    if (status === 'Rejected' && !window.confirm('Reject this appointment request?')) return
    clearFeedback()
    try {
      const { data } = await api.put(`/appointments/${appointment._id}/status`, { status })
      setAppointments((items) => items.map((item) => item._id === data._id ? data : item))
      setNotice(`Appointment ${status.toLowerCase()}.`)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not update this appointment.') }
  }

  async function saveService(event) {
    event.preventDefault(); clearFeedback()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    const payload = { name: data.name, description: data.description, price: Number(data.price), duration: Number(data.duration), isActive: data.isActive === 'on' }
    try {
      const response = editing ? await api.put(`/services/${editing._id}`, payload) : await api.post('/services', payload)
      setServices((items) => editing ? items.map((item) => item._id === response.data._id ? response.data : item) : [...items, response.data])
      setNotice(editing ? 'Service updated.' : 'Service added.')
      setModal(''); setEditing(null)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save this service.') }
  }

  async function saveBarber(event) {
    event.preventDefault(); clearFeedback()
    const form = new FormData(event.currentTarget)
    const breakLines = String(form.get('breaks') || '').split('\n').map((line) => line.trim()).filter(Boolean)
    const breaks = breakLines.map((line) => {
      const match = line.match(/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d\s+(.+)$/)
      return match ? { startTime: match[1], endTime: match[2], workingDays: match[3].split(',').map((day) => day.trim()).filter(Boolean) } : null
    })
    if (breaks.some((breakPeriod) => !breakPeriod)) {
      setError('Enter each break as HH:MM-HH:MM followed by comma-separated weekdays.')
      return
    }
    const payload = {
      name: form.get('name'), email: form.get('email'),
      avatarUrl: form.get('avatarUrl'),
      specialties: form.get('specialties').split(',').map((item) => item.trim()).filter(Boolean),
      workingDays: form.getAll('workingDays'), startTime: form.get('startTime'), endTime: form.get('endTime'),
      breaks,
      daysOff: String(form.get('daysOff') || '').split(',').map((day) => day.trim()).filter(Boolean),
      isActive: form.get('isActive') === 'on',
    }
    try {
      const response = editing ? await api.put(`/barbers/${editing._id}`, payload) : await api.post('/barbers', payload)
      setBarbers((items) => editing ? items.map((item) => item._id === response.data._id ? response.data : item) : [...items, response.data])
      setNotice(editing ? 'Barber updated.' : 'Barber added.')
      setModal(''); setEditing(null)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not save this barber.') }
  }

  async function createBarberAccount(event) {
    event.preventDefault(); clearFeedback()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const { data } = await api.post(`/barbers/${editing._id}/account`, form)
      setBarbers((items) => items.map((item) => item._id === editing._id ? { ...item, email: data.email } : item))
      setNotice(`Barber login created for ${data.email}. Share the temporary password securely.`)
      setModal(''); setEditing(null)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not create this barber account.') }
  }

  async function toggleActive(kind, item) {
    if (item.isActive && !window.confirm(`Deactivate this ${kind}?`)) return
    clearFeedback()
    const collection = kind === 'service' ? services : barbers
    const setCollection = kind === 'service' ? setServices : setBarbers
    try {
      if (item.isActive) await api.delete(`/${kind === 'service' ? 'services' : 'barbers'}/${item._id}`)
      else await api.put(`/${kind === 'service' ? 'services' : 'barbers'}/${item._id}`, { isActive: true })
      setCollection(collection.map((record) => record._id === item._id ? { ...record, isActive: !item.isActive } : record))
      setNotice(`${kind === 'service' ? 'Service' : 'Barber'} ${item.isActive ? 'deactivated' : 'reactivated'}.`)
    } catch (requestError) { setError(requestError.response?.data?.message || `Could not update this ${kind}.`) }
  }

  async function toggleCustomer(customer) {
    if (customer.isActive && !window.confirm('Deactivate this customer account?')) return
    clearFeedback()
    try {
      const { data } = await api.put(`/customers/${customer._id}/status`, { isActive: !customer.isActive })
      setCustomers((items) => items.map((item) => item._id === customer._id ? { ...item, isActive: data.isActive } : item))
      setNotice(`Customer ${data.isActive ? 'activated' : 'deactivated'}.`)
    } catch (requestError) { setError(requestError.response?.data?.message || 'Could not update this customer.') }
  }

  function signOut() { logout(); navigate('/') }
  function openForm(kind, item = null) { clearFeedback(); setEditing(item); setModal(kind) }

  return <main className="admin-shell">
    <aside className="admin-sidebar"><a className="wordmark admin-wordmark" href="/"><span className="brand-mark"><Scissors size={18} /></span><span>STILL<span className="wordmark-light"> / </span>FORM</span></a><div className="admin-shop-label">SHOP MANAGEMENT</div><nav className="admin-nav" aria-label="Admin dashboard">{sections.map(({ id, label, icon: Icon }) => <button key={id} aria-label={label} className={`admin-nav-link ${section === id ? 'is-active' : ''}`} onClick={() => { setSection(id); clearFeedback(); setSearch('') }}><Icon size={17} /><span>{label}</span>{id === 'appointments' && pending.length > 0 && <span className="nav-count">{pending.length}</span>}</button>)}</nav><div className="admin-sidebar-bottom"><div className="admin-user"><span className="admin-avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><strong>{user.name}</strong><small>Administrator</small></span></div><button className="admin-signout" onClick={signOut}><LogOut size={16} /><span>Sign out</span></button></div></aside>
    <section className="admin-main"><header className="admin-topbar"><div><span>STILL / FORM</span><ArrowRight size={14} /><strong>{sections.find((item) => item.id === section)?.label}</strong></div><span className="admin-date">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</span></header><div className="admin-content"><Feedback message={notice} type="success" /><Feedback message={error} />{loading ? <Loading label="Loading your dashboard" /> : <>
      {section === 'overview' && <Overview appointments={appointments} pending={pending} confirmed={confirmed} completed={completed} todayAppointments={todayAppointments} setSection={setSection} updateAppointment={updateAppointment} />}
      {section === 'appointments' && <AppointmentsSection appointments={visibleAppointments} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} updateAppointment={updateAppointment} />}
      {section === 'barbers' && <BarbersSection barbers={barbers} onEdit={(barber) => openForm('barber', barber)} onAdd={() => openForm('barber')} onToggle={(barber) => toggleActive('barber', barber)} onCreateAccount={(barber) => openForm('barber-account', barber)} />}
      {section === 'services' && <ServicesSection services={services} onEdit={(service) => openForm('service', service)} onAdd={() => openForm('service')} onToggle={(service) => toggleActive('service', service)} />}
      {section === 'customers' && <CustomersSection customers={visibleCustomers} search={search} setSearch={setSearch} onToggle={toggleCustomer} />}
      {section === 'insights' && <AIInsightsSection insights={insights} />}
    </>}</div></section>
    {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setModal(''); setEditing(null) } }}><section className="management-modal" role="dialog" aria-modal="true" aria-labelledby="management-modal-title"><div className="modal-heading"><div><p className="eyebrow eyebrow-dark">SHOP DETAILS</p><h2 id="management-modal-title">{modal === 'barber-account' ? 'Create barber login' : `${editing ? 'Edit' : 'Add'} ${modal}`}</h2></div><button className="icon-button" aria-label="Close" onClick={() => { setModal(''); setEditing(null) }}><X size={20} /></button></div>{modal === 'service' ? <ServiceForm key={editing?._id || 'new'} editing={editing} onSubmit={saveService} onCancel={() => { setModal(''); setEditing(null) }} /> : modal === 'barber-account' ? <BarberAccountForm key={editing?._id || 'new'} editing={editing} onSubmit={createBarberAccount} onCancel={() => { setModal(''); setEditing(null) }} /> : <BarberForm key={editing?._id || 'new'} editing={editing} onSubmit={saveBarber} onCancel={() => { setModal(''); setEditing(null) }} />}</section></div>}
  </main>
}

function Overview({ appointments, pending, confirmed, completed, todayAppointments, setSection, updateAppointment }) {
  const stats = [
    { label: 'Total appointments', value: appointments.length, icon: CalendarDays, tone: 'gold' },
    { label: 'Awaiting review', value: pending.length, icon: Clock3, tone: 'rose' },
    { label: 'Confirmed', value: confirmed.length, icon: CircleCheck, tone: 'green' },
    { label: 'Completed', value: completed.length, icon: Check, tone: 'dark' },
  ]
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">THE SHOP, AT A GLANCE</p><h1>A good day, <em>in order.</em></h1><p>Keep the chairs moving and the details in hand.</p></div><button className="button button-dark" onClick={() => setSection('appointments')}>View appointments <ArrowRight size={15} /></button></div><div className="stat-grid">{stats.map(({ label, value, icon: Icon, tone }) => <article className="stat-card" key={label}><span className={`stat-icon stat-${tone}`}><Icon size={18} /></span><span className="stat-value">{value}</span><span className="stat-label">{label}</span></article>)}</div><section className="admin-panel today-panel"><div className="panel-heading"><div><p className="eyebrow eyebrow-dark">{new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h2>Today at the shop</h2></div><button className="underlined-link" onClick={() => setSection('appointments')}>All appointments <ArrowRight size={15} /></button></div>{todayAppointments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>TIME</th><th>CLIENT</th><th>SERVICE</th><th>BARBER</th><th>STATUS</th><th /></tr></thead><tbody>{todayAppointments.map((appointment) => <tr key={appointment._id}><td className="table-time">{appointment.startTime}</td><td><strong>{appointment.customer?.name}</strong><small>{appointment.customer?.phone || appointment.customer?.email}</small></td><td>{appointment.service?.name}</td><td>{appointment.barber?.name}</td><td><StatusPill status={appointment.status} /></td><td><AppointmentActions appointment={appointment} updateAppointment={updateAppointment} /></td></tr>)}</tbody></table></div> : <div className="table-empty"><CalendarDays size={21} /><span>Nothing booked for today yet.</span></div>}</section></>
}

function AppointmentsSection({ appointments, search, setSearch, statusFilter, setStatusFilter, updateAppointment }) {
  const choices = ['All statuses', 'Pending', 'Confirmed', 'Rejected', 'Cancelled', 'Completed']
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">THE DAILY BOOK</p><h1>Every chair, <em>accounted for.</em></h1><p>Search and review every appointment request.</p></div></div><div className="table-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, service, barber…" /></label><label className="select-filter"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{choices.map((choice) => <option key={choice}>{choice}</option>)}</select></label></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>DATE / TIME</th><th>CLIENT</th><th>SERVICE</th><th>BARBER</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment._id}><td><strong>{appointmentDateLabel(appointment.appointmentDate)}</strong><small>{appointment.startTime} – {appointment.endTime}</small></td><td><strong>{appointment.customer?.name}</strong><small>{appointment.customer?.email}</small></td><td>{appointment.service?.name}<small>₱{Number(appointment.service?.price || 0).toLocaleString('en-PH')}</small></td><td>{appointment.barber?.name}</td><td><StatusPill status={appointment.status} /></td><td><AppointmentActions appointment={appointment} updateAppointment={updateAppointment} /></td></tr>)}</tbody></table>{appointments.length === 0 && <div className="table-empty">No appointments match these filters.</div>}</div></section></>
}

function AppointmentActions({ appointment, updateAppointment }) {
  if (appointment.status === 'Pending') return <div className="table-actions"><button className="table-action table-confirm" title="Confirm appointment" aria-label="Confirm appointment" onClick={() => updateAppointment(appointment, 'Confirmed')}><Check size={15} /></button><button className="table-action table-reject" title="Reject appointment" aria-label="Reject appointment" onClick={() => updateAppointment(appointment, 'Rejected')}><X size={15} /></button></div>
  if (appointment.status === 'Confirmed') return <button className="complete-action" onClick={() => updateAppointment(appointment, 'Completed')}>Mark complete <ArrowRight size={13} /></button>
  return <span className="muted-dash">—</span>
}

function BarbersSection({ barbers, onEdit, onAdd, onToggle, onCreateAccount }) {
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">THE HANDS BEHIND THE CHAIR</p><h1>Meet the <em>barbers.</em></h1><p>Set each barber’s hours, breaks, days off, and specialties.</p></div><button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add barber</button></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>BARBER</th><th>SPECIALTIES</th><th>WORKING DAYS</th><th>HOURS</th><th>BREAKS / DAYS OFF</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{barbers.map((barber) => <tr key={barber._id}><td><strong>{barber.name}</strong><small>{barber.email || 'No email added'}</small></td><td>{barber.specialties?.join(', ') || '—'}</td><td>{barber.workingDays?.map((day) => day.slice(0, 3)).join(' · ')}</td><td>{barber.startTime} – {barber.endTime}</td><td>{barber.breaks?.length ? barber.breaks.map((item) => `${item.startTime}–${item.endTime}`).join(', ') : 'No breaks'}<small>{barber.daysOff?.length || 0} date(s) off</small></td><td><span className={`status-pill ${barber.isActive ? 'status-confirmed' : 'status-rejected'}`}>{barber.isActive ? 'Active' : 'Inactive'}</span></td><td><div className="row-management-actions"><button className="quiet-button" onClick={() => onEdit(barber)}>Edit</button>{!barber.email && <button className="quiet-button" onClick={() => onCreateAccount(barber)}>Create login</button>}<button className="quiet-button" onClick={() => onToggle(barber)}>{barber.isActive ? 'Deactivate' : 'Reactivate'}</button></div></td></tr>)}</tbody></table>{barbers.length === 0 && <div className="table-empty">Add your first barber to open the booking calendar.</div>}</div></section></>
}

function ServicesSection({ services, onEdit, onAdd, onToggle }) {
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">THE SERVICE MENU</p><h1>Set the <em>standard.</em></h1><p>Keep prices, descriptions, and durations up to date.</p></div><button className="button button-dark" onClick={onAdd}><Plus size={16} /> Add service</button></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>SERVICE</th><th>DESCRIPTION</th><th>PRICE</th><th>DURATION</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{services.map((service) => <tr key={service._id}><td><strong>{service.name}</strong></td><td className="service-description-cell">{service.description}</td><td>₱{Number(service.price).toLocaleString('en-PH')}</td><td>{service.duration} min</td><td><span className={`status-pill ${service.isActive ? 'status-confirmed' : 'status-rejected'}`}>{service.isActive ? 'Active' : 'Inactive'}</span></td><td><div className="row-management-actions"><button className="quiet-button" onClick={() => onEdit(service)}>Edit</button><button className="quiet-button" onClick={() => onToggle(service)}>{service.isActive ? 'Deactivate' : 'Reactivate'}</button></div></td></tr>)}</tbody></table>{services.length === 0 && <div className="table-empty">Add a service to let customers book online.</div>}</div></section></>
}

function CustomersSection({ customers, search, setSearch, onToggle }) {
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">THE REGULARS</p><h1>Good to <em>know you.</em></h1><p>Review account details and manage customer access.</p></div></div><div className="table-toolbar"><label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone…" /></label></div><section className="admin-panel"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>CUSTOMER</th><th>PHONE</th><th>JOINED</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer._id}><td><strong>{customer.name}</strong><small>{customer.email}</small></td><td>{customer.phone || '—'}</td><td>{new Date(customer.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td><td><span className={`status-pill ${customer.isActive ? 'status-confirmed' : 'status-rejected'}`}>{customer.isActive ? 'Active' : 'Inactive'}</span></td><td><button className="quiet-button" onClick={() => onToggle(customer)}>{customer.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table>{customers.length === 0 && <div className="table-empty">No customers match this search.</div>}</div></section></>
}

function AIInsightsSection({ insights }) {
  if (!insights) return <Loading label="Reviewing shop activity" />
  return <><div className="admin-page-heading"><div><p className="eyebrow eyebrow-dark">SHOP PATTERNS</p><h1>Signals, not <em>certainties.</em></h1><p>Historical booking counts and transparent review-keyword triage.</p></div></div><div className="insights-grid"><section className="admin-panel insight-panel"><p className="eyebrow eyebrow-dark">BUSIEST START TIMES</p><h2>When chairs fill up</h2>{insights.peaks.peakHours.length ? insights.peaks.peakHours.map((item) => <div className="insight-row" key={item.time}><span>{item.time}</span><strong>{item.bookings} bookings</strong></div>) : <p className="insight-empty">Not enough confirmed visits yet.</p>}<p className="insight-caption">{insights.peaks.sampleSize} historical bookings · {insights.peaks.method}</p></section><section className="admin-panel insight-panel"><p className="eyebrow eyebrow-dark">REVIEW TRIAGE</p><h2>What customers mention</h2><div className="sentiment-counts">{Object.entries(insights.reviews.counts).map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label.replace('-', ' ')}</span></div>)}</div><p className="insight-caption">{insights.reviews.sampleSize} reviews · {insights.reviews.method}</p><p className="insight-caveat">{insights.reviews.disclaimer}</p></section></div><p className="insight-caveat">Peak suggestions are descriptive only. Verify staffing and demand before changing prices or shifts. No automatic discounts are applied.</p></>
}

function ServiceForm({ editing, onSubmit, onCancel }) {
  return <form className="form-stack management-form" onSubmit={onSubmit}><label>Service name<input name="name" defaultValue={editing?.name || ''} maxLength="100" required /></label><label>Description<textarea name="description" defaultValue={editing?.description || ''} rows="3" maxLength="500" /></label><div className="form-row"><label>Price (₱)<input name="price" type="number" min="0" step="1" defaultValue={editing?.price ?? ''} required /></label><label>Duration (minutes)<input name="duration" type="number" min="5" max="480" step="5" defaultValue={editing?.duration ?? 30} required /></label></div><label className="check-line"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /> Available for booking</label><div className="modal-actions"><button className="quiet-button" type="button" onClick={onCancel}>Cancel</button><button className="button button-dark" type="submit">{editing ? 'Save changes' : 'Add service'} <ArrowRight size={15} /></button></div></form>
}

function BarberAccountForm({ editing, onSubmit, onCancel }) {
  return <form className="form-stack management-form" onSubmit={onSubmit}><p className="form-intro">The barber can sign in to view only their assigned appointments. Share the initial password securely.</p><label>Login email<input name="email" type="email" defaultValue={editing?.email || ''} autoComplete="off" required /></label><label>Temporary password<input name="password" type="password" minLength="12" autoComplete="new-password" required /><small className="field-hint">At least 12 characters; deliver this out of band.</small></label><div className="modal-actions"><button className="quiet-button" type="button" onClick={onCancel}>Cancel</button><button className="button button-dark" type="submit">Create barber login <ArrowRight size={15} /></button></div></form>
}

function BarberForm({ editing, onSubmit, onCancel }) {
  return <form className="form-stack management-form" onSubmit={onSubmit}><label>Barber name<input name="name" defaultValue={editing?.name || ''} maxLength="80" required /></label><label>Email <span className="optional-label">OPTIONAL</span><input name="email" type="email" defaultValue={editing?.email || ''} /></label><label>Avatar image URL <span className="optional-label">HTTPS ONLY</span><input name="avatarUrl" type="url" pattern="https://.*" defaultValue={editing?.avatarUrl || ''} placeholder="https://…" /></label><label>Specialties <span className="optional-label">COMMA SEPARATED</span><input name="specialties" defaultValue={editing?.specialties?.join(', ') || ''} placeholder="Classic cuts, Beard styling" /></label><fieldset className="weekday-fieldset"><legend>Working days</legend><div className="weekday-options">{weekdays.map((day) => <label key={day}><input type="checkbox" name="workingDays" value={day} defaultChecked={editing ? editing.workingDays.includes(day) : !['Sunday'].includes(day)} /><span>{day.slice(0, 3)}</span></label>)}</div></fieldset><div className="form-row"><label>Start time<input name="startTime" type="time" defaultValue={editing?.startTime || '09:00'} required /></label><label>End time<input name="endTime" type="time" defaultValue={editing?.endTime || '18:00'} required /></label></div><label>Breaks <span className="optional-label">ONE PER LINE: HH:MM-HH:MM DAYS</span><textarea name="breaks" rows="2" defaultValue={editing?.breaks?.map((item) => `${item.startTime}-${item.endTime} ${item.workingDays.join(', ')}`).join('\n') || ''} placeholder={'12:00-13:00 Monday,Tuesday,Wednesday,Thursday,Friday'} /></label><label>Days off <span className="optional-label">COMMA-SEPARATED YYYY-MM-DD</span><input name="daysOff" defaultValue={editing?.daysOff?.join(', ') || ''} placeholder="2026-12-25, 2026-12-26" /></label><label className="check-line"><input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} /> Available for booking</label><div className="modal-actions"><button className="quiet-button" type="button" onClick={onCancel}>Cancel</button><button className="button button-dark" type="submit">{editing ? 'Save changes' : 'Add barber'} <ArrowRight size={15} /></button></div></form>
}