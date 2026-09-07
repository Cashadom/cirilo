import React, { useState } from 'react'
import {
  AtSign,
  Check,
  Mail,
  Send,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  createEmailShare,
  openEmailClientForShares,
  shareToCiriloId,
} from '../services/shareService'

export default function ShareEventDialog({
  event,
  open,
  onClose,
  onShared,
}) {
  const {
    firebaseUser,
    profile,
  } = useAuth()

  const [mode, setMode] =
    useState('cirilo')

  const [value, setValue] =
    useState('')

  const [sent, setSent] =
    useState(false)

  const [error, setError] =
    useState('')

  if (!open || !event) return null

  const valid =
    mode === 'cirilo'
      ? /^cirilo_\d{6}$/i.test(
          value.trim()
        )
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          value.trim()
        )

  async function send() {
    if (
      !valid ||
      !firebaseUser ||
      !profile
    ) {
      return
    }

    setError('')

    try {
      const sender = {
        uid:
          firebaseUser.uid,

        ciriloId:
          profile.ciriloId,

        displayName:
          profile.displayName ||
          firebaseUser.displayName ||
          'Cirilo user',
      }

      if (mode === 'cirilo') {
        const cleanId =
          value
            .trim()
            .toLowerCase()

        await shareToCiriloId({
          sender,
          ciriloId: cleanId,
          event,
        })

        await onShared?.({
          type: 'cirilo',
          value: cleanId,
        })
      } else {
        const cleanEmail =
          value
            .trim()
            .toLowerCase()

        const share =
          await createEmailShare({
            sender,
            recipientEmail:
              cleanEmail,
            event,
          })

        await onShared?.({
          type: 'email',
          value: cleanEmail,
        })

        openEmailClientForShares({
          senderName:
            sender.displayName,
          event,
          shares: [share],
        })
      }

      setSent(true)

      setTimeout(() => {
        setSent(false)
        setValue('')
        onClose()
      }, 1000)
    } catch (err) {
      setError(
        err.message ||
        'Could not share this event.'
      )
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="share-event-dialog"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="share-event-head">
          <div>
            <span className="eyebrow">
              Send event
            </span>

            <h2>
              {event.title}
            </h2>
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="share-mode-tabs">
          <button
            className={
              mode === 'cirilo'
                ? 'active'
                : ''
            }
            onClick={() => {
              setMode('cirilo')
              setValue('')
              setError('')
            }}
          >
            <AtSign size={15} />
            Cirilo ID
          </button>

          <button
            className={
              mode === 'email'
                ? 'active'
                : ''
            }
            onClick={() => {
              setMode('email')
              setValue('')
              setError('')
            }}
          >
            <Mail size={15} />
            Email
          </button>
        </div>

        <label className="field">
          {mode === 'cirilo'
            ? 'Recipient Cirilo ID'
            : 'Recipient email'}

          <input
            autoFocus
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            placeholder={
              mode === 'cirilo'
                ? 'cirilo_125621'
                : 'client@gmail.com'
            }
          />
        </label>

        <div className="share-preview">
          <span>
            They will receive
          </span>

          <p>
            <b>Cirilo</b> · Shared by
            @{profile?.ciriloId}
          </p>

          <strong>
            {event.title}
          </strong>

          <small>
            {event.date} ·{' '}
            {event.startTime} —{' '}
            {event.endTime}
          </small>
        </div>

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

        <button
          className="primary-btn share-send"
          disabled={!valid || sent}
          onClick={send}
        >
          {sent ? (
            <>
              <Check size={16} />
              Sent
            </>
          ) : (
            <>
              <Send size={16} />
              Send event
            </>
          )}
        </button>

        <p className="prototype-note">
          {mode === 'cirilo'
            ? 'Delivered directly to the recipient’s Cirilo Inbox.'
            : 'The guest can open the secure card without a Cirilo account.'}
        </p>
      </div>
    </div>
  )
}
