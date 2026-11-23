import { useEffect, useState } from 'react'
import { BadgeCheck, BriefcaseBusiness, Clock3, MapPin } from 'lucide-react'
import { apiUrl } from './api'

type ApplicationStatus = 'submitted' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'
type Application = {
  _id: string
  status: ApplicationStatus
  createdAt?: string
  message?: string
  workerId?: {
    name?: string
    phone?: string
    workerProfile?: {
      skills?: string[]
      experienceYears?: number
      preferredLocations?: Array<{ city: string; area?: string }>
    }
  }
}

type EmployerJob = {
  _id: string
  title: string
  status?: string
  applicantSummary?: { submitted?: number; reviewed?: number; accepted?: number; rejected?: number }
  applications?: Application[]
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) as T : {} as T
  } catch {
    throw new Error('The server returned an unexpected response.')
  }
}

function relativeTime(value?: string) {
  if (!value) return 'Recently'
  const hours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60)))
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

async function fetchEmployerJobs() {
  const response = await fetch(apiUrl('/api/employer/jobs'), { credentials: 'include' })
  const payload = await readJson<{ jobs?: EmployerJob[]; error?: string }>(response)
  if (!response.ok) throw new Error(payload.error ?? 'Could not load your jobs and applicants.')
  return payload.jobs ?? []
}

export default function EmployerDashboard({ refreshKey }: { refreshKey: number }) {
  const [jobs, setJobs] = useState<EmployerJob[] | null>(null)
  const loading = jobs === null
  const [error, setError] = useState('')
  const [updatingApplication, setUpdatingApplication] = useState('')

  useEffect(() => {
    let cancelled = false
    void fetchEmployerJobs()
      .then((nextJobs) => { if (!cancelled) setJobs(nextJobs) })
      .catch((loadError: unknown) => {
        if (cancelled) return
        setJobs([])
        setError(loadError instanceof Error ? loadError.message : 'Could not load your jobs and applicants.')
      })
    return () => { cancelled = true }
  }, [refreshKey])

  async function updateStatus(jobId: string, applicationId: string, status: 'reviewed' | 'accepted' | 'rejected') {
    setUpdatingApplication(applicationId)
    setError('')
    try {
      const response = await fetch(apiUrl(`/api/jobs/${jobId}/applications/${applicationId}`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await readJson<{ application?: { id: string; status: ApplicationStatus }; error?: string }>(response)
      if (!response.ok || !payload.application) throw new Error(payload.error ?? 'Could not update this application.')
      setJobs(await fetchEmployerJobs())
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this application.')
    } finally {
      setUpdatingApplication('')
    }
  }

  function refreshJobs() {
    setError('')
    setJobs(null)
    void fetchEmployerJobs()
      .then(setJobs)
      .catch((loadError: unknown) => {
        setJobs([])
        setError(loadError instanceof Error ? loadError.message : 'Could not load your jobs and applicants.')
      })
  }

  return (
    <div className="list-column employer-dashboard" id="dashboard">
      <div className="section-heading compact">
        <div><span className="section-kicker">EMPLOYER DASHBOARD</span><h2>Your jobs and applicants</h2></div>
        <button className="text-link" type="button" onClick={refreshJobs}>Refresh</button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading ? <div className="empty-state"><p>Loading your jobs and applicants…</p></div>
        : jobs?.length ? <div className="employer-job-list">
          {jobs.map((job) => (
            <section className="employer-job-card" key={job._id}>
              <header className="employer-job-heading">
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.applicantSummary?.submitted ?? 0} new · {job.applicantSummary?.accepted ?? 0} accepted · {job.status ?? 'open'}</span>
                </div>
                <BriefcaseBusiness size={19} />
              </header>
              {job.applications?.length ? job.applications.map((application) => {
                const worker = application.workerId
                const profile = worker?.workerProfile
                const location = profile?.preferredLocations?.[0]
                const isFinal = application.status === 'accepted' || application.status === 'rejected'
                return (
                  <article className="applicant-card" key={application._id}>
                    <div className="applicant-card-heading">
                      <div>
                        <strong>{worker?.name ?? 'Worker'}</strong>
                        <span><Clock3 size={12} /> {relativeTime(application.createdAt)} · {application.status}</span>
                      </div>
                      {worker?.phone && <a className="button button-outline worker-contact" href={`tel:${worker.phone}`}>Call</a>}
                    </div>
                    {profile?.experienceYears !== undefined && <p className="applicant-detail">{profile.experienceYears} years of experience</p>}
                    {location && <p className="applicant-detail"><MapPin size={12} /> {[location.area, location.city].filter(Boolean).join(', ')}</p>}
                    {profile?.skills?.length ? <div className="worker-skill-list">{profile.skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : null}
                    {application.message && <p className="applicant-message">{application.message}</p>}
                    <div className="application-actions">
                      {!isFinal && application.status === 'submitted' && <button className="button button-outline" type="button" disabled={updatingApplication === application._id} onClick={() => void updateStatus(job._id, application._id, 'reviewed')}>Mark reviewed</button>}
                      {!isFinal && <button className="button button-primary" type="button" disabled={updatingApplication === application._id} onClick={() => void updateStatus(job._id, application._id, 'accepted')}>Accept</button>}
                      {!isFinal && <button className="button button-outline application-reject" type="button" disabled={updatingApplication === application._id} onClick={() => void updateStatus(job._id, application._id, 'rejected')}>Reject</button>}
                    </div>
                  </article>
                )
              }) : <p className="no-applicants"><BadgeCheck size={15} /> No applicants yet.</p>}
            </section>
          ))}
        </div> : <div className="empty-state"><BriefcaseBusiness size={22} /><p>You have not posted any jobs yet.</p></div>}
    </div>
  )
}
