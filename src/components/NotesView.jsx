import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  ChevronDown,
  ChevronUp,
  Download,
  HeartPulse,
  Lock,
  MoreHorizontal,
  Plus,
  Share2,
  Stethoscope,
  BriefcaseBusiness,
  GraduationCap,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  markNoteItemDone,
  saveNote,
  subscribeNotes,
} from '../services/notesService'
import {
  canEditOriginal,
  canForward,
  getSharePolicy,
  isClosedEntity,
  isReceivedEntity,
} from '../services/sharePermissions'
import NoteModal from './NoteModal'
import { exportNoteToPdf } from '../services/pdfService'

const UNIVERSES = {
  personal: { label: 'Personal', icon: UserRound },
  pro: { label: 'Pro', icon: BriefcaseBusiness },
  study: { label: 'Study', icon: GraduationCap },
  health: { label: 'Health', icon: Stethoscope },
}

export default function NotesView({
  onAddToWeek,
  onSendToEvent,
  onShare,
  focusNoteId = '',
  focusItemId = '',
  onFocusConsumed,
}) {
  const { firebaseUser, profile } = useAuth()
  const [notes, setNotes] = useState([])
  const [activeUniverse, setActiveUniverse] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [modalFocusItemId, setModalFocusItemId] = useState('')
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseUser) return undefined

    return subscribeNotes(
      firebaseUser.uid,
      (nextNotes) => {
        setNotes(nextNotes)
        setError('')
      },
      (err) => {
        console.error(err)
        setError(err?.message || 'Could not load your Notes.')
      }
    )
  }, [firebaseUser])

  useEffect(() => {
    if (!focusNoteId || !notes.length) return

    const note = notes.find((candidate) => candidate.id === focusNoteId)
    if (!note) return

    setActiveUniverse('all')
    setEditing(note)
    setModalFocusItemId(focusItemId || '')
    setModalOpen(true)
    onFocusConsumed?.()
  }, [focusNoteId, focusItemId, notes, onFocusConsumed])

  const visible = useMemo(
    () =>
      activeUniverse === 'all'
        ? notes
        : notes.filter((note) => note.universe === activeUniverse),
    [notes, activeUniverse]
  )

  const openNew = () => {
    setEditing(null)
    setModalFocusItemId('')
    setModalOpen(true)
  }

  const openEdit = (note) => {
    setEditing(note)
    setModalFocusItemId('')
    setModalOpen(true)
  }

  const toggleExpanded = (noteId) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(noteId)) next.delete(noteId)
      else next.add(noteId)
      return next
    })
  }

  function handleAddToWeek(note, item) {
    if (item.kind === 'text') return

    onAddToWeek({
      noteId: note.id,
      noteTitle: note.title,
      universe: note.universe,
      item,
      sourceCiriloId:
        note.originalSenderCiriloId || note.senderCiriloId || '',
    })
  }

  function handleSendToEvent(note) {
    onSendToEvent?.({
      noteId: note.id,
      noteTitle: note.title,
      universe: note.universe,
      items: note.items || [],
      sourceCiriloId:
        note.originalSenderCiriloId || note.senderCiriloId || '',
    })
  }

  async function handleDone(note, item) {
    if (item.kind === 'text') return
    if (!canEditOriginal(note, firebaseUser.uid)) return

    await markNoteItemDone(firebaseUser.uid, note.id, item.id)
  }

  function handleExportPdf(note) {
    exportNoteToPdf({
      note,
      ciriloId: profile?.ciriloId || 'Cirilo user',
    })
  }

  return (
    <section className="notes-view">
      <div className="notes-intro">
        <div>
          <span className="eyebrow">Notes</span>
          <h2>Save it now. Decide when later.</h2>
          <p>
            Movies, books, training, shopping, study and health things you do
            not want to forget.
          </p>
        </div>

        <button className="primary-btn" onClick={openNew}>
          <Plus size={16} />
          New list
        </button>
      </div>

      <div className="notes-universe-tabs">
        <button
          className={activeUniverse === 'all' ? 'active' : ''}
          onClick={() => setActiveUniverse('all')}
        >
          All
        </button>

        {Object.entries(UNIVERSES).map(([key, data]) => {
          const Icon = data.icon
          return (
            <button
              key={key}
              className={activeUniverse === key ? 'active' : ''}
              onClick={() => setActiveUniverse(key)}
            >
              <Icon size={13} />
              {data.label}
            </button>
          )
        })}
      </div>

      {error && <div className="form-error">{error}</div>}

      {!visible.length ? (
        <div className="notes-empty">
          <HeartPulse size={22} />
          <p>Nothing saved here yet.</p>
          <button className="secondary-btn" onClick={openNew}>
            Create your first list
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {visible.map((note) => {
            const universe = UNIVERSES[note.universe] || UNIVERSES.personal
            const Icon = universe.icon
            const expanded = expandedIds.has(note.id)
            const received = isReceivedEntity(note)
            const senderCiriloId =
              note.originalSenderCiriloId ||
              note.senderCiriloId ||
              note.sharedByCiriloId ||
              note.sharedBy ||
              ''
            const senderPhotoURL =
              note.senderPhotoURL ||
              note.sharedByPhotoURL ||
              ''
            const closed = isClosedEntity(note)
            const editable = canEditOriginal(note, firebaseUser.uid)
            const forwardable = canForward(note, firebaseUser.uid)
            const blocks = (note.items || []).filter(
              (block) => block.kind === 'text' || block.status !== 'done'
            )
            const actionableCount = (note.items || []).filter(
              (block) => block.kind !== 'text' && block.status !== 'done'
            ).length
            const hasFreeText = blocks.some(
              (block) =>
                block.kind === 'text' &&
                String(block.text || '').trim()
            )
            const canDevelop = blocks.length > 1 || hasFreeText

            return (
              <article
                className={`note-card compact-note-card${expanded ? ' is-expanded' : ''}`}
                key={note.id}
              >
                <div className="note-card-head">
                  <div className="note-card-title-copy">
                    <span className="note-universe">
                      <Icon size={12} />
                      {universe.label}
                    </span>
                    <h3>{note.title}</h3>

                    {(received || senderCiriloId) && senderCiriloId && (
                      <span className="note-from-line">
                        {senderPhotoURL ? (
                          <img
                            className="note-from-avatar"
                            src={senderPhotoURL}
                            alt=""
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="note-from-avatar fallback">
                            {senderCiriloId.replace('cirilo_', '').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="note-from-copy">
                          From {senderCiriloId}
                          {note.forwardedByCiriloId
                            ? ` · forwarded by ${note.forwardedByCiriloId}`
                            : ''}
                        </span>
                      </span>
                    )}
                  </div>

                  <button
                    className="icon-btn note-more"
                    onClick={() => openEdit(note)}
                    title={editable ? 'Edit' : 'Open'}
                  >
                    {received ? <Lock size={14} /> : <MoreHorizontal size={16} />}
                  </button>
                </div>

                <div className="note-card-status-row">
                  <span className={`note-policy-badge ${getSharePolicy(note)}`}>
                    {getSharePolicy(note) === 'shareable' ? 'Shareable' : 'Private'}
                  </span>
                  {closed && <span className="note-closed-badge">Closed</span>}
                </div>

                <div className="note-card-items compact-body">
                  {(expanded ? blocks : blocks.slice(0, 1)).map((block) => {
                    if (block.kind === 'text') {
                      return (
                        <div className="note-free-preview" key={block.id}>
                          {block.text}
                        </div>
                      )
                    }

                    return (
                      <div className="note-card-item" key={block.id}>
                        <button
                          className="note-item-check"
                          title={editable ? 'Done' : 'Original item is locked'}
                          disabled={!editable}
                          onClick={() => handleDone(note, block)}
                        >
                          ✓
                        </button>

                        <span className="note-item-copy">
                          <span>{block.text}</span>
                          {block.status === 'scheduled' ? (
                            <small>Scheduled in your week</small>
                          ) : block.reminderType === 'monthly' ? (
                            <small>Monthly reminder</small>
                          ) : null}
                        </span>

                        <div className={`note-item-actions${expanded ? "" : " collapsed-item-actions"}`}>
                          <button
                            title="Add to week"
                            onClick={() => handleAddToWeek(note, block)}
                          >
                            <CalendarPlus size={13} />
                          </button>

                          {(editable || forwardable) && (
                            <button
                              title={forwardable && received ? 'Forward' : 'Share'}
                              onClick={() =>
                                onShare({
                                  type: 'item',
                                  noteId: note.id,
                                  noteTitle: note.title,
                                  universe: note.universe,
                                  visibility: note.visibility,
                                  sharePolicy: getSharePolicy(note),
                                  threadId: note.threadId || '',
                                  originalSenderCiriloId:
                                    note.originalSenderCiriloId || '',
                                  item: block,
                                })
                              }
                            >
                              <Share2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {!blocks.length && (
                    <div className="note-free-preview">No active item.</div>
                  )}
                </div>

                {canDevelop && (
                  <button
                    className="note-expand-button"
                    onClick={() => toggleExpanded(note.id)}
                  >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {expanded ? 'Reduce' : 'Develop'}
                  </button>
                )}

                <footer className="note-card-footer">
                  <span>
                    {actionableCount} {actionableCount === 1 ? 'item' : 'items'}
                  </span>

                  <div className="note-card-footer-actions">
                    <button
                      onClick={() => handleSendToEvent(note)}
                      title="Send this note to your calendar"
                    >
                      <CalendarPlus size={12} />
                      Send to event
                    </button>

                    <button onClick={() => handleExportPdf(note)} title="Export PDF">
                      <Download size={12} />
                      PDF
                    </button>

                    {(editable || forwardable) && (
                      <button
                        onClick={() =>
                          onShare({
                            type: 'note',
                            note: {
                              ...note,
                              sharePolicy: getSharePolicy(note),
                            },
                            threadId: note.threadId || '',
                            sharePolicy: getSharePolicy(note),
                            originalSenderCiriloId:
                              note.originalSenderCiriloId || '',
                          })
                        }
                      >
                        <Share2 size={12} />
                        {received ? 'Forward' : 'Share list'}
                      </button>
                    )}
                  </div>
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <NoteModal
        open={modalOpen}
        note={editing}
        focusItemId={modalFocusItemId}
        onClose={() => {
          setModalOpen(false)
          setModalFocusItemId('')
        }}
        onSave={async (note) => {
          try {
            setError('')
            await saveNote(firebaseUser.uid, {
              ...note,
              ownerCiriloId:
                note.ownerCiriloId || profile?.ciriloId || '',
            })
            setModalOpen(false)
            setModalFocusItemId('')
          } catch (err) {
            console.error(err)
            setError(err?.message || 'Could not save your list.')
          }
        }}
        onDelete={async (noteId) => {
          const { deleteNote } = await import('../services/notesService')
          await deleteNote(firebaseUser.uid, noteId)
          setModalOpen(false)
          setModalFocusItemId('')
        }}
      />
    </section>
  )
}
