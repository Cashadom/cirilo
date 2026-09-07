import React from 'react'
import { ArrowLeft, CalendarPlus, Copy, MapPin, Share2 } from 'lucide-react'
import PublicEventCard from './PublicEventCard'

export default function PublicProfilePage({ profile, events = [], onBack, onAdd, onOpen }) {
  const displayName = profile?.displayName || profile?.name || 'Cirilo user'
  const ciriloId = profile?.ciriloId || ''
  const photoURL = profile?.photoURL || ''
  const shareUrl = window.location.href
  const shareText = `${displayName} on Cirilo${ciriloId ? ` — @${ciriloId}` : ''}`

  const copyProfile = async () => {
    await navigator.clipboard?.writeText(shareUrl)
  }

  const shareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl })
        return
      } catch (error) {
        if (error?.name === 'AbortError') return
      }
    }
    await copyProfile()
  }

  return (
    <section className="public-profile-page">
      <button className="public-profile-back" onClick={onBack}>
        <ArrowLeft size={15} /> Back
      </button>

      <header className="public-profile-hero">
        <div className="public-profile-avatar public-profile-avatar-photo">
          {photoURL ? (
            <img src={photoURL} alt={displayName} />
          ) : (
            <span>{displayName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="public-profile-identity">
          <span className="eyebrow">Public profile</span>
          <h1>{displayName}</h1>
          {ciriloId ? <p className="public-profile-handle">@{ciriloId}</p> : null}
          {profile?.role ? <p className="public-profile-role">{profile.role}</p> : null}
          {profile?.location ? (
            <p className="public-profile-location">
              <MapPin size={13} /> {profile.location}
            </p>
          ) : null}
        </div>

        <div className="public-profile-share">
          <button className="secondary-btn" type="button" onClick={copyProfile}>
            <Copy size={14} /> Copy link
          </button>
          <button className="primary-btn" type="button" onClick={shareProfile}>
            <Share2 size={14} /> Share
          </button>
        </div>
      </header>

      {profile?.bio ? <p className="public-profile-bio">{profile.bio}</p> : null}

      <div className="public-profile-section-head">
        <span>Upcoming public events</span>
        <small>{events.length} available</small>
      </div>

      <div className="public-grid">
        {events.length ? (
          events.map(event => (
            <PublicEventCard
              key={event.publicId}
              event={event}
              onAdd={onAdd}
              onOpen={onOpen}
            />
          ))
        ) : (
          <div className="profile-empty">
            <CalendarPlus size={18} /> No public events yet.
          </div>
        )}
      </div>
    </section>
  )
}
