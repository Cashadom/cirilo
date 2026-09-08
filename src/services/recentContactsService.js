import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../firebase'

function asMillis(value) {
  if (!value) return 0
  if (typeof value?.toMillis === 'function') return value.toMillis()
  if (typeof value === 'number') return value

  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalizeCiriloId(value = '') {
  return String(value || '').trim().toLowerCase()
}

function extractContact(item, currentUid) {
  if (!item) return null

  const senderId = normalizeCiriloId(
    item.senderCiriloId ||
    item.originalSenderCiriloId ||
    item.sharedByCiriloId ||
    item.sharedBy ||
    ''
  )

  const recipientId = normalizeCiriloId(
    item.recipientCiriloId ||
    ''
  )

  const senderUid = item.senderUid || ''
  const recipientUid = item.recipientUid || ''

  const currentWasSender = senderUid && senderUid === currentUid
  const currentWasRecipient = recipientUid && recipientUid === currentUid

  let ciriloId = senderId
  let uid = senderUid
  let displayName =
    item.senderName ||
    item.senderDisplayName ||
    ''
  let photoURL =
    item.senderPhotoURL ||
    item.sharedByPhotoURL ||
    ''

  if (currentWasSender && recipientId) {
    ciriloId = recipientId
    uid = recipientUid || ''
    displayName =
      item.recipientName ||
      item.recipientDisplayName ||
      ''
    photoURL =
      item.recipientPhotoURL ||
      ''
  } else if (!senderId && currentWasRecipient && recipientId) {
    ciriloId = recipientId
  }

  if (!ciriloId) return null

  return {
    ciriloId,
    uid,
    displayName,
    photoURL,
    lastInteractionAt:
      asMillis(item.lastReplyAt) ||
      asMillis(item.updatedAt) ||
      asMillis(item.createdAt),
  }
}

async function enrichContact(contact) {
  if (!contact?.ciriloId) return contact

  try {
    const snap = await getDoc(
      doc(db, 'publicUsers', contact.ciriloId)
    )

    if (!snap.exists()) return contact

    const data = snap.data()

    return {
      ...contact,
      uid: contact.uid || data.uid || '',
      displayName:
        contact.displayName ||
        data.displayName ||
        data.name ||
        '',
      name:
        data.name ||
        data.displayName ||
        contact.displayName ||
        '',
      photoURL:
        contact.photoURL ||
        data.photoURL ||
        '',
      slug:
        data.slug ||
        data.ciriloId ||
        contact.ciriloId,
    }
  } catch (error) {
    return contact
  }
}

export function subscribeRecentContacts(
  uid,
  callback,
  onError
) {
  if (!uid) {
    callback([])
    return () => {}
  }

  const inboxQuery = query(
    collection(db, 'users', uid, 'inbox'),
    orderBy('createdAt', 'desc')
  )

  return onSnapshot(
    inboxQuery,
    async snapshot => {
      const byId = new Map()

      for (const snap of snapshot.docs) {
        const item = {
          id: snap.id,
          ...snap.data(),
        }

        const contact = extractContact(item, uid)
        if (!contact?.ciriloId) continue

        const previous = byId.get(contact.ciriloId)

        if (
          !previous ||
          contact.lastInteractionAt >
            previous.lastInteractionAt
        ) {
          byId.set(contact.ciriloId, contact)
        }
      }

      const topSix = [...byId.values()]
        .sort(
          (a, b) =>
            b.lastInteractionAt -
            a.lastInteractionAt
        )
        .slice(0, 6)

      const enriched = await Promise.all(
        topSix.map(enrichContact)
      )

      callback(enriched)
    },
    onError
  )
}
