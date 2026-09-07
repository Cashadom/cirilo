import React from 'react'
import { CATEGORIES, durationMinutes } from '../utils/calendar'

export default function WeekSummary({ events }) {
  const totals = Object.keys(CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
  let planned = 0
  let completedTasks = 0
  let totalTasks = 0

  events.forEach(e => {
    const mins = durationMinutes(e)
    totals[e.category] += mins
    planned += mins
    if (e.type === 'task') {
      totalTasks += 1
      if (e.completed) completedTasks += 1
    }
  })

  return (
    <aside className="summary-panel">
      <div className="summary-head">
        <span className="eyebrow">My week</span>
        <span className="summary-total">{Math.round(planned/60)}h planned</span>
      </div>

      <div className="balance-bar" aria-label="Weekly life balance">
        {Object.entries(totals).map(([key, mins]) => mins > 0 && (
          <span key={key} style={{ flex: mins, background: CATEGORIES[key].color }} />
        ))}
      </div>

      <div className="summary-list">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} className="summary-row">
            <span><i style={{ background: cat.color }}/>{cat.label}</span>
            <span>{Math.floor(totals[key]/60)}h {String(totals[key]%60).padStart(2,'0')}</span>
          </div>
        ))}
      </div>

      <div className="summary-footer">
        <span>{completedTasks}/{totalTasks} tasks done</span>
        <span>Life balance</span>
      </div>
    </aside>
  )
}
