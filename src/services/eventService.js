import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const eventsCollection = (uid) =>
  collection(db, 'users', uid, 'events')

const normalizeDate = (value) => {
  if (!value) return ''

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return String(value).slice(0, 10)
}

const normalizeEvent = (snapshot) => {
  const data = snapshot.data()

  return {
    ...data,
    id: snapshot.id,
    date: normalizeDate(data.date),
    startTime: data.startTime || '09:00',
    endTime: data.endTime || '10:00',
    category: data.category || 'personal',
    type: data.type || 'event',
    visibility: data.visibility || 'private',
    completed: Boolean(data.completed),
  }
}

export function subscribeToEvents(uid, callback, onError) {
  return onSnapshot(
    eventsCollection(uid),
    (snapshot) => {
      const events = snapshot.docs
        .map(normalizeEvent)
        .sort((a, b) =>
          `${a.date}T${a.startTime}`.localeCompare(
            `${b.date}T${b.startTime}`
          )
        )

      callback(events)
    },
    onError
  )
}

export function saveEvent(uid, event) {
  if (!uid) {
    return Promise.reject(new Error('Missing Firebase user ID.'))
  }

  if (!event?.id) {
    return Promise.reject(new Error('Missing event ID.'))
  }

  if (!event?.date) {
    return Promise.reject(new Error('Missing event date.'))
  }

  return setDoc(
    doc(db, 'users', uid, 'events', event.id),
    {
      ...event,
      date: normalizeDate(event.date),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export function removeEvent(uid, id) {
  return deleteDoc(doc(db, 'users', uid, 'events', id))
}
