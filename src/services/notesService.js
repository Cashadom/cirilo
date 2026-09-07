import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const NOTES_COLLECTION = (uid) =>
  collection(db, 'users', uid, 'notes')

const noteRef = (uid, noteId) =>
  doc(db, 'users', uid, 'notes', noteId)

const inboxCollection = (uid) =>
  collection(db, 'users', uid, 'inbox')

const CIRILO_ID_RE = /^cirilo_\d{6}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isoDay = (date = new Date()) =>
  date.toISOString().slice(0, 10)

const addMonthsISO = (dateString, months = 1) => {
  const base = dateString
    ? new Date(`${dateString}T12:00:00`)
    : new Date()

  base.setMonth(base.getMonth() + months)
  return isoDay(base)
}

const secureToken = () =>
  crypto.randomUUID().replaceAll('-', '') +
  crypto.randomUUID().replaceAll('-', '')

const normalizeItem = (item = {}) => ({
  id: item.id || crypto.randomUUID(),
  kind: item.kind === 'text' ? 'text' : 'item',
  text: item.text || '',
  status: item.status || 'active',
  reminderType:
    item.kind === 'text'
      ? 'none'
      : item.reminderType || 'none',
  nextReminderAt:
    item.kind === 'text'
      ? ''
      : item.nextReminderAt ||
        (item.reminderType === 'monthly'
          ? addMonthsISO(isoDay(), 1)
          : ''),
  lastRemindedAt: item.lastRemindedAt || '',
  hasBeenShared: Boolean(item.hasBeenShared),
  createdAt: item.createdAt || new Date().toISOString(),
})

const normalizeNote = (snapshot) => {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    title: data.title || 'Untitled list',
    universe: data.universe || 'personal',
    visibility: data.visibility || 'private',
    items: (data.items || []).map(normalizeItem),
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  }
}

export function subscribeNotes(uid, callback, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    NOTES_COLLECTION(uid),
    (snapshot) => {
      const notes = snapshot.docs
        .map(normalizeNote)
        .sort((a, b) => {
          const av = a.updatedAt?.toMillis?.() || 0
          const bv = b.updatedAt?.toMillis?.() || 0
          return bv - av
        })

      callback(notes)
    },
    onError
  )
}

