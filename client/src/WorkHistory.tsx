import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, Star } from 'lucide-react'
import { apiUrl } from './api'

type Role = 'worker' | 'employer'
type EligibleReview = {
  applicationId: string
  jobTitle: string
  counterpartName: string
  counterpartRole: Role
  myReview: { rating: number; comment: string } | null
}
type ReceivedReview = {
  id: string
  rating: number
  comment: string
  createdAt: string
  reviewerName: string
  reviewerRole: Role
  jobTitle: string
}
type Payment = {
  id: string
  applicationId: string
  jobTitle: string
  workerName: string
  employerName: string
  amount: number
  paidOn: string
  note: string
  status: 'pending_confirmation' | 'paid' | 'disputed'
  workerResponse: string
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) as T : {} as T
  } catch {
    throw new Error('The server returned an unexpected response.')
  }
}

async function fetchWorkHistory() {
  const [reviewResponse, paymentResponse] = await Promise.all([
    fetch(apiUrl('/api/reviews/me'), { credentials: 'include' }),
    fetch(apiUrl('/api/payments/me'), { credentials: 'include' }),
  ])
  const [reviewPayload, paymentPayload] = await Promise.all([
    readJson<{ eligible?: EligibleReview[]; received?: ReceivedReview[]; error?: string }>(reviewResponse),
    readJson<{ payments?: Payment[]; error?: string }>(paymentResponse),
  ])
  if (!reviewResponse.ok) throw new Error(reviewPayload.error ?? 'Could not load reviews.')
  if (!paymentResponse.ok) throw new Error(paymentPayload.error ?? 'Could not load salary records.')
  return {
    eligible: reviewPayload.eligible ?? [],
    received: reviewPayload.received ?? [],
    payments: paymentPayload.payments ?? [],
  }
}

