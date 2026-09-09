import React, { useEffect, useState } from 'react'
import { FileCheck2, Plus, Save, Trash2, X } from 'lucide-react'

function makeItem(text = '') {
  return { id: crypto.randomUUID(), text }
}

function emptyTemplate() {
  return {
    id: '',
    name: '',
    description: '',
    checklist: [makeItem()],
  }
}

export default function TambaTemplateModal({
  open,
  templates = [],
  onClose,
  onSave,
  onDelete,
  onUse,
}) {
  const [form, setForm] = useState(emptyTemplate())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(emptyTemplate())
      setError('')
      setSaving(false)
    }
  }, [open])

  if (!open) return null

  const editTemplate = template => {
    setForm({
      id: template.id,
      name: template.name || '',
      description: template.description || '',
      checklist:
        Array.isArray(template.checklist) && template.checklist.length
          ? template.checklist.map(item => ({
              id: item.id || crypto.randomUUID(),
              text: item.text || '',
            }))
          : [makeItem()],
    })
    setError('')
  }

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      checklist: [...prev.checklist, makeItem()],
    }))
  }

  const updateItem = (id, value) => {
    setForm(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, text: value } : item
      ),
    }))
  }

  const removeItem = id => {
    setForm(prev => ({
      ...prev,
      checklist:
        prev.checklist.length === 1
          ? prev.checklist
          : prev.checklist.filter(item => item.id !== id),
    }))
  }

  const save = async () => {
    const checklist = form.checklist
      .map(item => ({ ...item, text: item.text.trim() }))
      .filter(item => item.text)

    if (!form.name.trim()) {
      setError('Add a template name.')
      return
    }
    if (!checklist.length) {
      setError('Add at least one checklist item.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        checklist,
      })
      setForm(emptyTemplate())
    } catch (err) {
      setError(err?.message || 'Could not save the template.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="tamba-template-modal">
        <header className="tamba-modal-head">
          <div>
            <span className="eyebrow">Tamba Field Work</span>
            <h2>Job templates</h2>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </header>

        <div className="tamba-template-layout">
          <aside className="tamba-template-library">
            <div className="tamba-section-head">
              <div>
                <strong>Your templates</strong>
                <small>{templates.length} saved</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setForm(emptyTemplate())}
                title="New template"
              >
                <Plus size={15} />
              </button>
            </div>

            <div className="tamba-template-library-list">
              {templates.length === 0 ? (
                <div className="tamba-template-empty">
                  <FileCheck2 size={20} />
                  <span>No templates yet.</span>
                </div>
              ) : (
                templates.map(template => (
                  <button
                    type="button"
                    key={template.id}
                    className={
                      form.id === template.id
                        ? 'tamba-template-library-row active'
                        : 'tamba-template-library-row'
                    }
                    onClick={() => editTemplate(template)}
                  >
                    <strong>{template.name}</strong>
                    <small>
                      {(template.checklist || []).length} checklist items
                    </small>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="tamba-template-editor">
            <label className="field">
              Template name
              <input
                value={form.name}
                onChange={event =>
                  setForm(prev => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Office cleaning"
              />
            </label>

            <label className="field">
              Description
              <textarea
                rows={3}
                value={form.description}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Optional description"
              />
            </label>

            <div className="tamba-section-head">
              <div>
                <strong>Checklist</strong>
                <small>These items will be copied into each new job.</small>
              </div>
              <button
                type="button"
                className="secondary-btn compact"
                onClick={addItem}
              >
                <Plus size={14} /> Add item
              </button>
            </div>

            <div className="tamba-template-checklist">
              {form.checklist.map((item, index) => (
                <div key={item.id} className="tamba-template-checklist-row">
                  <span>{index + 1}</span>
                  <input
                    value={item.text}
                    onChange={event => updateItem(item.id, event.target.value)}
                    placeholder={`Checklist item ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeItem(item.id)}
                    disabled={form.checklist.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {error && <div className="form-error">{error}</div>}

            <footer className="tamba-template-footer">
              <div>
                {form.id && (
                  <>
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => onDelete(form.id)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() =>
                        onUse({
                          ...form,
                          checklist: form.checklist.filter(item =>
                            item.text.trim()
                          ),
                        })
                      }
                    >
                      Use template
                    </button>
                  </>
                )}
              </div>
              <button
                type="button"
                className="primary-btn"
                onClick={save}
                disabled={saving}
              >
                <Save size={15} />
                {saving ? 'Saving…' : 'Save template'}
              </button>
            </footer>
          </section>
        </div>
      </div>
    </div>
  )
}
