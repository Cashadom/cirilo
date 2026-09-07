import React from 'react'
import { Check, MapPin, Users } from 'lucide-react'

export default function ChannelsView({ channels, followed, onToggle, onOpen }) {
  return (
    <section className="channels-view">
      <div className="channels-intro">
        <span className="eyebrow">Channels</span>
        <h2>Follow what matters. Make it part of your week.</h2>
        <p>Schools, coaches, communities and organizations can publish useful events without becoming another endless social feed.</p>
      </div>

      <div className="channels-grid">
        {channels.map(channel => {
          const isFollowing = followed.includes(channel.id)
          return (
            <article className="channel-card" key={channel.id} style={{ '--channel': channel.accent }}>
              <button className="channel-main" onClick={() => onOpen(channel)}>
                <span className="channel-avatar">{channel.name.charAt(0)}</span>
                <span className="channel-copy">
                  <span className="channel-name">{channel.name}{channel.verified && <span className="verified-dot">✓</span>}</span>
                  <small>{channel.type} · @{channel.handle}</small>
                  <p>{channel.description}</p>
                </span>
              </button>
              <div className="channel-meta">
                <span><MapPin size={13}/>{channel.location}</span>
                <span><Users size={13}/>{channel.followers.toLocaleString()} followers</span>
              </div>
              <button className={isFollowing ? 'secondary-btn channel-follow active' : 'primary-btn channel-follow'} onClick={() => onToggle(channel.id)}>
                {isFollowing ? <><Check size={15}/> Following</> : 'Follow'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
