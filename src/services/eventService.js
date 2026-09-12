import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const eventsCollection = uid =>
  collection(db, 'users', uid, 'events')

const publicEventId = (uid, eventId) =>
  `${uid}_${eventId}`

const normalizeDate = value => {
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

const normalizeEvent = snapshot => {
  const data = snapshot.data()

  return {
    ...data,
    id: data.localEventId || snapshot.id,
    publicId: data.publicId || snapshot.id,
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
    snapshot => {
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

export function subscribeToPublicEvents(callback, onError) {
  return onSnapshot(
    collection(db, 'publicEvents'),
    snapshot => {
      const events = snapshot.docs
        .map(normalizeEvent)
        .filter(event => event.visibility === 'public')
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

async function syncPublicEvent(uid, event) {
  const mirrorRef = doc(
    db,
    'publicEvents',
    publicEventId(uid, event.id)
  )

  if (event.visibility !== 'public') {
    await deleteDoc(mirrorRef).catch(() => {})
    return
  }

  const profileSnap = await getDoc(doc(db, 'users', uid))
  const profile = profileSnap.exists()
    ? profileSnap.data()
    : {}

  const publicId =
    event.publicId ||
    `public-${uid}-${event.id}`

  await setDoc(
    mirrorRef,
    {
      ...event,
      localEventId: event.id,
      publicId,
      ownerUid: uid,
      ownerCiriloId: profile.ciriloId || '',
      ownerName:
        profile.organizationName ||
        profile.displayName ||
        'Cirilo',
      ownerPhotoURL: profile.photoURL || '',
      ownerProfileType: profile.profileType || 'personal',
      ownerOrganizationType: profile.organizationType || '',
      ownerVerified:
        profile.municipalityVerificationStatus === 'verified',
      date: normalizeDate(event.date),
      visibility: 'public',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function saveEvent(uid, event) {
  if (!uid) {
    throw new Error('Missing Firebase user ID.')
  }

  if (!event?.id) {
    throw new Error('Missing event ID.')
  }

  if (!event?.date) {
    throw new Error('Missing event date.')
  }

  const cleanEvent = {
    ...event,
    date: normalizeDate(event.date),
    updatedAt: serverTimestamp(),
  }

  await setDoc(
    doc(db, 'users', uid, 'events', event.id),
    cleanEvent,
    { merge: true }
  )

  await syncPublicEvent(uid, {
    ...event,
    date: normalizeDate(event.date),
  })

  return event
}

export async function removeEvent(uid, id) {
  await Promise.all([
    deleteDoc(doc(db, 'users', uid, 'events', id)),
    deleteDoc(
      doc(db, 'publicEvents', publicEventId(uid, id))
    ).catch(() => {}),
  ])
}
