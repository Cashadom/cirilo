import React, { useMemo } from 'react'
import { CalendarDays, Copy, ExternalLink, Globe2, Lock, UserRound } from 'lucide-react'

export default function ProfileView({ profile, setProfile, plan, publicEvents, onOpenPublicProfile, onPlans }) {
  const publicCount = useMemo(() => publicEvents.filter(e => e.owner?.id === profile.id).length, [publicEvents, profile.id])
  const publicUrl = `${window.location.origin}/?profile=${profile.slug}`
  const update = (key, value) => setProfile(prev => ({ ...prev, [key]: value }))
  return (
    <section className="profile-view">
      <div className="profile-intro">
        <span className="eyebrow">Profile</span>
        <h2>Your identity inside Cirilo.</h2>
        <p className="profile-handle">@cirilo_125621</p>
        <p>Your public profile becomes visible when you publish public events.</p>
      </div>

      <div className="profile-layout">
        <article className="profile-card">
          <div className="profile-avatar">{profile.name.charAt(0)}</div>
          <div className="profile-card-copy">
            <span className="profile-name">{profile.name}</span>
            <span className="profile-role">{profile.role}</span>
            <span className="profile-location">{profile.location}</span>
          </div>
          <span className={'profile-plan ' + plan}>{plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : 'Free'}</span>
        </article>

        <div className="profile-form">
          <label className="field">Display name<input value={profile.name} onChange={e => update('name', e.target.value)}/></label>
          <label className="field">Role<input value={profile.role} onChange={e => update('role', e.target.value)} placeholder="Coach, founder, host..."/></label>
          <label className="field">Location<input value={profile.location} onChange={e => update('location', e.target.value)} placeholder="Aix-en-Provence, France"/></label>
          <label className="field">Public profile slug<div className="slug-field"><span>cirilo.app/</span><input value={profile.slug} onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}/></div></label>
          <label className="field span-2">Bio<textarea rows="4" value={profile.bio} onChange={e => update('bio', e.target.value)} placeholder="Tell people what you organize or share."/></label>
        </div>

        <aside className="profile-public-box">
          <div><Globe2 size={17}/><span><b>Public profile</b><small>{plan === 'free' ? 'Upgrade to publish publicly.' : 'Ready for public events.'}</small></span></div>
          <div className="profile-stats"><span><b>{publicCount}</b><small>public events</small></span><span><b>{plan === 'free' ? 'Private' : 'Live'}</b><small>visibility</small></span></div>
          {plan === 'free' ? <button className="primary-btn" onClick={onPlans}>See publishing plans</button> : <>
            <button className="secondary-btn" onClick={() => navigator.clipboard?.writeText(publicUrl)}><Copy size={14}/> Copy public profile link</button>
            <button className="primary-btn" onClick={onOpenPublicProfile}><ExternalLink size={14}/> View public profile</button>
          </>}
        </aside>
      </div>
    </section>
  )
}
