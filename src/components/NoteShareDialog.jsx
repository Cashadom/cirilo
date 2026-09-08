import React, { useMemo, useState } from 'react'
import {
  AtSign,
  Check,
  Lock,
  Mail,
  Send,
  Share2,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  createSharedNoteLink,
  markNoteItemShared,
  openNoteEmailClient,
  shareNoteToCirilo,
} from '../services/notesService'
import { getSharePolicy } from '../services/sharePermissions'

export default function NoteShareDialog({
  open,
  payload,
  onClose,
  onShared,
}) {
  const { firebaseUser, profile } = useAuth()
  const [mode, setMode] = useState('cirilo')
  const [value, setValue] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const policy = useMemo(() => {
    if (!payload) return 'private'
    return getSharePolicy(payload.type === 'note' ? payload.note : payload)
  }, [payload])

  if (!open || !payload || !firebaseUser) return null

  const valid =
    mode === 'cirilo'
      ? /^cirilo_\d{6,10}$/i.test(value.trim())
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const title =
    payload.type === 'item' ? payload.item?.text : payload.note?.title

  const isForward = Boolean(payload.threadId)
  const forwardingBlocked = isForward && policy === 'private'

  async function send() {
    if (!valid || forwardingBlocked) return

    setError('')

    const sender = {
      uid: firebaseUser.uid,
      ciriloId: profile?.ciriloId || '',
      displayName:
        profile?.displayName || firebaseUser.displayName || 'Cirilo user',
      photoURL: profile?.photoURL || firebaseUser.photoURL || '',
    }

    const sharePayload = {
      ...payload,
      sharePolicy: policy,
      visibility: policy === 'shareable' ? 'shared' : 'private',
      threadId: payload.threadId || '',
    }

    try {
      if (mode === 'cirilo') {
        await shareNoteToCirilo({
          sender,
          recipientCiriloId: value.trim().toLowerCase(),
          payload: sharePayload,
        })
      } else {
        const share = await createSharedNoteLink({
          sender,
          recipientEmail: value.trim().toLowerCase(),
          payload: sharePayload,
        })

        openNoteEmailClient({
          senderName: sender.displayName,
          share: { ...share, payload: sharePayload },
        })
      }

      if (
        payload.type === 'item' &&
        payload.noteId &&
        payload.item?.id &&
        !isForward
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
      setError(err.message || 'Could not share this.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="share-event-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="share-event-head">
          <div>
            <span className="eyebrow">{isForward ? 'Forward' : 'Share'}</span>
            <h2>{title}</h2>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={`share-policy-box ${policy}`}>
          {policy === 'shareable' ? <Share2 size={14} /> : <Lock size={14} />}
          <div>
            <strong>{policy === 'shareable' ? 'Shareable' : 'Private'}</strong>
            <small>
              {policy === 'shareable'
                ? 'Recipients may forward it. The original content stays locked.'
                : 'Recipients can read and reply, but cannot forward it.'}
            </small>
          </div>
        </div>

        {forwardingBlocked ? (
          <div className="form-error">
            This content is private. Only the original organizer can share it
            with another person.
          </div>
        ) : (
          <>
            <div className="share-mode-tabs">
              <button
                className={mode === 'cirilo' ? 'active' : ''}
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
                className={mode === 'email' ? 'active' : ''}
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
              {mode === 'cirilo' ? 'Recipient Cirilo ID' : 'Recipient email'}
              <input
                autoFocus
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={
                  mode === 'cirilo' ? 'cirilo_828621' : 'friend@gmail.com'
                }
              />
            </label>

            <div className="share-preview">
              <span>They will receive</span>
              <p>
                {isForward
                  ? `Original from ${payload.originalSenderCiriloId || 'Cirilo'} · forwarded by ${profile?.ciriloId || ''}`
                  : `From ${profile?.ciriloId || ''}`}
              </p>
              <strong>{title}</strong>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button
              className="primary-btn share-send"
              disabled={!valid || sent}
              onClick={send}
            >
              {sent ? (
                <>
                  <Check size={15} /> Sent
                </>
              ) : (
                <>
                  <Send size={15} /> {isForward ? 'Forward' : 'Share'}
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
