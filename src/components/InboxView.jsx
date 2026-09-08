import React, { useMemo, useState, useEffect } from 'react'
import {
  Archive,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Forward,
  Inbox,
  MessageCircle,
  RotateCcw,
  Send,
  Share2,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  archiveInboxItem,
  deleteInboxItem,
  inferInboxArchiveType,
  markInboxItem,
  sendInboxReply,
  subscribeInbox,
} from '../services/inboxService'
import {
  markNoteItemDone,
  markNoteItemScheduled,
  remindNoteItemNextMonth,
  saveSharedNoteSnapshot,
} from '../services/notesService'
import {
  canForward,
  canReply,
  getSharePolicy,
  isClosedEntity,
} from '../services/sharePermissions'

export default function InboxView({
  addEvent,
  onNoteToWeek,
  onShareNoteItem,
}) {
  const { firebaseUser, profile } = useAuth()
  const [items, setItems] = useState([])
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [replyingId, setReplyingId] = useState('')
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseUser) return undefined

    return subscribeInbox(
      firebaseUser.uid,
      setItems,
      (err) => {
        console.error(err)
        setError('Could not load your Inbox.')
      }
    )
  }, [firebaseUser])

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status !== 'dismissed' &&
          item.status !== 'archived' &&
          !item.archived
      ),
    [items]
  )

  const toggleExpanded = (id) => {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function addEventShare(item) {
    try {
      const source = item.event || {}
      const today = new Date().toISOString().slice(0, 10)

      await addEvent({
        ...source,
        id: crypto.randomUUID(),
        title:
          source.title ||
          item.title ||
          item.subject ||
          item.message?.slice(0, 80) ||
          'Inbox item',
        notes:
          source.notes ||
          item.message ||
          item.text ||
          '',
        date: source.date || item.date || today,
        startTime: source.startTime || item.startTime || '09:00',
        endTime: source.endTime || item.endTime || '10:00',
        completed: false,
        priority: source.priority || 'normal',
        visibility: 'private',
        isSharedEvent: Boolean(item.type === 'event_share'),
        lockedForRecipient: Boolean(item.type === 'event_share'),
        sharedBy: item.senderCiriloId || '',
        sharedByCiriloId: item.senderCiriloId || '',
        originalSenderCiriloId:
          item.originalSenderCiriloId || item.senderCiriloId || '',
        sourceShareId: item.id,
        sourceInboxId: item.id,
      })

      await markInboxItem(firebaseUser.uid, item.id, 'added')
    } catch (err) {
      console.error(err)
      setError('Could not add this to your calendar.')
    }
  }

  async function addReminderToWeek(inboxItem) {
    try {
      await markNoteItemScheduled(
        firebaseUser.uid,
        inboxItem.noteId,
        inboxItem.noteItem.id
      )

      await markInboxItem(firebaseUser.uid, inboxItem.id, 'added')

      onNoteToWeek({
        noteId: inboxItem.noteId,
        noteTitle: inboxItem.noteTitle,
        universe: inboxItem.universe,
        item: inboxItem.noteItem,
      })
    } catch (err) {
      console.error(err)
      setError('Could not add this note to your week.')
    }
  }

  async function doneReminder(inboxItem) {
    try {
      await markNoteItemDone(
        firebaseUser.uid,
        inboxItem.noteId,
        inboxItem.noteItem.id
      )
      await markInboxItem(firebaseUser.uid, inboxItem.id, 'dismissed')
    } catch (err) {
      setError(err?.message || 'Could not complete this item.')
    }
  }

  async function nextMonth(inboxItem) {
    try {
      await remindNoteItemNextMonth(
        firebaseUser.uid,
        inboxItem.noteId,
        inboxItem.noteItem.id
      )
      await markInboxItem(firebaseUser.uid, inboxItem.id, 'dismissed')
    } catch (err) {
      setError(err?.message || 'Could not move this reminder.')
    }
  }

  async function saveSharedNote(inboxItem) {
    try {
      await saveSharedNoteSnapshot(firebaseUser.uid, inboxItem)
      await markInboxItem(firebaseUser.uid, inboxItem.id, 'added')
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Could not save this note.')
    }
  }

  async function archiveItem(item) {
    try {
      await archiveInboxItem(
        firebaseUser.uid,
        item.id,
        inferInboxArchiveType(item)
      )
    } catch (err) {
      setError(err?.message || 'Could not archive this item.')
    }
  }

  async function deleteItem(item) {
    try {
      await deleteInboxItem(firebaseUser.uid, item.id)
    } catch (err) {
      setError(err?.message || 'Could not delete your copy.')
    }
  }

  async function sendReply(item) {
    const text = replyText.trim()
    if (!text) return

    try {
      await sendInboxReply({
        sender: {
          uid: firebaseUser.uid,
          ciriloId: profile?.ciriloId || '',
          displayName:
            profile?.displayName || firebaseUser.displayName || 'Cirilo user',
          photoURL: profile?.photoURL || firebaseUser.photoURL || '',
        },
        inboxItem: item,
        text,
      })
      setReplyText('')
      setReplyingId('')
    } catch (err) {
      setError(err?.message || 'Could not send your reply.')
    }
  }

  function forwardItem(item) {
    if (!onShareNoteItem || !canForward(item, firebaseUser.uid)) return

    if (item.type === 'note_share') {
      onShareNoteItem({
        ...(item.notePayload || {}),
        threadId: item.threadId || '',
        sharePolicy: getSharePolicy(item),
        originalSenderCiriloId:
          item.originalSenderCiriloId || item.senderCiriloId || '',
      })
    }
  }

  function titleFor(item) {
    if (item.type === 'note_reminder') return item.noteItem?.text || 'Reminder'
    if (item.type === 'note_share') {
      return item.notePayload?.type === 'item'
        ? item.notePayload?.item?.text || 'Shared item'
        : item.notePayload?.note?.title || 'Shared note'
    }
    if (item.type === 'reply') return 'Reply'
    return item.event?.title || item.title || item.subject || 'Inbox message'
  }

  function bodyFor(item) {
    if (item.type === 'note_share') {
      const payload = item.notePayload || {}
      if (payload.type === 'item') return payload.item?.text || ''
      return (payload.note?.items || [])
        .map((entry) => entry.text)
        .filter(Boolean)
        .join('\n')
    }

    if (item.type === 'reply') return item.message || ''
    return item.event?.notes || item.message || item.text || ''
  }

  return (
    <section className="inbox-view">
      <div className="tasks-intro">
        <span className="eyebrow">Inbox</span>
        <h2>Things Cirilo brought back to you.</h2>
      </div>

      {error && <div className="form-error">{error}</div>}

      {!visibleItems.length ? (
        <div className="inbox-empty">
          <Inbox size={24} />
          <p>Nothing needs your attention.</p>
        </div>
      ) : (
        <div className="inbox-list">
          {visibleItems.map((item) => {
            const expanded = expandedIds.has(item.id)
            const sender =
              item.originalSenderCiriloId ||
              item.senderCiriloId ||
              item.sharedByCiriloId ||
              item.sharedBy ||
              ''
            const forwardedBy = item.forwardedByCiriloId || ''
            const closed = isClosedEntity(item)
            const policy = getSharePolicy(item)
            const body = bodyFor(item)
            const replyAllowed = canReply(item, firebaseUser.uid)
            const forwardAllowed =
              item.type === 'note_share' && canForward(item, firebaseUser.uid)

            if (item.type === 'note_reminder') {
              return (
                <article className="inbox-card compact-inbox-card" key={item.id}>
                  <div className="inbox-card-main">
                    <span className="inbox-from">Still on your list?</span>
                    <h3>{titleFor(item)}</h3>
                    <p>Saved in {item.noteTitle}</p>
                  </div>

                  <div className="inbox-actions inbox-note-actions">
                    <button className="primary-btn" onClick={() => addReminderToWeek(item)}>
                      <CalendarPlus size={14} /> Add to week
                    </button>
                    <button className="secondary-btn compact" onClick={() => doneReminder(item)}>
                      <Check size={14} /> Done
                    </button>
                    <button className="secondary-btn compact" onClick={() => nextMonth(item)}>
                      <RotateCcw size={14} /> Next month
                    </button>
                    <button className="secondary-btn compact" onClick={() => archiveItem(item)}>
                      <Archive size={14} />
                    </button>
                    <button className="secondary-btn compact" onClick={() => deleteItem(item)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              )
            }

            return (
              <article
                className={`inbox-card compact-inbox-card${expanded ? ' is-expanded' : ''}`}
                key={item.id}
              >
                <div className="inbox-card-main">
                  <span className="inbox-from">
                    {sender ? `From ${sender}` : 'Cirilo'}
                    {forwardedBy ? ` · forwarded by ${forwardedBy}` : ''}
                  </span>

                  <h3>{titleFor(item)}</h3>

                  <div className="inbox-meta-row">
                    <span className={`note-policy-badge ${policy}`}>
                      {policy === 'shareable' ? 'Shareable' : 'Private'}
                    </span>
                    {closed && <span className="note-closed-badge">Closed</span>}
                  </div>

                  {expanded && body && (
                    <p className="inbox-expanded-copy">{body}</p>
                  )}

                  {item.event?.date && (
                    <small>
                      {item.event.date} · {item.event.startTime} — {item.event.endTime}
                    </small>
                  )}

                  {replyingId === item.id && !closed && (
                    <div className="inbox-reply-box">
                      <textarea
                        rows={3}
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Reply…"
                      />
                      <button
                        className="primary-btn compact"
                        disabled={!replyText.trim()}
                        onClick={() => sendReply(item)}
                      >
                        <Send size={14} /> Reply
                      </button>
                    </div>
                  )}
                </div>

                <div className="inbox-card-controls">
                  <button
                    className="note-expand-button"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {expanded ? 'Collapse' : 'Expand'}
                  </button>

                  <div className="inbox-actions">
                    {item.type === 'note_share' && item.status !== 'added' && (
                      <button className="primary-btn compact" onClick={() => saveSharedNote(item)}>
                        Save to Notes
                      </button>
                    )}

                    {(item.type === 'event_share' || item.event || item.type === 'reply') && (
                      <button className="secondary-btn compact" onClick={() => addEventShare(item)}>
                        <CalendarPlus size={14} /> Add to event
                      </button>
                    )}

                    {replyAllowed && !closed && (
                      <button
                        className="secondary-btn compact"
                        onClick={() => {
                          setReplyingId(replyingId === item.id ? '' : item.id)
                          setReplyText('')
                        }}
                      >
                        <MessageCircle size={14} /> Reply
                      </button>
                    )}

                    {forwardAllowed && (
                      <button className="secondary-btn compact" onClick={() => forwardItem(item)}>
                        <Forward size={14} /> Forward
                      </button>
                    )}

                    <button className="secondary-btn compact" onClick={() => archiveItem(item)} title="Archive">
                      <Archive size={14} />
                    </button>

                    <button className="secondary-btn compact" onClick={() => deleteItem(item)} title="Delete my copy">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
