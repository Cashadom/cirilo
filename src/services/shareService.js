import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getSharePolicy } from './sharePermissions'

const CIRILO_ID_RE = /^cirilo_\d{6,10}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function createSecureToken() {
  return (
    crypto.randomUUID().replaceAll('-', '') +
    crypto.randomUUID().replaceAll('-', '')
  )
}

function normalizeCiriloId(value) {
  return (value || '').trim().toLowerCase()
}

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase()
}

async function resolveSender({
  uid,
  ciriloId,
  displayName,
  photoURL,
}) {
  let resolvedCiriloId = normalizeCiriloId(ciriloId)
  let resolvedDisplayName = displayName || ''
  let resolvedPhotoURL = photoURL || ''

  if (uid) {
    const userSnap = await getDoc(doc(db, 'users', uid))

    if (userSnap.exists()) {
      const data = userSnap.data()

      if (!CIRILO_ID_RE.test(resolvedCiriloId)) {
        resolvedCiriloId = normalizeCiriloId(data.ciriloId)
      }

      if (!resolvedDisplayName) {
        resolvedDisplayName = data.displayName || ''
      }

      if (!resolvedPhotoURL) {
        resolvedPhotoURL = data.photoURL || ''
      }
    }
  }

  if (CIRILO_ID_RE.test(resolvedCiriloId) && !resolvedPhotoURL) {
    const publicSnap = await getDoc(
      doc(db, 'publicUsers', resolvedCiriloId)
    )

    if (publicSnap.exists()) {
      const data = publicSnap.data()

      if (!resolvedDisplayName) {
        resolvedDisplayName = data.displayName || ''
      }

      if (!resolvedPhotoURL) {
        resolvedPhotoURL = data.photoURL || ''
      }
    }
  }

  if (!CIRILO_ID_RE.test(resolvedCiriloId)) {
    throw new Error('Your Cirilo ID could not be resolved.')
  }

  return {
    uid,
    ciriloId: resolvedCiriloId,
    displayName: resolvedDisplayName || 'Cirilo user',
    photoURL: resolvedPhotoURL || '',
  }
}

export function parseCiriloRecipients(value = '') {
  return [
    ...new Set(
      value
        .split(/[,\n;]+/)
        .map(normalizeCiriloId)
        .filter(Boolean)
    ),
  ]
}

export function parseEmailRecipients(value = '') {
  return [
    ...new Set(
      value
        .split(/[,\n;]+/)
        .map(normalizeEmail)
        .filter(Boolean)
    ),
  ]
}

export function validateCiriloRecipients(ids = []) {
  return ids.every((id) => CIRILO_ID_RE.test(id))
}

export function validateEmailRecipients(emails = []) {
  return emails.every((email) => EMAIL_RE.test(email))
}

export async function resolveCiriloId(ciriloId) {
  const cleanId = normalizeCiriloId(ciriloId)

  if (!CIRILO_ID_RE.test(cleanId)) {
    throw new Error(`Invalid Cirilo ID: ${cleanId || 'empty'}`)
  }

  const snapshot = await getDoc(doc(db, 'publicUsers', cleanId))

  if (!snapshot.exists()) {
    throw new Error(`Cirilo ID not found: ${cleanId}`)
  }

  return snapshot.data()
}

function eventSnapshot(event, sender) {
  const sharePolicy = getSharePolicy(event)

  return {
    title: event.title,
    category: event.category,
    type: event.type || 'event',
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location || '',
    notes: event.notes || '',
    reminder: event.reminder || '15 min before',
    priority: event.priority || 'normal',
    visibility: event.visibility || 'private',
    sharePolicy,

    createdByUid: event.createdByUid || sender.uid,
    createdByCiriloId:
      event.createdByCiriloId || sender.ciriloId,
    createdByName: event.createdByName || sender.displayName,
    createdByPhotoURL:
      event.createdByPhotoURL || sender.photoURL,

    originalSenderUid:
      event.originalSenderUid || event.createdByUid || sender.uid,
    originalSenderCiriloId:
      event.originalSenderCiriloId ||
      event.createdByCiriloId ||
      sender.ciriloId,

    invitedCiriloIds: event.invitedCiriloIds || [],
    invitedEmails: event.invitedEmails || [],
  }
}

