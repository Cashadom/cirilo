import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { format } from 'date-fns'
import { useAuth } from './AuthContext'
import {
  removeEvent,
  saveEvent,
  subscribeToEvents,
} from '../services/eventService'

const CalendarContext = createContext(null)

const LEGACY_KEY = 'cirilo.events.v1'
const MIGRATION_KEY = 'cirilo.firestoreMigrated.v1'

const now = new Date()

const d = (offset) => {
  const date = new Date(now)
  date.setDate(now.getDate() + offset)
  return format(date, 'yyyy-MM-dd')
}

const seed = [
  {
    id: 'demo-1',
    title: 'Client strategy review',
    category: 'pro',
    type: 'event',
    date: d(0),
    startTime: '09:30',
    endTime: '10:30',
    location: 'Zoom',
    people: 'Maya, Thomas',
    notes: 'Review launch priorities and next milestones.',
    reminder: '15 min before',
    priority: 'high',
    completed: false,
    visibility: 'private',
  },
  {
    id: 'demo-2',
    title: 'Gym',
    category: 'personal',
    type: 'event',
    date: d(0),
    startTime: '18:00',
    endTime: '19:15',
    location: 'Downtown club',
    people: '',
    notes: 'Leg day.',
    reminder: '30 min before',
    priority: 'normal',
    completed: false,
    visibility: 'private',
  },
  {
    id: 'demo-3',
    title: 'Dinner with family',
    category: 'family',
    type: 'event',
    date: d(2),
    startTime: '19:30',
    endTime: '21:30',
    location: 'Home',
    people: 'Family',
    notes: 'Bring dessert.',
    reminder: '1 hour before',
    priority: 'normal',
    completed: false,
    visibility: 'private',
  },
  {
    id: 'demo-4',
    title: 'Drinks with Leo',
    category: 'friends',
    type: 'event',
    date: d(4),
    startTime: '20:00',
    endTime: '22:00',
    location: 'Le Central',
    people: 'Leo',
    notes: '',
    reminder: '1 hour before',
    priority: 'normal',
    completed: false,
    visibility: 'private',
  },
  {
    id: 'demo-5',
    title: 'Send proposal',
    category: 'tasks',
    type: 'task',
    date: d(1),
    startTime: '11:00',
    endTime: '11:30',
    location: '',
    people: '',
    notes: 'Final check before sending.',
    reminder: 'At time',
    priority: 'high',
    completed: false,
    visibility: 'private',
  },
]

export function CalendarProvider({ children }) {
  const { firebaseUser, loading: authLoading } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const migrationStarted = useRef(false)

  useEffect(() => {
    if (authLoading) return undefined

    if (!firebaseUser) {
      setEvents([])
      setLoading(false)
      return undefined
    }

    setLoading(true)

    const unsubscribe = subscribeToEvents(
      firebaseUser.uid,
      async (remoteEvents) => {
        setEvents(remoteEvents)
        setLoading(false)

        if (
          !migrationStarted.current &&
          !localStorage.getItem(MIGRATION_KEY)
        ) {
          migrationStarted.current = true

          let localEvents = []

          try {
            localEvents = JSON.parse(
              localStorage.getItem(LEGACY_KEY) || '[]'
            )
          } catch {
            localEvents = []
          }

          const source =
            localEvents.length > 0
              ? localEvents
              : remoteEvents.length > 0
                ? []
                : seed

          if (source.length > 0) {
            await Promise.all(
              source.map((event) =>
                saveEvent(firebaseUser.uid, {
                  ...event,
                  id: event.id || crypto.randomUUID(),
                })
              )
            )
          }

          localStorage.setItem(MIGRATION_KEY, '1')
        }
      },
      (error) => {
        console.error(error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [firebaseUser, authLoading])

  const addEvent = async (payload) => {
    const event = {
      ...payload,
      id: payload.id || crypto.randomUUID(),
    }

    setEvents((current) => {
      const withoutSameId = current.filter(
        (item) => item.id !== event.id
      )

      return [...withoutSameId, event].sort((a, b) =>
        `${a.date || ''}T${a.startTime || '00:00'}`.localeCompare(
          `${b.date || ''}T${b.startTime || '00:00'}`
        )
      )
    })

    try {
      if (firebaseUser) {
        await saveEvent(firebaseUser.uid, event)
      }

      return event
    } catch (error) {
      setEvents((current) =>
        current.filter(
          (item) => item.id !== event.id
        )
      )

      throw error
    }
  }

  const updateEvent = async (patch) => {
    if (!patch.id) return

    const current =
      events.find(
        (event) => event.id === patch.id
      ) || {}

    const nextEvent = {
      ...current,
      ...patch,
    }

    setEvents((items) =>
      items
        .map((item) =>
          item.id === patch.id
            ? nextEvent
            : item
        )
        .sort((a, b) =>
          `${a.date || ''}T${a.startTime || '00:00'}`.localeCompare(
            `${b.date || ''}T${b.startTime || '00:00'}`
          )
        )
    )

    if (firebaseUser) {
      await saveEvent(
        firebaseUser.uid,
        nextEvent
      )
    }
  }

  const deleteEvent = async (id) => {
    const previous =
      events.find(
        (event) => event.id === id
      )

    setEvents((items) =>
      items.filter(
        (event) => event.id !== id
      )
    )

    try {
      if (firebaseUser) {
        await removeEvent(
          firebaseUser.uid,
          id
        )
      }
    } catch (error) {
      if (previous) {
        setEvents((items) => [
          ...items,
          previous,
        ])
      }

      throw error
    }
  }

  const toggleEvent = async (id) => {
    const event = events.find(
      (item) => item.id === id
    )

    if (!event) return

    await updateEvent({
      id,
      completed: !event.completed,
    })
  }

  const resetDemo = async () => {
    if (!firebaseUser) return

    await Promise.all(
      events.map((event) =>
        removeEvent(
          firebaseUser.uid,
          event.id
        )
      )
    )

    await Promise.all(
      seed.map((event) =>
        saveEvent(
          firebaseUser.uid,
          event
        )
      )
    )
  }

  const value = useMemo(
    () => ({
      events,
      loading,
      addEvent,
      updateEvent,
      deleteEvent,
      toggleEvent,
      resetDemo,
    }),
    [events, loading, firebaseUser]
  )

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)

  if (!context) {
    throw new Error(
      'useCalendar must be used inside CalendarProvider'
    )
  }

  return context
}
