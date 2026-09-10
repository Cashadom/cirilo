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
import {
  canChangePrivacy,
  canClose,
  canEditOriginal,
  canForward,
  getSharePolicy,
  isReceivedEntity,
} from './sharePermissions'

const NOTES_COLLECTION = (uid) =>
  collection(db, 'users', uid, 'notes')

const noteRef = (uid, noteId) =>
  doc(db, 'users', uid, 'notes', noteId)

const inboxCollection = (uid) =>
  collection(db, 'users', uid, 'inbox')

const threadRef = (threadId) =>
  doc(db, 'sharedThreads', threadId)

const repliesCollection = (threadId) =>
  collection(db, 'sharedThreads', threadId, 'replies')

const CIRILO_ID_RE = /^cirilo_\d{6,10}$/i
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

const cleanSnapshotNote = (note = {}) => ({
  title: note.title?.trim() || 'Untitled list',
  universe: note.universe || 'personal',
  visibility: note.visibility || 'private',
  sharePolicy: getSharePolicy(note),
  items: (note.items || []).map(normalizeItem),
})

const cleanSnapshotPayload = (payload = {}) => {
  if (payload.type === 'item') {
    return {
      type: 'item',
      noteId: payload.noteId || '',
      noteTitle: payload.noteTitle || 'Shared item',
      universe: payload.universe || 'personal',
      visibility: payload.visibility || 'private',
      sharePolicy: getSharePolicy(payload),
      item: normalizeItem(payload.item || {}),
    }
  }

  return {
    type: 'note',
    note: cleanSnapshotNote(payload.note || {}),
  }
}

