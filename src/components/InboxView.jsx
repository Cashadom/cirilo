import React, {
  useEffect,
  useState,
} from 'react'
import {
  CalendarPlus,
  Check,
  Inbox,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  markInboxItem,
  subscribeInbox,
} from '../services/inboxService'
import {
  markNoteItemDone,
  markNoteItemScheduled,
  remindNoteItemNextMonth,
  saveNote,
} from '../services/notesService'

export default function InboxView({
  addEvent,
  onNoteToWeek,
  onShareNoteItem,
}) {
  const {
    firebaseUser,
  } = useAuth()

  const [items, setItems] =
    useState([])

  const [error, setError] =
    useState('')

  useEffect(() => {
    if (!firebaseUser) {
      return undefined
    }

    return subscribeInbox(
      firebaseUser.uid,
      setItems,
      (err) => {
        console.error(err)
        setError(
          'Could not load your Inbox.'
        )
      }
    )
  }, [firebaseUser])

  async function addEventShare(item) {
    try {
      await addEvent({
        ...item.event,
        id: crypto.randomUUID(),
        completed: false,
        priority:
          item.event?.priority ||
          'normal',
        visibility: 'private',
        isSharedEvent: true,
        lockedForRecipient: true,
        sharedBy:
          item.senderCiriloId || '',
        sharedByCiriloId:
          item.senderCiriloId || '',
        sourceShareId: item.id,
      })

      await markInboxItem(
        firebaseUser.uid,
        item.id,
        'added'
      )
    } catch (err) {
      console.error(err)
      setError(
        'Could not add this event to your week.'
      )
    }
  }

  async function addReminderToWeek(
    inboxItem
  ) {
    try {
      await markNoteItemScheduled(
        firebaseUser.uid,
        inboxItem.noteId,
        inboxItem.noteItem.id
      )

      await markInboxItem(
        firebaseUser.uid,
        inboxItem.id,
        'added'
      )

      onNoteToWeek({
        noteId:
          inboxItem.noteId,
        noteTitle:
          inboxItem.noteTitle,
        universe:
          inboxItem.universe,
        item:
          inboxItem.noteItem,
      })
    } catch (err) {
      console.error(err)
      setError(
        'Could not add this note to your week.'
      )
    }
  }

  async function doneReminder(
    inboxItem
  ) {
    await markNoteItemDone(
      firebaseUser.uid,
      inboxItem.noteId,
      inboxItem.noteItem.id
    )

    await markInboxItem(
      firebaseUser.uid,
      inboxItem.id,
      'dismissed'
    )
  }

  async function nextMonth(
    inboxItem
  ) {
    await remindNoteItemNextMonth(
      firebaseUser.uid,
      inboxItem.noteId,
      inboxItem.noteItem.id
    )

    await markInboxItem(
      firebaseUser.uid,
      inboxItem.id,
      'dismissed'
    )
  }

  async function saveSharedNote(
    inboxItem
  ) {
    const payload =
      inboxItem.notePayload

    const newNote =
      payload.type === 'item'
        ? {
            title:
              payload.noteTitle ||
              'Shared with me',
            universe:
              payload.universe ||
              'personal',
            visibility: 'private',
            items: [
              {
                ...payload.item,
                id:
                  crypto.randomUUID(),
                status: 'active',
              },
            ],
          }
        : {
            ...payload.note,
            id: undefined,
            title:
              payload.note?.title ||
              'Shared with me',
            visibility: 'private',
            items:
              (
                payload.note?.items ||
                []
              ).map((item) => ({
                ...item,
                id:
                  crypto.randomUUID(),
              })),
          }

    await saveNote(
      firebaseUser.uid,
      newNote
    )

    await markInboxItem(
      firebaseUser.uid,
      inboxItem.id,
      'added'
    )
  }

  async function dismiss(item) {
    try {
      await markInboxItem(
        firebaseUser.uid,
        item.id,
        'dismissed'
      )
    } catch (err) {
      console.error(err)
      setError(
        'Could not dismiss this notification.'
      )
    }
  }

  const visibleItems =
    items.filter(
      (item) =>
        item.status !== 'dismissed'
    )

  return (
    <section className="inbox-view">
      <div className="tasks-intro">
        <span className="eyebrow">
          Inbox
        </span>

        <h2>
          Things Cirilo brought back to you.
        </h2>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      {!visibleItems.length ? (
        <div className="inbox-empty">
          <Inbox size={24} />
          <p>
            Nothing needs your attention.
          </p>
        </div>
      ) : (
        <div className="inbox-list">
          {visibleItems.map(
            (item) => {
              if (
                item.type ===
                'note_reminder'
              ) {
                return (
                  <article
                    className="inbox-card note-reminder-card"
                    key={item.id}
                  >
                    <div>
                      <span className="inbox-from">
                        Still on your list?
                      </span>

                      <h3>
                        {
                          item
                            .noteItem
                            ?.text
                        }
                      </h3>

                      <p>
                        Saved in{' '}
                        {
                          item.noteTitle
                        }
                      </p>

                      {!item
                        .noteItem
                        ?.hasBeenShared && (
                        <small>
                          Know someone
                          who might like
                          this? Share it.
                        </small>
                      )}
                    </div>

                    <div className="inbox-actions inbox-note-actions">
                      <button
                        className="primary-btn"
                        onClick={() =>
                          addReminderToWeek(
                            item
                          )
                        }
                      >
                        <CalendarPlus size={14} />
                        Add to week
                      </button>

                      <button
                        className="secondary-btn compact"
                        onClick={() =>
                          doneReminder(
                            item
                          )
                        }
                      >
                        <Check size={14} />
                        Done
                      </button>

                      <button
                        className="secondary-btn compact"
                        onClick={() =>
                          nextMonth(
                            item
                          )
                        }
                      >
                        <RotateCcw size={14} />
                        Next month
                      </button>

                      {!item
                        .noteItem
                        ?.hasBeenShared && (
                        <button
                          className="secondary-btn compact"
                          onClick={() =>
                            onShareNoteItem(
                              {
                                type: 'item',
                                noteId:
                                  item.noteId,
                                noteTitle:
                                  item.noteTitle,
                                universe:
                                  item.universe,
                                item:
                                  item.noteItem,
                              }
                            )
                          }
                        >
                          <Share2 size={14} />
                          Share
                        </button>
                      )}
                    </div>
                  </article>
                )
              }

              if (
                item.type ===
                'note_share'
              ) {
                const payload =
                  item.notePayload

                const title =
                  payload?.type ===
                  'item'
                    ? payload.item?.text
                    : payload.note
                        ?.title

                return (
                  <article
                    className="inbox-card"
                    key={item.id}
                  >
                    <div>
                      <span className="inbox-from">
                        Shared by
                        @{item.senderCiriloId}
                      </span>

                      <h3>
                        {title}
                      </h3>

                      <p>
                        Note / list
                      </p>
                    </div>

                    <div className="inbox-actions">
                      {item.status ===
                      'added' ? (
                        <span className="inbox-added">
                          <Check size={14} />
                          Saved
                        </span>
                      ) : (
                        <>
                          <button
                            className="secondary-btn compact"
                            onClick={() =>
                              dismiss(
                                item
                              )
                            }
                          >
                            <X size={14} />
                          </button>

                          <button
                            className="primary-btn"
                            onClick={() =>
                              saveSharedNote(
                                item
                              )
                            }
                          >
                            Save to Notes
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              }

              return (
                <article
                  className="inbox-card"
                  key={item.id}
                >
                  <div>
                    <span className="inbox-from">
                      Shared with you by
                      @{item.senderCiriloId}
                    </span>

                    <h3>
                      {item.event?.title}
                    </h3>

                    <p>
                      {item.event?.date}
                      {' · '}
                      {item.event?.startTime}
                      {' — '}
                      {item.event?.endTime}
                    </p>

                    {item.event
                      ?.location && (
                      <small>
                        {
                          item.event
                            .location
                        }
                      </small>
                    )}
                  </div>

                  <div className="inbox-actions">
                    {item.status ===
                    'added' ? (
                      <span className="inbox-added">
                        <Check size={14} />
                        Added
                      </span>
                    ) : (
                      <>
                        <button
                          className="secondary-btn compact"
                          onClick={() =>
                            dismiss(
                              item
                            )
                          }
                          title="Dismiss"
                        >
                          <X size={14} />
                        </button>

                        <button
                          className="primary-btn"
                          onClick={() =>
                            addEventShare(
                              item
                            )
                          }
                        >
                          <CalendarPlus size={15} />
                          Add to my week
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            }
          )}
        </div>
      )}
    </section>
  )
}
