import React from 'react'
import { Archive, CalendarDays, MapPin } from 'lucide-react'
import { CATEGORIES } from '../utils/calendar'

export default function ArchiveView({ events, onOpen }) {
  return (
    <section className="archive-view">
      <div className="archive-intro">
        <span className="eyebrow">Archive</span>
        <h2>Your past stays accessible.</h2>
        <p>Past events are read-only. You can review them, but Cirilo never lets you create new events in the past.</p>
      </div>
      <div className="archive-list">
        {events.length === 0 ? <p className="empty-state">Nothing archived yet.</p> : events.map(event => {
          const cat = CATEGORIES[event.category] || CATEGORIES.tasks
          return <button className="archive-row" key={event.id} onClick={() => onOpen(event)}>
            <i style={{ background: cat.color }}/>
            <span className="archive-date"><CalendarDays size={13}/>{event.date} · {event.startTime}</span>
            <span className="archive-main"><span>{event.title}</span><small>{event.location ? <><MapPin size={11}/>{event.location}</> : cat.label}</small></span>
            <span className="archive-state"><Archive size={13}/> Archived</span>
          </button>
        })}
      </div>
    </section>
  )
}