const normalizeNote = (snapshot) => {
  const data = snapshot.data()

  return {
    id: snapshot.id,
    title: data.title || 'Untitled list',
    universe: data.universe || 'personal',
    visibility: data.visibility || 'private',
    sharePolicy: getSharePolicy(data),
    items: (data.items || []).map(normalizeItem),

    ownerUid: data.ownerUid || '',
    ownerCiriloId: data.ownerCiriloId || '',
    localOwnerUid: data.localOwnerUid || '',

    senderUid: data.senderUid || data.sharedByUid || '',
    senderCiriloId:
      data.senderCiriloId ||
      data.sharedByCiriloId ||
      data.sharedBy ||
      '',
    senderName: data.senderName || data.sharedByName || '',
    senderPhotoURL:
      data.senderPhotoURL ||
      data.sharedByPhotoURL ||
      data.createdByPhotoURL ||
      '',

    originalSenderUid:
      data.originalSenderUid ||
      data.senderUid ||
      data.sharedByUid ||
      '',
    originalSenderCiriloId:
      data.originalSenderCiriloId ||
      data.senderCiriloId ||
      data.sharedByCiriloId ||
      data.sharedBy ||
      '',
    forwardedByCiriloId: data.forwardedByCiriloId || '',

    organizerUid: data.organizerUid || data.ownerUid || '',
    organizerCiriloId:
      data.organizerCiriloId || data.ownerCiriloId || '',

    isReceivedShared: Boolean(
      data.isReceivedShared ||
      data.lockedForRecipient ||
      data.receivedSnapshot ||
      data.senderCiriloId ||
      data.originalSenderCiriloId ||
      data.sharedByCiriloId ||
      data.sharedBy
    ),
    lockedForRecipient: Boolean(data.lockedForRecipient),
    receivedSnapshot: Boolean(data.receivedSnapshot),
    sourceShareId: data.sourceShareId || '',
    threadId: data.threadId || '',

    closed: Boolean(data.closed),
    closedByUid: data.closedByUid || '',
    closedByCiriloId: data.closedByCiriloId || '',
    closedAt: data.closedAt || null,

    archived: Boolean(data.archived),
    archivedAt: data.archivedAt || null,

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
        .filter((note) => !note.archived)
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

  if (existing.exists()) {
    const existingNote = normalizeNote(existing)

    if (!canEditOriginal(existingNote, uid)) {
      throw new Error(
        'This received content is locked. You can reply, archive or delete your local copy, but you cannot rewrite the original.'
      )
    }

    if (
      note.visibility !== undefined &&
      note.visibility !== existingNote.visibility &&
      !canChangePrivacy(existingNote, uid)
    ) {
      throw new Error('You cannot change this sharing policy.')
    }
  }

  const payload = {
    title: note.title?.trim() || 'Untitled list',
    universe: note.universe || 'personal',
    visibility: note.visibility || 'private',
    sharePolicy: getSharePolicy(note),
    items: (note.items || []).map(normalizeItem),
    ownerUid: existing.exists()
      ? existing.data().ownerUid || uid
      : note.ownerUid || uid,
    ownerCiriloId: existing.exists()
      ? existing.data().ownerCiriloId || note.ownerCiriloId || ''
      : note.ownerCiriloId || '',
    localOwnerUid: uid,
    createdAt: existing.exists()
      ? existing.data().createdAt
      : serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(ref, payload, { merge: true })

  return id
}

export function deleteNote(uid, noteId) {
  // Local delete only: this removes this user's copy, never another user's copy.
  return deleteDoc(noteRef(uid, noteId))
}

export async function archiveNote(uid, noteId) {
  return updateDoc(noteRef(uid, noteId), {
    archived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
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

  const normalized = normalizeNote(snapshot)

  if (!canEditOriginal(normalized, uid)) {
    throw new Error(
      'You cannot modify content written by another Cirilo member.'
    )
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

export async function markNoteItemDone(uid, noteId, itemId) {
  return updateNoteItem(uid, noteId, itemId, {
    status: 'done',
    reminderType: 'none',
    nextReminderAt: '',
  })
}

export async function markNoteItemScheduled(uid, noteId, itemId) {
  return updateNoteItem(uid, noteId, itemId, {
    status: 'scheduled',
    reminderType: 'none',
    nextReminderAt: '',
  })
}

export async function remindNoteItemNextMonth(
  uid,
  noteId,
  itemId
) {
  return updateNoteItem(uid, noteId, itemId, {
    status: 'active',
    reminderType: 'monthly',
    nextReminderAt: addMonthsISO(isoDay(), 1),
  })
}

export async function markNoteItemShared(uid, noteId, itemId) {
  const snapshot = await getDoc(noteRef(uid, noteId))

  if (!snapshot.exists()) return

  const normalized = normalizeNote(snapshot)

  // A received immutable copy must not be altered just because it was forwarded.
  if (isReceivedEntity(normalized)) return

  return updateNoteItem(uid, noteId, itemId, {
    hasBeenShared: true,
  })
}

export async function resolveCiriloUser(ciriloId) {
  const cleanId = (ciriloId || '').trim().toLowerCase()

  if (!CIRILO_ID_RE.test(cleanId)) {
    throw new Error('Invalid Cirilo ID.')
  }

  const snapshot = await getDoc(doc(db, 'publicUsers', cleanId))

  if (!snapshot.exists()) {
    throw new Error(`Cirilo ID not found: ${cleanId}`)
  }

  return snapshot.data()
}

async function createThreadIfNeeded({ sender, payload }) {
  if (payload.threadId) {
    const existingThread = await getDoc(threadRef(payload.threadId))

    if (!existingThread.exists()) {
      throw new Error('This shared conversation no longer exists.')
    }

    const data = existingThread.data()

    if (data.closed) {
      throw new Error('This conversation is closed.')
    }

    const isOrganizer = data.organizerUid === sender.uid

    if (!isOrganizer && !canForward({ ...data, sharePolicy: data.sharePolicy }, sender.uid)) {
      throw new Error('This content is private and cannot be forwarded.')
    }

    return {
      threadId: payload.threadId,
      originalSenderUid:
        data.originalSenderUid || data.organizerUid || sender.uid,
      originalSenderCiriloId:
        data.originalSenderCiriloId || data.organizerCiriloId || sender.ciriloId,
      organizerUid: data.organizerUid || sender.uid,
      organizerCiriloId: data.organizerCiriloId || sender.ciriloId,
      sharePolicy: getSharePolicy(data),
      sourceSnapshot: data.sourceSnapshot || cleanSnapshotPayload(payload),
      isForward: true,
    }
  }

  const threadId = crypto.randomUUID()
  const sourceSnapshot = cleanSnapshotPayload(payload)
  const sharePolicy = getSharePolicy(
    payload.type === 'note' ? payload.note : payload
  )

  await setDoc(threadRef(threadId), {
    threadId,
    type: payload.type || 'note',
    organizerUid: sender.uid,
    organizerCiriloId: sender.ciriloId,
    originalSenderUid: sender.uid,
    originalSenderCiriloId: sender.ciriloId,
    sharePolicy,
    sourceSnapshot,
    closed: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    threadId,
    originalSenderUid: sender.uid,
    originalSenderCiriloId: sender.ciriloId,
    organizerUid: sender.uid,
    organizerCiriloId: sender.ciriloId,
    sharePolicy,
    sourceSnapshot,
    isForward: false,
  }
}

export async function shareNoteToCirilo({
  sender,
  recipientCiriloId,
  payload,
}) {
  const recipient = await resolveCiriloUser(recipientCiriloId)

  if (recipient.uid === sender.uid) {
    throw new Error('You cannot share this with yourself.')
  }

  const thread = await createThreadIfNeeded({ sender, payload })

  if (
    !payload.threadId &&
    payload.type === 'note' &&
    payload.note?.id
  ) {
    await updateDoc(noteRef(sender.uid, payload.note.id), {
      threadId: thread.threadId,
      organizerUid: thread.organizerUid,
      organizerCiriloId: thread.organizerCiriloId,
      originalSenderUid: thread.originalSenderUid,
      originalSenderCiriloId: thread.originalSenderCiriloId,
      sharePolicy: thread.sharePolicy,
      updatedAt: serverTimestamp(),
    })
  }

  await addDoc(inboxCollection(recipient.uid), {
    type: 'note_share',
    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId,
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',

    originalSenderUid: thread.originalSenderUid,
    originalSenderCiriloId: thread.originalSenderCiriloId,
    forwardedByCiriloId: thread.isForward ? sender.ciriloId : '',
    organizerUid: thread.organizerUid,
    organizerCiriloId: thread.organizerCiriloId,

    recipientCiriloId: recipientCiriloId.trim().toLowerCase(),
    sharePolicy: thread.sharePolicy,
    threadId: thread.threadId,
    closed: false,

    status: 'new',
    notePayload: thread.sourceSnapshot,
    receivedSnapshot: true,
    createdAt: serverTimestamp(),
  })

  return thread.threadId
}

export async function saveSharedNoteSnapshot(uid, inboxItem) {
  if (!uid || !inboxItem) {
    throw new Error('Missing shared note.')
  }

  const payload = inboxItem.notePayload || {}
  const id = crypto.randomUUID()
  const ref = noteRef(uid, id)

  const snapshotNote =
    payload.type === 'item'
      ? {
          title: payload.noteTitle || 'Shared with me',
          universe: payload.universe || 'personal',
          visibility: 'private',
          sharePolicy: 'private',
          items: [normalizeItem(payload.item || {})],
        }
      : {
          ...cleanSnapshotNote(payload.note || {}),
          visibility: 'private',
          sharePolicy: 'private',
        }

  await setDoc(ref, {
    ...snapshotNote,

    ownerUid: uid,
    ownerCiriloId: '',
    localOwnerUid: uid,

    importedFromShareId: inboxItem.id || '',
    importedFromThreadId: inboxItem.threadId || '',
    importedFromSenderUid:
      inboxItem.senderUid ||
      inboxItem.sharedByUid ||
      '',
    importedFromSenderCiriloId:
      inboxItem.senderCiriloId ||
      inboxItem.sharedByCiriloId ||
      inboxItem.sharedBy ||
      '',
    importedFromOriginalSenderUid:
      inboxItem.originalSenderUid ||
      inboxItem.senderUid ||
      inboxItem.sharedByUid ||
      '',
    importedFromOriginalSenderCiriloId:
      inboxItem.originalSenderCiriloId ||
      inboxItem.senderCiriloId ||
      inboxItem.sharedByCiriloId ||
      inboxItem.sharedBy ||
      '',

    isReceivedShared: false,
    lockedForRecipient: false,
    receivedSnapshot: false,
    sourceShareId: '',
    threadId: '',

    organizerUid: uid,
    organizerCiriloId: '',
    originalSenderUid: '',
    originalSenderCiriloId: '',
    senderUid: '',
    senderCiriloId: '',
    senderName: '',
    senderPhotoURL: '',
    forwardedByCiriloId: '',

    closed: false,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return id
}

export async function createSharedNoteLink({
  sender,
  recipientEmail,
  payload,
}) {
  const email = (recipientEmail || '').trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    throw new Error('Invalid email address.')
  }

  const thread = await createThreadIfNeeded({ sender, payload })
  const token = secureToken()

  await setDoc(doc(db, 'sharedNotes', token), {
    token,
    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId,
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',

    originalSenderUid: thread.originalSenderUid,
    originalSenderCiriloId: thread.originalSenderCiriloId,
    forwardedByCiriloId: thread.isForward ? sender.ciriloId : '',
    organizerUid: thread.organizerUid,
    organizerCiriloId: thread.organizerCiriloId,
    sharePolicy: thread.sharePolicy,
    threadId: thread.threadId,

    recipientEmail: email,
    payload: thread.sourceSnapshot,
    revoked: false,
    createdAt: serverTimestamp(),
  })

  return {
    token,
    recipientEmail: email,
    sharePolicy: thread.sharePolicy,
    threadId: thread.threadId,
    shareUrl:
      `${window.location.origin}/?sharedNote=${encodeURIComponent(token)}`,
  }
}

export function openNoteEmailClient({ senderName, share }) {
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

export function subscribeSharedThread(threadId, callback, onError) {
  if (!threadId) return () => {}

  const unsubThread = onSnapshot(
    threadRef(threadId),
    (snapshot) => {
      callback({
        thread: snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null,
      })
    },
    onError
  )

  const unsubReplies = onSnapshot(
    repliesCollection(threadId),
    (snapshot) => {
      const replies = snapshot.docs
        .map((reply) => ({ id: reply.id, ...reply.data() }))
        .sort((a, b) => {
          const av = a.createdAt?.toMillis?.() || 0
          const bv = b.createdAt?.toMillis?.() || 0
          return av - bv
        })

      callback({ replies })
    },
    onError
  )

  return () => {
    unsubThread()
    unsubReplies()
  }
}

export async function addSharedReply({
  threadId,
  sender,
  text,
}) {
  const cleanText = (text || '').trim()

  if (!threadId || !sender?.uid || !cleanText) {
    throw new Error('Missing reply information.')
  }

  const threadSnapshot = await getDoc(threadRef(threadId))

  if (!threadSnapshot.exists()) {
    throw new Error('Shared conversation not found.')
  }

  const thread = threadSnapshot.data()

  if (thread.closed) {
    throw new Error('This conversation is closed.')
  }

  await addDoc(repliesCollection(threadId), {
    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId || '',
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',
    text: cleanText,
    createdAt: serverTimestamp(),
  })

  await updateDoc(threadRef(threadId), {
    updatedAt: serverTimestamp(),
  })
}

export async function closeSharedThread({
  threadId,
  currentUid,
  currentCiriloId,
}) {
  if (!threadId || !currentUid) {
    throw new Error('Missing conversation information.')
  }

  const snapshot = await getDoc(threadRef(threadId))

  if (!snapshot.exists()) {
    throw new Error('Shared conversation not found.')
  }

  const thread = { id: snapshot.id, ...snapshot.data() }

  if (!canClose(thread, currentUid)) {
    throw new Error('Only the organizer can close this conversation.')
  }

  await updateDoc(threadRef(threadId), {
    closed: true,
    closedByUid: currentUid,
    closedByCiriloId: currentCiriloId || '',
    closedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function syncDueNoteReminders(uid) {
  if (!uid) return

  const snapshot = await getDocs(NOTES_COLLECTION(uid))
  const today = isoDay()

  for (const noteDoc of snapshot.docs) {
    const data = noteDoc.data()

    // Received snapshots are immutable and never generate local reminder mutations.
    if (data.isReceivedShared || data.lockedForRecipient) continue

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

      addDoc(inboxCollection(uid), {
        type: 'note_reminder',
        status: 'new',
        noteId: noteDoc.id,
        noteTitle: data.title || 'Your list',
        universe: data.universe || 'personal',
        noteItem: item,
        createdAt: serverTimestamp(),
      })

      return {
        ...item,
        lastRemindedAt: today,
        nextReminderAt: addMonthsISO(today, 1),
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
