import React, {
  useEffect,
  useState,
} from 'react'
import {
  CalendarPlus,
  Download,
  LogIn,
  X,
} from 'lucide-react'
import {
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { CATEGORIES } from '../utils/calendar'

function icsDate(date, time) {
  return `${date.replaceAll('-', '')}T${time.replace(':', '')}00`
}

function downloadIcs(event) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cirilo//Shared Event//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@cirilo.fr`,
    `DTSTART:${icsDate(event.date, event.startTime)}`,
    `DTEND:${icsDate(event.date, event.endTime)}`,
    `SUMMARY:${(event.title || '').replaceAll('\n', ' ')}`,
    event.location
      ? `LOCATION:${event.location.replaceAll('\n', ' ')}`
      : '',
    event.notes
      ? `DESCRIPTION:${event.notes.replaceAll('\n', '\\n')}`
      : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob(
    [lines.join('\r\n')],
    {
      type:
        'text/calendar;charset=utf-8',
    }
  )

  const url =
    URL.createObjectURL(blob)

  const anchor =
    document.createElement('a')

  anchor.href = url
  anchor.download =
    'cirilo-event.ics'

  anchor.click()

  URL.revokeObjectURL(url)
}

export default function SharedCardPage({
  token,
  onClose,
  onAdd,
  onJoin,
}) {
  const { firebaseUser } =
    useAuth()

  const [share, setShare] =
    useState(null)

  const [error, setError] =
    useState('')

  useEffect(() => {
    getDoc(
      doc(db, 'sharedCards', token)
    )
      .then((snapshot) => {
        if (
          !snapshot.exists() ||
          snapshot.data().revoked
        ) {
          setError(
            'This shared card is no longer available.'
          )
          return
        }

        setShare(
          snapshot.data()
        )
      })
      .catch(() =>
        setError(
          'This shared card could not be opened.'
        )
      )
  }, [token])

  if (error) {
    return (
      <div className="public-page-backdrop">
        <div className="shared-card-error">
          <p>{error}</p>

          <button
            className="secondary-btn"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!share) return null

  const event = share.event

  const cat =
    CATEGORIES[event.category] ||
    CATEGORIES.personal

  const originId =
    share.senderCiriloId ||
    event.createdByCiriloId ||
    ''

  return (
    <div className="public-page-backdrop">
      <article
        className="public-event-page"
        style={{
          '--cat': cat.color,
          '--cat-2': cat.ribbon2,
        }}
      >
        <span className="life-ribbon public-ribbon-back" />
        <span className="life-ribbon public-ribbon-front" />

        <button
          className="icon-btn public-close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <span className="public-label">
          Shared by{' '}
          {originId
            ? `@${originId}`
            : 'a Cirilo user'}
        </span>

        <h1>
          {event.title}
        </h1>

        <p className="public-page-date">
          {event.date} ·{' '}
          {event.startTime} —{' '}
          {event.endTime}
        </p>

        {event.location && (
          <p className="shared-card-location">
            {event.location}
          </p>
        )}

        {event.notes && (
          <div className="public-page-notes">
            <span className="eyebrow">
              Notes
            </span>

            <p>
              {event.notes}
            </p>
          </div>
        )}

        <div className="public-page-actions">
          <button
            className="secondary-btn"
            onClick={() =>
              downloadIcs(event)
            }
          >
            <Download size={16} />
            Add to calendar
          </button>

          {firebaseUser ? (
            <button
              className="primary-btn"
              onClick={() =>
                onAdd({
                  ...event,

                  id:
                    crypto.randomUUID(),

                  completed:
                    false,

                  visibility:
                    'private',

                  isSharedEvent:
                    true,

                  lockedForRecipient:
                    true,

                  sharedBy:
                    originId,

                  sharedByCiriloId:
                    originId,

                  createdByUid:
                    share.senderUid ||
                    event.createdByUid ||
                    '',

                  createdByCiriloId:
                    originId,
                })
              }
            >
              <CalendarPlus size={16} />
              Add to my week
            </button>
          ) : (
            <button
              className="primary-btn"
              onClick={() => {
                localStorage.setItem(
                  'cirilo.pendingShareToken',
                  token
                )

                onJoin?.()
              }}
            >
              <LogIn size={16} />
              Create a Cirilo account
            </button>
          )}
        </div>

        {!firebaseUser && (
          <p className="prototype-note">
            No Cirilo account is required to view this card.
            Create one to keep the event in your week.
          </p>
        )}
      </article>
    </div>
  )
}