export async function shareEventToCirilo({
  senderUid,
  senderCiriloId,
  senderName,
  senderPhotoURL,
  recipientCiriloId,
  event,
}) {
  const sender = await resolveSender({
    uid: senderUid,
    ciriloId: senderCiriloId,
    displayName: senderName,
    photoURL: senderPhotoURL,
  })

  const cleanRecipientId = normalizeCiriloId(recipientCiriloId)
  const recipient = await resolveCiriloId(cleanRecipientId)

  if (recipient.uid === sender.uid) {
    throw new Error('You cannot send an invitation to yourself.')
  }

  const snapshot = eventSnapshot(event, sender)

  const payload = {
    type: 'event_share',

    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId,
    senderName: sender.displayName,
    senderPhotoURL: sender.photoURL,

    originalSenderUid: snapshot.originalSenderUid,
    originalSenderCiriloId: snapshot.originalSenderCiriloId,
    forwardedByCiriloId:
      snapshot.originalSenderCiriloId !== sender.ciriloId
        ? sender.ciriloId
        : '',

    recipientCiriloId: cleanRecipientId,
    status: 'new',
    sharePolicy: snapshot.sharePolicy,
    receivedSnapshot: true,
    event: snapshot,
    createdAt: serverTimestamp(),
  }

  const inviteRef = await addDoc(
    collection(db, 'users', recipient.uid, 'inbox'),
    payload
  )

  return {
    inviteId: inviteRef.id,
    recipientCiriloId: cleanRecipientId,
    recipient,
  }
}

export async function shareEventToCiriloMany({
  senderUid,
  senderCiriloId,
  senderName,
  senderPhotoURL,
  recipientCiriloIds,
  event,
}) {
  const cleanIds = [
    ...new Set(
      (recipientCiriloIds || [])
        .map(normalizeCiriloId)
        .filter(Boolean)
    ),
  ]

  if (!validateCiriloRecipients(cleanIds)) {
    throw new Error('One or more Cirilo IDs are invalid.')
  }

  return Promise.all(
    cleanIds.map((recipientCiriloId) =>
      shareEventToCirilo({
        senderUid,
        senderCiriloId,
        senderName,
        senderPhotoURL,
        recipientCiriloId,
        event,
      })
    )
  )
}

export async function shareToCiriloId({ sender, ciriloId, event }) {
  if (!sender?.uid) {
    throw new Error('Missing sender account.')
  }

  return shareEventToCirilo({
    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId,
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',
    recipientCiriloId: ciriloId,
    event,
  })
}

export async function createEmailShare({
  sender,
  recipientEmail,
  event,
}) {
  const email = normalizeEmail(recipientEmail)

  if (!EMAIL_RE.test(email)) {
    throw new Error(`Invalid email address: ${email || 'empty'}`)
  }

  if (!sender?.uid) {
    throw new Error('Missing sender account.')
  }

  const resolvedSender = await resolveSender({
    uid: sender.uid,
    ciriloId: sender.ciriloId,
    displayName: sender.displayName,
    photoURL: sender.photoURL,
  })

  const token = createSecureToken()
  const snapshot = eventSnapshot(event, resolvedSender)

  await setDoc(doc(db, 'sharedCards', token), {
    token,

    senderUid: resolvedSender.uid,
    senderCiriloId: resolvedSender.ciriloId,
    senderName: resolvedSender.displayName,
    senderPhotoURL: resolvedSender.photoURL,

    originalSenderUid: snapshot.originalSenderUid,
    originalSenderCiriloId: snapshot.originalSenderCiriloId,
    sharePolicy: snapshot.sharePolicy,

    recipientEmail: email,
    visibility: snapshot.visibility,
    revoked: false,
    event: snapshot,
    createdAt: serverTimestamp(),
  })

  const shareUrl =
    `${window.location.origin}/?share=${encodeURIComponent(token)}`

  return {
    token,
    shareUrl,
    recipientEmail: email,
  }
}

export async function createEmailSharesMany({
  sender,
  recipientEmails,
  event,
}) {
  const cleanEmails = [
    ...new Set(
      (recipientEmails || [])
        .map(normalizeEmail)
        .filter(Boolean)
    ),
  ]

  if (!validateEmailRecipients(cleanEmails)) {
    throw new Error('One or more email addresses are invalid.')
  }

  return Promise.all(
    cleanEmails.map((recipientEmail) =>
      createEmailShare({
        sender,
        recipientEmail,
        event,
      })
    )
  )
}

export function openEmailClientForShares({
  senderName,
  event,
  shares,
}) {
  if (!shares?.length) return

  const recipients = shares
    .map((share) => share.recipientEmail)
    .join(',')

  const subject = encodeURIComponent(
    `${senderName || 'Someone'} shared an event with you on Cirilo`
  )

  const links = shares
    .map((share) => `${share.recipientEmail}: ${share.shareUrl}`)
    .join('\n')

  const body = encodeURIComponent(
    `${senderName || 'Someone'} shared an event with you.\n\n` +
      `${event.title}\n` +
      `${event.date} · ${event.startTime} — ${event.endTime}\n\n` +
      `Open the Cirilo card:\n${links}\n\n` +
      `No Cirilo account is required to view the card.`
  )

  window.location.href =
    `mailto:${encodeURIComponent(recipients)}` +
    `?subject=${subject}&body=${body}`
}
