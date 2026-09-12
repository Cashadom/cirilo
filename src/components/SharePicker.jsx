import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'

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

  if (
    typeof value.toMillis ===
    'function'
  ) {
    return value.toMillis()
  }

  if (
    typeof value.seconds ===
    'number'
  ) {
    return value.seconds * 1000
  }

  return 0
}

function normalizeId(value) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
}

function ContactAvatar({
  contact,
}) {
  if (
    contact.photoURL
  ) {
    return (
      <img
        src={
          contact.photoURL
        }
        alt=""
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <span>
      {(
        contact.displayName ||
        contact.ciriloId ||
        'C'
      )
        .trim()
        .charAt(0)
        .toUpperCase()}
    </span>
  )
}

export default function SharePicker({
  value = [],
  onChange,
  title = 'Share with',
  compact = false,
}) {
  const {
    firebaseUser,
  } = useAuth()

  const [
    contacts,
    setContacts,
  ] = useState([])

  const [
    teams,
    setTeams,
  ] = useState([])

  const [
    query,
    setQuery,
  ] = useState('')

  const [
    showAdd,
    setShowAdd,
  ] = useState(false)

  const [
    newCiriloId,
    setNewCiriloId,
  ] = useState('')

  const [
    showTeam,
    setShowTeam,
  ] = useState(false)

  const [
    teamName,
    setTeamName,
  ] = useState('')

  const [
    teamMembers,
    setTeamMembers,
  ] = useState([])

  const [
    busy,
    setBusy,
  ] = useState('')

  const [
    error,
    setError,
  ] = useState('')

  useEffect(
    () => {
      if (
        !firebaseUser?.uid
      ) {
        return undefined
      }

      const stopContacts =
        subscribeContacts(
          firebaseUser.uid,

          rows =>
            setContacts(
              rows
            ),

          err =>
            setError(
              err?.message ||
              'Could not load contacts.'
            )
        )

      const stopTeams =
        subscribeTeams(
          firebaseUser.uid,

          rows =>
            setTeams(
              rows
            ),

          err =>
            setError(
              err?.message ||
              'Could not load teams.'
            )
        )

      return () => {
        stopContacts?.()
        stopTeams?.()
      }
    },
    [
      firebaseUser?.uid,
    ]
  )

  const selected =
    useMemo(
      () =>
        new Set(
          (
            value ||
            []
          )
            .map(
              normalizeId
            )
            .filter(
              Boolean
            )
        ),
      [
        value,
      ]
    )

  const contactById =
    useMemo(
      () => {
        const map =
          new Map()

        contacts.forEach(
          contact => {
            const id =
              normalizeId(
                contact.ciriloId
              )

            if (id) {
              map.set(
                id,
                contact
              )
            }
          }
        )

        return map
      },
      [
        contacts,
      ]
    )

  const filteredContacts =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLowerCase()

        if (
          !needle
        ) {
          return contacts
        }

        return contacts.filter(
          contact =>
            `${contact.ciriloId || ''} ${contact.displayName || ''}`
              .toLowerCase()
              .includes(
                needle
              )
        )
      },
      [
        contacts,
        query,
      ]
    )

  const favorites =
    filteredContacts.filter(
      contact =>
        contact.favorite
    )

  const recent = [
    ...filteredContacts,
  ]
    .filter(
      contact =>
        timestampValue(
          contact.lastSharedAt
        ) > 0
    )
    .sort(
      (
        a,
        b
      ) =>
        timestampValue(
          b.lastSharedAt
        ) -
        timestampValue(
          a.lastSharedAt
        )
    )
    .slice(
      0,
      5
    )

  function emit(nextSet) {
    const ids = [
      ...nextSet,
    ]
      .map(
        normalizeId
      )
      .filter(
        Boolean
      )

    onChange?.(
      ids
    )
  }

  function toggleContact(
    rawCiriloId
  ) {
    const ciriloId =
      normalizeId(
        rawCiriloId
      )

    if (
      !ciriloId
    ) {
      return
    }

    const next =
      new Set(
        selected
      )

    if (
      next.has(
        ciriloId
      )
    ) {
      next.delete(
        ciriloId
      )
    } else {
      next.add(
        ciriloId
      )
    }

    emit(
      next
    )
  }

  function teamIsSelected(
    team
  ) {
    const members =
      (
        team.members ||
        []
      )
        .map(
          normalizeId
        )
        .filter(
          Boolean
        )

    return (
      members.length >
        0 &&
      members.every(
        member =>
          selected.has(
            member
          )
      )
    )
  }

  function toggleTeam(
    team
  ) {
    const next =
      new Set(
        selected
      )

    const allSelected =
      teamIsSelected(
        team
      )

    ;(
      team.members ||
      []
    ).forEach(
      rawMember => {
        const member =
          normalizeId(
            rawMember
          )

        if (
          !member
        ) {
          return
        }

        if (
          allSelected
        ) {
          next.delete(
            member
          )
        } else {
          next.add(
            member
          )
        }
      }
    )

    emit(
      next
    )
  }

  async function createContact() {
    const cleanId =
      normalizeId(
        newCiriloId
      )

    if (
      !cleanId ||
      !firebaseUser?.uid
    ) {
      return
    }

    setBusy(
      'contact'
    )

    setError(
      ''
    )

    try {
      const contact =
        await addContact(
          firebaseUser.uid,
          cleanId
        )

      const finalId =
        normalizeId(
          contact?.ciriloId ||
          cleanId
        )

      /*
       * IMPORTANT:
       * the recipient is selected immediately.
       * We do NOT wait for the contacts subscription.
       */
      const next =
        new Set(
          selected
        )

      next.add(
        finalId
      )

      emit(
        next
      )

      setNewCiriloId(
        ''
      )

      setShowAdd(
        false
      )

      setQuery(
        ''
      )
    } catch (
      err
    ) {
      setError(
        err?.message ||
        'Could not add this user.'
      )
    } finally {
      setBusy(
        ''
      )
    }
  }

  async function createTeam() {
    if (
      !firebaseUser?.uid
    ) {
      return
    }

    setBusy(
      'team'
    )

    setError(
      ''
    )

    try {
      await saveTeam(
        firebaseUser.uid,
        {
          name:
            teamName,

          members:
            teamMembers,
        }
      )

      setTeamName(
        ''
      )

      setTeamMembers(
        []
      )

      setShowTeam(
        false
      )
    } catch (
      err
    ) {
      setError(
        err?.message ||
        'Could not create this team.'
      )
    } finally {
      setBusy(
        ''
      )
    }
  }

  function toggleTeamMember(
    rawCiriloId
  ) {
    const ciriloId =
      normalizeId(
        rawCiriloId
      )

    setTeamMembers(
      current =>
        current.includes(
          ciriloId
        )
          ? current.filter(
              item =>
                item !==
                ciriloId
            )
          : [
              ...current,
              ciriloId,
            ]
    )
  }

  function renderContact(
    contact
  ) {
    const ciriloId =
      normalizeId(
        contact.ciriloId
      )

    const active =
      selected.has(
        ciriloId
      )

    return (
      <div
        className={
          `share-picker-row${active ? ' active' : ''}`
        }
        key={
          ciriloId
        }
      >
        <button
          type="button"
          className="share-picker-person"
          onClick={() =>
            toggleContact(
              ciriloId
            )
          }
        >
          <span className="share-picker-avatar">
            <ContactAvatar
              contact={
                contact
              }
            />
          </span>

          <span className="share-picker-person-copy">
            <strong>
              {ciriloId}{' '}
              [
              {contact.displayName ||
                'Cirilo user'}
              ]
            </strong>
          </span>

          <span
            className={
              `share-picker-check${active ? ' active' : ''}`
            }
          >
            {active && (
              <Check
                size={
                  12
                }
              />
            )}
          </span>
        </button>

        <button
          type="button"
          className={
            `share-picker-star${contact.favorite ? ' active' : ''}`
          }
          title={
            contact.favorite
              ? 'Remove from favorites'
              : 'Add to favorites'
          }
          onClick={() =>
            setContactFavorite(
              firebaseUser.uid,
              contact,
              !contact.favorite
            ).catch(
              err =>
                setError(
                  err?.message ||
                  'Could not update favorite.'
                )
            )
          }
        >
          <Star
            size={
              14
            }
            fill={
              contact.favorite
                ? 'currentColor'
                : 'none'
            }
          />
        </button>
      </div>
    )
  }

  return (
    <section
      className={
        `share-picker${compact ? ' compact' : ''}`
      }
    >
      <div className="share-picker-head">
        <div>
          <span className="eyebrow">
            {title}
          </span>

          <small>
            {selected.size
              ? `${selected.size} selected`
              : 'Choose people or a team'}
          </small>
        </div>

        <button
          type="button"
          className="secondary-btn compact"
          onClick={() =>
            setShowAdd(
              current =>
                !current
            )
          }
        >
          <Plus
            size={
              14
            }
          />

          Add user
        </button>
      </div>

      {selected.size >
        0 && (
        <div className="share-picker-selected">
          <span className="share-picker-label">
            Selected
          </span>

          <div className="share-picker-selected-chips">
            {[
              ...selected,
            ].map(
              ciriloId => {
                const contact =
                  contactById.get(
                    ciriloId
                  )

                return (
                  <button
                    type="button"
                    className="share-picker-chip"
                    key={
                      ciriloId
                    }
                    title="Remove"
                    onClick={() =>
                      toggleContact(
                        ciriloId
                      )
                    }
                  >
                    <Check
                      size={
                        11
                      }
                    />

                    <span>
                      {ciriloId}
                      {contact?.displayName
                        ? ` [${contact.displayName}]`
                        : ''}
                    </span>

                    <X
                      size={
                        11
                      }
                    />
                  </button>
                )
              }
            )}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="share-picker-add">
          <input
            autoFocus
            value={
              newCiriloId
            }
            onChange={
              event =>
                setNewCiriloId(
                  event.target.value
                )
            }
            placeholder="cirilo_154875"
            onKeyDown={
              event => {
                if (
                  event.key ===
                  'Enter'
                ) {
                  event.preventDefault()

                  createContact()
                }
              }
            }
          />

          <button
            type="button"
            className="primary-btn compact"
            onClick={
              createContact
            }
            disabled={
              busy ===
              'contact'
            }
          >
            {busy ===
            'contact'
              ? 'Adding...'
              : 'Add'}
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={() =>
              setShowAdd(
                false
              )
            }
          >
            <X
              size={
                14
              }
            />
          </button>
        </div>
      )}

      <div className="share-picker-search">
        <Search
          size={
            14
          }
        />

        <input
          value={
            query
          }
          onChange={
            event =>
              setQuery(
                event.target.value
              )
          }
          placeholder="Search saved contacts"
        />
      </div>

      {recent.length >
        0 && (
        <div className="share-picker-section">
          <span className="share-picker-label">
            Recent
          </span>

          {recent.map(
            renderContact
          )}
        </div>
      )}

      {favorites.length >
        0 && (
        <div className="share-picker-section">
          <span className="share-picker-label">
            Favorites
          </span>

          {favorites.map(
            renderContact
          )}
        </div>
      )}

      <div className="share-picker-section">
        <div className="share-picker-section-head">
          <span className="share-picker-label">
            Teams
          </span>

          <button
            type="button"
            onClick={() =>
              setShowTeam(
                current =>
                  !current
              )
            }
          >
            <Plus
              size={
                12
              }
            />

            Create team
          </button>
        </div>

        {showTeam && (
          <div className="share-picker-team-editor">
            <input
              value={
                teamName
              }
              onChange={
                event =>
                  setTeamName(
                    event.target.value
                  )
              }
              placeholder="Team name"
            />

            <div className="share-picker-team-members">
              {contacts.map(
                contact => {
                  const id =
                    normalizeId(
                      contact.ciriloId
                    )

                  return (
                    <label
                      key={
                        id
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          teamMembers.includes(
                            id
                          )
                        }
                        onChange={() =>
                          toggleTeamMember(
                            id
                          )
                        }
                      />

                      <span>
                        {id}{' '}
                        [
                        {contact.displayName ||
                          'Cirilo user'}
                        ]
                      </span>
                    </label>
                  )
                }
              )}
            </div>

            <div className="share-picker-team-actions">
              <button
                type="button"
                className="secondary-btn compact"
                onClick={() =>
                  setShowTeam(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-btn compact"
                onClick={
                  createTeam
                }
                disabled={
                  busy ===
                  'team'
                }
              >
                Save team
              </button>
            </div>
          </div>
        )}

        {teams.length ? (
          teams.map(
            team => {
              const active =
                teamIsSelected(
                  team
                )

              return (
                <div
                  className={
                    `share-picker-team${active ? ' active' : ''}`
                  }
                  key={
                    team.id
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleTeam(
                        team
                      )
                    }
                  >
                    <Users
                      size={
                        15
                      }
                    />

                    <span>
                      <strong>
                        {
                          team.name
                        }
                      </strong>

                      <small>
                        {
                          team.members
                            ?.length ||
                          0
                        }{' '}
                        people
                      </small>
                    </span>

                    <span
                      className={
                        `share-picker-check${active ? ' active' : ''}`
                      }
                    >
                      {active && (
                        <Check
                          size={
                            12
                          }
                        />
                      )}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="share-picker-delete-team"
                    title="Delete team"
                    onClick={() =>
                      removeTeam(
                        firebaseUser.uid,
                        team.id
                      ).catch(
                        err =>
                          setError(
                            err?.message ||
                            'Could not delete team.'
                          )
                      )
                    }
                  >
                    <Trash2
                      size={
                        13
                      }
                    />
                  </button>
                </div>
              )
            }
          )
        ) : (
          <p className="share-picker-empty">
            No team yet.
          </p>
        )}
      </div>

      <div className="share-picker-section">
        <span className="share-picker-label">
          All contacts
        </span>

        {filteredContacts.length
          ? filteredContacts.map(
              renderContact
            )
          : (
              <p className="share-picker-empty">
                No contacts yet. Add a Cirilo user above.
              </p>
            )}
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}
    </section>
  )
}