import React from 'react'
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { format, isSameDay } from 'date-fns'
import EventCard from './EventCard'
import { HOURS, dateKey, minutesFromTime } from '../utils/calendar'

const START = 7 * 60
const PX_PER_MINUTE = 1.05
const GRID_HEIGHT = (22 - 7) * 60 * PX_PER_MINUTE

function DayColumn({ day, columnIndex, events, onOpen, onCreate, onResize, onShare }) {
  const id = dateKey(day)
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={'day-column ' + (columnIndex % 2 === 1 ? 'day-column-alt ' : '') + (isOver ? 'is-over' : '')}
      style={{ height: GRID_HEIGHT }}
      onClick={(e) => {
        if (e.target.closest('.event-card, button, a, input, textarea, select')) return
        const rect = e.currentTarget.getBoundingClientRect()
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top))
        const rawMinutes = START + y / PX_PER_MINUTE
        const minutes = Math.max(START, Math.min((22 * 60) - 60, Math.round(rawMinutes / 30) * 30))
        const end = minutes + 60
        const toTime = value => `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`
        onCreate({
          date: id,
          startTime: toTime(minutes),
          endTime: toTime(end),
        })
      }}
    >
      {HOURS.map(h => <div key={h} className="hour-line" style={{ top: (h*60 - START)*PX_PER_MINUTE }}/>)}
      {events.map(event => <EventCard key={event.id} event={event} onOpen={onOpen} onResize={onResize} onShare={onShare}/>)}
      {isSameDay(day, new Date()) && <div className="now-line" style={{ top: (new Date().getHours()*60 + new Date().getMinutes() - START)*PX_PER_MINUTE }}/>}
    </div>
  )
}

export default function WeekView({ days, events, activeCats, onMove, onOpen, onCreate, onResize, onShare }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={({ active, over }) => {
        if (!over) return
        const event = events.find(e => e.id === active.id)
        if (event && over.id !== event.date) onMove(event.id, over.id)
      }}
    >
      <div className="calendar-shell">
        <div className="calendar-head">
          <div className="time-head"/>
          {days.map(day => (
            <div key={dateKey(day)} className={'day-head ' + (isSameDay(day, new Date()) ? 'today' : '')}>
              <span>{format(day, 'EEE').toUpperCase()}</span>
              <strong>{format(day, 'd')}</strong>
            </div>
          ))}
        </div>
        <div className="calendar-body">
          <div className="time-axis" style={{ height: GRID_HEIGHT }}>
            {HOURS.map(h => <span key={h} style={{ top: (h*60 - START)*PX_PER_MINUTE - 8 }}>{String(h).padStart(2,'0')}:00</span>)}
          </div>
          {days.map((day, index) => {
            const key = dateKey(day)
            return (
              <DayColumn
                key={key}
                day={day}
                columnIndex={index}
                events={events.filter(e => e.date === key && activeCats.has(e.category))}
                onOpen={onOpen}
                onCreate={onCreate}
                onResize={onResize}
                onShare={onShare}
              />
            )
          })}
        </div>
      </div>
    </DndContext>
  )
}