export async function saveNote(uid, note) {
  if (!uid) throw new Error('Missing user ID.')

  const id = note.id || crypto.randomUUID()
  const ref = noteRef(uid, id)

  const existing = await getDoc(ref)

  await setDoc(
    ref,
    {
      title: note.title?.trim() || 'Untitled list',
      universe: note.universe || 'personal',
      visibility: note.visibility || 'private',
      items: (note.items || []).map(normalizeItem),
      createdAt: existing.exists()
        ? existing.data().createdAt
        : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return id
}

export function deleteNote(uid, noteId) {
  return deleteDoc(noteRef(uid, noteId))
}

export async function updateNoteItem(
  uid,
  noteId,
  itemId,
  patch
) {
  const ref = noteRef(uid, noteId)
  const snapshot = await getDoc(ref)

  if (!snapshot.exists()) {
    throw new Error('Note not found.')
  }

  const data = snapshot.data()

  const items = (data.items || []).map((item) =>
    item.id === itemId
      ? normalizeItem({
          ...item,
          ...patch,
        })
      : normalizeItem(item)
  )

  await updateDoc(ref, {
    items,
    updatedAt: serverTimestamp(),
  })
}

export async function markNoteItemDone(
  uid,
  noteId,
  itemId
) {
  return updateNoteItem(
    uid,
    noteId,
    itemId,
    {
      status: 'done',
      reminderType: 'none',
      nextReminderAt: '',
    }
  )
}

export async function markNoteItemScheduled(
  uid,
  noteId,
  itemId
) {
  return updateNoteItem(
    uid,
    noteId,
    itemId,
    {
      status: 'scheduled',
      reminderType: 'none',
      nextReminderAt: '',
    }
  )
}

export async function remindNoteItemNextMonth(
  uid,
  noteId,
  itemId
) {
  return updateNoteItem(
    uid,
    noteId,
    itemId,
    {
      status: 'active',
      reminderType: 'monthly',
      nextReminderAt: addMonthsISO(isoDay(), 1),
    }
  )
}

export async function markNoteItemShared(
  uid,
  noteId,
  itemId
) {
  return updateNoteItem(
    uid,
    noteId,
    itemId,
    {
      hasBeenShared: true,
    }
  )
}

export async function resolveCiriloUser(ciriloId) {
  const cleanId = (ciriloId || '')
    .trim()
    .toLowerCase()

  if (!CIRILO_ID_RE.test(cleanId)) {
    throw new Error('Invalid Cirilo ID.')
  }

  const snapshot = await getDoc(
    doc(db, 'publicUsers', cleanId)
  )

  if (!snapshot.exists()) {
    throw new Error(`Cirilo ID not found: ${cleanId}`)
  }

  return snapshot.data()
}

export async function shareNoteToCirilo({
  sender,
  recipientCiriloId,
  payload,
}) {
  const recipient =
    await resolveCiriloUser(recipientCiriloId)

  if (recipient.uid === sender.uid) {
    throw new Error(
      'You cannot share this with yourself.'
    )
  }

  await addDoc(
    inboxCollection(recipient.uid),
    {
      type: 'note_share',
      senderUid: sender.uid,
      senderCiriloId: sender.ciriloId,
      senderName:
        sender.displayName || 'Cirilo user',
      senderPhotoURL:
        sender.photoURL || '',
      status: 'new',
      notePayload: payload,
      createdAt: serverTimestamp(),
    }
  )
}

export async function createSharedNoteLink({
  sender,
  recipientEmail,
  payload,
}) {
  const email = (recipientEmail || '')
    .trim()
    .toLowerCase()

  if (!EMAIL_RE.test(email)) {
    throw new Error('Invalid email address.')
  }

  const token = secureToken()

  await setDoc(
    doc(db, 'sharedNotes', token),
    {
      token,
      senderUid: sender.uid,
      senderCiriloId: sender.ciriloId,
      senderName:
        sender.displayName || 'Cirilo user',
      senderPhotoURL:
        sender.photoURL || '',
      recipientEmail: email,
      payload,
      revoked: false,
      createdAt: serverTimestamp(),
    }
  )

  return {
    token,
    recipientEmail: email,
    shareUrl:
      `${window.location.origin}/?sharedNote=${encodeURIComponent(token)}`,
  }
}

export function openNoteEmailClient({
  senderName,
  share,
}) {
  const title =
    share.payload?.type === 'item'
      ? share.payload.item?.text
      : share.payload?.note?.title

  const subject = encodeURIComponent(
    `${senderName || 'Someone'} shared something with you on Cirilo`
  )

  const body = encodeURIComponent(
    `${senderName || 'Someone'} shared "${title || 'a list'}" with you.\n\n` +
    `Open it on Cirilo:\n${share.shareUrl}\n\n` +
    `No Cirilo account is required to view it.`
  )

  window.location.href =
    `mailto:${encodeURIComponent(share.recipientEmail)}` +
    `?subject=${subject}&body=${body}`
}

export async function syncDueNoteReminders(uid) {
  if (!uid) return

  const snapshot =
    await getDocs(NOTES_COLLECTION(uid))

  const today = isoDay()

  for (const noteDoc of snapshot.docs) {
    const data = noteDoc.data()
    let changed = false

    const items = (data.items || []).map((raw) => {
      const item = normalizeItem(raw)

      const due =
        item.kind !== 'text' &&
        item.status === 'active' &&
        item.reminderType === 'monthly' &&
        item.nextReminderAt &&
        item.nextReminderAt <= today &&
        item.lastRemindedAt !== today

      if (!due) return item

      changed = true

      addDoc(
        inboxCollection(uid),
        {
          type: 'note_reminder',
          status: 'new',
          noteId: noteDoc.id,
          noteTitle:
            data.title || 'Your list',
          universe:
            data.universe || 'personal',
          noteItem: item,
          createdAt: serverTimestamp(),
        }
      )

      return {
        ...item,
        lastRemindedAt: today,
        nextReminderAt:
          addMonthsISO(today, 1),
      }
    })

    if (changed) {
      await updateDoc(noteDoc.ref, {
        items,
        updatedAt: serverTimestamp(),
      })
    }
  }
}
