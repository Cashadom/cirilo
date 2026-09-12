import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CalendarPlus,
  NotebookPen,
  Download,
  Trash2,
  X,
} from 'lucide-react'
import { exportTalentPdf } from '../services/talentPdfService'

const emptyTalent = {
  id: '',
  firstName: '',
  lastName: '',
  jobTitle: '',
  email: '',
  phone: '',
  location: '',
  source: '',
  availability: '',
  salary: '',
  notes: '',
  clientComment: '',
  status: 'new',
}

export default function TalentModal({
  open,
  talent,
  onClose,
  onSave,
  onDelete,
  onAddInterview,
  onCreateNote,
}) {
  const [form, setForm] = useState(emptyTalent)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    setForm({
      ...emptyTalent,
      ...talent,
      id: talent?.id || crypto.randomUUID(),
    })

    setBusy('')
    setError('')
  }, [open, talent])

  const existingTalent = Boolean(talent?.id)

  const fullName = useMemo(
    () =>
      [form.firstName, form.lastName]
        .filter(Boolean)
        .join(' ') || 'Talent',
    [form.firstName, form.lastName]
  )

  if (!open) return null

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function save() {
    if (
      !form.firstName.trim() &&
      !form.lastName.trim()
    ) {
      setError('Add at least a first name or last name.')
      return
    }

    try {
      setBusy('save')
      setError('')

      await onSave({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      })

      onClose()
    } catch (err) {
      console.error(err)
      setError(
        err?.message || 'Could not save this talent.'
      )
    } finally {
      setBusy('')
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="talent-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="talent-modal-head">
          <div>
            <span className="eyebrow">
              Talents
            </span>

            <h2>
              {existingTalent
                ? fullName
                : 'Add talent'}
            </h2>

            <p>
              Candidate profile and recruitment follow-up.
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="talent-modal-layout">
          <div className="talent-modal-main">
            <section className="talent-form-section">
              <h3>Identity</h3>

              <div className="talent-form-grid">
                <label className="field">
                  First name
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      update(
                        'firstName',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="field">
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      update(
                        'lastName',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="field span-2">
                  Job / Position
                  <input
                    value={form.jobTitle}
                    onChange={(event) =>
                      update(
                        'jobTitle',
                        event.target.value
                      )
                    }
                    placeholder="Sales Manager, Technician..."
                  />
                </label>

                <label className="field">
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      update(
                        'email',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="field">
                  Phone
                  <input
                    value={form.phone}
                    onChange={(event) =>
                      update(
                        'phone',
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="field">
                  Location
                  <input
                    value={form.location}
                    onChange={(event) =>
                      update(
                        'location',
                        event.target.value
                      )
                    }
                    placeholder="Lyon, Marseille..."
                  />
                </label>

                <label className="field">
                  Source
                  <input
                    value={form.source}
                    onChange={(event) =>
                      update(
                        'source',
                        event.target.value
                      )
                    }
                    placeholder="LinkedIn, referral..."
                  />
                </label>

                <label className="field">
                  Availability
                  <input
                    value={form.availability}
                    onChange={(event) =>
                      update(
                        'availability',
                        event.target.value
                      )
                    }
                    placeholder="Immediate, 1 month..."
                  />
                </label>

                <label className="field">
                  Salary / Rate
                  <input
                    value={form.salary}
                    onChange={(event) =>
                      update(
                        'salary',
                        event.target.value
                      )
                    }
                    placeholder="€45K, €500/day..."
                  />
                </label>
              </div>
            </section>

            <section className="talent-form-section">
              <h3>Notes</h3>

              <label className="field">
                Internal notes
                <textarea
                  rows="5"
                  value={form.notes}
                  onChange={(event) =>
                    update('notes', event.target.value)
                  }
                  placeholder="Private recruitment notes. Never included in the anonymous client export."
                />
              </label>

              <label className="field talent-client-comment">
                Client comment
                <textarea
                  rows="5"
                  value={form.clientComment}
                  onChange={(event) =>
                    update('clientComment', event.target.value)
                  }
                  placeholder="Shareable candidate summary for the client..."
                />
              </label>
            </section>
          </div>

          <aside className="talent-side">
            <section className="talent-side-block">
              <h3>Recruitment</h3>

              <label className="field">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    update(
                      'status',
                      event.target.value
                    )
                  }
                >
                  <option value="new">
                    New
                  </option>

                  <option value="interview">
                    Interview
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="hired">
                    Hired
                  </option>

                  <option value="rejected">
                    Rejected
                  </option>
                </select>
              </label>
            </section>

            {existingTalent && (
              <>
                <section className="talent-side-block">
                  <h3>Cirilo</h3>

                  <button
                    type="button"
                    className="secondary-btn talent-action-btn"
                    onClick={() =>
                      onAddInterview(form)
                    }
                  >
                    <CalendarPlus size={15} />
                    Add interview to Week
                  </button>

                  <button
                    type="button"
                    className="secondary-btn talent-action-btn"
                    onClick={() =>
                      onCreateNote(form)
                    }
                  >
                    <NotebookPen size={15} />
                    Create interview note
                  </button>
                </section>

                <section className="talent-side-block">
                  <h3>Export</h3>

                  <button
                    type="button"
                    className="secondary-btn talent-action-btn"
                    onClick={() => exportTalentPdf(form, 'full')}
                  >
                    <Download size={15} />
                    Full profile
                  </button>

                  <button
                    type="button"
                    className="secondary-btn talent-action-btn"
                    onClick={() => exportTalentPdf(form, 'client')}
                  >
                    <Download size={15} />
                    Anonymous client profile
                  </button>

                  <p className="talent-export-help">
                    Client export hides email, phone, source, salary and internal notes.
                  </p>
                </section>
              </>
            )}
          </aside>
        </div>

        {error && (
          <div className="form-error talent-error">
            {error}
          </div>
        )}

        <footer className="modal-footer talent-modal-footer">
          {existingTalent ? (
            <button
              type="button"
              className="danger-btn"
              onClick={() =>
                onDelete(form.id)
              }
            >
              <Trash2 size={15} />
              Delete
            </button>
          ) : (
            <span />
          )}

          <div>
            <button
              type="button"
              className="secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={save}
              disabled={busy === 'save'}
            >
              {busy === 'save'
                ? 'Saving...'
                : 'Save talent'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
