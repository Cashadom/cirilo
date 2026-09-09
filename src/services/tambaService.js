import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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

function recipientEventId(ownerUid, jobId) {
  return `tamba_${ownerUid}_${jobId}`
}

function recipientInboxId(ownerUid, jobId) {
  return `tamba_${ownerUid}_${jobId}`
}

export function subscribeToTambaJobs(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    jobCollection(uid),
    snapshot => {
      const rows = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      onData(rows)
    },
    onError
  )
}

export function subscribeToTambaTemplates(uid, onData, onError) {
  if (!uid) return () => {}

  return onSnapshot(
    templateCollection(uid),
    snapshot => {
      const rows = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      rows.sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''))
      )
      onData(rows)
    },
    onError
  )
}

export async function resolveCiriloUser(ciriloId) {
  const normalized = String(ciriloId || '').trim()
  if (!normalized) return null

  const idsQuery = query(
    collection(db, 'publicUsers'),
    where('ciriloId', '==', normalized)
  )

  const snapshot = await getDocs(idsQuery)
  if (snapshot.empty) return null

  const hit = snapshot.docs[0]

  return {
    uid: hit.id,
    ...hit.data(),
  }
}

function buildRecipientEvent({
  ownerUid,
  ownerCiriloId,
  assignee,
  jobId,
  payload,
}) {
  return {
    title: payload.title || 'Tamba Field Work',
    category: 'tasks',
    type: 'event',
    date: payload.date,
    startTime: payload.startTime || '09:00',
    endTime: payload.endTime || '10:00',
    location: payload.location || '',
    people: ownerCiriloId || '',
    notes: [
      payload.client ? `Client / place: ${payload.client}` : '',
      payload.notes || '',
      ...(payload.checklist || []).map(item => `• ${item.text}`),
    ]
      .filter(Boolean)
      .join('\n'),
    reminder: '15 min before',
    priority: 'normal',
    completed: false,
    visibility: 'private',

    isSharedEvent: true,
    lockedForRecipient: true,
    tambaAutoAssigned: true,

    assignedToUid: assignee.uid,
    assignedToCiriloId: payload.assignedToCiriloId,

    createdByUid: ownerUid,
    createdByCiriloId: ownerCiriloId || '',
    sharedBy: ownerCiriloId || '',
    sharedByCiriloId: ownerCiriloId || '',

    sourceTambaJobId: jobId,
    sourceOwnerUid: ownerUid,

    updatedAt: serverTimestamp(),
  }
}

