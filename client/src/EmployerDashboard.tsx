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

function todayDateInput() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
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

export default function EmployerDashboard({ refreshKey, onPaymentRecorded }: { refreshKey: number; onPaymentRecorded: () => void }) {
  const [jobs, setJobs] = useState<EmployerJob[] | null>(null)
  const loading = jobs === null
  const [error, setError] = useState('')
  const [updatingApplication, setUpdatingApplication] = useState('')
  const [recordingPayment, setRecordingPayment] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, { amount: string; paidOn: string; note: string }>>({})

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

  async function recordPayment(applicationId: string) {
    const draft = paymentDrafts[applicationId]
    if (!draft?.amount || !draft.paidOn) return
    setRecordingPayment(applicationId)
    setError('')
    try {
      const response = await fetch(apiUrl(`/api/payments/${applicationId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(draft.amount), paidOn: draft.paidOn, note: draft.note }),
      })
      const payload = await readJson<{ error?: string }>(response)
      if (!response.ok) throw new Error(payload.error ?? 'Could not record this salary payment.')
      setPaymentDrafts((current) => ({ ...current, [applicationId]: { ...current[applicationId], amount: '', note: '' } }))
      onPaymentRecorded()
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not record this salary payment.')
    } finally {
      setRecordingPayment('')
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
                    {application.status === 'accepted' && (
                      <div className="payment-entry">
                        <strong>Record an offline salary payment</strong>
                        <div className="payment-entry-fields">
                          <label>Amount (₹)
                            <input type="number" min="1" max="10000000" step="0.01" value={paymentDrafts[application._id]?.amount ?? ''} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application._id]: { amount: event.target.value, paidOn: current[application._id]?.paidOn ?? todayDateInput(), note: current[application._id]?.note ?? '' } }))} />
                          </label>
                          <label>Payment date
                            <input type="date" max={todayDateInput()} value={paymentDrafts[application._id]?.paidOn ?? todayDateInput()} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application._id]: { amount: current[application._id]?.amount ?? '', paidOn: event.target.value, note: current[application._id]?.note ?? '' } }))} />
                          </label>
                        </div>
                        <label>Note (optional)
                          <input type="text" maxLength={500} value={paymentDrafts[application._id]?.note ?? ''} onChange={(event) => setPaymentDrafts((current) => ({ ...current, [application._id]: { amount: current[application._id]?.amount ?? '', paidOn: current[application._id]?.paidOn ?? todayDateInput(), note: event.target.value } }))} placeholder="Work period or payment details" />
                        </label>
                        <button className="button button-outline" type="button" disabled={recordingPayment === application._id || !paymentDrafts[application._id]?.amount || !paymentDrafts[application._id]?.paidOn} onClick={() => void recordPayment(application._id)}>{recordingPayment === application._id ? 'Recording…' : 'Record payment'}</button>
                        <p className="profile-privacy-note">The worker must confirm receipt. This records an offline payment; it does not transfer money.</p>
                      </div>
                    )}
                  </article>
                )
              }) : <p className="no-applicants"><BadgeCheck size={15} /> No applicants yet.</p>}
            </section>
          ))}
        </div> : <div className="empty-state"><BriefcaseBusiness size={22} /><p>You have not posted any jobs yet.</p></div>}
    </div>
  )
}
