import React, { useState } from 'react'
import { AtSign, Check, Mail, Send, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  createSharedNoteLink,
  markNoteItemShared,
  openNoteEmailClient,
  shareNoteToCirilo,
} from '../services/notesService'
import { resolveCiriloContact, touchSharedContacts } from '../services/contactService'
import SharePicker from './SharePicker'

export default function NoteShareDialog({ open, payload, onClose, onShared }) {
  const { firebaseUser, profile } = useAuth()
  const [mode, setMode] = useState('cirilo')
  const [recipientIds, setRecipientIds] = useState([])
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!open || !payload || !firebaseUser) return null

  const title = payload.type === 'item' ? payload.item?.text : payload.note?.title
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const valid = mode === 'cirilo' ? recipientIds.length > 0 : emailValid

  async function send() {
    if (!valid) return
    setError('')

    const sender = {
      uid: firebaseUser.uid,
      ciriloId: profile?.ciriloId || '',
      displayName: profile?.displayName || firebaseUser.displayName || 'Cirilo user',
      photoURL: profile?.photoURL || firebaseUser.photoURL || '',
    }

    try {
      if (mode === 'cirilo') {
        const uniqueIds = [...new Set(recipientIds.map(id => id.trim().toLowerCase()).filter(Boolean))]

        // Keep one immutable Notes thread for every recipient of the same share.
        let threadId = payload.threadId || ''

        for (const recipientCiriloId of uniqueIds) {
          threadId = await shareNoteToCirilo({
            sender,
            recipientCiriloId,
            payload: threadId ? { ...payload, threadId } : payload,
          })
        }

        const recipients = await Promise.all(uniqueIds.map(id => resolveCiriloContact(id)))
        await touchSharedContacts(firebaseUser.uid, recipients)
      } else {
        const share = await createSharedNoteLink({
          sender,
          recipientEmail: email.trim().toLowerCase(),
          payload,
        })

        openNoteEmailClient({ senderName: sender.displayName, share: { ...share, payload } })
      }

      if (payload.type === 'item' && payload.noteId && payload.item?.id) {
        await markNoteItemShared(firebaseUser.uid, payload.noteId, payload.item.id)
      }

      await onShared?.()
      setSent(true)

      setTimeout(() => {
        setSent(false)
        setRecipientIds([])
        setEmail('')
        onClose()
      }, 800)
    } catch (err) {
      setError(err?.message || 'Could not share this.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="share-event-dialog" onMouseDown={event => event.stopPropagation()}>
        <div className="share-event-head">
          <div>
            <span className="eyebrow">Share</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="share-mode-tabs">
          <button className={mode === 'cirilo' ? 'active' : ''} onClick={() => { setMode('cirilo'); setError('') }}>
            <AtSign size={15} /> Cirilo
          </button>
          <button className={mode === 'email' ? 'active' : ''} onClick={() => { setMode('email'); setError('') }}>
            <Mail size={15} /> Email
          </button>
        </div>

        {mode === 'cirilo' ? (
          <SharePicker value={recipientIds} onChange={setRecipientIds} title="Share note with" compact />
        ) : (
          <label className="field">
            Recipient email
            <input autoFocus value={email} onChange={event => setEmail(event.target.value)} placeholder="friend@gmail.com" />
          </label>
        )}

        <div className="share-preview">
          <span>They will receive</span>
          <p>Shared by @{profile?.ciriloId}</p>
          <strong>{title}</strong>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-btn share-send" disabled={!valid || sent} onClick={send}>
          {sent ? <><Check size={15} /> Sent</> : <><Send size={15} /> {mode === 'cirilo' && recipientIds.length > 1 ? `Share with ${recipientIds.length} people` : 'Share'}</>}
        </button>
      </div>
    </div>
  )
}
