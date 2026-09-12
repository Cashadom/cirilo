import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Crown,
  Lock,
  Mail,
  Send,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

import {
  doc,
  getDoc,
} from 'firebase/firestore'

import {
  db,
} from '../firebase'

import {
  CATEGORIES,
} from '../utils/calendar'

import {
  getProfileTypeMeta,
  normalizeProfileType,
} from '../utils/profileType'

import SharePicker from './SharePicker'

import {
  parseEmailRecipients,
  validateCiriloRecipients,
  validateEmailRecipients,
} from '../services/shareService'

const todayKey =
  () =>
    new Date()
      .toISOString()
      .slice(
        0,
        10
      )

const empty = {
  title: '',
  category: 'pro',
  type: 'event',
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  people: '',
  notes: '',
  reminder: '15 min before',
  priority: 'normal',
  completed: false,
  visibility: 'private',
  municipalCategory: 'local_life',
  publicUrl: '',
  publicContact: '',
  invitedCiriloIds: [],
  invitedEmails: [],
}

const MUNICIPAL_CATEGORIES = [
  [
    'culture',
    'Culture',
  ],

  [
    'sports',
    'Sports',
  ],

  [
    'works_traffic',
    'Works & Traffic',
  ],

  [
    'environment',
    'Environment',
  ],

  [
    'civic_municipal',
    'Civic & Municipal',
  ],

  [
    'education',
    'Education',
  ],

  [
    'social_health',
    'Social & Health',
  ],

  [
    'local_life',
    'Local life',
  ],

  [
    'other',
    'Other',
  ],
]

function cleanCiriloIds(
  values = []
) {
  return [
    ...new Set(
      values
        .map(
          value =>
            String(
              value ||
              ''
            )
              .trim()
              .toLowerCase()
        )
        .filter(
          Boolean
        )
    ),
  ]
}

