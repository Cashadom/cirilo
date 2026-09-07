import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CalendarPlus,
  Check,
  HeartPulse,
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
import NoteModal from './NoteModal'

const UNIVERSES = {
  personal: {
    label: 'Personal',
    icon: UserRound,
  },
  pro: {
    label: 'Pro',
    icon: BriefcaseBusiness,
  },
  study: {
    label: 'Study',
    icon: GraduationCap,
  },
  health: {
    label: 'Health',
    icon: Stethoscope,
  },
}

export default function NotesView({
  onAddToWeek,
  onShare,
  focusNoteId = '',
  focusItemId = '',
  onFocusConsumed,
}) {
  const { firebaseUser } = useAuth()

  const [notes, setNotes] = useState([])
  const [activeUniverse, setActiveUniverse] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [modalFocusItemId, setModalFocusItemId] = useState('')
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
        setError(
          err?.message ||
          'Could not load your Notes.'
        )
      }
    )
  }, [firebaseUser])

  useEffect(() => {
    if (!focusNoteId || !notes.length) return

    const note = notes.find(
      (candidate) => candidate.id === focusNoteId
    )

    if (!note) return

    setActiveUniverse('all')
    setEditing(note)
    setModalFocusItemId(focusItemId || '')
    setModalOpen(true)
    onFocusConsumed?.()
  }, [
    focusNoteId,
    focusItemId,
    notes,
    onFocusConsumed,
  ])

  const visible = useMemo(
    () =>
      activeUniverse === 'all'
        ? notes
        : notes.filter(
            (note) =>
              note.universe === activeUniverse
          ),
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

  function handleAddToWeek(note, item) {
    if (item.kind === 'text') return

    onAddToWeek({
      noteId: note.id,
      noteTitle: note.title,
      universe: note.universe,
      item,
    })
  }

  async function handleDone(note, item) {
    if (item.kind === 'text') return

    await markNoteItemDone(
      firebaseUser.uid,
      note.id,
      item.id
    )
  }

  return (
    <section className="notes-view">
      <div className="notes-intro">
        <div>
          <span className="eyebrow">
            Notes
          </span>

          <h2>
            Save it now. Decide when later.
          </h2>

          <p>
            Movies, books, training, shopping,
            study and health things you do not want
            to forget.
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={openNew}
        >
          <Plus size={16} />
          New list
        </button>
      </div>

      <div className="notes-universe-tabs">
        <button
          className={
            activeUniverse === 'all'
              ? 'active'
              : ''
          }
          onClick={() =>
            setActiveUniverse('all')
          }
        >
          All
        </button>

        {Object.entries(UNIVERSES).map(
          ([key, data]) => {
            const Icon = data.icon

            return (
              <button
                key={key}
                className={
                  activeUniverse === key
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setActiveUniverse(key)
                }
              >
                <Icon size={13} />
                {data.label}
              </button>
            )
          }
        )}
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {!visible.length ? (
        <div className="notes-empty">
          <HeartPulse size={22} />
          <p>
            Nothing saved here yet.
          </p>

          <button
            className="secondary-btn"
            onClick={openNew}
          >
            Create your first list
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {visible.map((note) => {
            const universe =
              UNIVERSES[note.universe] ||
              UNIVERSES.personal

            const Icon = universe.icon

            const visibleBlocks = note.items.filter(
              (block) =>
                block.kind === 'text' ||
                block.status !== 'done'
            )

            const actionableCount = note.items.filter(
              (block) =>
                block.kind !== 'text' &&
                block.status !== 'done'
            ).length

            return (
              <article
                className="note-card"
                key={note.id}
              >
                <div className="note-card-head">
                  <div>
                    <span className="note-universe">
                      <Icon size={12} />
                      {universe.label}
                    </span>

                    <h3>{note.title}</h3>
                  </div>

                  <button
                    className="icon-btn note-more"
                    onClick={() => openEdit(note)}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                <div className="note-card-items">
                  {visibleBlocks
                    .slice(0, 6)
                    .map((block) => {
                      if (block.kind === 'text') {
                        return (
                          <div
                            key={block.id}
                            style={{
                              padding: '10px 0',
                              borderBottom: '1px solid #f3f4f5',
                              color: '#6f767d',
                              fontSize: 11,
                              lineHeight: 1.55,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {block.text}
                          </div>
                        )
                      }

                      return (
                        <div
                          className="note-card-item"
                          key={block.id}
                        >
                          <button
                            className="note-item-check"
                            title="Done"
                            onClick={() =>
                              handleDone(note, block)
                            }
                          >
                            <Check size={12} />
                          </button>

                          <span className="note-item-copy">
                            <span>{block.text}</span>

                            {block.status === 'scheduled' ? (
                              <small>
                                Scheduled in your week
                              </small>
                            ) : block.reminderType === 'monthly' ? (
                              <small>
                                Monthly reminder
                              </small>
                            ) : null}
                          </span>

                          <div className="note-item-actions">
                            <button
                              title="Add to week"
                              onClick={() =>
                                handleAddToWeek(
                                  note,
                                  block
                                )
                              }
                            >
                              <CalendarPlus size={13} />
                            </button>

                            <button
                              title="Share"
                              onClick={() =>
                                onShare({
                                  type: 'item',
                                  noteId: note.id,
                                  noteTitle: note.title,
                                  universe: note.universe,
                                  item: block,
                                })
                              }
                            >
                              <Share2 size={13} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>

                <footer className="note-card-footer">
                  <span>
                    {actionableCount}{' '}
                    {actionableCount === 1
                      ? 'item'
                      : 'items'}
                  </span>

                  <button
                    onClick={() =>
                      onShare({
                        type: 'note',
                        note,
                      })
                    }
                  >
                    <Share2 size={12} />
                    Share list
                  </button>
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
            await saveNote(
              firebaseUser.uid,
              note
            )
            setModalOpen(false)
            setModalFocusItemId('')
          } catch (err) {
            console.error(err)
            setError(
              err?.message ||
              'Could not save your list.'
            )
          }
        }}
        onDelete={async (noteId) => {
          const { deleteNote } = await import(
            '../services/notesService'
          )

          await deleteNote(
            firebaseUser.uid,
            noteId
          )

          setModalOpen(false)
          setModalFocusItemId('')
        }}
      />
    </section>
  )
}
