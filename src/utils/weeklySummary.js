import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'

const PERSONALISH = new Set(['personal', 'family', 'friends'])
const PROFESSIONAL = new Set(['pro'])

function dayPhrase(days) {
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export function buildWeeklyPreview(events, now = new Date(), limit = 3) {
  const today = startOfDay(now)
  const upcoming = events
    .filter(event => {
      if (!event.date) return false
      const date = parseISO(event.date)
      return date >= today
    })
    .sort((a, b) => {
      const aKey = `${a.date}T${a.startTime || '00:00'}`
      const bKey = `${b.date}T${b.startTime || '00:00'}`
      return aKey.localeCompare(bKey)
    })

  if (!upcoming.length) return []

  const chosen = []
  let wanted = null

  for (const event of upcoming) {
    const group = PROFESSIONAL.has(event.category)
      ? 'pro'
      : PERSONALISH.has(event.category)
      ? 'personal'
      : 'other'

    if (wanted && group !== wanted && upcoming.some(x => {
      const gx = PROFESSIONAL.has(x.category) ? 'pro' : PERSONALISH.has(x.category) ? 'personal' : 'other'
      return gx === wanted && !chosen.includes(x)
    })) continue

    chosen.push(event)
    if (group === 'pro') wanted = 'personal'
    else if (group === 'personal') wanted = 'pro'

    if (chosen.length >= limit) break
  }

  if (chosen.length < limit) {
    for (const event of upcoming) {
      if (!chosen.includes(event)) chosen.push(event)
      if (chosen.length >= limit) break
    }
  }

  return chosen.slice(0, limit).map(event => {
    const days = differenceInCalendarDays(parseISO(event.date), today)
    return {
      ...event,
      relative: dayPhrase(days),
      sentence: `${dayPhrase(days)}, ${event.title}`,
      dateLabel: format(parseISO(event.date), 'EEE, MMM d')
    }
  })
}