export default function EventModal({
  open,
  draft,
  onClose,
  onSave,
  onDelete,
  readOnly = false,
  profileType = 'personal',
  organizationType = '',
  municipalityVerificationStatus = 'unverified',
  canPublishPublic = false,
  onUpgrade,
}) {
  const [
    form,
    setForm,
  ] =
    useState(
      empty
    )

  const [
    emailInput,
    setEmailInput,
  ] =
    useState(
      ''
    )

  const [
    error,
    setError,
  ] =
    useState(
      ''
    )

  const [
    creatorProfile,
    setCreatorProfile,
  ] =
    useState({
      displayName:
        '',

      photoURL:
        '',
    })

  const normalizedProfileType =
    normalizeProfileType(
      profileType
    )

  const profileTypeMeta =
    getProfileTypeMeta(
      normalizedProfileType
    )

  const isMunicipality =
    normalizedProfileType ===
      'public' &&
    organizationType ===
      'municipality'

  const municipalityVerified =
    municipalityVerificationStatus ===
    'verified'

  useEffect(
    () => {
      if (
        !open
      ) {
        return
      }

      const next = {
        ...empty,
        ...draft,

        ...(
          isMunicipality
            ? {
                type:
                  'event',

                category:
                  draft?.category ||
                  'personal',

                municipalCategory:
                  draft
                    ?.municipalCategory ||
                  'local_life',

                priority:
                  'normal',
              }
            : {}
        ),

        invitedCiriloIds:
          cleanCiriloIds(
            draft
              ?.invitedCiriloIds ||
            []
          ),

        invitedEmails:
          draft
            ?.invitedEmails ||
          [],
      }

      setForm(
        next
      )

      setEmailInput(
        (
          next.invitedEmails ||
          []
        ).join(
          ', '
        )
      )

      setCreatorProfile({
        displayName:
          next.createdByName ||
          next.sharedByName ||
          '',

        photoURL:
          next.createdByPhotoURL ||
          next.sharedByPhotoURL ||
          '',
      })

      setError(
        ''
      )
    },
    [
      open,
      draft,
      isMunicipality,
    ]
  )

  const isPast =
    useMemo(
      () =>
        form.date &&
        form.date <
          todayKey(),

      [
        form.date,
      ]
    )

  const isReceivedSharedEvent =
    Boolean(
      form.isSharedEvent ||
      form.lockedForRecipient ||
      form.sourceShareId ||
      form.sharedByCiriloId ||
      (
        form.sharedBy &&
        /^cirilo_\d{6}$/i.test(
          form.sharedBy
        )
      )
    )

  const locked =
    readOnly ||
    isReceivedSharedEvent

  const sharedOriginId =
    isReceivedSharedEvent
      ? (
          form.sharedByCiriloId ||
          form.createdByCiriloId ||
          (
            /^cirilo_\d{6}$/i.test(
              form.sharedBy ||
              ''
            )
              ? form.sharedBy
              : ''
          )
        )
      : ''

  useEffect(
    () => {
      if (
        !open ||
        !isReceivedSharedEvent ||
        !sharedOriginId
      ) {
        return
      }

      let cancelled =
        false

      async function loadCreator() {
        try {
          const snapshot =
            await getDoc(
              doc(
                db,
                'publicUsers',
                sharedOriginId
              )
            )

          if (
            cancelled ||
            !snapshot.exists()
          ) {
            return
          }

          const data =
            snapshot.data()

          setCreatorProfile(
            current => ({
              displayName:
                data.displayName ||
                current.displayName ||
                '',

              photoURL:
                data.photoURL ||
                current.photoURL ||
                '',
            })
          )
        } catch (
          err
        ) {
          console.error(
            'Could not load creator profile:',
            err
          )
        }
      }

      loadCreator()

      return () => {
        cancelled =
          true
      }
    },
    [
      open,
      isReceivedSharedEvent,
      sharedOriginId,
    ]
  )

  const participantIds =
    cleanCiriloIds(
      form.invitedCiriloIds ||
      []
    )

  const visibleParticipants =
    participantIds.slice(
      0,
      4
    )

  const hiddenParticipantsCount =
    Math.max(
      0,

      participantIds.length -
      visibleParticipants.length
    )

  if (
    !open
  ) {
    return null
  }

  const update =
    (
      key,
      value
    ) => {
      if (
        !locked
      ) {
        setForm(
          current => ({
            ...current,

            [key]:
              value,
          })
        )
      }
    }

  const save =
    () => {
      if (
        locked
      ) {
        return
      }

      if (
        !form.title.trim() ||
        !form.date
      ) {
        setError(
          'Add a title and date.'
        )

        return
      }

      if (
        !form.id &&
        isPast
      ) {
        setError(
          'Cirilo does not allow creating new events in the past.'
        )

        return
      }

      if (
        form.visibility ===
          'public' &&
        !canPublishPublic
      ) {
        setError(
          'Public publishing requires Cirilo Pro or Business.'
        )

        return
      }

      /*
       * SINGLE SOURCE OF TRUTH:
       *
       * SharePicker writes directly here.
       */
      const invitedCiriloIds =
        cleanCiriloIds(
          form.invitedCiriloIds ||
          []
        )

      const invitedEmails =
        parseEmailRecipients(
          emailInput
        )

      if (
        form.visibility ===
          'shared' &&
        invitedCiriloIds.length ===
          0 &&
        invitedEmails.length ===
          0
      ) {
        setError(
          'Add at least one Cirilo ID or email address.'
        )

        return
      }

      if (
        !validateCiriloRecipients(
          invitedCiriloIds
        )
      ) {
        setError(
          'One or more Cirilo IDs are invalid.'
        )

        return
      }

      if (
        !validateEmailRecipients(
          invitedEmails
        )
      ) {
        setError(
          'One or more email addresses are invalid.'
        )

        return
      }

      setError(
        ''
      )

      onSave({
        ...form,

        visibility:
          form.type ===
          'task'
            ? 'private'
            : form.visibility,

        invitedCiriloIds:
          form.type ===
          'task'
            ? []
            : invitedCiriloIds,

        invitedEmails:
          form.type ===
          'task'
            ? []
            : invitedEmails,

        municipalEvent:
          isMunicipality,

        municipalCategory:
          isMunicipality
            ? form.municipalCategory ||
              'local_life'
            : form.municipalCategory ||
              '',

        priority:
          isMunicipality
            ? 'normal'
            : form.priority,

        reminder:
          isMunicipality
            ? 'At time'
            : form.reminder,

        title:
          form.title.trim(),

        id:
          form.id ||
          crypto.randomUUID(),
      })
    }

  const hasInvites =
    (
      form
        .invitedCiriloIds ||
      []
    ).length >
      0 ||
    (
      form
        .invitedEmails ||
      []
    ).length >
      0

  const creatorInitial =
    (
      creatorProfile.displayName ||
      'Cirilo'
    )
      .trim()
      .charAt(
        0
      )
      .toUpperCase() ||
    'C'

  return (
    <div
      className="modal-backdrop"
      onMouseDown={
        onClose
      }
    >
      <div
        className="modal-card"
        onMouseDown={
          event =>
            event.stopPropagation()
        }
      >
        <header>
          <div>
            <span className="eyebrow">
              {isReceivedSharedEvent
                ? 'Shared event'
                : readOnly
                  ? 'Archived item'
                  : form.id
                    ? 'Edit item'
                    : 'New item'}
            </span>

            <h2>
              {isReceivedSharedEvent
                ? 'Event received'
                : readOnly
                  ? 'Past event'
                  : form.id
                    ? 'Update your plan'
                    : 'Add to your week'}
            </h2>
          </div>

          <button
            className="icon-btn"
            onClick={
              onClose
            }
          >
            <X
              size={
                20
              }
            />
          </button>
        </header>

        {readOnly &&
          !isReceivedSharedEvent && (
            <div className="archive-readonly-note">
              This event is archived and can be consulted, not recreated in the past.
            </div>
          )}

        {!isReceivedSharedEvent &&
          form.sourceNoteId && (
            <div className="archive-readonly-note">
              <strong>
                From Notes
              </strong>

              {form.sourceNoteTitle
                ? ` · ${form.sourceNoteTitle}`
                : ''}

              <br />

              <small>
                This is your event. You can edit it normally; the original Note stays linked.
              </small>
            </div>
          )}

        {isReceivedSharedEvent && (
          <div className="shared-event-origin">
            <div className="shared-event-origin-main">
              <span className="shared-event-origin-avatar">
                {creatorProfile.photoURL ? (
                  <img
                    src={
                      creatorProfile.photoURL
                    }
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>
                    {
                      creatorInitial
                    }
                  </span>
                )}
              </span>

              <div>
                <div className="shared-event-origin-line">
                  <Lock
                    size={
                      12
                    }
                  />

                  Shared with you by{' '}
                  {sharedOriginId
                    ? `@${sharedOriginId}`
                    : 'another Cirilo user'}
                </div>

                <small>
                  This event was created by someone else and cannot be edited from your account.
                </small>
              </div>
            </div>

            {visibleParticipants.length >
              0 && (
              <div className="shared-event-participants">
                <span>
                  Participants
                </span>

                <div>
                  {visibleParticipants.map(
                    id => (
                      <small
                        key={
                          id
                        }
                      >
                        @
                        {id}
                      </small>
                    )
                  )}

                  {hiddenParticipantsCount >
                    0 && (
                    <small>
                      +
                      {
                        hiddenParticipantsCount
                      }
                    </small>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!isReceivedSharedEvent &&
          hasInvites && (
            <div className="archive-readonly-note">
              <strong>
                Shared with
              </strong>

              <div className="invite-chip-list">
                {(
                  form.invitedCiriloIds ||
                  []
                ).map(
                  id => (
                    <span
                      className="invite-chip"
                      key={
                        id
                      }
                    >
                      <UserRound
                        size={
                          12
                        }
                      />

                      @
                      {id}
                    </span>
                  )
                )}

                {(
                  form.invitedEmails ||
                  []
                ).map(
                  email => (
                    <span
                      className="invite-chip"
                      key={
                        email
                      }
                    >
                      <Mail
                        size={
                          12
                        }
                      />

                      {
                        email
                      }
                    </span>
                  )
                )}
              </div>
            </div>
          )}

        <div className="modal-grid">
          <label className="field span-2">
            Title

            <input
              disabled={
                locked
              }
              autoFocus={
                !locked
              }
              value={
                form.title
              }
              onChange={
                event =>
                  update(
                    'title',
                    event.target.value
                  )
              }
              placeholder="What is happening?"
            />
          </label>

          {isMunicipality ? (
            <label className="field">
              Municipal category

              <select
                disabled={
                  locked
                }
                value={
                  form.municipalCategory ||
                  'local_life'
                }
                onChange={
                  event =>
                    update(
                      'municipalCategory',
                      event.target.value
                    )
                }
              >
                {MUNICIPAL_CATEGORIES.map(
                  ([
                    value,
                    label,
                  ]) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {
                        label
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          ) : (
            <>
              <label className="field">
                Category

                <select
                  disabled={
                    locked
                  }
                  value={
                    form.category
                  }
                  onChange={
                    event =>
                      update(
                        'category',
                        event.target.value
                      )
                  }
                >
                  {Object.entries(
                    CATEGORIES
                  ).map(
                    ([
                      key,
                      category,
                    ]) => (
                      <option
                        key={
                          key
                        }
                        value={
                          key
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="field">
                Type

                <select
                  disabled={
                    locked
                  }
                  value={
                    form.type
                  }
                  onChange={
                    event => {
                      const nextType =
                        event.target.value

                      if (
                        nextType ===
                        'task'
                      ) {
                        setForm(
                          current => ({
                            ...current,

                            type:
                              nextType,

                            visibility:
                              'private',

                            invitedCiriloIds:
                              [],

                            invitedEmails:
                              [],
                          })
                        )

                        setEmailInput(
                          ''
                        )
                      } else {
                        update(
                          'type',
                          nextType
                        )
                      }
                    }
                  }
                >
                  <option value="event">
                    Event
                  </option>

                  <option value="task">
                    Task
                  </option>
                </select>
              </label>
            </>
          )}

          <label className="field">
            Visibility

            <select
              disabled={
                locked ||
                form.type ===
                  'task'
              }
              value={
                form.type ===
                'task'
                  ? 'private'
                  : form.visibility ||
                    'private'
              }
              onChange={
                event => {
                  update(
                    'visibility',
                    event.target.value
                  )

                  setError(
                    ''
                  )
                }
              }
            >
              <option value="private">
                Private
              </option>

              <option value="shared">
                Shared
              </option>

              <option value="public">
                Public{' '}
                {canPublishPublic
                  ? ''
                  : isMunicipality
                    ? '· Verification required'
                    : '· Pro'}
              </option>
            </select>

            <small className="field-help">
              {form.type ===
              'task'
                ? 'Tasks always stay private.'
                : isMunicipality
                  ? municipalityVerified
                    ? 'Verified municipality: Public is available without a paid plan.'
                    : 'Municipality events can be prepared privately. Public publishing unlocks after Cirilo verification.'
                  : normalizedProfileType ===
                    'public'
                    ? 'Public profiles default new calendar events to Public. You can still choose Private or Shared.'
                    : normalizedProfileType ===
                      'company'
                      ? 'Company profiles default new calendar events to Shared. You can switch each event to Private or Public.'
                      : `Personal profiles default new calendar events to ${profileTypeMeta.defaultEventVisibility}.`}
            </small>
          </label>

          <label className="field">
            Date

            <input
              disabled={
                locked
              }
              type="date"
              min={
                form.id
                  ? undefined
                  : todayKey()
              }
              value={
                form.date
              }
              onChange={
                event =>
                  update(
                    'date',
                    event.target.value
                  )
              }
            />
          </label>

          {!isMunicipality ? (
            <label className="field">
              Priority

              <select
                disabled={
                  locked
                }
                value={
                  form.priority
                }
                onChange={
                  event =>
                    update(
                      'priority',
                      event.target.value
                    )
                }
              >
                <option value="normal">
                  Normal
                </option>

                <option value="high">
                  High
                </option>

                <option value="low">
                  Low
                </option>
              </select>
            </label>
          ) : null}

          <label className="field">
            Starts

            <input
              disabled={
                locked
              }
              type="time"
              value={
                form.startTime
              }
              onChange={
                event =>
                  update(
                    'startTime',
                    event.target.value
                  )
              }
            />
          </label>

          <label className="field">
            Ends

            <input
              disabled={
                locked
              }
              type="time"
              value={
                form.endTime
              }
              onChange={
                event =>
                  update(
                    'endTime',
                    event.target.value
                  )
              }
            />
          </label>

          <label className="field">
            Location

            <input
              disabled={
                locked
              }
              value={
                form.location
              }
              onChange={
                event =>
                  update(
                    'location',
                    event.target.value
                  )
              }
              placeholder="Office, Zoom, Home..."
            />
          </label>

          {!isMunicipality ? (
            <label className="field">
              People

              <input
                disabled={
                  locked
                }
                value={
                  form.people
                }
                onChange={
                  event =>
                    update(
                      'people',
                      event.target.value
                    )
                }
                placeholder="Names or group"
              />
            </label>
          ) : null}

          {form.visibility ===
            'shared' &&
            !locked && (
              <>
                <div className="field span-2">
                  <SharePicker
                    /*
                     * DIRECT BINDING.
                     * No ciriloInput intermediary anymore.
                     */
                    value={
                      form.invitedCiriloIds ||
                      []
                    }

                    onChange={
                      ids => {
                        setForm(
                          current => ({
                            ...current,

                            invitedCiriloIds:
                              cleanCiriloIds(
                                ids
                              ),
                          })
                        )

                        setError(
                          ''
                        )
                      }
                    }

                    title="Invite Cirilo users"

                    compact
                  />
                </div>

                <label className="field span-2">
                  Invite by email

                  <textarea
                    rows="2"
                    value={
                      emailInput
                    }
                    onChange={
                      event =>
                        setEmailInput(
                          event.target.value
                        )
                    }
                    placeholder="leo@gmail.com, client@example.com"
                  />

                  <small className="field-help">
                    Guests can open the card without a Cirilo account.
                  </small>
                </label>
              </>
            )}

          {!isMunicipality ? (
            <label className="field span-2">
              Reminder

              <select
                disabled={
                  locked
                }
                value={
                  form.reminder
                }
                onChange={
                  event =>
                    update(
                      'reminder',
                      event.target.value
                    )
                }
              >
                <option>
                  At time
                </option>

                <option>
                  15 min before
                </option>

                <option>
                  30 min before
                </option>

                <option>
                  1 hour before
                </option>

                <option>
                  1 day before
                </option>
              </select>
            </label>
          ) : null}

          {isMunicipality ? (
            <>
              <label className="field">
                Event URL

                <input
                  disabled={
                    locked
                  }
                  type="url"
                  value={
                    form.publicUrl ||
                    ''
                  }
                  onChange={
                    event =>
                      update(
                        'publicUrl',
                        event.target.value
                      )
                  }
                  placeholder="https://www.mairie.fr/event"
                />
              </label>

              <label className="field">
                Public contact

                <input
                  disabled={
                    locked
                  }
                  value={
                    form.publicContact ||
                    ''
                  }
                  onChange={
                    event =>
                      update(
                        'publicContact',
                        event.target.value
                      )
                  }
                  placeholder="culture@mairie.fr · 04..."
                />
              </label>
            </>
          ) : null}

          <label className="field span-2">
            {isMunicipality
              ? 'Public description'
              : 'Notes'}

            <textarea
              disabled={
                locked
              }
              rows="4"
              value={
                form.notes
              }
              onChange={
                event =>
                  update(
                    'notes',
                    event.target.value
                  )
              }
              placeholder={
                isMunicipality
                  ? 'Describe the event for residents...'
                  : 'Add context, links or preparation notes...'
              }
            />
          </label>
        </div>

        {form.visibility ===
          'public' &&
          !canPublishPublic &&
          !locked && (
            <button
              className="upgrade-inline"
              onClick={
                onUpgrade
              }
            >
              <Crown
                size={
                  15
                }
              />

              {isMunicipality
                ? 'Municipality verification is required before public publishing · Open profile'
                : 'Public events require a paid publishing plan · View plans'}
            </button>
          )}

        {error && (
          <div className="form-error">
            {
              error
            }
          </div>
        )}

        <footer className="modal-footer">
          {!locked &&
          form.id ? (
            <button
              className="danger-btn"
              onClick={() =>
                onDelete(
                  form.id
                )
              }
            >
              <Trash2
                size={
                  16
                }
              />

              Delete
            </button>
          ) : (
            <span />
          )}

          <div>
            <button
              className="secondary-btn"
              onClick={
                onClose
              }
            >
              {locked
                ? 'Close'
                : 'Cancel'}
            </button>

            {!locked && (
              <button
                className="primary-btn"
                onClick={
                  save
                }
              >
                {form.visibility ===
                  'shared' && (
                  <Send
                    size={
                      15
                    }
                  />
                )}

                {form.visibility ===
                'shared'
                  ? form.id
                    ? 'Save & send'
                    : 'Add & send'
                  : form.id
                    ? 'Save changes'
                    : 'Add to week'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}