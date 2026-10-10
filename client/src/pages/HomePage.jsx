import { ArrowDownRight, ArrowRight, ArrowUpRight, Clock3, Scissors, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../services/api'
import { EmptyState, Loading } from '../components/Feedback'
import { useAuth } from '../hooks/useAuth'

export default function HomePage() {
  const { user } = useAuth()
  const [services, setServices] = useState([])
  const [reviews, setReviews] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  useEffect(() => {
    api.get('/services').then(({ data }) => setServices(data.slice(0, 3))).catch(() => setError(true)).finally(() => setLoading(false))
    api.get('/reviews').then(({ data }) => setReviews(data.slice(0, 3))).catch(() => {})
  }, [])

  useEffect(() => {
    if (user?.role !== 'customer') return
    api.get('/ai/recommendations/me').then(({ data }) => setRecommendations(data)).catch(() => {})
  }, [user?.id, user?.role])

  return (
    <main>
      <section className="hero-section">
        <div className="hero-image" role="img" aria-label="Barber carefully shaping a customer's haircut" />
        <div className="hero-wash" />
        <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot" /> INDEPENDENT BARBERSHOP · EST. 2018</p><h1>Good hair.<br /><span>Good company.</span></h1><p className="hero-description">A neighbourhood barbershop for the everyday ritual. Come as you are. Leave a little sharper.</p><div className="hero-actions"><Link className="button button-gold" to="/book">Book an appointment <ArrowUpRight size={16} /></Link><Link className="hero-secondary" to="/style-matcher"><Sparkles size={15} /> Try the style guide</Link><Link className="hero-secondary hero-secondary-muted" to="/services">Explore services <ArrowDownRight size={16} /></Link></div></div>
        <div className="hero-index"><span>01</span><span className="index-line" /><span>03</span></div><div className="hero-caption">A good cut is a small thing<br />that changes the whole day.</div>
      </section>
      {recommendations && (recommendations.services.length > 0 || recommendations.barbers.length > 0) && <section className="recommendation-section"><div className="section-heading"><div><p className="eyebrow eyebrow-dark">A GOOD PLACE TO START</p><h2>Picked for <em>you.</em></h2></div><span className="method-note">Based on your visits and shop reviews</span></div><div className="recommendation-grid">{recommendations.services.slice(0, 2).map((service) => <article className="recommendation-item" key={service._id}><span className="recommendation-kicker">SERVICE SUGGESTION</span><h3>{service.name}</h3><p>{service.reason}</p><Link to={`/book?service=${service._id}`} className="underlined-link">See times <ArrowRight size={14} /></Link></article>)}{recommendations.barbers.slice(0, 2).map((barber) => <article className="recommendation-item" key={barber.id}><span className="recommendation-kicker">BARBER SUGGESTION</span><h3>{barber.name}</h3><p>{barber.reason}{barber.rating ? ` · ${barber.rating} average from ${barber.reviewCount} review${barber.reviewCount === 1 ? '' : 's'}` : ''}</p><Link to={`/book?barber=${barber.id}`} className="underlined-link">Check availability <ArrowRight size={14} /></Link></article>)}</div></section>}
      <section className="intro-strip"><span className="strip-number">01 / THE SHOP</span><p>Good work takes time. We keep the chair warm, the conversation easy, and the details sharp.</p><Link to="/services" aria-label="Explore our services"><ArrowRight size={20} /></Link></section>
      <section className="services-section" id="services"><div className="section-heading"><div><p className="eyebrow eyebrow-dark">THE MENU</p><h2>Simple things,<br /><em>done properly.</em></h2></div><Link className="underlined-link" to="/services">All services <ArrowUpRight size={15} /></Link></div>
        {loading ? <Loading label="Finding the right finish" /> : error ? <EmptyState title="The service menu is unavailable" text="Please check your connection and try again." /> : services.length ? <div className="service-list">{services.map((service, index) => <article className="service-row" key={service._id}><span className="service-index">0{index + 1}</span><div className="service-title"><h3>{service.name}</h3><p>{service.description}</p></div><span className="service-duration"><Clock3 size={14} /> {service.duration} min</span><strong className="service-price">₱{Number(service.price).toLocaleString('en-PH')}</strong><Link className="row-arrow" to={`/book?service=${service._id}`} aria-label={`Book ${service.name}`}><ArrowUpRight size={18} /></Link></article>)}</div> : <EmptyState title="No services available yet" text="Please check back soon." />}
        <Link className="mobile-menu-link" to="/services">See all services <ArrowRight size={16} /></Link>
      </section>
      <section className="promise-band"><div className="promise-mark"><Scissors size={26} strokeWidth={1.4} /></div><p>“There’s a difference between getting a haircut<br className="desktop-break" /> and getting <em>your</em> haircut.”</p><span>THE STILL / FORM PROMISE</span></section>
      {reviews.length > 0 && <section className="reviews-section"><div className="section-heading"><div><p className="eyebrow eyebrow-dark">KIND WORDS</p><h2>From the <em>chair.</em></h2></div></div><div className="public-review-list">{reviews.map((review) => <article className="public-review" key={review._id}><div className="public-review-stars" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={14} fill="currentColor" />)}</div><p>{review.comment || 'A good visit at Still / Form.'}</p><span>{review.customer?.name || 'A customer'} · {review.service?.name || 'Barber service'}</span></article>)}</div></section>}
      <section className="visit-section"><div className="visit-photo" role="img" aria-label="Warm, welcoming barbershop interior" /><div className="visit-copy"><p className="eyebrow eyebrow-dark">YOUR CHAIR IS WAITING</p><h2>Make a little<br /><em>time for yourself.</em></h2><p>Pick your service, choose your barber, and find a time that works. We’ll take it from there.</p><Link className="button button-dark" to="/book">Find your time <ArrowUpRight size={16} /></Link><div className="visit-detail"><ShieldCheck size={18} /><span>Easy online booking<br /><small>Plans change. Cancel up to 24 hours ahead.</small></span></div></div></section>
    </main>
  )
}