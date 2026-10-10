import { ArrowUpRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EmptyState, Feedback, Loading } from '../components/Feedback'
import api from '../services/api'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/services').then(({ data }) => setServices(data)).catch(() => setError('We could not load services. Please try again.')).finally(() => setLoading(false)) }, [])

  return <main className="inner-page"><div className="page-heading"><p className="eyebrow eyebrow-dark">THE MENU</p><h1>Time well <em>spent.</em></h1><p>Good work, clear prices, no surprises. Choose your service and we’ll find you a chair.</p></div><Feedback message={error} />{loading ? <Loading label="Loading services" /> : services.length ? <div className="service-cards">{services.map((service, index) => <article className="service-card" key={service._id}><span className="service-card-number">0{index + 1}</span><h2>{service.name}</h2><p>{service.description || 'A thoughtful service, finished with care.'}</p><div className="service-card-meta"><span><Clock3 size={15} /> {service.duration} minutes</span><strong>₱{Number(service.price).toLocaleString('en-PH')}</strong></div><Link to={`/book?service=${service._id}`} className="button button-dark button-full">Book this service <ArrowUpRight size={15} /></Link></article>)}</div> : <EmptyState title="No services at the moment" text="Please check back soon." />}</main>
}