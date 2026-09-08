import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  MessageCircle,
  Save,
  Smartphone,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { updateUserProfile } from '../services/userService'
import { subscribeRecentContacts } from '../services/recentContactsService'

const CIRILO_AVATARS = [
  { id: 'avatar1', src: '/avatar1.png', label: 'Avatar 1' },
  { id: 'avatar2', src: '/avatar2.png', label: 'Avatar 2' },
  { id: 'avatar3', src: '/avatar3.png', label: 'Avatar 3' },
  { id: 'avatar4', src: '/avatar4.png', label: 'Avatar 4' },
  { id: 'avatar5', src: '/avatar5.png', label: 'Avatar 5' },
]

export default function ProfileView({
  profile,
  plan,
  publicEvents,
  onSaved,
  onOpenPublicProfile,
  onPlans,
  onSendNote,
  onProposeEvent,
}) {
  const { firebaseUser } = useAuth()
  const [draft, setDraft] = useState(profile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [recentContacts, setRecentContacts] = useState([])

  useEffect(() => {
    setDraft(profile)
  }, [profile])

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setRecentContacts([])
      return undefined
    }

    return subscribeRecentContacts(
      firebaseUser.uid,
      setRecentContacts,
      error => {
        console.error('Could not load recent Cirilo contacts.', error)
      }
    )
  }, [firebaseUser?.uid])

  const publicCount = useMemo(
    () =>
      publicEvents.filter(
        event =>
          event.owner?.id === profile.id ||
          event.owner?.ciriloId === profile.ciriloId
      ).length,
    [publicEvents, profile.id, profile.ciriloId]
  )

  const update = (key, value) => {
    setSaved(false)
    setError('')
    setDraft(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const publicUrl = `${window.location.origin}/?profile=${encodeURIComponent(
    draft.slug || draft.ciriloId || ''
  )}`

  const shareText = `Find me on Cirilo: ${draft.ciriloId} ${publicUrl}`

  const currentPhoto = draft.photoURL || firebaseUser?.photoURL || ''

  const selectAvatar = src => update('photoURL', src)

  const keepCurrentPhoto = () => {
    update('photoURL', firebaseUser?.photoURL || profile.photoURL || '')
  }

  const saveProfile = async () => {
    if (!firebaseUser?.uid) return

    const displayName = String(
      draft.displayName || draft.name || ''
    ).trim()

    if (!displayName) {
      setError('Display name cannot be empty.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await updateUserProfile(firebaseUser.uid, {
        displayName,
        photoURL: draft.photoURL || '',
        role: draft.role || '',
        location: draft.location || '',
        bio: draft.bio || '',
        slug: draft.slug || draft.ciriloId,
      })

      await onSaved?.()

      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  const copyId = async () => {
    if (!draft.ciriloId) return
    await navigator.clipboard?.writeText(draft.ciriloId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shareWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  const shareSms = () => {
    window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`
  }

  return (
    <section className="profile-view">
      <div className="profile-intro">
        <span className="eyebrow">Profile</span>
        <h2>Your Cirilo identity.</h2>
        <p className="profile-handle">
          {draft.ciriloId}
        </p>
        <p>Edit your profile and share your Cirilo ID.</p>
      </div>

      <div className="profile-layout">
        <article className="profile-card">
          <div className="profile-avatar">
            {currentPhoto ? (
              <img src={currentPhoto} alt="" />
            ) : (
              (draft.displayName || draft.name || 'C').charAt(0)
            )}
          </div>

          <div className="profile-card-copy">
            <span className="profile-name">
              {draft.displayName || draft.name}
            </span>
            <span className="profile-role">{draft.role}</span>
            <span className="profile-location">{draft.location}</span>
          </div>

          <span className={'profile-plan ' + plan}>
            {plan === 'business'
              ? 'Business'
              : plan === 'pro'
                ? 'Pro'
                : 'Free'}
          </span>
        </article>

        <div className="profile-form">
          <label className="field">
            Display name
            <input
              value={draft.displayName || draft.name || ''}
              onChange={e => {
                update('displayName', e.target.value)
                update('name', e.target.value)
              }}
            />
          </label>

          <div className="field profile-picture-field">
            <span>Profile picture</span>
            <div className="profile-picture-current">
              <div className="profile-picture-preview">
                {currentPhoto ? <img src={currentPhoto} alt="" /> : (draft.displayName || draft.name || 'C').charAt(0)}
              </div>
              <div>
                <strong>Your current picture</strong>
                <small>Keep it, or choose a Cirilo avatar below.</small>
              </div>
            </div>
          </div>

          <div className="field span-2 avatar-picker-field">
            <div className="avatar-picker-title">
              <span>Choose a Cirilo avatar</span>
              {(firebaseUser?.photoURL || profile.photoURL) && (
                <button type="button" className="avatar-keep-photo" onClick={keepCurrentPhoto}>
                  <ImageIcon size={13} /> Keep my photo
                </button>
              )}
            </div>
            <div className="avatar-picker">
              {CIRILO_AVATARS.map(avatar => {
                const active = draft.photoURL === avatar.src
                return (
                  <button type="button" key={avatar.id} className={`avatar-choice${active ? ' active' : ''}`} onClick={() => selectAvatar(avatar.src)} aria-label={`Choose ${avatar.label}`} aria-pressed={active}>
                    <img src={avatar.src} alt="" />
                    {active ? <span className="avatar-choice-check"><Check size={13} /></span> : null}
                  </button>
                )
              })}
            </div>
          </div>

          <label className="field">
            Role
            <input
              value={draft.role || ''}
              onChange={e => update('role', e.target.value)}
              placeholder="Coach, founder, host..."
            />
          </label>

          <label className="field">
            Location
            <input
              value={draft.location || ''}
              onChange={e => update('location', e.target.value)}
              placeholder="Aix-en-Provence, France"
            />
          </label>

          <label className="field span-2">
            Bio
            <textarea
              rows="4"
              value={draft.bio || ''}
              onChange={e => update('bio', e.target.value)}
              placeholder="A few words about you."
            />
          </label>

          {error ? (
            <p className="form-error span-2">{error}</p>
          ) : null}

          <div className="span-2">
            <button
              type="button"
              className="primary-btn"
              onClick={saveProfile}
              disabled={saving}
            >
              {saved ? <Check size={15} /> : <Save size={15} />}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save profile'}
            </button>
          </div>
        </div>

        <aside className="profile-public-box">
          <div>
            <Globe2 size={17} />
            <span>
              <b>Your Cirilo ID</b>
              <small>Share it so people can find you.</small>
            </span>
          </div>

          <div className="profile-id-row">
            <strong>{draft.ciriloId}</strong>
            <button
              type="button"
              className="icon-btn"
              onClick={copyId}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>

          <div className="profile-share-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={shareWhatsApp}
            >
              <MessageCircle size={14} />
              WhatsApp
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={shareSms}
            >
              <Smartphone size={14} />
              SMS
            </button>
          </div>

          <div className="profile-stats">
            <span>
              <b>{publicCount}</b>
              <small>public events</small>
            </span>
            <span>
              <b>{plan === 'free' ? 'Private' : 'Live'}</b>
              <small>visibility</small>
            </span>
          </div>

          {plan === 'free' ? (
            <button
              className="primary-btn"
              onClick={onPlans}
            >
              See publishing plans
            </button>
          ) : (
            <>
              <button
                className="secondary-btn"
                onClick={() =>
                  navigator.clipboard?.writeText(publicUrl)
                }
              >
                <Copy size={14} />
                Copy public profile link
              </button>

              <button
                className="primary-btn"
                onClick={onOpenPublicProfile}
              >
                <ExternalLink size={14} />
                View public profile
              </button>
            </>
          )}


          <div className="profile-recent-contacts">
            <div className="profile-recent-head">
              <div>
                <b>Recent Cirilo contacts</b>
                <small>Your 6 latest Cirilo exchanges.</small>
              </div>
              <span>{recentContacts.length}</span>
            </div>

            {recentContacts.length ? (
              <div className="profile-recent-list">
                {recentContacts.map(contact => (
                  <div
                    className="profile-recent-contact"
                    key={contact.ciriloId}
                  >
                    <span className="profile-recent-avatar">
                      <img src="/icon.png" alt="" />
                    </span>

                    <span className="profile-recent-copy">
                      <strong>{contact.ciriloId}</strong>
                      <small>
                        {contact.displayName || contact.name || 'Cirilo user'}
                      </small>
                    </span>

                    <span className="profile-recent-actions">
                      <button
                        type="button"
                        onClick={() => onSendNote?.(contact.ciriloId)}
                      >
                        Send a note
                      </button>
                      <button
                        type="button"
                        onClick={() => onProposeEvent?.(contact.ciriloId)}
                      >
                        Propose an event
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="profile-recent-empty">
                No Cirilo exchanges yet.
              </p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
