import React from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { CATEGORIES } from '../utils/calendar'
import { buildWeeklyPreview } from '../utils/weeklySummary'

export default function WeeklyBrief({ events, onOpen }) {
  const preview = buildWeeklyPreview(events, new Date(), 3)

  return (
    <section className="weekly-brief">
      <div className="weekly-brief-head">
        <div>
          <span className="eyebrow">Coming up</span>
          <h3>Your next moves.</h3>
        </div>
        <span className="weekly-brief-chip"><Sparkles size={13}/> Smart mix</span>
      </div>

      {preview.length === 0 ? (
        <p className="weekly-brief-empty">Your next events will appear here.</p>
      ) : (
        <div className="weekly-brief-list">
          {preview.map(event => {
            const cat = CATEGORIES[event.category]
            return (
              <button key={event.id || event.publicId} className="weekly-brief-item" onClick={() => onOpen?.(event)}>
                <i style={{ background: cat?.color || '#7E8793' }} />
                <span className="weekly-brief-copy">
                  <span>{event.relative}</span>
                  <strong>{event.title}</strong>
                  <small>{event.dateLabel} · {event.startTime}</small>
                </span>
                <ArrowRight size={14}/>
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
