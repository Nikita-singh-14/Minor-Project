import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, BadgeCheck, MapPin, Search, UsersRound } from 'lucide-react'
import { apiUrl } from './api'

type Worker = {
  id: string
  name: string
  bio: string
  skills: string[]
  experienceYears: number | null
  preferredLocations: Array<{ city: string; area?: string }>
  phone?: string
  averageRating: number | null
  reviewCount: number
}

type Pagination = { page: number; pages: number; total: number }

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) as T : {} as T
  } catch {
    throw new Error('The server returned an unexpected response.')
  }
}

export default function WorkerDirectory({ city }: { city: string }) {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [page, setPage] = useState(1)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pages: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadWorkers() {
      setLoading(true)
      setError('')
      const params = new URLSearchParams({ city, page: String(page), limit: '12' })
      if (submittedQuery) params.set('q', submittedQuery)
      try {
        const response = await fetch(apiUrl(`/api/workers?${params.toString()}`), { credentials: 'include' })
        const payload = await readJson<{ workers?: Worker[]; pagination?: Pagination; error?: string }>(response)
        if (!response.ok) throw new Error(payload.error ?? 'Could not search worker profiles.')
        if (cancelled) return
        setWorkers(payload.workers ?? [])
        setPagination(payload.pagination ?? { page, pages: 0, total: 0 })
      } catch (loadError) {
        if (cancelled) return
        setWorkers([])
        setPagination({ page, pages: 0, total: 0 })
        setError(loadError instanceof Error ? loadError.message : 'Could not search worker profiles.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadWorkers()
    return () => { cancelled = true }
  }, [city, page, submittedQuery])

  function searchWorkers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSubmittedQuery(query.trim())
  }

  return (
    <div className="list-column" id="workers">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">SKILLED PEOPLE, NEARBY</span>
          <h2>Find workers</h2>
        </div>
        <span className="worker-result-count">{pagination.total} found</span>
      </div>
      <form className="worker-search-form" onSubmit={searchWorkers}>
        <Search size={17} aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Search name or skill" aria-label="Search workers by name or skill" />
        <button className="button button-primary" type="submit">Search</button>
      </form>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <div className="listing-stack worker-stack">
        {loading ? <div className="empty-state"><p>Searching worker profiles…</p></div>
          : workers.length ? workers.map((worker) => {
            const preferredLocation = worker.preferredLocations[0]
            return (
              <article className="worker-profile-card" key={worker.id}>
                <div className="worker-profile-heading">
                  <span className="worker-profile-icon"><UsersRound size={20} /></span>
                  <div className="worker-main">
                    <strong>{worker.name}</strong>
                    <span>{worker.experienceYears === null ? 'Experience not specified' : `${worker.experienceYears} years of experience`}</span>
                  </div>
                  {worker.phone && <a className="button button-outline worker-contact" href={`tel:${worker.phone}`}>Call</a>}
                </div>
                <p className="worker-rating"><span aria-label={worker.averageRating ? `${worker.averageRating} out of 5 stars` : 'No ratings yet'}>★ {worker.averageRating ?? 'New'}</span> {worker.reviewCount ? `· ${worker.reviewCount} review${worker.reviewCount === 1 ? '' : 's'}` : '· No reviews yet'}</p>
                {(preferredLocation?.city || preferredLocation?.area) && <p className="worker-profile-location"><MapPin size={13} /> {[preferredLocation.area, preferredLocation.city].filter(Boolean).join(', ')}</p>}
                {worker.bio && <p className="worker-profile-bio">{worker.bio}</p>}
                <div className="worker-skill-list">
                  {worker.skills.map((skill) => <span key={skill}>{skill}</span>)}
                  {!worker.skills.length && <span>Skills not added yet</span>}
                </div>
                <span className="worker-profile-visible"><BadgeCheck size={13} /> Worker profile shared by its owner</span>
              </article>
            )
          }) : !error && <div className="empty-state"><UsersRound size={22} /><p>No visible worker profiles match this search.</p></div>}
      </div>
      {pagination.pages > 1 && (
        <div className="worker-pagination">
          <button type="button" className="button button-outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
          <span>Page {pagination.page} of {pagination.pages}</span>
          <button type="button" className="button button-outline" disabled={page >= pagination.pages || loading} onClick={() => setPage((current) => current + 1)}>Next <ArrowRight size={14} /></button>
        </div>
      )}
    </div>
  )
}
