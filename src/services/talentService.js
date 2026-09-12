import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const TALENT_STATUSES = [
  'new',
  'interview',
  'pending',
  'hired',
  'rejected',
]

const talentCollection = (uid) =>
  collection(db, 'users', uid, 'talents')

export function subscribeToTalents(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    talentCollection(uid),
    (snapshot) => {
      const rows = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((item) => !item.archived)
        .sort((a, b) =>
          `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
            `${b.lastName || ''} ${b.firstName || ''}`
          )
        )

      onData(rows)
    },
    onError
  )
}

export async function saveTalent({
  uid,
  ciriloId,
  talent,
}) {
  if (!uid) {
    throw new Error('Missing user account.')
  }

  const id = talent?.id || crypto.randomUUID()
  const isNew = !talent?.id

  const payload = {
    firstName: String(talent?.firstName || '').trim(),
    lastName: String(talent?.lastName || '').trim(),
    jobTitle: String(talent?.jobTitle || '').trim(),

    email: String(talent?.email || '')
      .trim()
      .toLowerCase(),

    phone: String(talent?.phone || '').trim(),
    location: String(talent?.location || '').trim(),
    source: String(talent?.source || '').trim(),
    availability: String(talent?.availability || '').trim(),
    salary: String(talent?.salary || '').trim(),
    notes: String(talent?.notes || '').trim(),
    clientComment: String(talent?.clientComment || '').trim(),

    status: TALENT_STATUSES.includes(talent?.status)
      ? talent.status
      : 'new',

    ownerUid: uid,
    ownerCiriloId: ciriloId || '',
    archived: Boolean(talent?.archived),

    updatedAt: serverTimestamp(),
  }

  if (isNew) {
    payload.createdAt = serverTimestamp()
  }

  await setDoc(
    doc(db, 'users', uid, 'talents', id),
    payload,
    { merge: true }
  )

  return {
    id,
    ...payload,
  }
}

export async function deleteTalent(uid, talentId) {
  if (!uid || !talentId) return

  await deleteDoc(
    doc(db, 'users', uid, 'talents', talentId)
  )
}

