import React from 'react'
import { ArrowLeft, CalendarPlus, MapPin } from 'lucide-react'
import PublicEventCard from './PublicEventCard'

export default function PublicProfilePage({ profile, events, onBack, onAdd, onOpen }) {
  return (
    <section className="public-profile-page">
      <button className="public-profile-back" onClick={onBack}><ArrowLeft size={15}/> Back</button>
      <header className="public-profile-hero">
        <div className="public-profile-avatar">{profile.name.charAt(0)}</div>
        <div>
          <span className="eyebrow">Public profile</span>
          <h1>{profile.name}</h1>
          <p className="public-profile-role">{profile.role}</p>
          <p className="public-profile-location"><MapPin size={13}/>{profile.location}</p>
        </div>
      </header>
      <p className="public-profile-bio">{profile.bio}</p>
      <div className="public-profile-section-head"><span>Upcoming public events</span><small>{events.length} available</small></div>
      <div className="public-grid">
        {events.length ? events.map(event => <PublicEventCard key={event.publicId} event={event} onAdd={onAdd} onOpen={onOpen}/>) : <div className="profile-empty"><CalendarPlus size={18}/> No public events yet.</div>}
      </div>
    </section>
  )
}
