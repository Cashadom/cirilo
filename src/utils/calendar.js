import { addDays, format, startOfWeek } from 'date-fns'

export const CATEGORIES = {
  pro: { label: 'Pro', color: '#2F80ED', soft: '#F7FBFF', ribbon2: '#84BDF4' },
  personal: { label: 'Personal', color: '#4EBA86', soft: '#F8FCFA', ribbon2: '#95D8B7' },
  family: { label: 'Family', color: '#FF8066', soft: '#FFF9F7', ribbon2: '#FFB29F' },
  friends: { label: 'Friends', color: '#8057D8', soft: '#FBF9FE', ribbon2: '#B39AE8' },
  tasks: { label: 'Tasks', color: '#7E8793', soft: '#FAFBFC', ribbon2: '#B8BEC6' },
}

export const HOURS = Array.from({ length: 15 }, (_, i) => i + 7)

export function getWeekDays(anchorDate = new Date()) {
  const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function dateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function minutesFromTime(value = '09:00') {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function durationMinutes(event) {
  return Math.max(30, minutesFromTime(event.endTime) - minutesFromTime(event.startTime))
}
