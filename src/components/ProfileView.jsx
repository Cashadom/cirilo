import React, {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Building2,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  Landmark,
  LockKeyhole,
  MessageCircle,
  Save,
  Smartphone,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  updateUserProfile,
} from '../services/userService'

import {
  subscribeRecentContacts,
} from '../services/recentContactsService'

import {
  ORGANIZATION_TYPE_OPTIONS,
  PROFILE_TYPE_OPTIONS,
  getProfileTypeMeta,
  normalizeOrganizationType,
  normalizeProfileType,
} from '../utils/profileType'

import {
  submitMunicipalityVerification,
  subscribeMunicipalityVerification,
} from '../services/verificationService'

const CIRILO_AVATARS = [
  {
    id: 'avatar1',
    src: '/avatar1.png',
    label: 'Avatar 1',
  },

  {
    id: 'avatar2',
    src: '/avatar2.png',
    label: 'Avatar 2',
  },

  {
    id: 'avatar3',
    src: '/avatar3.png',
    label: 'Avatar 3',
  },

  {
    id: 'avatar4',
    src: '/avatar4.png',
    label: 'Avatar 4',
  },

  {
    id: 'avatar5',
    src: '/avatar5.png',
    label: 'Avatar 5',
  },
]

export default function ProfileView({
  profile,
  plan,
  publicEvents,
  onSaved,
  onOpenPublicProfile,
  onPlans,
  onSendNote,
  onProposeEvent,
}) {
  const {
    firebaseUser,
  } = useAuth()

  const [
    draft,
    setDraft,
  ] = useState({
    ...profile,

    profileType:
      normalizeProfileType(
        profile?.profileType
      ),

    organizationType:
      normalizeOrganizationType(
        profile?.organizationType
      ),
  })

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    saved,
    setSaved,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    copied,
    setCopied,
  ] = useState(false)

  const [
    recentContacts,
    setRecentContacts,
  ] = useState([])

  const [
    verification,
    setVerification,
  ] = useState(null)

  const [
    verificationLoading,
    setVerificationLoading,
  ] = useState(false)

  const [
    verificationError,
    setVerificationError,
  ] = useState('')

  /*
   * IMPORTANT :
   *
   * on verrouille UNIQUEMENT un vrai profil mairie :
   *
   * Public
   * + Municipality
   * + Verified
   *
   * verification?.status seul ne suffit jamais.
   */
  const municipalityLocked =
    profile?.municipalityVerificationStatus ===
      'verified' &&
    normalizeProfileType(
      profile?.profileType
    ) ===
      'public' &&
    normalizeOrganizationType(
      profile?.organizationType
    ) ===
      'municipality'

  useEffect(
    () => {
      const locked =
        profile?.municipalityVerificationStatus ===
          'verified' &&
        normalizeProfileType(
          profile?.profileType
        ) ===
          'public' &&
        normalizeOrganizationType(
          profile?.organizationType
        ) ===
          'municipality'

      setDraft({
        ...profile,

        profileType:
          locked
            ? 'public'
            : normalizeProfileType(
                profile?.profileType
              ),

        organizationType:
          locked
            ? 'municipality'
            : normalizeOrganizationType(
                profile?.organizationType
              ),
      })
    },
    [
      profile,
    ]
  )

  useEffect(
    () => {
      if (
        !firebaseUser?.uid
      ) {
        setRecentContacts(
          []
        )

        return undefined
      }

      return subscribeRecentContacts(
        firebaseUser.uid,

        setRecentContacts,

        contactError => {
          console.error(
            'Could not load recent Cirilo contacts.',
            contactError
          )
        }
      )
    },
    [
      firebaseUser?.uid,
    ]
  )

  useEffect(
    () => {
      if (
        !firebaseUser?.uid
      ) {
        setVerification(
          null
        )

        return undefined
      }

      return subscribeMunicipalityVerification(
        firebaseUser.uid,

        nextVerification => {
          /*
           * On affiche la demande,
           * MAIS on ne force jamais profileType ici.
           *
           * users/{uid} reste la source de vérité.
           */
          setVerification(
            nextVerification
          )
        },

        verificationLoadError => {
          console.error(
            'Could not load municipality verification:',
            verificationLoadError
          )
        }
      )
    },
    [
      firebaseUser?.uid,
    ]
  )

  const publicCount =
    useMemo(
      () =>
        publicEvents.filter(
          event =>
            event.owner?.id ===
              profile.id ||
            event.owner?.ciriloId ===
              profile.ciriloId
        ).length,

      [
        publicEvents,
        profile.id,
        profile.ciriloId,
      ]
    )

  const update =
    (
      key,
      value
    ) => {
      setSaved(false)
      setError('')

      setDraft(
        previous => ({
          ...previous,
          [key]:
            value,
        })
      )
    }

  const selectProfileType =
    nextType => {
      if (
        municipalityLocked &&
        nextType !== 'public'
      ) {
        return
      }

      setSaved(false)
      setError('')

      setDraft(
        previous => {
          const next = {
            ...previous,

            profileType:
              nextType,
          }

          if (
            nextType !==
            'public'
          ) {
            next.organizationType =
              ''
          }

          if (
            municipalityLocked
          ) {
            next.profileType =
              'public'

            next.organizationType =
              'municipality'
          }

          return next
        }
      )
    }

  const publicUrl =
    `${window.location.origin}/?profile=${encodeURIComponent(
      draft.slug ||
      draft.ciriloId ||
      ''
    )}`

  const shareText =
    `Find me on Cirilo: ${draft.ciriloId} ${publicUrl}`

  const currentPhoto =
    draft.photoURL ||
    firebaseUser?.photoURL ||
    ''

  const effectiveProfileType =
    municipalityLocked
      ? 'public'
      : normalizeProfileType(
          draft.profileType
        )

  const effectiveOrganizationType =
    municipalityLocked
      ? 'municipality'
      : normalizeOrganizationType(
          draft.organizationType
        )

  const profileTypeMeta =
    getProfileTypeMeta(
      effectiveProfileType
    )

  const selectAvatar =
    src =>
      update(
        'photoURL',
        src
      )

  const keepCurrentPhoto =
    () => {
      update(
        'photoURL',

        firebaseUser?.photoURL ||
        profile.photoURL ||
        ''
      )
    }

  const saveProfile =
    async () => {
      if (
        !firebaseUser?.uid
      ) {
        return
      }

      const displayName =
        String(
          draft.displayName ||
          draft.name ||
          ''
        ).trim()

      if (
        !displayName
      ) {
        setError(
          'Display name cannot be empty.'
        )

        return
      }

      setSaving(true)
      setError('')

      try {
        await updateUserProfile(
          firebaseUser.uid,

          {
            displayName,

            photoURL:
              draft.photoURL ||
              '',

            role:
              draft.role ||
              '',

            location:
              draft.location ||
              '',

            bio:
              draft.bio ||
              '',

            slug:
              draft.slug ||
              draft.ciriloId,

            profileType:
              municipalityLocked
                ? 'public'
                : normalizeProfileType(
                    draft.profileType
                  ),

            organizationType:
              municipalityLocked
                ? 'municipality'
                : normalizeOrganizationType(
                    draft.organizationType
                  ),

            organizationName:
              draft.organizationName ||
              '',

            municipalityCity:
              draft.municipalityCity ||
              '',

            municipalityPostalCode:
              draft.municipalityPostalCode ||
              '',

            organizationWebsite:
              draft.organizationWebsite ||
              '',
          }
        )

        await onSaved?.()

        setSaved(true)

        setTimeout(
          () =>
            setSaved(
              false
            ),
          1500
        )
      } catch (
        saveError
      ) {
        console.error(
          saveError
        )

        setError(
          saveError?.message ||
          'Could not save profile.'
        )
      } finally {
        setSaving(
          false
        )
      }
    }

  const submitMunicipality =
    async () => {
      if (
        !firebaseUser?.uid
      ) {
        return
      }

      setVerificationError(
        ''
      )

      setVerificationLoading(
        true
      )

      try {
        const result =
          await submitMunicipalityVerification({
            organizationName:
              draft.organizationName ||
              '',

            municipalityCity:
              draft.municipalityCity ||
              '',

            municipalityPostalCode:
              draft.municipalityPostalCode ||
              '',

            municipalityAddress:
              draft.municipalityAddress ||
              '',

            organizationWebsite:
              draft.organizationWebsite ||
              '',

            organizationEmail:
              draft.organizationEmail ||
              '',

            requesterName:
              draft.requesterName ||
              '',

            requesterRole:
              draft.requesterRole ||
              '',
          })

        setVerification(
          previous => ({
            ...(previous ||
              {}),

            status:
              result?.status ||
              'pending',

            organizationName:
              draft.organizationName ||
              '',

            municipalityCity:
              draft.municipalityCity ||
              '',

            municipalityPostalCode:
              draft.municipalityPostalCode ||
              '',

            municipalityAddress:
              draft.municipalityAddress ||
              '',

            organizationWebsite:
              draft.organizationWebsite ||
              '',

            organizationEmail:
              draft.organizationEmail ||
              '',

            requesterName:
              draft.requesterName ||
              '',

            requesterRole:
              draft.requesterRole ||
              '',
          })
        )

        try {
          await onSaved?.()
        } catch (
          refreshError
        ) {
          console.warn(
            'Municipality verification submitted, but profile refresh failed.',
            refreshError
          )
        }
      } catch (
        submitError
      ) {
        console.error(
          submitError
        )

        const code =
          String(
            submitError?.code ||
            ''
          )

        const message =
          String(
            submitError?.message ||
            ''
          )

        if (
          code.includes(
            'permission-denied'
          ) ||
          message
            .toLowerCase()
            .includes(
              'missing or insufficient permissions'
            )
        ) {
          setVerificationError(
            'Verification could not be submitted because the current session is not authorized. Sign out, sign back in, then try again.'
          )
        } else if (
          code.includes(
            'unauthenticated'
          )
        ) {
          setVerificationError(
            'Your session has expired. Sign in again, then submit the verification request.'
          )
        } else {
          setVerificationError(
            message ||
            'Could not submit municipality verification.'
          )
        }
      } finally {
        setVerificationLoading(
          false
        )
      }
    }

  const copyId =
    async () => {
      if (
        !draft.ciriloId
      ) {
        return
      }

      await navigator.clipboard?.writeText(
        draft.ciriloId
      )

      setCopied(true)

      setTimeout(
        () =>
          setCopied(
            false
          ),
        1500
      )
    }

  const shareWhatsApp =
    () => {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          shareText
        )}`,
        '_blank',
        'noopener,noreferrer'
      )
    }

  const shareSms =
    () => {
      window.location.href =
        `sms:?&body=${encodeURIComponent(
          shareText
        )}`
    }

  const currentVerificationStatus =
    profile?.municipalityVerificationStatus ||
    verification?.status ||
    'unverified'

  return (
    <section className="profile-view">
      <div className="profile-intro">
        <span className="eyebrow">
          Profile
        </span>

        <h2>
          Your Cirilo identity.
        </h2>

        <p className="profile-handle">
          {draft.ciriloId}
        </p>

        <p>
          Edit your profile and share your Cirilo ID.
        </p>
      </div>

      <div className="profile-layout">

        <article className="profile-card">

          <div className="profile-avatar">
            {currentPhoto ? (
              <img
                src={
                  currentPhoto
                }
                alt=""
              />
            ) : (
              (
                draft.displayName ||
                draft.name ||
                'C'
              ).charAt(0)
            )}
          </div>

          <div className="profile-card-copy">

            <span className="profile-name">
              {draft.displayName ||
                draft.name}
            </span>

            <span className="profile-role">
              {draft.role}
            </span>

            <span className="profile-location">
              {draft.location}
            </span>

          </div>

          <div className="profile-card-badges">

            <span
              className={
                `profile-type-badge ${effectiveProfileType}`
              }
            >
              {
                profileTypeMeta.label
              }
            </span>

            <span
              className={
                `profile-plan ${plan}`
              }
            >
              {plan ===
              'business'
                ? 'Business'
                : plan ===
                  'pro'
                  ? 'Pro'
                  : 'Free'}
            </span>

          </div>

        </article>

        <div className="profile-form">

          <div className="field span-2 profile-type-field">

            <span>
              Account type
            </span>

            <div className="profile-type-grid">

              {PROFILE_TYPE_OPTIONS.map(
                option => {
                  const active =
                    effectiveProfileType ===
                    option.key

                  const disabled =
                    municipalityLocked &&
                    option.key !==
                      'public'

                  const Icon =
                    option.key ===
                    'personal'
                      ? UserRound
                      : option.key ===
                        'public'
                        ? Landmark
                        : Building2

                  return (
                    <button
                      type="button"
                      key={
                        option.key
                      }
                      disabled={
                        disabled
                      }
                      aria-disabled={
                        disabled
                      }
                      aria-pressed={
                        active
                      }
                      className={
                        `profile-type-option${active ? ' active' : ''}${disabled ? ' is-locked' : ''}`
                      }
                      style={
                        disabled
                          ? {
                              opacity:
                                0.42,
                              cursor:
                                'not-allowed',
                              filter:
                                'grayscale(1)',
                            }
                          : undefined
                      }
                      onClick={() =>
                        selectProfileType(
                          option.key
                        )
                      }
                    >

                      <Icon
                        size={
                          17
                        }
                      />

                      <span>

                        <strong>
                          {
                            option.label
                          }
                        </strong>

                        <small>
                          {disabled
                            ? 'Disabled for a verified municipality identity.'
                            : option.description}
                        </small>

                      </span>

                      {disabled ? (
                        <LockKeyhole
                          size={
                            14
                          }
                        />
                      ) : null}

                    </button>
                  )
                }
              )}

            </div>

            {municipalityLocked ? (

              <div className="profile-type-safety public">

                <strong>
                  Verified municipality account
                </strong>

                <small>
                  This Cirilo identity is permanently attached to the verified municipality. Personal and Company account types are disabled for this account.
                </small>

              </div>

            ) : effectiveProfileType ===
              'public' ? (

              <div className="profile-type-safety public">

                <strong>
                  Public Agenda
                </strong>

                <small>
                  New calendar events default to Public. Notes, Tasks, Talents, Tamba and internal work stay private.
                </small>

              </div>

            ) : effectiveProfileType ===
              'company' ? (

              <div className="profile-type-safety company">

                <strong>
                  Company workspace
                </strong>

                <small>
                  New calendar events default to Shared. Public publishing is available only with a paid Pro or Business plan. Company events will support Conference, Meeting, Recruitment, Trade show, Event and Other.
                </small>

              </div>

            ) : (

              <div className="profile-type-safety personal">

                <strong>
                  Personal workspace
                </strong>

                <small>
                  New calendar events, Notes and Tasks stay private unless you explicitly share them.
                </small>

              </div>

            )}

          </div>

          {effectiveProfileType ===
          'public' ? (

            <div className="field span-2 organization-type-field">

              <span>
                Public organization type
              </span>

              <select
                value={
                  effectiveOrganizationType
                }
                disabled={
                  municipalityLocked
                }
                onChange={
                  event =>
                    update(
                      'organizationType',
                      event.target.value
                    )
                }
              >

                <option value="">
                  Choose an organization type
                </option>

                {ORGANIZATION_TYPE_OPTIONS.map(
                  option => (
                    <option
                      key={
                        option.key
                      }
                      value={
                        option.key
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  )
                )}

              </select>

            </div>

          ) : null}

          {effectiveProfileType ===
            'public' &&
          effectiveOrganizationType ===
            'municipality' ? (

            <div className="span-2 municipality-verification-card">

              <div className="municipality-verification-head">

                <div>

                  <span className="eyebrow">
                    Municipality verification
                  </span>

                  <strong>
                    Official municipality identity
                  </strong>

                  <small>
                    Public municipal publishing becomes free after Cirilo verification.
                  </small>

                </div>

                <span
                  className={
                    `verification-status ${currentVerificationStatus}`
                  }
                >
                  {currentVerificationStatus ===
                  'verified'
                    ? 'Verified'
                    : currentVerificationStatus ===
                      'pending'
                      ? 'Pending review'
                      : currentVerificationStatus ===
                        'rejected'
                        ? 'Rejected'
                        : 'Not submitted'}
                </span>

              </div>

              <div className="municipality-fields">

                <label className="field">
                  Official municipality name

                  <input
                    value={
                      draft.organizationName ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'organizationName',
                          event.target.value
                        )
                    }
                    placeholder="Mairie de [Commune]"
                  />
                </label>

                <label className="field">
                  City

                  <input
                    value={
                      draft.municipalityCity ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'municipalityCity',
                          event.target.value
                        )
                    }
                    placeholder="[Commune]"
                  />
                </label>

                <label className="field">
                  Postal code

                  <input
                    value={
                      draft.municipalityPostalCode ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'municipalityPostalCode',
                          event.target.value
                        )
                    }
                    placeholder="[Code postal]"
                  />
                </label>

                <label className="field">
                  Official address

                  <input
                    value={
                      draft.municipalityAddress ||
                      verification?.municipalityAddress ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'municipalityAddress',
                          event.target.value
                        )
                    }
                    placeholder="[Adresse officielle]"
                  />
                </label>

                <label className="field">
                  Official website

                  <input
                    value={
                      draft.organizationWebsite ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'organizationWebsite',
                          event.target.value
                        )
                    }
                    placeholder="https://www.mairie-exemple.fr"
                  />
                </label>

                <label className="field">
                  Professional email

                  <input
                    type="email"
                    value={
                      draft.organizationEmail ||
                      verification?.organizationEmail ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'organizationEmail',
                          event.target.value
                        )
                    }
                    placeholder="communication@mairie-exemple.fr"
                  />
                </label>

                <label className="field">
                  Requester name

                  <input
                    value={
                      draft.requesterName ||
                      verification?.requesterName ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'requesterName',
                          event.target.value
                        )
                    }
                    placeholder="First name, last name"
                  />
                </label>

                <label className="field">
                  Requester role

                  <input
                    value={
                      draft.requesterRole ||
                      verification?.requesterRole ||
                      ''
                    }
                    onChange={
                      event =>
                        update(
                          'requesterRole',
                          event.target.value
                        )
                    }
                    placeholder="Communication department, Mayor's office..."
                  />
                </label>

              </div>

              {verification?.adminNote ? (

                <p className="municipality-admin-note">
                  Cirilo review:{' '}
                  {
                    verification.adminNote
                  }
                </p>

              ) : null}

              {verificationError ? (

                <p className="form-error">
                  {
                    verificationError
                  }
                </p>

              ) : null}

              {currentVerificationStatus !==
              'verified' ? (

                <button
                  type="button"
                  className="primary-btn municipality-submit"
                  disabled={
                    verificationLoading
                  }
                  onClick={
                    submitMunicipality
                  }
                >
                  {verificationLoading
                    ? 'Submitting...'
                    : currentVerificationStatus ===
                      'pending'
                      ? 'Update verification request'
                      : 'Submit for verification'}
                </button>

              ) : (

                <div className="municipality-verified-note">
                  ✓ Official municipality verified by Cirilo. Public municipal events can be published without a paid plan. This Cirilo identity is now locked to the municipality.
                </div>

              )}

            </div>

          ) : null}

          <label className="field">

            Display name

            <input
              value={
                draft.displayName ||
                draft.name ||
                ''
              }
              onChange={
                event => {
                  update(
                    'displayName',
                    event.target.value
                  )

                  update(
                    'name',
                    event.target.value
                  )
                }
              }
            />

          </label>

          <div className="field profile-picture-field">

            <span>
              Profile picture
            </span>

            <div className="profile-picture-current">

              <div className="profile-picture-preview">

                {currentPhoto ? (

                  <img
                    src={
                      currentPhoto
                    }
                    alt=""
                  />

                ) : (

                  (
                    draft.displayName ||
                    draft.name ||
                    'C'
                  ).charAt(0)

                )}

              </div>

              <div>

                <strong>
                  Your current picture
                </strong>

                <small>
                  Keep it, or choose a Cirilo avatar below.
                </small>

              </div>

            </div>

          </div>

          <div className="field span-2 avatar-picker-field">

            <div className="avatar-picker-title">

              <span>
                Choose a Cirilo avatar
              </span>

              {(firebaseUser?.photoURL ||
                profile.photoURL) && (

                <button
                  type="button"
                  className="avatar-keep-photo"
                  onClick={
                    keepCurrentPhoto
                  }
                >

                  <ImageIcon
                    size={
                      13
                    }
                  />

                  Keep my photo

                </button>

              )}

            </div>

            <div className="avatar-picker">

              {CIRILO_AVATARS.map(
                avatar => {
                  const active =
                    draft.photoURL ===
                    avatar.src

                  return (
                    <button
                      type="button"
                      key={
                        avatar.id
                      }
                      className={
                        `avatar-choice${active ? ' active' : ''}`
                      }
                      onClick={() =>
                        selectAvatar(
                          avatar.src
                        )
                      }
                    >

                      <img
                        src={
                          avatar.src
                        }
                        alt=""
                      />

                      {active ? (

                        <span className="avatar-choice-check">

                          <Check
                            size={
                              13
                            }
                          />

                        </span>

                      ) : null}

                    </button>
                  )
                }
              )}

            </div>

          </div>

          <label className="field">

            Role

            <input
              value={
                draft.role ||
                ''
              }
              onChange={
                event =>
                  update(
                    'role',
                    event.target.value
                  )
              }
              placeholder="Coach, founder, host..."
            />

          </label>

          <label className="field">

            Location

            <input
              value={
                draft.location ||
                ''
              }
              onChange={
                event =>
                  update(
                    'location',
                    event.target.value
                  )
              }
              placeholder="Aix-en-Provence, France"
            />

          </label>

          <label className="field span-2">

            Bio

            <textarea
              rows="4"
              value={
                draft.bio ||
                ''
              }
              onChange={
                event =>
                  update(
                    'bio',
                    event.target.value
                  )
              }
              placeholder="A few words about you."
            />

          </label>

          {error ? (

            <p className="form-error span-2">
              {
                error
              }
            </p>

          ) : null}

          <div className="span-2">

            <button
              type="button"
              className="primary-btn"
              onClick={
                saveProfile
              }
              disabled={
                saving
              }
            >

              {saved ? (
                <Check
                  size={
                    15
                  }
                />
              ) : (
                <Save
                  size={
                    15
                  }
                />
              )}

              {saving
                ? 'Saving...'
                : saved
                  ? 'Saved'
                  : 'Save profile'}

            </button>

          </div>

        </div>

        <aside className="profile-public-box">

          <div>

            <Globe2
              size={
                17
              }
            />

            <span>

              <b>
                Your Cirilo ID
              </b>

              <small>
                Share it so people can find you.
              </small>

            </span>

          </div>

          <div className="profile-id-row">

            <strong>
              {
                draft.ciriloId
              }
            </strong>

            <button
              type="button"
              className="icon-btn"
              onClick={
                copyId
              }
            >

              {copied ? (
                <Check
                  size={
                    14
                  }
                />
              ) : (
                <Copy
                  size={
                    14
                  }
                />
              )}

            </button>

          </div>

          <div className="profile-share-actions">

            <button
              type="button"
              className="secondary-btn"
              onClick={
                shareWhatsApp
              }
            >

              <MessageCircle
                size={
                  14
                }
              />

              WhatsApp

            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={
                shareSms
              }
            >

              <Smartphone
                size={
                  14
                }
              />

              SMS

            </button>

          </div>

          <div className="profile-stats">

            <span>

              <b>
                {
                  publicCount
                }
              </b>

              <small>
                public events
              </small>

            </span>

            <span>

              <b>
                {effectiveProfileType ===
                'public'
                  ? 'Public'
                  : effectiveProfileType ===
                    'company'
                    ? 'Shared'
                    : 'Private'}
              </b>

              <small>
                default agenda
              </small>

            </span>

          </div>

          {plan ===
            'free' &&
          !municipalityLocked ? (

            <button
              className="primary-btn"
              onClick={
                onPlans
              }
            >
              See publishing plans
            </button>

          ) : (

            <>

              <button
                className="secondary-btn"
                onClick={() =>
                  navigator.clipboard?.writeText(
                    publicUrl
                  )
                }
              >

                <Copy
                  size={
                    14
                  }
                />

                Copy public profile link

              </button>

              <button
                className="primary-btn"
                onClick={
                  onOpenPublicProfile
                }
              >

                <ExternalLink
                  size={
                    14
                  }
                />

                View public profile

              </button>

            </>

          )}

          <div className="profile-recent-contacts">

            <div className="profile-recent-head">

              <div>

                <b>
                  Recent Cirilo contacts
                </b>

                <small>
                  Your 6 latest Cirilo exchanges.
                </small>

              </div>

              <span>
                {
                  recentContacts.length
                }
              </span>

            </div>

            {recentContacts.length ? (

              <div className="profile-recent-list">

                {recentContacts.map(
                  contact => (

                    <div
                      className="profile-recent-contact"
                      key={
                        contact.ciriloId
                      }
                    >

                      <span className="profile-recent-avatar">

                        <img
                          src="/icon.png"
                          alt=""
                        />

                      </span>

                      <span className="profile-recent-copy">

                        <strong>
                          {
                            contact.ciriloId
                          }
                        </strong>

                        <small>
                          {contact.displayName ||
                            contact.name ||
                            'Cirilo user'}
                        </small>

                      </span>

                      <span className="profile-recent-actions">

                        <button
                          type="button"
                          onClick={() =>
                            onSendNote?.(
                              contact.ciriloId
                            )
                          }
                        >
                          Send a note
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onProposeEvent?.(
                              contact.ciriloId
                            )
                          }
                        >
                          Propose an event
                        </button>

                      </span>

                    </div>

                  )
                )}

              </div>

            ) : (

              <p className="profile-recent-empty">
                No Cirilo exchanges yet.
              </p>

            )}

          </div>

        </aside>

      </div>

    </section>
  )
}