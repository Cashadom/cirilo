import React from 'react'
import { Check, MapPin, Users, X } from 'lucide-react'
import PublicEventCard from './PublicEventCard'

export default function ChannelPage({ channel, events, isFollowing, onToggle, onClose, onAdd, onOpenEvent }) {
  if (!channel) return null
  return (
    <div className="channel-page-backdrop" onMouseDown={onClose}>
      <article className="channel-page" onMouseDown={e => e.stopPropagation()}>
        <button className="icon-btn channel-close" onClick={onClose}><X size={18}/></button>
        <div className="channel-page-header">
          <span className="channel-avatar large">{channel.name.charAt(0)}</span>
          <div>
            <span className="eyebrow">{channel.type}</span>
            <h1>{channel.name}</h1>
            <p>@{channel.handle}</p>
          </div>
          <button className={isFollowing ? 'secondary-btn' : 'primary-btn'} onClick={() => onToggle(channel.id)}>
            {isFollowing ? <><Check size={15}/> Following</> : 'Follow channel'}
          </button>
        </div>

        <p className="channel-page-description">{channel.description}</p>
        <div className="channel-page-meta">
          <span><MapPin size={14}/>{channel.location}</span>
          <span><Users size={14}/>{channel.followers.toLocaleString()} followers</span>
        </div>

        <div className="channel-events-head">
          <span className="eyebrow">Upcoming</span>
          <span>{events.length} public events</span>
        </div>
        <div className="public-grid compact-grid">
          {events.map(event => <PublicEventCard key={event.publicId} event={event} onAdd={onAdd} onOpen={onOpenEvent}/>)}
        </div>
      </article>
    </div>
  )
}
