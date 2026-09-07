import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeInbox(
  uid,
  callback,
  onError
) {
  const inboxQuery = query(
    collection(db, 'users', uid, 'inbox'),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    inboxQuery,
    (snapshot) => {
      callback(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }))
      )
    },
    onError
  )
}

export function markInboxItem(
  uid,
  id,
  status
) {
  return updateDoc(
    doc(db, 'users', uid, 'inbox', id),
    { status }
  )
}

export async function getInboxItem(uid, id) {
  if (!uid || !id) return null

  const snapshot = await getDoc(
    doc(db, 'users', uid, 'inbox', id)
  )

  if (!snapshot.exists()) return null

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}
