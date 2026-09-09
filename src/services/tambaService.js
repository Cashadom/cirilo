import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { db, storage } from '../firebase'

function jobCollection(uid) {
  return collection(db, 'users', uid, 'tambaJobs')
}

function templateCollection(uid) {
  return collection(db, 'users', uid, 'tambaTemplates')
}

function cleanChecklist(checklist = []) {
  return checklist
    .map(item => ({
      id: item.id || crypto.randomUUID(),
      text: String(item.text || '').trim(),
      completed: Boolean(item.completed),
    }))
    .filter(item => item.text)
}

function normalizeCiriloId(value = '') {
  return String(value || '').trim().toLowerCase()
}

export function subscribeToTambaJobs(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    jobCollection(uid),
    snapshot => {
      onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() })))
    },
    onError
  )
}

export function subscribeToTambaTemplates(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    templateCollection(uid),
    snapshot => {
      const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      onData(rows)
    },
    onError
  )
}

export async function resolveCiriloUser(ciriloId) {
  const normalized = normalizeCiriloId(ciriloId)
  if (!/^cirilo_\d{6}$/i.test(normalized)) {
    throw new Error(`Invalid Cirilo ID: ${normalized || 'empty'}`)
  }

  const snapshot = await getDoc(doc(db, 'publicUsers', normalized))
  if (!snapshot.exists()) {
    throw new Error(`Cirilo ID ${normalized} was not found.`)
  }

  const data = snapshot.data()
  return {
    uid: data.uid || '',
    ciriloId: normalized,
    displayName: data.displayName || 'Cirilo user',
    photoURL: data.photoURL || '',
  }
}

