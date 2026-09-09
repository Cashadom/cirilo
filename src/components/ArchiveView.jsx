import React from 'react'
import { Archive, CalendarDays, MapPin, Wrench } from 'lucide-react'
import { CATEGORIES } from '../utils/calendar'

export default function ArchiveView({
  events = [],
  tambaJobs = [],
  onOpen,
  onOpenTamba,
}) {
  const hasAnything = events.length > 0 || tambaJobs.length > 0

  return (
    <section className="archive-view">
      <div className="archive-intro">
        <span className="eyebrow">Archive</span>
        <h2>Your past stays accessible.</h2>
        <p>
          Past events and archived Tamba jobs stay available for reference.
        </p>
      </div>

      {!hasAnything ? (
        <p className="empty-state">Nothing archived yet.</p>
      ) : (
        <>
          {tambaJobs.length > 0 && (
            <div className="archive-list">
              {tambaJobs.map(job => (
                <button
                  className="archive-row"
                  key={`tamba-${job.id}`}
                  onClick={() => onOpenTamba?.(job)}
                >
                  <i style={{ background: '#7E8793' }} />
                  <span className="archive-date">
                    <CalendarDays size={13} />
                    {job.date || 'No date'} · {job.startTime || '--:--'}
                  </span>
                  <span className="archive-main">
                    <span>{job.title || 'Tamba Field Work'}</span>
                    <small>
                      <Wrench size={11} />
                      {job.location || job.client || 'Tamba Field Work'}
                    </small>
                  </span>
                  <span className="archive-state">
                    <Archive size={13} /> Tamba archived
                  </span>
                </button>
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div className="archive-list">
              {events.map(event => {
                const cat = CATEGORIES[event.category] || CATEGORIES.tasks

                return (
                  <button
                    className="archive-row"
                    key={event.id}
                    onClick={() => onOpen(event)}
                  >
                    <i style={{ background: cat.color }} />
                    <span className="archive-date">
                      <CalendarDays size={13} />
                      {event.date} · {event.startTime}
                    </span>
                    <span className="archive-main">
                      <span>{event.title}</span>
                      <small>
                        {event.location ? (
                          <>
                            <MapPin size={11} />
                            {event.location}
                          </>
                        ) : (
                          cat.label
                        )}
                      </small>
                    </span>
                    <span className="archive-state">
                      <Archive size={13} /> Archived
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
