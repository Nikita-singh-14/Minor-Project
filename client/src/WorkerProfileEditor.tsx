import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck } from 'lucide-react'
import { apiUrl } from './api'

type WorkerProfile = {
  name: string
  phone?: string
  bio: string
  skills: string[]
  experienceYears: number | null
  preferredLocations: Array<{ city: string; area?: string }>
  isVisible: boolean
  contactVisible: boolean
}

const emptyProfile: WorkerProfile = {
  name: '',
  bio: '',
  skills: [],
  experienceYears: null,
  preferredLocations: [],
  isVisible: false,
  contactVisible: false,
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return text ? JSON.parse(text) as T : {} as T
  } catch {
    throw new Error('The server returned an unexpected response.')
  }
}

export default function WorkerProfileEditor() {
  const [profile, setProfile] = useState<WorkerProfile>(emptyProfile)
  const [skillsText, setSkillsText] = useState('')
  const [city, setCity] = useState('')
  const [area, setArea] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadProfile() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch(apiUrl('/api/workers/me'), { credentials: 'include' })
        const payload = await readJson<{ profile?: WorkerProfile; error?: string }>(response)
        if (!response.ok || !payload.profile) {
          throw new Error(payload.error ?? 'Could not load your profile.')
        }
        if (cancelled) return

        const loadedProfile = {
          ...emptyProfile,
          ...payload.profile,
          experienceYears: payload.profile.experienceYears ?? null,
          preferredLocations: payload.profile.preferredLocations ?? [],
          skills: payload.profile.skills ?? [],
        }
        setProfile(loadedProfile)
        setSkillsText(loadedProfile.skills.join(', '))
        setCity(loadedProfile.preferredLocations[0]?.city ?? '')
        setArea(loadedProfile.preferredLocations[0]?.area ?? '')
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Could not load your profile.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadProfile()
    return () => { cancelled = true }
  }, [])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')

    const skills = [...new Set(skillsText.split(',').map((skill) => skill.trim()).filter(Boolean))]
    const preferredLocations = city.trim().length >= 2
      ? [{ city: city.trim(), area: area.trim() }]
      : []

    try {
      const response = await fetch(apiUrl('/api/workers/me'), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: profile.bio,
          skills,
          experienceYears: profile.experienceYears,
          preferredLocations,
          isVisible: profile.isVisible,
          contactVisible: profile.isVisible && profile.contactVisible && Boolean(profile.phone),
        }),
      })
      const payload = await readJson<{ profile?: WorkerProfile; error?: string }>(response)
      if (!response.ok || !payload.profile) {
        throw new Error(payload.error ?? 'Could not save your profile.')
      }

      const savedProfile = {
        ...emptyProfile,
        ...payload.profile,
        experienceYears: payload.profile.experienceYears ?? null,
        preferredLocations: payload.profile.preferredLocations ?? [],
        skills: payload.profile.skills ?? [],
      }
      setProfile(savedProfile)
      setSkillsText(savedProfile.skills.join(', '))
      setCity(savedProfile.preferredLocations[0]?.city ?? '')
      setArea(savedProfile.preferredLocations[0]?.area ?? '')
      setMessage('Your profile has been saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="empty-state"><p>Loading your worker profile…</p></div>
  }

  return (
    <section className="worker-profile-editor" aria-labelledby="worker-profile-title">
      <div className="section-heading compact">
        <div>
          <span className="section-kicker">YOUR WORKER PROFILE</span>
          <h2 id="worker-profile-title">Help employers find you</h2>
        </div>
      </div>
      <form className="profile-form" onSubmit={saveProfile}>
        <label>
          Skills (comma-separated)
          <input value={skillsText} onChange={(event) => setSkillsText(event.target.value)} maxLength={1200} placeholder="Masonry, painting, plumbing" />
        </label>
        <div className="form-split">
          <label>
            Years of experience
            <input
              type="number"
              min="0"
              max="60"
              value={profile.experienceYears ?? ''}
              onChange={(event) => setProfile((current) => ({ ...current, experienceYears: event.target.value === '' ? null : Number(event.target.value) }))}
            />
          </label>
          <label>
            Preferred city
            <input value={city} onChange={(event) => setCity(event.target.value)} maxLength={100} placeholder="Bilaspur" />
          </label>
        </div>
        <label>
          Preferred area
          <input value={area} onChange={(event) => setArea(event.target.value)} maxLength={100} placeholder="Torwa" />
        </label>
        <label>
          About your work
          <textarea value={profile.bio} onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))} maxLength={1000} rows={3} placeholder="Describe the work you do and what jobs you are looking for." />
        </label>
        <label className="profile-checkbox">
          <input type="checkbox" checked={profile.isVisible} onChange={(event) => setProfile((current) => ({ ...current, isVisible: event.target.checked, contactVisible: event.target.checked && current.contactVisible }))} />
          Let employers find my profile
        </label>
        <label className="profile-checkbox">
          <input type="checkbox" checked={profile.contactVisible} disabled={!profile.isVisible || !profile.phone} onChange={(event) => setProfile((current) => ({ ...current, contactVisible: event.target.checked }))} />
          Let employers see my phone number{profile.phone ? '' : ' (add a phone number to your account first)'}
        </label>
        <p className="profile-privacy-note">Your profile is hidden from employers unless you enable discovery. Your phone number is shared only when you separately allow it.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="profile-success" role="status"><BadgeCheck size={16} /> {message}</p>}
        <button className="button button-primary dialog-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save worker profile'}
        </button>
      </form>
    </section>
  )
}
