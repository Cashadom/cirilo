import React, { useEffect, useState } from 'react'
import {
  BookmarkPlus,
  Lock,
  LogIn,
  Share2,
  X,
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function SharedNotePage({
  token,
  onClose,
  onSave,
  onJoin,
}) {
  const { firebaseUser } = useAuth()
  const [share, setShare] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDoc(doc(db, 'sharedNotes', token))
      .then((snapshot) => {
        if (!snapshot.exists() || snapshot.data().revoked) {
          setError('This shared note is no longer available.')
          return
        }

        setShare(snapshot.data())
      })
      .catch(() => setError('This shared note could not be opened.'))
  }, [token])

  if (error) {
    return (
      <div className="public-page-backdrop">
        <div className="shared-card-error">
          <p>{error}</p>
          <button className="secondary-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  if (!share) return null

  const payload = share.payload || {}
  const isItem = payload?.type === 'item'
  const title = isItem ? payload.item?.text : payload.note?.title
  const items = isItem ? [payload.item] : payload.note?.items || []
  const policy = share.sharePolicy || payload.sharePolicy || 'private'
  const originalSender =
    share.originalSenderCiriloId || share.senderCiriloId || ''

  return (
    <div className="public-page-backdrop">
      <article className="shared-note-page">
        <button className="icon-btn shared-note-close" onClick={onClose}>
          <X size={18} />
        </button>

        <span className="eyebrow">Shared note</span>
        <h1>{title}</h1>

        <p className="shared-note-from">
          From {originalSender}
          {share.forwardedByCiriloId
            ? ` · Forwarded by ${share.forwardedByCiriloId}`
            : ''}
        </p>

        <div className={`shared-note-policy ${policy}`}>
          {policy === 'shareable' ? <Share2 size={13} /> : <Lock size={13} />}
          {policy === 'shareable'
            ? 'Shareable · original content remains locked'
            : 'Private · forwarding is disabled'}
        </div>

        <div className="shared-note-items">
          {items.map((item) => (
            <div key={item.id} className="shared-note-row">
              <span />
              <p>{item.text}</p>
            </div>
          ))}
        </div>

        <div className="public-page-actions">
          {firebaseUser ? (
            <button
              className="primary-btn"
              onClick={() =>
                onSave(payload, {
                  ...share,
                  receivedSnapshot: true,
                  lockedForRecipient: true,
                })
              }
            >
              <BookmarkPlus size={15} />
              Save my copy
            </button>
          ) : (
            <button className="primary-btn" onClick={onJoin}>
              <LogIn size={15} />
              Create a Cirilo account
            </button>
          )}
        </div>

        <p className="prototype-note">
          The sender cannot later rewrite or remove the copy you keep in Cirilo.
        </p>
      </article>
    </div>
  )
}
