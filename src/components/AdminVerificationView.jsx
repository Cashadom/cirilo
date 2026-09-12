import React, { useEffect, useState } from 'react'
import {
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import {
  listMunicipalityVerifications,
  reviewMunicipalityVerification,
} from '../services/verificationService'

export default function AdminVerificationView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState('')
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')

    try {
      setItems(
        await listMunicipalityVerifications()
      )
    } catch (e) {
      setError(
        e?.message ||
        'Could not load municipality verifications.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function review(item, decision) {
    const adminNote =
      decision === 'rejected'
        ? window.prompt(
            'Reason for rejection / information required:',
            ''
          ) || ''
        : ''

    setWorking(item.uid)
    setError('')

    try {
      await reviewMunicipalityVerification({
        uid: item.uid,
        decision,
        adminNote,
      })

      await load()
    } catch (e) {
      setError(
        e?.message ||
        'Could not review this municipality.'
      )
    } finally {
      setWorking('')
    }
  }

  return (
    <section className="admin-verifications-view">
      <div className="admin-verifications-intro">
        <div>
          <span className="eyebrow">
            Cirilo Admin
          </span>
          <h2>Municipality verification.</h2>
          <p>
            Only the Cirilo administrator can approve an official municipality identity.
          </p>
        </div>

        <button
          className="secondary-btn"
          type="button"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error ? (
        <p className="form-error">{error}</p>
      ) : null}

      {loading ? (
        <div className="admin-verification-empty">
          <LoaderCircle size={18} />
          Loading requests...
        </div>
      ) : items.length ? (
        <div className="admin-verification-list">
          {items.map(item => (
            <article
              className="admin-verification-card"
              key={item.uid}
            >
              <div className="admin-verification-main">
                <div className="admin-verification-title">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>
                      {item.organizationName ||
                      'Municipality'}
                    </strong>
                    <small>
                      {item.municipalityPostalCode}{' '}
                      {item.municipalityCity}
                    </small>
                  </div>
                </div>

                <dl>
                  <div>
                    <dt>Address</dt>
                    <dd>
                      {item.municipalityAddress || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Website</dt>
                    <dd>
                      {item.organizationWebsite || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>
                      {item.organizationEmail || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Requester</dt>
                    <dd>
                      {item.requesterName || '—'}
                      {item.requesterRole
                        ? ` · ${item.requesterRole}`
                        : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Cirilo ID</dt>
                    <dd>
                      {item.ciriloId || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{item.status}</dd>
                  </div>
                </dl>
              </div>

              <div className="admin-verification-actions">
                <button
                  className="secondary-btn"
                  type="button"
                  disabled={working === item.uid}
                  onClick={() =>
                    review(item, 'rejected')
                  }
                >
                  <XCircle size={15} />
                  Reject
                </button>

                <button
                  className="primary-btn"
                  type="button"
                  disabled={working === item.uid}
                  onClick={() =>
                    review(item, 'verified')
                  }
                >
                  <CheckCircle2 size={15} />
                  Verify municipality
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-verification-empty">
          No municipality waiting for validation.
        </div>
      )}
    </section>
  )
}
