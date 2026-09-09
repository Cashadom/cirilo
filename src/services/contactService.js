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

const CIRILO_ID_RE = /^cirilo_\d{6}$/i

export function normalizeCiriloId(value = '') {
  return String(value || '').trim().toLowerCase()
}

export async function resolveCiriloContact(ciriloId) {
  const cleanId = normalizeCiriloId(ciriloId)

  if (!CIRILO_ID_RE.test(cleanId)) {
    throw new Error('Invalid Cirilo ID.')
  }

  const snapshot = await getDoc(doc(db, 'publicUsers', cleanId))

  if (!snapshot.exists()) {
    throw new Error('Cirilo ID not found.')
  }

  const data = snapshot.data()

  return {
    uid: data.uid || '',
    ciriloId: cleanId,
    displayName: data.displayName || 'Cirilo user',
    photoURL: data.photoURL || '',
  }
}

export function subscribeContacts(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    collection(db, 'users', uid, 'contacts'),
    snapshot => {
      const rows = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data(),
      }))
      onData(rows)
    },
    onError
  )
}

export function subscribeTeams(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    collection(db, 'users', uid, 'teams'),
    snapshot => {
      const rows = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data(),
      }))
      onData(rows)
    },
    onError
  )
}

export async function addContact(uid, ciriloId, options = {}) {
  if (!uid) throw new Error('Missing user account.')

  const contact = await resolveCiriloContact(ciriloId)

  if (contact.uid === uid) {
    throw new Error('You cannot add yourself as a contact.')
  }

  const ref = doc(db, 'users', uid, 'contacts', contact.ciriloId)
  const existing = await getDoc(ref)
  const old = existing.exists() ? existing.data() : {}

  const payload = {
    uid: contact.uid,
    ciriloId: contact.ciriloId,
    displayName: contact.displayName,
    photoURL: contact.photoURL,
    favorite: options.favorite ?? old.favorite ?? false,
    createdAt: old.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastSharedAt: old.lastSharedAt || null,
  }

  await setDoc(ref, payload, { merge: true })

  return {
    id: contact.ciriloId,
    ...payload,
  }
}

export async function setContactFavorite(uid, contact, favorite) {
  if (!uid || !contact?.ciriloId) return

  await setDoc(
    doc(db, 'users', uid, 'contacts', normalizeCiriloId(contact.ciriloId)),
    {
      favorite: Boolean(favorite),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}

export async function removeContact(uid, ciriloId) {
  if (!uid || !ciriloId) return
  await deleteDoc(doc(db, 'users', uid, 'contacts', normalizeCiriloId(ciriloId)))
}

export async function saveTeam(uid, team) {
  if (!uid) throw new Error('Missing user account.')

  const name = String(team?.name || '').trim()
  const members = [...new Set((team?.members || []).map(normalizeCiriloId).filter(Boolean))]

  if (!name) throw new Error('Add a team name.')
  if (!members.length) throw new Error('Add at least one contact to the team.')

  const id = team?.id || crypto.randomUUID()

  await setDoc(
    doc(db, 'users', uid, 'teams', id),
    {
      name,
      members,
      createdAt: team?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return { id, name, members }
}

export async function removeTeam(uid, teamId) {
  if (!uid || !teamId) return
  await deleteDoc(doc(db, 'users', uid, 'teams', teamId))
}

export async function touchSharedContacts(uid, recipients = []) {
  if (!uid) return

  const unique = new Map()
  recipients.forEach(recipient => {
    const ciriloId = normalizeCiriloId(recipient?.ciriloId)
    if (ciriloId) unique.set(ciriloId, recipient)
  })

  await Promise.all(
    [...unique.entries()].map(async ([ciriloId, recipient]) => {
      await setDoc(
        doc(db, 'users', uid, 'contacts', ciriloId),
        {
          uid: recipient.uid || '',
          ciriloId,
          displayName: recipient.displayName || 'Cirilo user',
          photoURL: recipient.photoURL || '',
          lastSharedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    })
  )
}
