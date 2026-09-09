import React, { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  addContact,
  removeTeam,
  saveTeam,
  setContactFavorite,
  subscribeContacts,
  subscribeTeams,
} from '../services/contactService'
import '../share.css'

function timestampValue(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.seconds === 'number') return value.seconds * 1000
  return 0
}

function ContactAvatar({ contact }) {
  if (contact.photoURL) {
    return <img src={contact.photoURL} alt="" referrerPolicy="no-referrer" />
  }

  return (
    <span>
      {(contact.displayName || contact.ciriloId || 'C').trim().charAt(0).toUpperCase()}
    </span>
  )
}

export default function SharePicker({
  value = [],
  onChange,
  title = 'Share with',
  compact = false,
}) {
  const { firebaseUser } = useAuth()
  const [contacts, setContacts] = useState([])
  const [teams, setTeams] = useState([])
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newCiriloId, setNewCiriloId] = useState('')
  const [showTeam, setShowTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseUser?.uid) return undefined

    const stopContacts = subscribeContacts(
      firebaseUser.uid,
      rows => setContacts(rows),
      err => setError(err?.message || 'Could not load contacts.')
    )

    const stopTeams = subscribeTeams(
      firebaseUser.uid,
      rows => setTeams(rows),
      err => setError(err?.message || 'Could not load teams.')
    )

    return () => {
      stopContacts?.()
      stopTeams?.()
    }
  }, [firebaseUser?.uid])

  const selected = useMemo(
    () => new Set((value || []).map(item => String(item).trim().toLowerCase()).filter(Boolean)),
    [value]
  )

  const contactById = useMemo(() => {
    const map = new Map()
    contacts.forEach(contact => map.set(String(contact.ciriloId || '').trim().toLowerCase(), contact))
    return map
  }, [contacts])

  const filteredContacts = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return contacts
    return contacts.filter(contact =>
      `${contact.ciriloId} ${contact.displayName}`.toLowerCase().includes(needle)
    )
  }, [contacts, query])

  const favorites = filteredContacts.filter(contact => contact.favorite)
  const recent = [...filteredContacts]
    .filter(contact => timestampValue(contact.lastSharedAt) > 0)
    .sort((a, b) => timestampValue(b.lastSharedAt) - timestampValue(a.lastSharedAt))
    .slice(0, 5)

  function emit(nextSet) {
    onChange?.([...nextSet])
  }

  function toggleContact(ciriloId) {
    const next = new Set(selected)
    if (next.has(ciriloId)) next.delete(ciriloId)
    else next.add(ciriloId)
    emit(next)
  }

  function teamIsSelected(team) {
    return team.members?.length > 0 && team.members.every(member => selected.has(member))
  }

  function toggleTeam(team) {
    const next = new Set(selected)
    const allSelected = teamIsSelected(team)

    ;(team.members || []).forEach(member => {
      if (allSelected) next.delete(member)
      else next.add(member)
    })

    emit(next)
  }

  async function createContact() {
    if (!newCiriloId.trim() || !firebaseUser?.uid) return
    setBusy('contact')
    setError('')

    try {
      const contact = await addContact(firebaseUser.uid, newCiriloId)
      const next = new Set(selected)
      next.add(contact.ciriloId)
      emit(next)
      setNewCiriloId('')
      setShowAdd(false)
    } catch (err) {
      setError(err?.message || 'Could not add this user.')
    } finally {
      setBusy('')
    }
  }

  async function createTeam() {
    if (!firebaseUser?.uid) return
    setBusy('team')
    setError('')

    try {
      await saveTeam(firebaseUser.uid, {
        name: teamName,
        members: teamMembers,
      })
      setTeamName('')
      setTeamMembers([])
      setShowTeam(false)
    } catch (err) {
      setError(err?.message || 'Could not create this team.')
    } finally {
      setBusy('')
    }
  }

  function toggleTeamMember(ciriloId) {
    setTeamMembers(current =>
      current.includes(ciriloId)
        ? current.filter(item => item !== ciriloId)
        : [...current, ciriloId]
    )
  }

  function renderContact(contact) {
    const active = selected.has(contact.ciriloId)

    return (
      <div className={`share-picker-row${active ? ' active' : ''}`} key={contact.ciriloId}>
        <button
          type="button"
          className="share-picker-person"
          onClick={() => toggleContact(contact.ciriloId)}
        >
          <span className="share-picker-avatar">
            <ContactAvatar contact={contact} />
          </span>
          <span className="share-picker-person-copy">
            <strong>{contact.ciriloId} [{contact.displayName || 'Cirilo user'}]</strong>
          </span>
          <span className={`share-picker-check${active ? ' active' : ''}`}>
            {active && <Check size={12} />}
          </span>
        </button>

        <button
          type="button"
          className={`share-picker-star${contact.favorite ? ' active' : ''}`}
          title={contact.favorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={() =>
            setContactFavorite(firebaseUser.uid, contact, !contact.favorite).catch(err =>
              setError(err?.message || 'Could not update favorite.')
            )
          }
        >
          <Star size={14} fill={contact.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    )
  }

  return (
    <section className={`share-picker${compact ? ' compact' : ''}`}>
      <div className="share-picker-head">
        <div>
          <span className="eyebrow">{title}</span>
          <small>{selected.size ? `${selected.size} selected` : 'Choose people or a team'}</small>
        </div>
        <button type="button" className="secondary-btn compact" onClick={() => setShowAdd(current => !current)}>
          <Plus size={14} /> Add user
        </button>
      </div>

      {selected.size > 0 && (
        <div className="share-picker-selected">
          <span className="share-picker-label">Selected</span>
          <div className="share-picker-selected-chips">
            {[...selected].map(ciriloId => {
              const contact = contactById.get(ciriloId)
              return (
                <button
                  type="button"
                  className="share-picker-chip"
                  key={ciriloId}
                  title="Remove"
                  onClick={() => toggleContact(ciriloId)}
                >
                  <span>{ciriloId} [{contact?.displayName || 'Cirilo user'}]</span>
                  <X size={11} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="share-picker-add">
          <input
            autoFocus
            value={newCiriloId}
            onChange={event => setNewCiriloId(event.target.value)}
            placeholder="cirilo_154875"
            onKeyDown={event => {
              if (event.key === 'Enter') createContact()
            }}
          />
          <button type="button" className="primary-btn compact" onClick={createContact} disabled={busy === 'contact'}>
            Add
          </button>
          <button type="button" className="icon-btn" onClick={() => setShowAdd(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="share-picker-search">
        <Search size={14} />
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search contacts"
        />
      </div>

      {recent.length > 0 && (
        <div className="share-picker-section">
          <span className="share-picker-label">Recent</span>
          {recent.map(renderContact)}
        </div>
      )}

      {favorites.length > 0 && (
        <div className="share-picker-section">
          <span className="share-picker-label">Favorites</span>
          {favorites.map(renderContact)}
        </div>
      )}

      <div className="share-picker-section">
        <div className="share-picker-section-head">
          <span className="share-picker-label">Teams</span>
          <button type="button" onClick={() => setShowTeam(current => !current)}>
            <Plus size={12} /> Create team
          </button>
        </div>

        {showTeam && (
          <div className="share-picker-team-editor">
            <input
              value={teamName}
              onChange={event => setTeamName(event.target.value)}
              placeholder="Team name"
            />
            <div className="share-picker-team-members">
              {contacts.map(contact => (
                <label key={contact.ciriloId}>
                  <input
                    type="checkbox"
                    checked={teamMembers.includes(contact.ciriloId)}
                    onChange={() => toggleTeamMember(contact.ciriloId)}
                  />
                  <span>{contact.ciriloId} [{contact.displayName || 'Cirilo user'}]</span>
                </label>
              ))}
            </div>
            <div className="share-picker-team-actions">
              <button type="button" className="secondary-btn compact" onClick={() => setShowTeam(false)}>
                Cancel
              </button>
              <button type="button" className="primary-btn compact" onClick={createTeam} disabled={busy === 'team'}>
                Save team
              </button>
            </div>
          </div>
        )}

        {teams.length ? (
          teams.map(team => {
            const active = teamIsSelected(team)
            return (
              <div className={`share-picker-team${active ? ' active' : ''}`} key={team.id}>
                <button type="button" onClick={() => toggleTeam(team)}>
                  <Users size={15} />
                  <span>
                    <strong>{team.name}</strong>
                    <small>{team.members?.length || 0} people</small>
                  </span>
                  <span className={`share-picker-check${active ? ' active' : ''}`}>
                    {active && <Check size={12} />}
                  </span>
                </button>
                <button
                  type="button"
                  className="share-picker-delete-team"
                  title="Delete team"
                  onClick={() =>
                    removeTeam(firebaseUser.uid, team.id).catch(err =>
                      setError(err?.message || 'Could not delete team.')
                    )
                  }
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        ) : (
          <p className="share-picker-empty">No team yet.</p>
        )}
      </div>

      <div className="share-picker-section">
        <span className="share-picker-label">All contacts</span>
        {filteredContacts.length ? filteredContacts.map(renderContact) : (
          <p className="share-picker-empty">No contacts yet. Add a Cirilo user above.</p>
        )}
      </div>

      {error && <div className="form-error">{error}</div>}
    </section>
  )
}
