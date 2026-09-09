import React, { useState } from 'react'
import { AtSign, Check, Mail, Send, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  createEmailShare,
  openEmailClientForShares,
  shareToCiriloId,
} from '../services/shareService'
import { resolveCiriloContact, touchSharedContacts } from '../services/contactService'
import SharePicker from './SharePicker'

export default function ShareEventDialog({ event, open, onClose, onShared }) {
  const { firebaseUser, profile } = useAuth()
  const [mode, setMode] = useState('cirilo')
  const [recipientIds, setRecipientIds] = useState([])
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!open || !event) return null

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const valid = mode === 'cirilo' ? recipientIds.length > 0 : emailValid

  async function send() {
    if (!valid || !firebaseUser || !profile) return

    setError('')

    try {
      const sender = {
        uid: firebaseUser.uid,
        ciriloId: profile.ciriloId,
        displayName: profile.displayName || firebaseUser.displayName || 'Cirilo user',
        photoURL: profile.photoURL || firebaseUser.photoURL || '',
      }

      if (mode === 'cirilo') {
        const uniqueIds = [...new Set(recipientIds.map(id => id.trim().toLowerCase()).filter(Boolean))]

        await Promise.all(
          uniqueIds.map(ciriloId =>
            shareToCiriloId({ sender, ciriloId, event })
          )
        )

        const recipients = await Promise.all(
          uniqueIds.map(id => resolveCiriloContact(id))
        )

        await touchSharedContacts(firebaseUser.uid, recipients)

        for (const value of uniqueIds) {
          await onShared?.({ type: 'cirilo', value })
        }
      } else {
        const cleanEmail = email.trim().toLowerCase()
        const share = await createEmailShare({ sender, recipientEmail: cleanEmail, event })
        await onShared?.({ type: 'email', value: cleanEmail })
        openEmailClientForShares({ senderName: sender.displayName, event, shares: [share] })
      }

      setSent(true)
      setTimeout(() => {
        setSent(false)
        setRecipientIds([])
        setEmail('')
        onClose()
      }, 900)
    } catch (err) {
      setError(err?.message || 'Could not share this event.')
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="share-event-dialog" onMouseDown={event => event.stopPropagation()}>
        <div className="share-event-head">
          <div>
            <span className="eyebrow">Send event</span>
            <h2>{event.title}</h2>
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
          <SharePicker value={recipientIds} onChange={setRecipientIds} title="Share event with" compact />
        ) : (
          <label className="field">
            Recipient email
            <input autoFocus value={email} onChange={event => setEmail(event.target.value)} placeholder="client@gmail.com" />
          </label>
        )}

        <div className="share-preview">
          <span>They will receive</span>
          <p><b>Cirilo</b> · Shared by @{profile?.ciriloId}</p>
          <strong>{event.title}</strong>
          <small>{event.date} · {event.startTime} — {event.endTime}</small>
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="primary-btn share-send" disabled={!valid || sent} onClick={send}>
          {sent ? <><Check size={16} /> Sent</> : <><Send size={16} /> {mode === 'cirilo' && recipientIds.length > 1 ? `Send to ${recipientIds.length} people` : 'Send event'}</>}
        </button>

        <p className="prototype-note">
          {mode === 'cirilo' ? 'Delivered to each selected person’s Cirilo Inbox.' : 'The guest can open the secure card without a Cirilo account.'}
        </p>
      </div>
    </div>
  )
}
