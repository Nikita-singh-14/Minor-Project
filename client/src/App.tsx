import { useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Brush,
  ChevronDown,
  ChevronRight,
  Clock3,
  HardHat,
  Hammer,
  MapPin,
  Menu,
  PaintRoller,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './App.css'

type Category = { id: string; en: string; hi: string; icon: LucideIcon; tone: string }
type Job = { id: number; role: string; employer: string; place: string; pay: number; unit: string; posted: string; category: string; distance: string }
type Worker = { name: string; role: string; rating: string; reviews: number; experience: string; distance: string; image: string; category: string }
type Dialog = 'worker' | 'employer' | 'admin' | 'post' | null

const categories: Category[] = [
  { id: 'construction', en: 'Construction', hi: 'निर्माण कार्य', icon: Hammer, tone: 'peach' },
  { id: 'electrician', en: 'Electrician', hi: 'इलेक्ट्रीशियन', icon: Plug, tone: 'mint' },
  { id: 'plumber', en: 'Plumber', hi: 'प्लंबर', icon: Wrench, tone: 'blue' },
  { id: 'painter', en: 'Painter', hi: 'पेंटर', icon: PaintRoller, tone: 'yellow' },
  { id: 'driver', en: 'Driver', hi: 'ड्राइवर', icon: BriefcaseBusiness, tone: 'blue' },
  { id: 'cleaning', en: 'Cleaning', hi: 'सफाई कर्मचारी', icon: Brush, tone: 'mint' },
  { id: 'carpenter', en: 'Carpenter', hi: 'कारपेंटर', icon: Hammer, tone: 'peach' },
  { id: 'helper', en: 'Home helper', hi: 'घरेलू सहायक', icon: UsersRound, tone: 'pink' },
]

const jobsSeed: Job[] = [
  { id: 1, role: 'Mason needed', employer: 'R.K. Builders', place: 'Bilaspur, Chhattisgarh', pay: 700, unit: 'day', posted: 'Today', category: 'construction', distance: '2.1 km' },
  { id: 2, role: 'Electrician required', employer: 'Sharma Electricals', place: 'Torwa, Bilaspur', pay: 850, unit: 'day', posted: 'Yesterday', category: 'electrician', distance: '3.4 km' },
  { id: 3, role: 'House painter needed', employer: 'Amit Verma', place: 'Bilaspur', pay: 500, unit: 'day', posted: 'Today', category: 'painter', distance: '1.8 km' },
  { id: 4, role: 'Office cleaning staff', employer: 'City Care Services', place: 'Sakri, Bilaspur', pay: 600, unit: 'day', posted: '2 days ago', category: 'cleaning', distance: '4.2 km' },
]

const workers: Worker[] = [
  { name: 'Ramesh Kumar', role: 'Mason', rating: '4.8', reviews: 56, experience: '5 years', distance: '2.3 km', image: 'photo-1500648767791-00dcc994a43e', category: 'construction' },
  { name: 'Suresh Yadav', role: 'Electrician', rating: '4.6', reviews: 32, experience: '4 years', distance: '3.1 km', image: 'photo-1506794778202-cad84cf45f1d', category: 'electrician' },
  { name: 'Imran Khan', role: 'Plumber', rating: '4.7', reviews: 41, experience: '6 years', distance: '2.8 km', image: 'photo-1507003211169-0a1dd7228f2d', category: 'plumber' },
  { name: 'Rekha Sahu', role: 'Home helper', rating: '4.5', reviews: 28, experience: '3 years', distance: '1.9 km', image: 'photo-1534528741775-53994a69daeb', category: 'helper' },
]

const copy = {
  en: {
    home: 'Home', jobs: 'Find Jobs', workers: 'Find Workers', how: 'How It Works', about: 'About', help: 'Help',
    title: 'Work today. Build a better tomorrow.', subtitle: 'Good work is closer than you think. Find trusted local jobs and workers with Rozgaar Setu.',
    worker: 'I need work', employer: 'I have work', workerSub: 'Find nearby jobs', employerSub: 'Post a job in minutes',
    searchPlaceholder: 'What work are you looking for? (e.g. mason, painter, driver...)', location: 'Your city or area', search: 'Search',
    popular: 'Popular categories', allCategories: 'All categories', nearby: 'Jobs near you', allJobs: 'View all jobs', available: 'Available workers', allWorkers: 'View all workers',
    availableBadge: 'Available', apply: 'Apply', perDay: '/ day', statsTitle: 'New opportunities across India', statsWorkers: 'Registered workers', statsJobs: 'Jobs posted', statsTowns: 'Towns & cities', rating: 'Average rating',
    safe: 'Safe & verified', local: 'Your neighbourhood', simple: 'Easy for everyone', postTitle: 'Post work', close: 'Close dialog', roleTitle: 'Welcome to Rozgaar Setu',
    roleSub: 'Choose how you want to get started.', createAccount: 'Continue as', name: 'Your name', phone: 'Phone number', continue: 'Continue', postHeading: 'Post a local job', jobTitle: 'Job title', category: 'Category', pay: 'Pay per day (₹)', area: 'Area', publish: 'Publish job', posted: 'Your job has been added to the demo listings.', applied: 'Application saved for this demo.', noResults: 'No matching listings. Try a different search or category.',
  },
  hi: {
    home: 'होम', jobs: 'काम खोजें', workers: 'कामगार खोजें', how: 'कैसे काम करता है', about: 'हमारे बारे में', help: 'मदद',
    title: 'काम से बने बेहतर कल।', subtitle: 'अच्छा काम आपके पास ही है। Rozgaar Setu पर भरोसेमंद स्थानीय काम और कामगार खोजें।',
    worker: 'मुझे काम चाहिए', employer: 'मुझे काम करवाना है', workerSub: 'पास के काम खोजें', employerSub: 'मिनटों में काम पोस्ट करें',
    searchPlaceholder: 'आप क्या ढूंढ रहे हैं? (जैसे मिस्त्री, प्लंबर, ड्राइवर...)', location: 'अपना शहर या इलाका', search: 'खोजें',
    popular: 'लोकप्रिय श्रेणियां', allCategories: 'सभी श्रेणियां', nearby: 'आपके पास के काम', allJobs: 'सभी काम देखें', available: 'उपलब्ध कामगार', allWorkers: 'सभी कामगार देखें',
    availableBadge: 'उपलब्ध', apply: 'आवेदन करें', perDay: '/ दिन', statsTitle: 'पूरे भारत में नए अवसर', statsWorkers: 'पंजीकृत कामगार', statsJobs: 'पोस्ट किए काम', statsTowns: 'शहरों में उपलब्ध', rating: 'औसत रेटिंग',
    safe: 'सुरक्षित और भरोसेमंद', local: 'आपके आसपास', simple: 'सबके लिए आसान', postTitle: 'काम पोस्ट करें', close: 'डायलॉग बंद करें', roleTitle: 'Rozgaar Setu में आपका स्वागत है',
    roleSub: 'शुरू करने का तरीका चुनें।', createAccount: 'जारी रखें', name: 'आपका नाम', phone: 'फोन नंबर', continue: 'आगे बढ़ें', postHeading: 'स्थानीय काम पोस्ट करें', jobTitle: 'काम का नाम', category: 'श्रेणी', pay: 'रोज़ की मज़दूरी (₹)', area: 'इलाका', publish: 'काम पोस्ट करें', posted: 'डेमो सूची में आपका काम जोड़ दिया गया है।', applied: 'डेमो के लिए आपका आवेदन सेव हो गया है।', noResults: 'कोई काम नहीं मिला। दूसरी खोज या श्रेणी चुनें।',
  },
}

function App() {
  const [language, setLanguage] = useState<'en' | 'hi'>('hi')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('Bilaspur')
  const [activeCategory, setActiveCategory] = useState('all')
  const [jobs, setJobs] = useState(jobsSeed)
  const [applied, setApplied] = useState<number[]>(() => JSON.parse(localStorage.getItem('rozgaar-applications') ?? '[]') as number[])
  const [dialog, setDialog] = useState<Dialog>(null)
  const [toast, setToast] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const t = copy[language]

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    const matchesQuery = `${job.role} ${job.employer} ${job.place} ${job.category}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (activeCategory === 'all' || job.category === activeCategory)
  }), [activeCategory, jobs, query])
  const visibleWorkers = useMemo(() => workers.filter((worker) => activeCategory === 'all' || worker.category === activeCategory), [activeCategory])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  function applyForJob(jobId: number) {
    if (applied.includes(jobId)) return
    const next = [...applied, jobId]
    setApplied(next)
    localStorage.setItem('rozgaar-applications', JSON.stringify(next))
    showToast(t.applied)
  }

  function publishJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const category = String(form.get('category'))
    const newJob: Job = {
      id: Date.now(), role: String(form.get('title')), employer: 'You', place: String(form.get('area')),
      pay: Number(form.get('pay')), unit: 'day', posted: 'Just now', category, distance: 'Nearby',
    }
    setJobs((current) => [newJob, ...current])
    setActiveCategory('all')
    setQuery('')
    setDialog(null)
    showToast(t.posted)
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' })
  }

  function scrollTo(id: string) {
    setMobileNavOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Rozgaar Setu home">
          <span className="brand-mark"><UsersRound size={24} strokeWidth={2.6} /><span /></span>
          <span className="brand-copy"><strong>Rozgaar <em>Setu</em></strong><small>काम से बने, भारत से जुड़ें</small></span>
        </a>
        <div className="header-actions">
          <label className="location-control"><MapPin size={15} /><select aria-label="Choose location" value={location} onChange={(event) => setLocation(event.target.value)}><option>Bilaspur</option><option>Raipur</option><option>Korba</option><option>Rajnandgaon</option></select><ChevronDown size={13} /></label>
          <button className="language-control" onClick={() => setLanguage(language === 'hi' ? 'en' : 'hi')} aria-label="Switch language">文 <span>{language === 'hi' ? 'हिंदी' : 'English'}</span><ChevronDown size={13} /></button>
          <button className="button button-outline header-login" onClick={() => setDialog('worker')}><UsersRound size={15} /> Login</button>
          <button className="button button-primary header-signup" onClick={() => setDialog('worker')}>Sign Up <ArrowRight size={15} /></button>
          <button className="icon-button mobile-menu" aria-label="Toggle menu" onClick={() => setMobileNavOpen(!mobileNavOpen)}>{mobileNavOpen ? <X /> : <Menu />}</button>
        </div>
        <nav className={`main-nav ${mobileNavOpen ? 'is-open' : ''}`}>
          <button onClick={() => scrollTo('top')}>{t.home}</button><button onClick={() => scrollTo('jobs')}>{t.jobs}</button><button onClick={() => scrollTo('workers')}>{t.workers}</button><button onClick={() => scrollTo('categories')}>{t.allCategories}</button><button onClick={() => scrollTo('how-it-works')}>{t.how}</button><button onClick={() => scrollTo('footer')}>{t.about}</button><button onClick={() => showToast('Help center is coming soon.')}>{t.help}</button>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> ROZGAAR SETU · BILASPUR</span>
            <h1>{language === 'hi' ? <>काम से बने<br /><span>बेहतर कल।</span></> : <>Work today.<br /><span>Build a better tomorrow.</span></>}</h1>
            <p>{t.subtitle}</p>
            <div className="hero-actions">
              <button className="role-button role-worker" onClick={() => setDialog('worker')}><UsersRound size={25} /><span><strong>{t.worker}</strong><small>{t.workerSub}</small></span><ArrowRight className="role-arrow" size={16} /></button>
              <button className="role-button role-employer" onClick={() => setDialog('post')}><HardHat size={25} /><span><strong>{t.employer}</strong><small>{t.employerSub}</small></span><ArrowRight className="role-arrow" size={16} /></button>
            </div>
            <div className="trust-row"><span><ShieldCheck size={17} /> {t.safe}</span><span><MapPin size={17} /> {t.local}</span><span><UsersRound size={17} /> {t.simple}</span></div>
          </div>
          <div className="hero-image" role="img" aria-label="Construction worker in a safety helmet">
            <div className="hero-image-shade" />
            <div className="hero-caption"><span>हर हाथ को</span><strong>काम मिले</strong></div>
            <div className="hero-location"><MapPin size={14} /> BILASPUR, CHHATTISGARH</div>
          </div>
        </section>

        <section className="search-section" aria-label="Search local work">
          <form className="search-bar" onSubmit={(event) => { event.preventDefault(); scrollTo('jobs') }}>
            <Search className="search-icon" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} aria-label="Search jobs" />
            <label className="search-location"><MapPin size={17} /><select aria-label="Search location" value={location} onChange={(event) => setLocation(event.target.value)}><option>Bilaspur</option><option>Raipur</option><option>Korba</option><option>Rajnandgaon</option></select></label>
            <button type="submit" className="button button-primary search-submit">{t.search}<Search size={16} /></button>
          </form>
        </section>

        <section className="content-section category-section" id="categories">
          <div className="section-heading"><div><span className="section-kicker">FIND YOUR TRADE</span><h2>{t.popular}</h2></div><button className="text-link" onClick={() => setActiveCategory('all')}>{t.allCategories} <ArrowRight size={15} /></button></div>
          <div className="category-grid">
            {categories.map((category) => {
              const Icon = category.icon
              return <button key={category.id} className={`category-tile ${category.tone} ${activeCategory === category.id ? 'is-selected' : ''}`} onClick={() => setActiveCategory(activeCategory === category.id ? 'all' : category.id)} aria-pressed={activeCategory === category.id}><Icon size={24} strokeWidth={2.1} /><span>{language === 'hi' ? category.hi : category.en}</span></button>
            })}
            <button className={`category-tile other ${activeCategory === 'all' ? 'is-selected' : ''}`} onClick={() => setActiveCategory('all')}><span className="other-dots">•••</span><span>{language === 'hi' ? 'सभी काम' : 'All work'}</span></button>
          </div>
        </section>

        <section className="content-section listings-section">
          <div className="list-column" id="jobs">
            <div className="section-heading compact"><div><span className="section-kicker">WORK THAT FITS YOUR DAY</span><h2>{t.nearby}</h2></div><button className="text-link" onClick={() => { setActiveCategory('all'); setQuery('') }}>{t.allJobs} <ArrowRight size={15} /></button></div>
            <div className="listing-stack">
              {visibleJobs.length ? visibleJobs.map((job) => {
                const category = categories.find((item) => item.id === job.category) ?? categories[0]
                const Icon = category.icon
                return <article className="job-row" key={job.id}><div className={`listing-icon ${category.tone}`}><Icon size={20} /></div><div className="job-main"><strong>{job.role}</strong><span><MapPin size={12} /> {job.place}</span></div><div className="job-pay"><strong>₹{job.pay} <small>{t.perDay}</small></strong><span><Clock3 size={12} /> {job.posted}</span></div><div className="job-distance">{job.distance}</div><button className={`row-action ${applied.includes(job.id) ? 'is-applied' : ''}`} aria-label={applied.includes(job.id) ? 'Already applied' : `Apply to ${job.role}`} onClick={() => applyForJob(job.id)}>{applied.includes(job.id) ? <BadgeCheck size={19} /> : <ChevronRight size={19} />}</button></article>
              }) : <div className="empty-state"><Search size={22} /><p>{t.noResults}</p></div>}
            </div>
          </div>

          <div className="list-column" id="workers">
            <div className="section-heading compact"><div><span className="section-kicker">SKILLED PEOPLE, NEARBY</span><h2>{t.available}</h2></div><button className="text-link" onClick={() => setDialog('employer')}>{t.allWorkers} <ArrowRight size={15} /></button></div>
            <div className="listing-stack worker-stack">
              {visibleWorkers.length ? visibleWorkers.map((worker) => <article className="worker-row" key={worker.name}><img className="worker-avatar" src={`https://images.unsplash.com/${worker.image}?auto=format&fit=crop&w=96&h=96&q=80`} alt={`${worker.name}, ${worker.role}`} /><div className="worker-main"><strong>{worker.name}</strong><span>{worker.role}</span><small><Star size={12} fill="currentColor" /> {worker.rating} <span>({worker.reviews} reviews)</span></small></div><div className="worker-meta"><span className="availability"><span /> {t.availableBadge}</span><small><Clock3 size={12} /> {worker.experience}</small></div><div className="worker-distance"><MapPin size={12} /> {worker.distance}</div><button className="row-action" aria-label={`View ${worker.name}`} onClick={() => setDialog('employer')}><ChevronRight size={19} /></button></article>) : <div className="empty-state"><UsersRound size={22} /><p>{t.noResults}</p></div>}
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-heading"><span className="section-kicker">SIMPLE BY DESIGN</span><h2>{t.how}</h2><p>एक सही काम, एक बेहतर शुरुआत।</p></div>
          <div className="how-steps"><article><span className="step-number">01</span><span className="step-icon"><Search size={20} /></span><h3>काम खोजें</h3><p>अपने इलाके और हुनर के हिसाब से काम ढूंढें।</p></article><article><span className="step-number">02</span><span className="step-icon"><UsersRound size={20} /></span><h3>सीधे जुड़ें</h3><p>कामगार या काम देने वाले से बात करें।</p></article><article><span className="step-number">03</span><span className="step-icon"><BadgeCheck size={20} /></span><h3>काम शुरू करें</h3><p>सही अवसर से अपने कल को बेहतर बनाएं।</p></article></div>
        </section>

        <section className="stats-band"><div className="stats-intro"><span className="india-mark"><MapPin size={31} /></span><div><span className="section-kicker">LOCAL WORK, REAL IMPACT</span><h2>{t.statsTitle}</h2><p>छोटे शहर, बड़े सपने — Rozgaar Setu के साथ</p></div></div><div className="stat"><UsersRound size={22} /><strong>10,000+</strong><span>{t.statsWorkers}</span></div><div className="stat"><BriefcaseBusiness size={22} /><strong>5,000+</strong><span>{t.statsJobs}</span></div><div className="stat"><MapPin size={22} /><strong>200+</strong><span>{t.statsTowns}</span></div><div className="stat"><Star size={22} fill="currentColor" /><strong>4.7</strong><span>{t.rating}</span></div></section>
      </main>

      <footer className="site-footer" id="footer"><div className="footer-brand"><a className="brand footer-logo" href="#top"><span className="brand-mark"><UsersRound size={24} /><span /></span><span className="brand-copy"><strong>Rozgaar <em>Setu</em></strong><small>काम से बने, भारत से जुड़ें</small></span></a><p>“हर हाथ को काम, हर घर में सम्मान”</p></div><div className="footer-links"><strong>Quick links</strong><button onClick={() => scrollTo('jobs')}>{t.jobs}</button><button onClick={() => scrollTo('workers')}>{t.workers}</button><button onClick={() => scrollTo('categories')}>{t.allCategories}</button></div><div className="footer-links"><strong>For everyone</strong><button onClick={() => setDialog('worker')}>{t.worker}</button><button onClick={() => setDialog('post')}>{t.postTitle}</button><button onClick={() => setDialog('admin')}>Admin</button></div><div className="footer-connect"><strong>काम आपके पास है।</strong><span>Bilaspur, Chhattisgarh</span><button className="footer-post" onClick={() => setDialog('post')}>{t.postTitle} <ArrowRight size={15} /></button></div><span className="footer-bottom">Made with care for a stronger India <span>◆</span></span></footer>

      {dialog && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null) }}><section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><button className="dialog-close icon-button" onClick={() => setDialog(null)} aria-label={t.close}><X size={19} /></button>{dialog === 'post' ? <><span className="dialog-icon"><HardHat size={22} /></span><span className="section-kicker">EMPLOYER SPACE</span><h2 id="dialog-title">{t.postHeading}</h2><p className="dialog-description">काम की जानकारी दें, आसपास के कामगारों तक पहुंचें।</p><form className="dialog-form" onSubmit={publishJob}><label>{t.jobTitle}<input name="title" placeholder="जैसे घर की पेंटिंग" required /></label><label>{t.category}<select name="category">{categories.map((category) => <option value={category.id} key={category.id}>{category.hi}</option>)}</select></label><div className="form-split"><label>{t.pay}<input name="pay" type="number" min="100" required placeholder="700" /></label><label>{t.area}<input name="area" required defaultValue={location} /></label></div><button className="button button-primary dialog-submit" type="submit">{t.publish}<ArrowRight size={16} /></button><p className="demo-note">Demo mode: listings are temporary and saved in this browser session.</p></form></> : <><span className="dialog-icon"><UsersRound size={22} /></span><span className="section-kicker">YOUR NEXT STEP</span><h2 id="dialog-title">{t.roleTitle}</h2><p className="dialog-description">{t.roleSub}</p><div className="role-options"><button onClick={() => setDialog('worker')}><UsersRound size={20} /><span><strong>{t.worker}</strong><small>{t.workerSub}</small></span><ChevronRight size={17} /></button><button onClick={() => setDialog('post')}><HardHat size={20} /><span><strong>{t.employer}</strong><small>{t.employerSub}</small></span><ChevronRight size={17} /></button><button onClick={() => { setDialog(null); showToast('Admin access will be configured in the next build phase.') }}><ShieldCheck size={20} /><span><strong>Admin</strong><small>Manage the Rozgaar Setu platform</small></span><ChevronRight size={17} /></button></div><form className="dialog-form login-form" onSubmit={(event) => { event.preventDefault(); setDialog(null); showToast('Account sign-in will be connected to the API next.') }}><label>{t.name}<input name="name" autoComplete="name" required placeholder="नाम लिखें" /></label><label>{t.phone}<input name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() -]{8,16}" required placeholder="मोबाइल नंबर" /></label><button className="button button-primary dialog-submit" type="submit">{t.continue}<ArrowRight size={16} /></button><p className="demo-note">Demo mode: authentication and verification are not connected yet.</p></form></>}</section></div>}
      {toast && <div className="toast-message" role="status"><BadgeCheck size={17} /> {toast}</div>}
    </div>
  )
}

export default App