export default function WorkHistory({ role, refreshKey }: { role: Role; refreshKey: number }) {
  const [eligible, setEligible] = useState<EligibleReview[]>([])
  const [received, setReceived] = useState<ReceivedReview[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [rating, setRating] = useState<Record<string, number>>({})
  const [comment, setComment] = useState<Record<string, string>>({})
  const [disputeMessage, setDisputeMessage] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    const data = await fetchWorkHistory()
    setEligible(data.eligible)
    setReceived(data.received)
    setPayments(data.payments)
  }, [])

  useEffect(() => {
    let cancelled = false
    void fetchWorkHistory()
      .then((data) => {
        if (cancelled) return
        setEligible(data.eligible)
        setReceived(data.received)
        setPayments(data.payments)
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load work history.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey])

  async function submitReview(item: EligibleReview) {
    setBusy(item.applicationId)
    setError('')
    try {
      const response = await fetch(apiUrl(`/api/reviews/${item.applicationId}`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: rating[item.applicationId] ?? 5, comment: comment[item.applicationId] ?? '' }),
      })
      const payload = await readJson<{ error?: string }>(response)
      if (!response.ok) throw new Error(payload.error ?? 'Could not submit your review.')
      await loadData()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit your review.')
    } finally {
      setBusy('')
    }
  }

  async function answerPayment(payment: Payment, decision: 'confirm' | 'dispute') {
    setBusy(payment.id)
    setError('')
    try {
      const response = await fetch(apiUrl(`/api/payments/${payment.id}/response`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, message: disputeMessage[payment.id] ?? '' }),
      })
      const payload = await readJson<{ error?: string }>(response)
      if (!response.ok) throw new Error(payload.error ?? 'Could not update this salary record.')
      await loadData()
    } catch (answerError) {
      setError(answerError instanceof Error ? answerError.message : 'Could not update this salary record.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="work-history-panel" aria-label="Reviews and salary records">
      <div className="section-heading compact">
        <div><span className="section-kicker">TRUST & PAYMENTS</span><h2>Reviews and salary records</h2></div>
        <button className="text-link" type="button" onClick={() => { setLoading(true); setError(''); void loadData().catch((e: unknown) => setError(e instanceof Error ? e.message : 'Refresh failed')).finally(() => setLoading(false)) }}>Refresh</button>
      </div>
      {error && <p className="auth-error" role="alert">{error}</p>}
      {loading ? <div className="empty-state"><p>Loading reviews and salary records…</p></div> : (
        <div className="work-history-grid">
          <div className="work-history-column">
            <h3><Star size={15} /> Ratings and reviews</h3>
            {eligible.length > 0 && <div className="work-history-list">
              {eligible.map((item) => (
                <article className="work-history-card" key={item.applicationId}>
                  <strong>{item.jobTitle}</strong>
                  <span>{item.counterpartName} · accepted work</span>
                  {item.myReview ? <p className="profile-success"><BadgeCheck size={14} /> You rated this work {item.myReview.rating}/5</p> : (
                    <div className="work-history-form">
                      <label>Rating
                        <select value={rating[item.applicationId] ?? 5} onChange={(event) => setRating((current) => ({ ...current, [item.applicationId]: Number(event.target.value) }))}>
                          {[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} star{value === 1 ? '' : 's'}</option>)}
                        </select>
                      </label>
                      <label>Review
                        <textarea maxLength={1000} value={comment[item.applicationId] ?? ''} onChange={(event) => setComment((current) => ({ ...current, [item.applicationId]: event.target.value }))} placeholder="Share your experience (optional)" />
                      </label>
                      <button className="button button-primary" type="button" disabled={busy === item.applicationId} onClick={() => void submitReview(item)}>{busy === item.applicationId ? 'Submitting…' : `Review ${item.counterpartName}`}</button>
                    </div>
                  )}
                </article>
              ))}
            </div>}
            {received.map((review) => (
              <article className="work-history-card received-review" key={review.id}>
                <strong>{review.reviewerName} <span className="review-stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></strong>
                <span>{review.jobTitle}</span>
                {review.comment && <p>{review.comment}</p>}
              </article>
            ))}
            {!eligible.length && !received.length && <p className="work-history-empty">Reviews are available after an application is accepted.</p>}
          </div>

          <div className="work-history-column">
            <h3><BadgeCheck size={15} /> Salary tracking</h3>
            {payments.length ? <div className="work-history-list">
              {payments.map((payment) => (
                <article className="work-history-card" key={payment.id}>
                  <strong>{payment.jobTitle} · ₹{payment.amount.toLocaleString('en-IN')}</strong>
                  <span>{new Date(payment.paidOn).toLocaleDateString()} · {role === 'worker' ? `From ${payment.employerName}` : `For ${payment.workerName}`}</span>
                  <span className={`payment-status payment-${payment.status}`}>{payment.status.replaceAll('_', ' ')}</span>
                  {payment.note && <p>{payment.note}</p>}
                  {payment.workerResponse && <p>Worker response: {payment.workerResponse}</p>}
                  {role === 'worker' && payment.status === 'pending_confirmation' && (
                    <div className="work-history-form">
                      <label>If disputing, explain why
                        <textarea maxLength={500} value={disputeMessage[payment.id] ?? ''} onChange={(event) => setDisputeMessage((current) => ({ ...current, [payment.id]: event.target.value }))} />
                      </label>
                      <div className="application-actions">
                        <button className="button button-primary" type="button" disabled={busy === payment.id} onClick={() => void answerPayment(payment, 'confirm')}>Confirm received</button>
                        <button className="button button-outline application-reject" type="button" disabled={busy === payment.id || !disputeMessage[payment.id]?.trim()} onClick={() => void answerPayment(payment, 'dispute')}>Dispute</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div> : <p className="work-history-empty">No salary records yet. Employers can record payments for accepted applications.</p>}
            <p className="profile-privacy-note">These are records of payments made outside the app. Rozgaar Setu does not move money or verify bank transfers.</p>
          </div>
        </div>
      )}
    </section>
  )
}
