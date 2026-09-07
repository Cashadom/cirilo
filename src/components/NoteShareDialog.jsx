import React, {
  useState,
} from 'react'
import {
  AtSign,
  Check,
  Mail,
  Send,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  createSharedNoteLink,
  markNoteItemShared,
  openNoteEmailClient,
  shareNoteToCirilo,
} from '../services/notesService'

export default function NoteShareDialog({
  open,
  payload,
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

  if (
    !open ||
    !payload ||
    !firebaseUser
  ) {
    return null
  }

  const valid =
    mode === 'cirilo'
      ? /^cirilo_\d{6}$/i.test(
          value.trim()
        )
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          value.trim()
        )

  const title =
    payload.type === 'item'
      ? payload.item?.text
      : payload.note?.title

  async function send() {
    if (!valid) return

    setError('')

    const sender = {
      uid: firebaseUser.uid,
      ciriloId: profile?.ciriloId || '',
      displayName:
        profile?.displayName ||
        firebaseUser.displayName ||
        'Cirilo user',
      photoURL:
        profile?.photoURL ||
        firebaseUser.photoURL ||
        '',
    }

    try {
      if (mode === 'cirilo') {
        await shareNoteToCirilo({
          sender,
          recipientCiriloId:
            value.trim().toLowerCase(),
          payload,
        })
      } else {
        const share =
          await createSharedNoteLink({
            sender,
            recipientEmail:
              value.trim().toLowerCase(),
            payload,
          })

        openNoteEmailClient({
          senderName:
            sender.displayName,
          share: {
            ...share,
            payload,
          },
        })
      }

      if (
        payload.type === 'item' &&
        payload.noteId &&
        payload.item?.id
      ) {
        await markNoteItemShared(
          firebaseUser.uid,
          payload.noteId,
          payload.item.id
        )
      }

      await onShared?.()

      setSent(true)

      setTimeout(() => {
        setSent(false)
        setValue('')
        onClose()
      }, 800)
    } catch (err) {
      setError(
        err.message ||
        'Could not share this.'
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
              Share
            </span>

            <h2>
              {title}
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
              setValue(
                event.target.value
              )
            }
            placeholder={
              mode === 'cirilo'
                ? 'cirilo_828621'
                : 'friend@gmail.com'
            }
          />
        </label>

        <div className="share-preview">
          <span>
            They will receive
          </span>

          <p>
            Shared by
            @{profile?.ciriloId}
          </p>

          <strong>
            {title}
          </strong>
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
              <Check size={15} />
              Sent
            </>
          ) : (
            <>
              <Send size={15} />
              Share
            </>
          )}
        </button>
      </div>
    </div>
  )
}