function buildInboxShare({
  ownerUid,
  ownerCiriloId,
  assignee,
  jobId,
  payload,
}) {
  return {
    type: 'tamba_share',
    status: 'new',

    senderUid: ownerUid,
    senderCiriloId: ownerCiriloId || '',
    originalSenderUid: ownerUid,
    originalSenderCiriloId: ownerCiriloId || '',

    recipientUid: assignee.uid,
    recipientCiriloId: payload.assignedToCiriloId,

    title: payload.title || 'Tamba Field Work',
    message: payload.notes || '',
    sharePolicy: 'private',
    closed: false,

    tambaJob: {
      sourceJobId: jobId,
      sourceOwnerUid: ownerUid,
      sourceOwnerCiriloId: ownerCiriloId || '',
      title: payload.title,
      client: payload.client,
      location: payload.location,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      checklist: payload.checklist,
      notes: payload.notes,
      proofPhotoUrl: payload.proofPhotoUrl,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export async function saveTambaJob({
  ownerUid,
  ownerCiriloId,
  job,
}) {
  if (!ownerUid) {
    throw new Error('Missing owner UID.')
  }

  const requestedCiriloId = String(job.assignedToCiriloId || '').trim()
  const assignee = requestedCiriloId
    ? await resolveCiriloUser(requestedCiriloId)
    : null

  if (requestedCiriloId && !assignee) {
    throw new Error(`Cirilo ID ${requestedCiriloId} was not found.`)
  }

  const previousAssigneeUid = job.assignedToUid || ''
  const jobId = job.id || crypto.randomUUID()

  const payload = {
    title: String(job.title || '').trim(),
    client: String(job.client || '').trim(),
    location: String(job.location || '').trim(),
    date: job.date || '',
    startTime: job.startTime || '',
    endTime: job.endTime || '',

    assignedToCiriloId: requestedCiriloId,
    assignedToUid: assignee?.uid || '',
    assignedToName: assignee?.displayName || '',

    status: job.status || 'scheduled',
    checklist: cleanChecklist(job.checklist),
    notes: String(job.notes || '').trim(),
    proofPhotoUrl: job.proofPhotoUrl || '',

    sourceTemplateId: job.sourceTemplateId || '',
    sourceTemplateName: job.sourceTemplateName || '',

    createdByUid: job.createdByUid || ownerUid,
    createdByCiriloId: job.createdByCiriloId || ownerCiriloId || '',

    archived: false,
    archivedAt: null,

    createdAt: job.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const ownerRef = doc(db, 'users', ownerUid, 'tambaJobs', jobId)

  // Always save the creator's Tamba job first.
  await setDoc(ownerRef, payload, { merge: true })

  // Remove old recipient agenda entry if assignment changed or was cleared.
  if (
    previousAssigneeUid &&
    previousAssigneeUid !== assignee?.uid &&
    previousAssigneeUid !== ownerUid
  ) {
    await deleteDoc(
      doc(
        db,
        'users',
        previousAssigneeUid,
        'events',
        recipientEventId(ownerUid, jobId)
      )
    ).catch(() => {})

    await deleteDoc(
      doc(
        db,
        'users',
        previousAssigneeUid,
        'inbox',
        recipientInboxId(ownerUid, jobId)
      )
    ).catch(() => {})
  }

  // If a Cirilo ID is provided:
  // 1) send it to the recipient Inbox
  // 2) automatically put it in the recipient Cirilo agenda
  if (assignee && assignee.uid !== ownerUid) {
    await setDoc(
      doc(
        db,
        'users',
        assignee.uid,
        'inbox',
        recipientInboxId(ownerUid, jobId)
      ),
      buildInboxShare({
        ownerUid,
        ownerCiriloId,
        assignee,
        jobId,
        payload,
      }),
      { merge: true }
    )

    await setDoc(
      doc(
        db,
        'users',
        assignee.uid,
        'events',
        recipientEventId(ownerUid, jobId)
      ),
      buildRecipientEvent({
        ownerUid,
        ownerCiriloId,
        assignee,
        jobId,
        payload,
      }),
      { merge: true }
    )
  }

  return {
    id: jobId,
    ...payload,
  }
}

export async function acceptTambaInboxJob({
  uid,
  ciriloId,
  inboxItem,
}) {
  if (!uid) throw new Error('Missing user UID.')
  if (!inboxItem?.tambaJob) throw new Error('Tamba job is missing.')

  const source = inboxItem.tambaJob
  const localId = source.sourceJobId
    ? `received_${source.sourceJobId}`
    : crypto.randomUUID()

  const payload = {
    title: String(source.title || inboxItem.title || 'Tamba Field Work').trim(),
    client: String(source.client || '').trim(),
    location: String(source.location || '').trim(),
    date: source.date || '',
    startTime: source.startTime || '09:00',
    endTime: source.endTime || '10:00',

    assignedToCiriloId: ciriloId || '',
    assignedToUid: uid,
    assignedToName: '',

    status: 'scheduled',
    checklist: cleanChecklist(source.checklist),
    notes: String(source.notes || '').trim(),
    proofPhotoUrl: source.proofPhotoUrl || '',

    sourceOwnerUid:
      source.sourceOwnerUid ||
      inboxItem.senderUid ||
      inboxItem.originalSenderUid ||
      '',
    sourceOwnerCiriloId:
      source.sourceOwnerCiriloId ||
      inboxItem.senderCiriloId ||
      inboxItem.originalSenderCiriloId ||
      '',
    sourceJobId: source.sourceJobId || '',

    createdByUid:
      inboxItem.senderUid ||
      inboxItem.originalSenderUid ||
      '',
    createdByCiriloId:
      inboxItem.senderCiriloId ||
      inboxItem.originalSenderCiriloId ||
      '',

    receivedFromInboxId: inboxItem.id || '',
    localCopy: true,

    archived: false,
    archivedAt: null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(
    doc(db, 'users', uid, 'tambaJobs', localId),
    payload,
    { merge: true }
  )

  return {
    id: localId,
    ...payload,
  }
}

export async function archiveTambaJob(uid, job) {
  if (!uid || !job?.id) {
    throw new Error('Job could not be archived.')
  }

  await updateDoc(
    doc(db, 'users', uid, 'tambaJobs', job.id),
    {
      archived: true,
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  )

  // Remove the automatic recipient calendar copy when the creator archives it.
  if (job.assignedToUid && job.assignedToUid !== uid) {
    await deleteDoc(
      doc(
        db,
        'users',
        job.assignedToUid,
        'events',
        recipientEventId(uid, job.id)
      )
    ).catch(() => {})
  }
}

export async function restoreTambaJob(uid, job) {
  if (!uid || !job?.id) {
    throw new Error('Job could not be restored.')
  }

  await updateDoc(
    doc(db, 'users', uid, 'tambaJobs', job.id),
    {
      archived: false,
      archivedAt: null,
      updatedAt: serverTimestamp(),
    }
  )
}

export async function updateTambaJobStatus({
  currentUid,
  job,
  status,
}) {
  const payload = {
    status,
    checklist: cleanChecklist(job.checklist),
    notes: String(job.notes || '').trim(),
    proofPhotoUrl: job.proofPhotoUrl || '',
    updatedAt: serverTimestamp(),
  }

  if (status === 'in_progress') {
    payload.startedAt = serverTimestamp()
  }

  if (status === 'completed') {
    payload.completedAt = serverTimestamp()
  }

  await updateDoc(
    doc(db, 'users', currentUid, 'tambaJobs', job.id),
    payload
  )
}

export async function deleteTambaJob(uid, job) {
  if (!uid || !job?.id) return

  await deleteDoc(
    doc(db, 'users', uid, 'tambaJobs', job.id)
  )

  if (job.assignedToUid && job.assignedToUid !== uid) {
    await deleteDoc(
      doc(
        db,
        'users',
        job.assignedToUid,
        'events',
        recipientEventId(uid, job.id)
      )
    ).catch(() => {})

    await deleteDoc(
      doc(
        db,
        'users',
        job.assignedToUid,
        'inbox',
        recipientInboxId(uid, job.id)
      )
    ).catch(() => {})
  }
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

  return {
    id: templateId,
    ...payload,
  }
}

export async function deleteTambaTemplate(uid, templateId) {
  await deleteDoc(
    doc(db, 'users', uid, 'tambaTemplates', templateId)
  )
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
  if (!uid || !jobId || !file) {
    throw new Error('Missing upload information.')
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error('Please select an image file.')
  }

  const maxBytes = 8 * 1024 * 1024

  if (file.size > maxBytes) {
    throw new Error('Image must be smaller than 8 MB.')
  }

  const extension =
    file.name?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'

  const storageRef = ref(
    storage,
    `users/${uid}/tamba/${jobId}/proof-${Date.now()}.${extension}`
  )

  await uploadBytes(storageRef, file, {
    contentType: file.type,
  })

  return getDownloadURL(storageRef)
}
