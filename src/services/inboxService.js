import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeInbox(uid, callback, onError) {
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

export function markInboxItem(uid, id, status) {
  return updateDoc(doc(db, 'users', uid, 'inbox', id), {
    status,
  })
}

export async function archiveInboxItem(
  uid,
  id,
  archiveType = 'inbox'
) {
  return updateDoc(doc(db, 'users', uid, 'inbox', id), {
    status: 'archived',
    archived: true,
    archiveType,
    archivedAt: serverTimestamp(),
  })
}

export function deleteInboxItem(uid, id) {
  // Local delete only. The sender's copy and every other recipient copy remain intact.
  return deleteDoc(doc(db, 'users', uid, 'inbox', id))
}

export async function getInboxItem(uid, id) {
  if (!uid || !id) return null

  const snapshot = await getDoc(doc(db, 'users', uid, 'inbox', id))

  if (!snapshot.exists()) return null

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

export async function sendInboxReply({
  sender,
  inboxItem,
  text,
}) {
  const cleanText = (text || '').trim()

  if (!sender?.uid || !cleanText || !inboxItem) {
    throw new Error('Missing reply information.')
  }

  if (inboxItem.closed || inboxItem.status === 'closed') {
    throw new Error('This conversation is closed.')
  }

  const recipientUid =
    inboxItem.senderUid || inboxItem.originalSenderUid || ''

  if (!recipientUid) {
    throw new Error('The sender could not be resolved.')
  }

  await addDoc(collection(db, 'users', recipientUid, 'inbox'), {
    type: 'reply',
    status: 'new',

    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId || '',
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',

    recipientUid,
    relatedInboxItemId: inboxItem.id || '',
    relatedType: inboxItem.type || 'message',
    threadId: inboxItem.threadId || '',

    originalSenderUid:
      inboxItem.originalSenderUid || inboxItem.senderUid || '',
    originalSenderCiriloId:
      inboxItem.originalSenderCiriloId || inboxItem.senderCiriloId || '',

    message: cleanText,
    sharePolicy: inboxItem.sharePolicy || 'private',
    closed: false,
    createdAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'users', sender.uid, 'inbox', inboxItem.id), {
    lastReplyAt: serverTimestamp(),
  })
}

export function inferInboxArchiveType(item = {}) {
  if (
    item.type === 'event_share' ||
    item.event ||
    item.archiveType === 'event'
  ) {
    return 'event'
  }

  if (
    item.type === 'note_share' ||
    item.type === 'note_reminder' ||
    item.notePayload ||
    item.noteId
  ) {
    return 'note'
  }

  return 'inbox'
}
