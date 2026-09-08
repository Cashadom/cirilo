import React, { useEffect, useMemo, useState } from 'react'
import {
  AlignLeft,
  Bell,
  CheckCircle2,
  ListPlus,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  addSharedReply,
  closeSharedThread,
  subscribeSharedThread,
} from '../services/notesService'
import {
  canClose,
  canEditOriginal,
  canReply,
  getSharePolicy,
  isClosedEntity,
  isReceivedEntity,
} from '../services/sharePermissions'

const UNIVERSES = [
  ['personal', 'Personal'],
  ['pro', 'Pro'],
  ['study', 'Study'],
  ['health', 'Health'],
]

const blankBlock = (kind = 'text') => ({
  id: crypto.randomUUID(),
  kind,
  text: '',
  status: 'active',
  reminderType: 'none',
  nextReminderAt: '',
  lastRemindedAt: '',
  hasBeenShared: false,
  createdAt: new Date().toISOString(),
})

const empty = {
  title: '',
  universe: 'personal',
  visibility: 'private',
  sharePolicy: 'private',
  items: [blankBlock('text')],
}

export default function NoteModal({
  open,
  note,
  focusItemId = '',
  onClose,
  onSave,
  onDelete,
}) {
  const { firebaseUser, profile } = useAuth()
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [thread, setThread] = useState(null)
  const [replies, setReplies] = useState([])
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  useEffect(() => {
    if (!open) return

    setForm(
      note
        ? {
            ...note,
            visibility:
              note.sharePolicy === 'shareable' || note.visibility === 'shared'
                ? 'shared'
                : 'private',
            items: note.items?.length
              ? note.items.map((block) => ({
                  ...block,
                  kind: block.kind === 'text' ? 'text' : 'item',
                }))
              : [blankBlock('text')],
          }
        : {
            ...empty,
            items: [blankBlock('text')],
          }
    )

    setError('')
    setReplyText('')
    setThread(null)
    setReplies([])
  }, [open, note])

  useEffect(() => {
    if (!open || !note?.threadId) return undefined

    return subscribeSharedThread(
      note.threadId,
      (update) => {
        if (Object.prototype.hasOwnProperty.call(update, 'thread')) {
          setThread(update.thread)
        }
        if (Object.prototype.hasOwnProperty.call(update, 'replies')) {
          setReplies(update.replies || [])
        }
      },
      (err) => {
        console.error(err)
        setError('Could not load this conversation.')
      }
    )
  }, [open, note?.threadId])

  useEffect(() => {
    if (!open || !focusItemId) return

    const timer = window.setTimeout(() => {
      document
        .querySelector(`[data-note-block-id="${focusItemId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [open, focusItemId, form.items.length])

  const effectiveNote = useMemo(
    () => ({ ...form, ...(thread || {}) }),
    [form, thread]
  )

  const received = isReceivedEntity(note || form)
  const closed = isClosedEntity(effectiveNote)
  const editable = note
    ? canEditOriginal(note, firebaseUser?.uid || '') && !closed
    : true
  const replyAllowed =
    Boolean(note?.threadId) && canReply(effectiveNote, firebaseUser?.uid || '')
  const closeAllowed = canClose(effectiveNote, firebaseUser?.uid || '')
  const policy = getSharePolicy(form)

  if (!open) return null

  const updateBlock = (id, patch) => {
    if (!editable) return

    setForm((current) => ({
      ...current,
      items: current.items.map((block) =>
        block.id === id ? { ...block, ...patch } : block
      ),
    }))
  }

  const removeBlock = (id) => {
    if (!editable) return

    setForm((current) => ({
      ...current,
      items: current.items.filter((block) => block.id !== id),
    }))
  }

  const addBlock = (kind = 'text') => {
    if (!editable) return

    setForm((current) => ({
      ...current,
      items: [...current.items, blankBlock(kind)],
    }))
  }

  const save = () => {
    if (!editable) return

    const items = form.items
      .map((block) => ({
        ...block,
        kind: block.kind === 'text' ? 'text' : 'item',
        text: block.text.trim(),
        reminderType:
          block.kind === 'text' ? 'none' : block.reminderType || 'none',
        nextReminderAt:
          block.kind === 'text' ? '' : block.nextReminderAt || '',
      }))
      .filter((block) => block.text)

    if (!form.title.trim()) {
      setError('Add a list title.')
      return
    }

    if (!items.length) {
      setError('Add at least one item or free text block.')
      return
    }

    onSave({
      ...form,
      visibility: form.visibility,
      sharePolicy: form.visibility === 'shared' ? 'shareable' : 'private',
      title: form.title.trim(),
      items,
    })
  }

  async function sendReply() {
    const text = replyText.trim()
    if (!text || !note?.threadId || !firebaseUser) return

    setSendingReply(true)
    setError('')

    try {
      await addSharedReply({
        threadId: note.threadId,
        sender: {
          uid: firebaseUser.uid,
          ciriloId: profile?.ciriloId || '',
          displayName:
            profile?.displayName || firebaseUser.displayName || 'Cirilo user',
          photoURL: profile?.photoURL || firebaseUser.photoURL || '',
        },
        text,
      })
      setReplyText('')
    } catch (err) {
      setError(err?.message || 'Could not send your reply.')
    } finally {
      setSendingReply(false)
    }
  }

  async function closeConversation() {
    if (!note?.threadId || !firebaseUser) return

    try {
      setError('')
      await closeSharedThread({
        threadId: note.threadId,
        currentUid: firebaseUser.uid,
        currentCiriloId: profile?.ciriloId || '',
      })
    } catch (err) {
      setError(err?.message || 'Could not close this conversation.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="note-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="note-modal-head">
          <div>
            <span className="eyebrow">
              {received ? 'Received' : note ? 'Edit list' : 'New list'}
            </span>

            <h2>
              {received
                ? 'Original content is locked.'
                : note
                  ? 'Keep it alive.'
                  : 'Save it before you forget it.'}
            </h2>

            {received && (
              <div className="note-origin-line">
                <Lock size={12} />
                From {note.originalSenderCiriloId || note.senderCiriloId || 'Cirilo'}
                {note.forwardedByCiriloId
                  ? ` · Forwarded by ${note.forwardedByCiriloId}`
                  : ''}
              </div>
            )}
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        {closed && (
          <div className="note-closed-banner">
            <CheckCircle2 size={14} />
            Closed
            {(thread?.closedByCiriloId || note?.closedByCiriloId) && (
              <span>
                by {thread?.closedByCiriloId || note?.closedByCiriloId}
              </span>
            )}
          </div>
        )}

        <div className="modal-grid">
          <label className="field span-2">
            List title
            <input
              autoFocus={!received}
              value={form.title}
              disabled={!editable}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Movies to watch"
            />
          </label>

          <label className="field">
            Universe
            <select
              value={form.universe}
              disabled={!editable}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  universe: event.target.value,
                }))
              }
            >
              {UNIVERSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Sharing
            <select
              value={form.visibility}
              disabled={!editable}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visibility: event.target.value,
                  sharePolicy:
                    event.target.value === 'shared' ? 'shareable' : 'private',
                }))
              }
            >
              <option value="private">Private · no forwarding</option>
              <option value="shared">Shareable · forwarding allowed</option>
            </select>
          </label>
        </div>

        <div className="note-items-editor">
          <div className="note-items-editor-head">
            <span>Content</span>

            {editable && (
              <div className="note-add-actions">
                <button
                  className="secondary-btn compact"
                  onClick={() => addBlock('text')}
                  type="button"
                >
                  <AlignLeft size={14} />
                  Add an item
                </button>

                <button
                  className="secondary-btn compact"
                  onClick={() => addBlock('item')}
                  type="button"
                >
                  <ListPlus size={14} />
                  Action item
                </button>
              </div>
            )}
          </div>

          {form.items.map((block, index) => {
            const isText = block.kind === 'text'
            const isFocused = block.id === focusItemId

            return (
              <div
                key={block.id}
                data-note-block-id={block.id}
                className={`note-editor-block${isFocused ? ' focused' : ''}`}
              >
                {isText ? (
                  <div className="note-free-text-editor">
                    <span className="note-item-number">{index + 1}</span>

                    <textarea
                      rows={4}
                      value={block.text}
                      readOnly={!editable}
                      onChange={(event) =>
                        updateBlock(block.id, { text: event.target.value })
                      }
                      placeholder="Write anything here… a film, an idea, a link, a message…"
                    />

                    {editable && (
                      <button
                        className="icon-btn note-delete-item"
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="note-item-editor">
                    <span className="note-item-number">{index + 1}</span>

                    <input
                      value={block.text}
                      readOnly={!editable}
                      onChange={(event) =>
                        updateBlock(block.id, { text: event.target.value })
                      }
                      placeholder="Action item"
                    />

                    <label className="note-reminder-select">
                      <Bell size={13} />
                      <select
                        value={block.reminderType}
                        disabled={!editable}
                        onChange={(event) =>
                          updateBlock(block.id, {
                            reminderType: event.target.value,
                            nextReminderAt:
                              event.target.value === 'monthly'
                                ? new Date(
                                    new Date().setMonth(new Date().getMonth() + 1)
                                  )
                                    .toISOString()
                                    .slice(0, 10)
                                : '',
                          })
                        }
                      >
                        <option value="none">No reminder</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>

                    {editable && (
                      <button
                        className="icon-btn note-delete-item"
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        disabled={form.items.length === 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {note?.threadId && (
          <section className="note-thread">
            <div className="note-thread-head">
              <span>
                <MessageCircle size={13} /> Conversation
              </span>
              <small>
                {policy === 'shareable' ? 'Shareable' : 'Private'}
              </small>
            </div>

            <div className="note-thread-replies">
              {!replies.length ? (
                <p className="note-thread-empty">No replies yet.</p>
              ) : (
                replies.map((reply) => (
                  <article className="note-reply" key={reply.id}>
                    <strong>{reply.senderCiriloId || 'Cirilo user'}</strong>
                    <p>{reply.text}</p>
                  </article>
                ))
              )}
            </div>

            {replyAllowed && !closed && (
              <div className="note-reply-box">
                <textarea
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Reply…"
                  rows={3}
                />
                <button
                  className="primary-btn compact"
                  disabled={!replyText.trim() || sendingReply}
                  onClick={sendReply}
                >
                  <Send size={14} />
                  Reply
                </button>
              </div>
            )}
          </section>
        )}

        {error && <div className="form-error">{error}</div>}

        <footer className="modal-footer">
          <div className="note-modal-left-actions">
            {note?.id && (
              <button
                className="danger-btn"
                onClick={() => onDelete(note.id)}
              >
                <Trash2 size={15} />
                {received ? 'Delete my copy' : 'Delete list'}
              </button>
            )}

            {closeAllowed && note?.threadId && !closed && (
              <button
                className="secondary-btn"
                onClick={closeConversation}
              >
                <CheckCircle2 size={15} />
                Close
              </button>
            )}
          </div>

          <div>
            <button className="secondary-btn" onClick={onClose}>
              {editable ? 'Cancel' : 'Close'}
            </button>

            {editable && (
              <button className="primary-btn" onClick={save}>
                Save list
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