function cleanJobPayload({ ownerUid, ownerCiriloId, job }) {
  return {
    title: String(job.title || '').trim(),
    client: String(job.client || '').trim(),
    location: String(job.location || '').trim(),
    date: job.date || '',
    startTime: job.startTime || '',
    endTime: job.endTime || '',

    // Legacy fields stay readable, but sharing no longer depends on one assignee.
    assignedToCiriloId: '',
    assignedToUid: '',
    assignedToName: '',

    status: job.status || 'scheduled',
    checklist: cleanChecklist(job.checklist),
    notes: String(job.notes || '').trim(),
    proofPhotoUrl: job.proofPhotoUrl || '',
    sourceTemplateId: job.sourceTemplateId || '',
    sourceTemplateName: job.sourceTemplateName || '',
    createdByUid: job.createdByUid || ownerUid,
    createdByCiriloId: job.createdByCiriloId || ownerCiriloId || '',
    archived: Boolean(job.archived),
    archivedAt: job.archivedAt || null,
    createdAt: job.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export async function saveTambaJob({ ownerUid, ownerCiriloId, job }) {
  if (!ownerUid) throw new Error('Missing owner UID.')

  const jobId = job.id || crypto.randomUUID()
  const payload = cleanJobPayload({ ownerUid, ownerCiriloId, job })

  await setDoc(
    doc(db, 'users', ownerUid, 'tambaJobs', jobId),
    payload,
    { merge: true }
  )

  return { id: jobId, ...payload }
}

function buildInboxTambaShare({ sender, recipient, job }) {
  return {
    type: 'tamba_share',
    status: 'new',

    senderUid: sender.uid,
    senderCiriloId: sender.ciriloId || '',
    senderName: sender.displayName || 'Cirilo user',
    senderPhotoURL: sender.photoURL || '',

    originalSenderUid: sender.uid,
    originalSenderCiriloId: sender.ciriloId || '',

    recipientUid: recipient.uid,
    recipientCiriloId: recipient.ciriloId,

    title: job.title || 'Field Work',
    message: job.notes || '',
    sharePolicy: 'private',
    closed: false,

    tambaJob: {
      sourceJobId: job.id,
      sourceOwnerUid: sender.uid,
      sourceOwnerCiriloId: sender.ciriloId || '',
      title: String(job.title || '').trim(),
      client: String(job.client || '').trim(),
      location: String(job.location || '').trim(),
      date: job.date || '',
      startTime: job.startTime || '09:00',
      endTime: job.endTime || '10:00',
      checklist: cleanChecklist(job.checklist),
      notes: String(job.notes || '').trim(),
      proofPhotoUrl: job.proofPhotoUrl || '',
      sharedSnapshot: true,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export async function shareTambaJobToCiriloMany({
  senderUid,
  senderCiriloId,
  senderName,
  senderPhotoURL,
  recipientCiriloIds,
  job,
}) {
  if (!senderUid) throw new Error('Missing sender account.')
  if (!job?.id) throw new Error('Save the job before sharing it.')

  const cleanIds = [...new Set(
    (recipientCiriloIds || []).map(normalizeCiriloId).filter(Boolean)
  )]

  if (!cleanIds.length) throw new Error('Choose at least one person.')

  const recipients = await Promise.all(cleanIds.map(resolveCiriloUser))

  const sender = {
    uid: senderUid,
    ciriloId: normalizeCiriloId(senderCiriloId),
    displayName: senderName || 'Cirilo user',
    photoURL: senderPhotoURL || '',
  }

  const validRecipients = recipients.filter(recipient => recipient.uid && recipient.uid !== senderUid)

  if (!validRecipients.length) {
    throw new Error('Choose at least one other Cirilo user.')
  }

  await Promise.all(
    validRecipients.map(recipient =>
      addDoc(
        collection(db, 'users', recipient.uid, 'inbox'),
        buildInboxTambaShare({ sender, recipient, job })
      )
    )
  )

  return validRecipients
}

export async function acceptTambaInboxJob({ uid, ciriloId, inboxItem }) {
  if (!uid) throw new Error('Missing user UID.')
  if (!inboxItem?.tambaJob) throw new Error('Field Work job is missing.')

  const source = inboxItem.tambaJob
  const localId = source.sourceJobId
    ? `received_${source.sourceJobId}_${inboxItem.id || crypto.randomUUID()}`
    : crypto.randomUUID()

  const payload = {
    title: String(source.title || inboxItem.title || 'Field Work').trim(),
    client: String(source.client || '').trim(),
    location: String(source.location || '').trim(),
    date: source.date || '',
    startTime: source.startTime || '09:00',
    endTime: source.endTime || '10:00',
    assignedToCiriloId: '',
    assignedToUid: '',
    assignedToName: '',
    status: 'scheduled',
    checklist: cleanChecklist(source.checklist),
    notes: String(source.notes || '').trim(),
    proofPhotoUrl: source.proofPhotoUrl || '',
    sourceOwnerUid: source.sourceOwnerUid || inboxItem.senderUid || '',
    sourceOwnerCiriloId: source.sourceOwnerCiriloId || inboxItem.senderCiriloId || '',
    sourceJobId: source.sourceJobId || '',
    createdByUid: inboxItem.senderUid || '',
    createdByCiriloId: inboxItem.senderCiriloId || '',
    receivedFromInboxId: inboxItem.id || '',
    localCopy: true,
    archived: false,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', uid, 'tambaJobs', localId), payload, { merge: true })

  return { id: localId, ...payload }
}

export async function archiveTambaJob(uid, job) {
  if (!uid || !job?.id) throw new Error('Job could not be archived.')

  await updateDoc(doc(db, 'users', uid, 'tambaJobs', job.id), {
    archived: true,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function restoreTambaJob(uid, job) {
  if (!uid || !job?.id) throw new Error('Job could not be restored.')

  await updateDoc(doc(db, 'users', uid, 'tambaJobs', job.id), {
    archived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  })
}

export async function updateTambaJobStatus({ currentUid, job, status }) {
  const payload = {
    status,
    checklist: cleanChecklist(job.checklist),
    notes: String(job.notes || '').trim(),
    proofPhotoUrl: job.proofPhotoUrl || '',
    updatedAt: serverTimestamp(),
  }

  if (status === 'in_progress') payload.startedAt = serverTimestamp()
  if (status === 'completed') payload.completedAt = serverTimestamp()

  await updateDoc(doc(db, 'users', currentUid, 'tambaJobs', job.id), payload)
}

export async function deleteTambaJob(uid, job) {
  if (!uid || !job?.id) return
  await deleteDoc(doc(db, 'users', uid, 'tambaJobs', job.id))
}

export async function saveTambaTemplate(uid, template) {
  const templateId = template.id || crypto.randomUUID()
  const payload = {
    name: String(template.name || '').trim(),
    description: String(template.description || '').trim(),
    checklist: (template.checklist || [])
      .map(item => ({
        id: item.id || crypto.randomUUID(),
        text: String(item.text || '').trim(),
      }))
      .filter(item => item.text),
    createdAt: template.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(
    doc(db, 'users', uid, 'tambaTemplates', templateId),
    payload,
    { merge: true }
  )

  return { id: templateId, ...payload }
}

export async function deleteTambaTemplate(uid, templateId) {
  await deleteDoc(doc(db, 'users', uid, 'tambaTemplates', templateId))
}

export function makeJobFromTemplate(template, today) {
  return {
    id: crypto.randomUUID(),
    title: template?.name || '',
    client: '',
    location: '',
    date: today,
    startTime: '09:00',
    endTime: '10:00',
    assignedToCiriloId: '',
    assignedToUid: '',
    assignedToName: '',
    status: 'scheduled',
    checklist: (template?.checklist || []).map(item => ({
      id: crypto.randomUUID(),
      text: item.text || '',
      completed: false,
    })),
    notes: template?.description || '',
    proofPhotoUrl: '',
    sourceTemplateId: template?.id || '',
    sourceTemplateName: template?.name || '',
    archived: false,
  }
}

export async function uploadTambaProofPhoto(uid, jobId, file) {
  if (!uid || !jobId || !file) throw new Error('Missing upload information.')
  if (!file.type?.startsWith('image/')) throw new Error('Please select an image file.')
  if (file.size > 8 * 1024 * 1024) throw new Error('Image must be smaller than 8 MB.')

  const extension = file.name?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
  const storageRef = ref(storage, `users/${uid}/tamba/${jobId}/proof-${Date.now()}.${extension}`)

  await uploadBytes(storageRef, file, { contentType: file.type })
  return getDownloadURL(storageRef)
}
