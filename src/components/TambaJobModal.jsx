import React, { useEffect, useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import {
  Archive,
  CalendarPlus,
  Camera,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  MapPin,
  MessageCircle,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import '../tamba.css'
import SharePicker from './SharePicker'
import { useAuth } from '../context/AuthContext'
import { shareTambaJobToCiriloMany } from '../services/tambaService'
import { touchSharedContacts } from '../services/contactService'

function newChecklistItem(text = '') {
  return {
    id: crypto.randomUUID(),
    text,
    completed: false,
  }
}

function normalizeJob(draft, today) {
  return {
    id: draft?.id || crypto.randomUUID(),
    title: draft?.title || '',
    client: draft?.client || '',
    location: draft?.location || '',
    date: draft?.date || today,
    startTime: draft?.startTime || '09:00',
    endTime: draft?.endTime || '10:00',
    assignedToCiriloId: draft?.assignedToCiriloId || '',
    assignedToUid: draft?.assignedToUid || '',
    assignedToName: draft?.assignedToName || '',
    status: draft?.status || 'scheduled',
    checklist:
      Array.isArray(draft?.checklist) && draft.checklist.length
        ? draft.checklist.map(item => ({
            id: item.id || crypto.randomUUID(),
            text: item.text || '',
            completed: Boolean(item.completed),
          }))
        : [newChecklistItem()],
    notes: draft?.notes || '',
    proofPhotoUrl: draft?.proofPhotoUrl || '',
    sourceTemplateId: draft?.sourceTemplateId || '',
    sourceTemplateName: draft?.sourceTemplateName || '',
    createdByUid: draft?.createdByUid || '',
    createdByCiriloId: draft?.createdByCiriloId || '',
    createdAt: draft?.createdAt || null,
    archived: Boolean(draft?.archived),
    archivedAt: draft?.archivedAt || null,
  }
}

function safeFileName(value = 'tamba-job') {
  return (
    String(value || 'tamba-job')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'tamba-job'
  )
}

function buildShareText(job) {
  const checklist = (job.checklist || [])
    .filter(item => String(item.text || '').trim())
    .map(item => `${item.completed ? '✓' : '○'} ${item.text.trim()}`)
    .join('\n')

  return [
    'Tamba Field Work',
    '',
    job.title || 'Job',
    job.client ? `Client / place: ${job.client}` : '',
    job.location ? `Location: ${job.location}` : '',
    job.date ? `Date: ${job.date}` : '',
    job.startTime || job.endTime
      ? `Time: ${job.startTime || '--:--'} - ${job.endTime || '--:--'}`
      : '',
    '',
    checklist ? 'Checklist:' : '',
    checklist,
    job.notes ? `\nNotes:\n${job.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export default function TambaJobModal({
  open,
  draft,
  today,
  currentUser,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onStart,
  onComplete,
  onUploadProof,
  onShareCirilo,
  onAddToAgenda,
}) {
  const { profile, firebaseUser } = useAuth()
  const [form, setForm] = useState(() => normalizeJob(draft, today))
  const [shareRecipientIds, setShareRecipientIds] = useState([])
  const [sharePickerOpen, setSharePickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [actionBusy, setActionBusy] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(normalizeJob(draft, today))
      setError('')
      setMessage('')
      setSaving(false)
      setUploading(false)
      setActionBusy('')
      setShareRecipientIds([])
      setSharePickerOpen(false)
    }
  }, [open, draft, today])

  const checklistDone = useMemo(
    () => form.checklist.filter(item => item.completed).length,
    [form.checklist]
  )

  if (!open) return null

  const update = patch => {
    setForm(prev => ({ ...prev, ...patch }))
    setMessage('')
  }

  const cleanPayload = () => ({
    ...form,
    title: form.title.trim(),
    client: form.client.trim(),
    location: form.location.trim(),
    assignedToCiriloId: '',
    assignedToUid: '',
    assignedToName: '',
    notes: form.notes.trim(),
    checklist: form.checklist
      .map(item => ({ ...item, text: item.text.trim() }))
      .filter(item => item.text),
  })

  const validate = () => {
    if (!form.title.trim()) return 'Add a job title.'
    if (!form.date) return 'Choose a date.'
    if (!form.startTime || !form.endTime) return 'Choose a start and end time.'
    if (form.endTime <= form.startTime) return 'End time must be after start time.'
    if (!form.checklist.some(item => item.text.trim())) {
      return 'Add at least one checklist item.'
    }
    return ''
  }

  const updateChecklistItem = (id, patch) => {
    setForm(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }))
  }

  const addChecklistItem = () => {
    setForm(prev => ({
      ...prev,
      checklist: [...prev.checklist, newChecklistItem()],
    }))
  }

  const removeChecklistItem = id => {
    setForm(prev => ({
      ...prev,
      checklist:
        prev.checklist.length === 1
          ? prev.checklist
          : prev.checklist.filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await onSave(cleanPayload())
      if (saved) setForm(prev => ({ ...prev, ...saved }))
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not save this job.')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async nextStatus => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const next = { ...cleanPayload(), status: nextStatus }
      setForm(next)
      if (nextStatus === 'in_progress') await onStart(next)
      if (nextStatus === 'completed') await onComplete(next)
    } catch (err) {
      setError(err?.message || 'Could not update the job status.')
    } finally {
      setSaving(false)
    }
  }

  const uploadProof = async event => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const url = await onUploadProof(form.id, file)
      update({ proofPhotoUrl: url })
    } catch (err) {
      setError(err?.message || 'Could not upload the proof photo.')
    } finally {
      setUploading(false)
    }
  }

  const exportPdf = async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 18
    const contentWidth = pageWidth - margin * 2
    let y = 42

    const statusLabel =
      form.status === 'in_progress'
        ? 'In progress'
        : form.status === 'completed'
        ? 'Completed'
        : 'Scheduled'

    const drawFooter = () => {
      doc.setDrawColor(225, 228, 232)
      doc.setLineWidth(0.3)
      doc.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(115, 122, 130)
      doc.text('More works on www.cirilo.fr', margin, pageHeight - 10)
      doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }

    const newPage = () => {
      drawFooter()
      doc.addPage()
      y = 22
    }

    try {
      const response = await fetch('/logo.png')
      const blob = await response.blob()
      const logoData = await new Promise(resolve => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      })
      if (logoData) doc.addImage(logoData, 'PNG', margin, 12, 35, 11, undefined, 'FAST')
    } catch {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(17)
      doc.setTextColor(25, 28, 32)
      doc.text('cirilo', margin, 21)
    }

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(135, 142, 150)
    doc.text('FIELD WORK REPORT', pageWidth - margin, 18, { align: 'right' })
    doc.setDrawColor(224, 227, 231)
    doc.line(margin, 29, pageWidth - margin, 29)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(21)
    doc.setTextColor(25, 28, 32)
    const titleLines = doc.splitTextToSize(form.title || 'Job', contentWidth)
    doc.text(titleLines, margin, y)
    y += titleLines.length * 8 + 4

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(120, 127, 135)
    doc.text('Job sheet', margin, y)

    doc.setFillColor(247, 248, 249)
    doc.setDrawColor(225, 228, 232)
    doc.roundedRect(pageWidth - margin - 31, y - 5, 31, 8, 3, 3, 'FD')
    doc.setFontSize(8)
    doc.setTextColor(85, 92, 100)
    doc.text(statusLabel, pageWidth - margin - 15.5, y, { align: 'center' })
    y += 13

    const details = [
      ['CLIENT / PLACE', form.client || '—'],
      ['LOCATION', form.location || '—'],
      ['DATE', form.date || '—'],
      ['TIME', `${form.startTime || '--:--'}  —  ${form.endTime || '--:--'}`],
      ['CHECKLIST', `${checklistDone}/${form.checklist.length} completed`],
      ['STATUS', statusLabel],
    ]

    const gap = 8
    const colWidth = (contentWidth - gap) / 2

    details.forEach((detail, index) => {
      const column = index % 2
      const row = Math.floor(index / 2)
      const x = margin + column * (colWidth + gap)
      const boxY = y + row * 19

      doc.setFillColor(250, 250, 250)
      doc.setDrawColor(230, 232, 235)
      doc.roundedRect(x, boxY, colWidth, 15, 2, 2, 'FD')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(145, 151, 158)
      doc.text(detail[0], x + 4, boxY + 5)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(45, 50, 55)
      const value = doc.splitTextToSize(String(detail[1]), colWidth - 8)
      doc.text(value[0] || '—', x + 4, boxY + 11)
    })

    y += 62
    doc.setDrawColor(224, 227, 231)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(35, 39, 44)
    doc.text('Checklist', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(135, 142, 150)
    doc.text(`${checklistDone}/${form.checklist.length} completed`, pageWidth - margin, y, { align: 'right' })
    y += 9

    const items = (form.checklist || []).filter(item => String(item.text || '').trim())

    items.forEach(item => {
      const wrapped = doc.splitTextToSize(item.text.trim(), contentWidth - 16)
      const itemHeight = Math.max(12, wrapped.length * 5 + 6)

      if (y + itemHeight > pageHeight - 28) {
        newPage()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(35, 39, 44)
        doc.text('Checklist continued', margin, y)
        y += 9
      }

      doc.setFillColor(252, 252, 252)
      doc.setDrawColor(229, 232, 235)
      doc.roundedRect(margin, y, contentWidth, itemHeight, 2, 2, 'FD')
      doc.rect(margin + 4, y + 4, 4, 4)

      if (item.completed) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(74, 126, 94)
        doc.text('x', margin + 5.05, y + 7.2)
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(55, 60, 66)
      doc.text(wrapped, margin + 12, y + 7)
      y += itemHeight + 3
    })

    if (form.notes.trim()) {
      if (y + 35 > pageHeight - 28) newPage()
      y += 5
      doc.setDrawColor(224, 227, 231)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(35, 39, 44)
      doc.text('Notes', margin, y)
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(70, 75, 81)

      doc.splitTextToSize(form.notes.trim(), contentWidth - 8).forEach(line => {
        if (y + 5 > pageHeight - 27) newPage()
        doc.text(line, margin + 4, y)
        y += 5
      })
    }

    if (form.proofPhotoUrl) {
      if (y + 65 > pageHeight - 28) newPage()
      y += 5
      doc.setDrawColor(224, 227, 231)
      doc.line(margin, y, pageWidth - margin, y)
      y += 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(35, 39, 44)
      doc.text('Proof photo', margin, y)
      y += 7

      try {
        const response = await fetch(form.proofPhotoUrl)
        const blob = await response.blob()
        const imageData = await new Promise(resolve => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })

        if (imageData) {
          const format = blob.type === 'image/png' ? 'PNG' : 'JPEG'
          doc.addImage(imageData, format, margin, y, Math.min(95, contentWidth), 50, undefined, 'FAST')
        }
      } catch {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(135, 142, 150)
        doc.text('Proof photo attached to the Cirilo job.', margin, y)
      }
    }

    drawFooter()

    doc.setProperties({
      title: form.title || 'Field Work Report',
      subject: 'Cirilo Field Work Report',
      author: 'Cirilo',
      creator: 'Cirilo',
    })

    doc.save(`${safeFileName(form.title)}.pdf`)
  }

  const shareWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(buildShareText(form))}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const shareCirilo = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    if (!shareRecipientIds.length) {
      setError('Choose at least one Cirilo user or team.')
      return
    }

    setActionBusy('cirilo')
    setError('')
    setMessage('')

    try {
      const saved = await onSave(cleanPayload())
      const jobToShare = saved ? { ...cleanPayload(), ...saved } : cleanPayload()

      if (!jobToShare.id) {
        throw new Error('Save the job before sharing it.')
      }

      const recipients = await shareTambaJobToCiriloMany({
        senderUid: firebaseUser?.uid || currentUser?.uid || '',
        senderCiriloId: profile?.ciriloId || currentUser?.ciriloId || '',
        senderName: profile?.displayName || firebaseUser?.displayName || 'Cirilo user',
        senderPhotoURL: profile?.photoURL || firebaseUser?.photoURL || '',
        recipientCiriloIds: shareRecipientIds,
        job: jobToShare,
      })

      await touchSharedContacts(firebaseUser?.uid || currentUser?.uid || '', recipients)

      if (saved) setForm(prev => ({ ...prev, ...saved }))
      setMessage(`Shared to ${recipients.length} Cirilo Inbox${recipients.length > 1 ? 'es' : ''}.`)
      setSharePickerOpen(false)
      setShareRecipientIds([])
    } catch (err) {
      setError(err?.message || 'Could not share this job.')
    } finally {
      setActionBusy('')
    }
  }

  const addAgenda = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setActionBusy('agenda')
    setError('')
    setMessage('')
    try {
      await onAddToAgenda(cleanPayload())
      setMessage('Added to your Cirilo agenda.')
    } catch (err) {
      setError(err?.message || 'Could not add this job to your agenda.')
    } finally {
      setActionBusy('')
    }
  }

  const archive = async () => {
    setActionBusy('archive')
    setError('')
    try {
      await onArchive(cleanPayload())
      onClose()
    } catch (err) {
      setError(err?.message || 'Could not archive this job.')
    } finally {
      setActionBusy('')
    }
  }

  const isCreator =
    !form.createdByUid || form.createdByUid === currentUser?.uid
  const isArchived = Boolean(form.archived)
  const canEditCore = isCreator && form.status !== 'completed' && !isArchived
  const isAssignee =
    Boolean(form.localCopy || form.receivedFromInboxId || form.sourceOwnerUid) ||
    form.assignedToUid === currentUser?.uid ||
    (form.assignedToCiriloId &&
      form.assignedToCiriloId === currentUser?.ciriloId)

  return (
    <div className="modal-backdrop">
      <div className="tamba-job-modal tamba-job-modal-wide">
        <header className="tamba-modal-head">
          <div>
            <span className="eyebrow">Tamba Field Work</span>
            <h2>{isArchived ? 'Archived job' : draft?.id ? 'Job details' : 'New job'}</h2>
            {form.sourceTemplateName && (
              <small>From template · {form.sourceTemplateName}</small>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </header>

        <div className="tamba-status-bar">
          <span className={`tamba-status-pill ${isArchived ? 'archived' : form.status}`}>
            {isArchived
              ? 'Archived'
              : form.status === 'in_progress'
              ? 'In progress'
              : form.status === 'completed'
              ? 'Completed'
              : 'Scheduled'}
          </span>
          <span>
            {checklistDone}/{form.checklist.length} checklist items completed
          </span>
        </div>

        <div className="tamba-modal-layout">
          <div className="tamba-modal-content">
            <div className="modal-grid">
              <label className="field span-2">
                Job title
                <input
                  value={form.title}
                  onChange={event => update({ title: event.target.value })}
                  placeholder="e.g. Office cleaning — 3rd floor"
                  disabled={!canEditCore}
                />
              </label>

              <label className="field">
                Client / place
                <input
                  value={form.client}
                  onChange={event => update({ client: event.target.value })}
                  placeholder="e.g. Hudson Office"
                  disabled={!canEditCore}
                />
              </label>

              <label className="field">
                Location
                <span className="tamba-input-icon">
                  <MapPin size={14} />
                  <input
                    value={form.location}
                    onChange={event => update({ location: event.target.value })}
                    placeholder="Address or meeting point"
                    disabled={!canEditCore}
                  />
                </span>
              </label>

              <label className="field">
                Date
                <input
                  type="date"
                  value={form.date}
                  onChange={event => update({ date: event.target.value })}
                  disabled={!canEditCore}
                />
              </label>

              <label className="field">
                Start
                <span className="tamba-input-icon">
                  <Clock3 size={14} />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={event => update({ startTime: event.target.value })}
                    disabled={!canEditCore}
                  />
                </span>
              </label>

              <label className="field">
                End
                <span className="tamba-input-icon">
                  <Clock3 size={14} />
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={event => update({ endTime: event.target.value })}
                    disabled={!canEditCore}
                  />
                </span>
              </label>
            </div>

            <section className="tamba-checklist-editor">
              <div className="tamba-section-head">
                <div>
                  <strong>Checklist</strong>
                  <small>Each item can be completed independently.</small>
                </div>
                {canEditCore && (
                  <button
                    type="button"
                    className="secondary-btn compact"
                    onClick={addChecklistItem}
                  >
                    <Plus size={14} /> Add item
                  </button>
                )}
              </div>

              <div className="tamba-checklist-list">
                {form.checklist.map((item, index) => (
                  <div className="tamba-checklist-item" key={item.id}>
                    <button
                      type="button"
                      className={`tamba-check ${item.completed ? 'done' : ''}`}
                      onClick={() =>
                        updateChecklistItem(item.id, {
                          completed: !item.completed,
                        })
                      }
                      disabled={isArchived || (!isAssignee && !isCreator)}
                    >
                      {item.completed && <Check size={13} />}
                    </button>
                    <input
                      value={item.text}
                      onChange={event =>
                        updateChecklistItem(item.id, { text: event.target.value })
                      }
                      placeholder={`Checklist item ${index + 1}`}
                      disabled={!canEditCore}
                    />
                    {canEditCore && (
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => removeChecklistItem(item.id)}
                        disabled={form.checklist.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <label className="field tamba-notes-field">
              Notes
              <textarea
                rows={4}
                value={form.notes}
                onChange={event => update({ notes: event.target.value })}
                placeholder="Access instructions, special requests, job details…"
                disabled={isArchived}
              />
            </label>

            <section className="tamba-proof">
              <div className="tamba-section-head">
                <div>
                  <strong>Proof photo</strong>
                  <small>Optional evidence attached to this job.</small>
                </div>
                {!isArchived && (
                  <label className="secondary-btn compact tamba-upload-button">
                    <Camera size={14} />
                    {uploading ? 'Uploading…' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadProof}
                      disabled={uploading}
                      hidden
                    />
                  </label>
                )}
              </div>
              {form.proofPhotoUrl ? (
                <div className="tamba-proof-preview">
                  <img src={form.proofPhotoUrl} alt="Job proof" />
                </div>
              ) : (
                <div className="tamba-proof-empty">No proof photo attached.</div>
              )}
            </section>

            {error && <div className="form-error">{error}</div>}
            {message && <div className="tamba-action-success">{message}</div>}

            <footer className="tamba-modal-footer">
              <div>
                {draft?.id && isCreator && !isArchived && (
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => onDelete(form.id)}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>

              <div className="tamba-modal-actions">
                {!isArchived &&
                  form.status === 'scheduled' &&
                  (isAssignee || isCreator) && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => changeStatus('in_progress')}
                      disabled={saving}
                    >
                      Start job
                    </button>
                  )}

                {!isArchived &&
                  form.status === 'in_progress' &&
                  (isAssignee || isCreator) && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => changeStatus('completed')}
                      disabled={saving}
                    >
                      <CheckCircle2 size={15} /> Complete job
                    </button>
                  )}

                {canEditCore && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={save}
                    disabled={saving}
                  >
                    <Save size={15} />
                    {saving ? 'Saving…' : 'Save job'}
                  </button>
                )}
              </div>
            </footer>
          </div>

          <aside className="tamba-action-rail">
            <div className="tamba-action-rail-title">
              <strong>Actions</strong>
              <small>Export, share or schedule this job.</small>
            </div>

            <button type="button" className="tamba-rail-btn" onClick={exportPdf}>
              <Download size={15} />
              <span>
                <strong>Export PDF</strong>
                <small>Download the job sheet</small>
              </span>
            </button>

            <button type="button" className="tamba-rail-btn" onClick={shareWhatsApp}>
              <MessageCircle size={15} />
              <span>
                <strong>WhatsApp</strong>
                <small>Share job details</small>
              </span>
            </button>

            {!isArchived && (
              <button
                type="button"
                className="tamba-rail-btn"
                onClick={() => {
                  setSharePickerOpen(true)
                  setError('')
                }}
              >
                <Send size={15} />
                <span>
                  <strong>Share in Cirilo</strong>
                  <small>Contacts, favorites or teams</small>
                </span>
              </button>
            )}

            {!isArchived && (
              <button
                type="button"
                className="tamba-rail-btn"
                onClick={addAgenda}
                disabled={actionBusy === 'agenda'}
              >
                <CalendarPlus size={15} />
                <span>
                  <strong>Add to my agenda</strong>
                  <small>Add to your Cirilo week</small>
                </span>
              </button>
            )}

            {draft?.id && isCreator && !isArchived && (
              <>
                <div className="tamba-action-rail-separator" />
                <button
                  type="button"
                  className="tamba-rail-btn tamba-rail-archive"
                  onClick={archive}
                  disabled={actionBusy === 'archive'}
                >
                  <Archive size={15} />
                  <span>
                    <strong>Archive job</strong>
                    <small>Move it to Archive</small>
                  </span>
                </button>
              </>
            )}
          </aside>
        </div>
      </div>
      {sharePickerOpen && (
        <div className="tamba-share-picker-overlay" onMouseDown={() => setSharePickerOpen(false)}>
          <div className="tamba-share-picker-card" onMouseDown={event => event.stopPropagation()}>
            <div className="share-event-head">
              <div>
                <span className="eyebrow">Share Field Work</span>
                <h2>{form.title || 'Job'}</h2>
              </div>
              <button className="icon-btn" type="button" onClick={() => setSharePickerOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <SharePicker
              value={shareRecipientIds}
              onChange={setShareRecipientIds}
              title="Share with"
            />

            <div className="share-picker-dialog-actions">
              <button className="secondary-btn" type="button" onClick={() => setSharePickerOpen(false)}>Cancel</button>
              <button
                className="primary-btn"
                type="button"
                disabled={!shareRecipientIds.length || actionBusy === 'cirilo'}
                onClick={shareCirilo}
              >
                <Send size={15} />
                {shareRecipientIds.length > 1 ? `Share with ${shareRecipientIds.length} people` : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
