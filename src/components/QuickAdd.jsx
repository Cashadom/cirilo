import React, { useState } from 'react'
import { Command } from 'lucide-react'
import { addDays, format, nextFriday, nextMonday, nextSaturday, nextSunday, nextThursday, nextTuesday, nextWednesday } from 'date-fns'

const tags = { '#pro':'pro', '#personal':'personal', '#family':'family', '#friends':'friends', '#tasks':'tasks' }
const nextByDay = { monday: nextMonday, tuesday: nextTuesday, wednesday: nextWednesday, thursday: nextThursday, friday: nextFriday, saturday: nextSaturday, sunday: nextSunday }

function parseQuick(text) {
  let category = 'pro'
  Object.entries(tags).forEach(([tag, value]) => { if (text.toLowerCase().includes(tag)) category = value })

  let date = new Date()
  const lower = text.toLowerCase()
  if (lower.includes('tomorrow')) date = addDays(date, 1)
  Object.entries(nextByDay).forEach(([name, fn]) => { if (lower.includes(name)) date = fn(new Date()) })

  const timeMatch = lower.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s?(am|pm)?\b/)
  let startTime = '09:00'
  if (timeMatch) {
    let h = Number(timeMatch[1]); const m = Number(timeMatch[2] || 0)
    if (timeMatch[3] === 'pm' && h < 12) h += 12
    if (timeMatch[3] === 'am' && h === 12) h = 0
    startTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
  }
  const [hh, mm] = startTime.split(':').map(Number)
  const end = new Date(2000,0,1,hh,mm+60)
  const endTime = format(end, 'HH:mm')
  const title = text
    .replace(/#(pro|personal|family|friends|tasks)/ig, '')
    .replace(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/ig, '')
    .replace(/\b([01]?\d|2[0-3])(?::[0-5]\d)?\s?(am|pm)?\b/ig, '')
    .replace(/\s+/g, ' ').trim()

  return { title: title || 'Untitled', category, date: format(date, 'yyyy-MM-dd'), startTime, endTime }
}

export default function QuickAdd({ onAdd }) {
  const [value, setValue] = useState('')
  const submit = () => {
    if (!value.trim()) return
    onAdd(parseQuick(value))
    setValue('')
  }
  return (
    <div className="quick-add">
      <Command size={16}/>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        placeholder="Dinner Friday 8pm #friends"
      />
      <kbd>↵</kbd>
    </div>
  )
}
