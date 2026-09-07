import React, {
  useEffect,
  useState,
} from 'react'
import {
  AlignLeft,
  Bell,
  ListPlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

const UNIVERSES = [
  ['personal', 'Personal'],
  ['pro', 'Pro'],
  ['study', 'Study'],
  ['health', 'Health'],
]

const blankBlock = (kind = 'item') => ({
  id: crypto.randomUUID(),
  kind,
  text: '',
  status: 'active',
  reminderType: 'none',
  nextReminderAt: '',
  lastRemindedAt: '',
  hasBeenShared: false,
  createdAt: new Date().toISOString(),
})

const empty = {
  title: '',
  universe: 'personal',
  visibility: 'private',
  items: [blankBlock('item')],
}

export default function NoteModal({
  open,
  note,
  focusItemId = '',
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    setForm(
      note
        ? {
            ...note,
            items: note.items?.length
              ? note.items.map((block) => ({
                  ...block,
                  kind: block.kind === 'text' ? 'text' : 'item',
                }))
              : [blankBlock('item')],
          }
        : {
            ...empty,
            items: [blankBlock('item')],
          }
    )

    setError('')
  }, [open, note])

  useEffect(() => {
    if (!open || !focusItemId) return

    const timer = window.setTimeout(() => {
      document
        .querySelector(`[data-note-block-id="${focusItemId}"]`)
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
    }, 80)

    return () => window.clearTimeout(timer)
  }, [open, focusItemId, form.items.length])

  if (!open) return null

  const updateBlock = (id, patch) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((block) =>
        block.id === id
          ? {
              ...block,
              ...patch,
            }
          : block
      ),
    }))
  }

  const removeBlock = (id) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (block) => block.id !== id
      ),
    }))
  }

  const addBlock = (kind) => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        blankBlock(kind),
      ],
    }))
  }

  const save = () => {
    const items = form.items
      .map((block) => ({
        ...block,
        kind: block.kind === 'text' ? 'text' : 'item',
        text: block.text.trim(),
        reminderType:
          block.kind === 'text'
            ? 'none'
            : block.reminderType || 'none',
        nextReminderAt:
          block.kind === 'text'
            ? ''
            : block.nextReminderAt || '',
      }))
      .filter((block) => block.text)

    if (!form.title.trim()) {
      setError('Add a list title.')
      return
    }

    if (!items.length) {
      setError('Add at least one item or free text block.')
      return
    }

    onSave({
      ...form,
      title: form.title.trim(),
      items,
    })
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="note-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <header className="note-modal-head">
          <div>
            <span className="eyebrow">
              {note ? 'Edit list' : 'New list'}
            </span>

            <h2>
              {note
                ? 'Keep it alive.'
                : 'Save it before you forget it.'}
            </h2>
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="modal-grid">
          <label className="field span-2">
            List title

            <input
              autoFocus
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Movies to watch"
            />
          </label>

          <label className="field">
            Universe

            <select
              value={form.universe}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  universe: event.target.value,
                }))
              }
            >
              {UNIVERSES.map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Visibility

            <select
              value={form.visibility}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  visibility: event.target.value,
                }))
              }
            >
              <option value="private">
                Private
              </option>

              <option value="shared">
                Shareable
              </option>
            </select>
          </label>
        </div>

        <div className="note-items-editor">
          <div className="note-items-editor-head">
            <span>Items</span>

            <div
              style={{
                display: 'flex',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="secondary-btn compact"
                onClick={() => addBlock('text')}
                type="button"
              >
                <AlignLeft size={14} />
                Free text
              </button>

              <button
                className="secondary-btn compact"
                onClick={() => addBlock('item')}
                type="button"
              >
                <ListPlus size={14} />
                Add item
              </button>
            </div>
          </div>

          {form.items.map((block, index) => {
            const isText = block.kind === 'text'
            const isFocused = block.id === focusItemId

            return (
              <div
                key={block.id}
                data-note-block-id={block.id}
                style={{
                  marginBottom: 8,
                  padding: isFocused ? 6 : 0,
                  borderRadius: 10,
                  background: isFocused
                    ? '#fafafa'
                    : 'transparent',
                }}
              >
                {isText ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '24px minmax(0,1fr) 36px',
                      gap: 8,
                      alignItems: 'start',
                    }}
                  >
                    <span className="note-item-number">
                      {index + 1}
                    </span>

                    <textarea
                      rows={4}
                      value={block.text}
                      onChange={(event) =>
                        updateBlock(
                          block.id,
                          {
                            text: event.target.value,
                          }
                        )
                      }
                      placeholder="Write anything here… shopping details, ideas, links, notes…"
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        minHeight: 92,
                        border: '1px solid #e0e3e6',
                        borderRadius: 9,
                        padding: '10px 11px',
                        outline: 'none',
                        font: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />

                    <button
                      className="icon-btn note-delete-item"
                      type="button"
                      onClick={() =>
                        removeBlock(block.id)
                      }
                      disabled={form.items.length === 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="note-item-editor">
                    <span className="note-item-number">
                      {index + 1}
                    </span>

                    <input
                      value={block.text}
                      onChange={(event) =>
                        updateBlock(
                          block.id,
                          {
                            text: event.target.value,
                          }
                        )
                      }
                      placeholder={
                        form.universe === 'health'
                          ? 'Dentist check-up'
                          : form.universe === 'study'
                            ? 'Read chapter 4'
                            : form.universe === 'pro'
                              ? 'Negotiation training'
                              : 'La 25e heure'
                      }
                    />

                    <label className="note-reminder-select">
                      <Bell size={13} />

                      <select
                        value={block.reminderType}
                        onChange={(event) =>
                          updateBlock(
                            block.id,
                            {
                              reminderType: event.target.value,
                              nextReminderAt:
                                event.target.value === 'monthly'
                                  ? new Date(
                                      new Date().setMonth(
                                        new Date().getMonth() + 1
                                      )
                                    )
                                      .toISOString()
                                      .slice(0, 10)
                                  : '',
                            }
                          )
                        }
                      >
                        <option value="none">
                          No reminder
                        </option>

                        <option value="monthly">
                          Monthly
                        </option>
                      </select>
                    </label>

                    <button
                      className="icon-btn note-delete-item"
                      type="button"
                      onClick={() =>
                        removeBlock(block.id)
                      }
                      disabled={form.items.length === 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <footer className="modal-footer">
          {note?.id ? (
            <button
              className="danger-btn"
              onClick={() => onDelete(note.id)}
            >
              <Trash2 size={15} />
              Delete list
            </button>
          ) : (
            <span />
          )}

          <div>
            <button
              className="secondary-btn"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="primary-btn"
              onClick={save}
            >
              Save list
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
