import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'

export function subscribeInbox(uid, callback, onError) {
  const inboxQuery = query(
    collection(db, 'users', uid, 'inbox'),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    inboxQuery,
    snapshot => {
      callback(
        snapshot.docs.map(item => ({
          id: item.id,
          ...item.data(),
        }))
      )
    },
    onError
  )
}

export function markInboxItem(uid, id, status) {
  return updateDoc(
    doc(db, 'users', uid, 'inbox', id),
    {
      status,
    }
  )
}

export async function archiveInboxItem(
  uid,
  id,
  archiveType = 'inbox'
) {
  return updateDoc(
    doc(db, 'users', uid, 'inbox', id),
    {
      status: 'archived',
      archived: true,
      archiveType,
      archivedAt: serverTimestamp(),
    }
  )
}

export function deleteInboxItem(uid, id) {
  return deleteDoc(
    doc(db, 'users', uid, 'inbox', id)
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

export async function sendInboxReply({
  sender,
  inboxItem,
  text,
}) {
  const cleanText = String(text || '').trim()

  if (!sender?.uid) {
    throw new Error('Sender is missing.')
  }

  if (!inboxItem) {
    throw new Error('Inbox item is missing.')
  }

  if (!cleanText) {
    throw new Error('Reply cannot be empty.')
  }

  if (
    inboxItem.closed === true ||
    inboxItem.status === 'closed'
  ) {
    throw new Error('This conversation is closed.')
  }

  const recipientUid =
    inboxItem.senderUid ||
    inboxItem.originalSenderUid ||
    ''

  if (!recipientUid) {
    console.error(
      'Could not resolve reply recipient:',
      inboxItem
    )

    throw new Error(
      'The sender could not be resolved.'
    )
  }

  if (recipientUid === sender.uid) {
    throw new Error('The reply recipient could not be resolved.')
  }

  const originalSenderUid =
    inboxItem.originalSenderUid ||
    inboxItem.senderUid ||
    ''

  const originalSenderCiriloId =
    inboxItem.originalSenderCiriloId ||
    inboxItem.senderCiriloId ||
    inboxItem.sharedByCiriloId ||
    inboxItem.sharedBy ||
    ''

  const baseReplyData = {
    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId || '',
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',

    recipientUid,

    relatedInboxItemId: inboxItem.id || '',
    relatedType: inboxItem.type || 'message',

    threadId: inboxItem.threadId || '',

    originalSenderUid,
    originalSenderCiriloId,

    message: cleanText,

    sharePolicy: inboxItem.sharePolicy || 'private',
    closed: false,

    createdAt: serverTimestamp(),
  }

  /*
   * IMPORTANT:
   * The recipient copy and the sender's local history copy are
   * written in one Firestore batch. Either both writes succeed,
   * or neither is committed.
   */
  const recipientReplyRef = doc(
    collection(db, 'users', recipientUid, 'inbox')
  )

  const localReplyRef = doc(
    collection(db, 'users', sender.uid, 'inbox')
  )

  const originalInboxRef = doc(
    db,
    'users',
    sender.uid,
    'inbox',
    inboxItem.id
  )

  const batch = writeBatch(db)

  batch.set(recipientReplyRef, {
    ...baseReplyData,
    type: 'reply',
    status: 'new',
    localCopy: false,
  })

  batch.set(localReplyRef, {
    ...baseReplyData,
    type: 'reply_sent',
    status: 'sent',
    localCopy: true,
  })

  batch.update(originalInboxRef, {
    lastReplyAt: serverTimestamp(),
  })

  await batch.commit()

  return {
    id: recipientReplyRef.id,
    localId: localReplyRef.id,
    ...baseReplyData,
    type: 'reply',
    status: 'new',
  }
}

export function inferInboxArchiveType(
  item = {}
) {
  if (
    item.type === 'event_share' ||
    item.event ||
    item.archiveType === 'event'
  ) {
    return 'event'
  }

  if (
    item.type === 'tamba_share' ||
    item.tambaJob ||
    item.archiveType === 'tamba'
  ) {
    return 'tamba'
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
