import React, {
  useEffect,
  useState,
} from 'react'

import {
  useDraggable,
} from '@dnd-kit/core'

import {
  CSS,
} from '@dnd-kit/utilities'

import {
  BadgeCheck,
  Check,
  Lock,
  MapPin,
  Users,
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
  durationMinutes,
  minutesFromTime,
} from '../utils/calendar'

const START_MIN =
  7 * 60

const PX_PER_MINUTE =
  1.05

export default function EventCard({
  event,
  onOpen,
  onResize,
  onShare,

  cardMode = 'standard',

  municipalityName = '',
}) {
  /*
   * This is the only switch controlling mairie cards
   * inside the Week.
   *
   * Personal and Company always remain standard.
   */
  const isMunicipalityCard =
    cardMode ===
    'municipality'

  /*
   * Only explicit recipient/share markers make this
   * a received event.
   *
   * createdByCiriloId is also present on the owner's
   * own events, so it is NOT sufficient by itself.
   */
  const isReceivedSharedEvent =
    Boolean(
      event.isSharedEvent ||
      event.lockedForRecipient ||
      event.sourceShareId ||
      event.sharedByCiriloId ||
      (
        event.sharedBy &&
        /^cirilo_\d{6}$/i.test(
          event.sharedBy
        )
      )
    )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id:
      event.id,

    disabled:
      isReceivedSharedEvent,
  })

  const cat =
    CATEGORIES[
      event.category
    ] ||
    CATEGORIES.personal

  const top =
    (
      minutesFromTime(
        event.startTime
      ) -
      START_MIN
    ) *
    PX_PER_MINUTE

  const height =
    Math.max(
      44,

      durationMinutes(
        event
      ) *
        PX_PER_MINUTE
    )

  const sharedCiriloId =
    isReceivedSharedEvent
      ? (
          event
            .sharedByCiriloId ||
          event
            .createdByCiriloId ||
          (
            /^cirilo_\d{6}$/i.test(
              event.sharedBy ||
              ''
            )
              ? event.sharedBy
              : ''
          )
        )
      : ''

  const [
    creator,
    setCreator,
  ] = useState({
    displayName:
      event
        .createdByName ||
      event
        .sharedByName ||
      '',

    photoURL:
      event
        .createdByPhotoURL ||
      event
        .sharedByPhotoURL ||
      '',
  })

  useEffect(
    () => {
      setCreator({
        displayName:
          event
            .createdByName ||
          event
            .sharedByName ||
          '',

        photoURL:
          event
            .createdByPhotoURL ||
          event
            .sharedByPhotoURL ||
          '',
      })
    },
    [
      event.createdByName,
      event.sharedByName,
      event.createdByPhotoURL,
      event.sharedByPhotoURL,
    ]
  )

  useEffect(
    () => {
      if (
        !isReceivedSharedEvent ||
        !sharedCiriloId
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
                sharedCiriloId
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

          setCreator(
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
        } catch (error) {
          console.error(
            'Could not load event creator:',
            error
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
      isReceivedSharedEvent,
      sharedCiriloId,
    ]
  )

  const creatorInitial =
    (
      creator.displayName ||
      'Cirilo'
    )
      .trim()
      .charAt(0)
      .toUpperCase() ||
    'C'

  const inviteCount =
    (
      event
        .invitedCiriloIds
        ?.length ||
      0
    ) +
    (
      event
        .invitedEmails
        ?.length ||
      0
    )

  /*
   * ---------------------------------------------------------
   * STANDARD CARD
   * ---------------------------------------------------------
   *
   * This stays your original Personal / Company card.
   *
   * Municipality only adds its explicit class and badge.
   */

  return (
    <article
      ref={
        setNodeRef
      }

      style={{
        top,
        height,

        transform:
          CSS.Translate.toString(
            transform
          ),

        opacity:
          isDragging
            ? 0.62
            : 1,

        zIndex:
          isDragging
            ? 30
            : 3,

        '--cat':
          cat.color,

        '--cat-2':
          cat.ribbon2,
      }}

      className={
        'event-card ' +
        (
          event.completed
            ? 'is-complete '
            : ''
        ) +
        (
          event.type ===
          'task'
            ? 'is-task '
            : ''
        ) +
        (
          isReceivedSharedEvent
            ? 'is-received-shared '
            : ''
        ) +
        (
          isMunicipalityCard
            ? 'is-municipality-event '
            : ''
        )
      }

      onDoubleClick={() =>
        onOpen(
          event
        )
      }

      {...(
        !isReceivedSharedEvent
          ? listeners
          : {}
      )}

      {...(
        !isReceivedSharedEvent
          ? attributes
          : {}
      )}
    >
      <span className="life-ribbon ribbon-back" />
      <span className="life-ribbon ribbon-front" />

      {isReceivedSharedEvent &&
        sharedCiriloId && (
          <span
            className="event-creator-avatar"

            title={
              `Shared by @${sharedCiriloId}`
            }
          >
            {creator.photoURL ? (
              <img
                src={
                  creator.photoURL
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
        )}

      {event.type ===
        'task' && (
        <span className="task-mark">
          {event.completed
            ? (
                <Check
                  size={
                    11
                  }
                />
              )
            : null}
        </span>
      )}

      <button
        className="event-body"

        onClick={
          clickEvent => {
            clickEvent.stopPropagation()

            onOpen(
              event
            )
          }
        }
      >
        <span className="event-time">
          {
            event.startTime
          }{' '}
          —{' '}
          {
            event.endTime
          }
        </span>

        {/*
         * Municipality identity appears ONLY while the
         * active account is the verified mairie profile.
         *
         * Personal / Company do not render this at all.
         */}
        {isMunicipalityCard &&
          height >
            56 && (
            <span className="event-shared-by municipality-card-label">
              <BadgeCheck
                size={
                  10
                }
              />

              {municipalityName ||
                'Municipality'}
            </span>
          )}

        <span className="event-title">
          {
            event.title
          }
        </span>

        {sharedCiriloId &&
          height >
            68 && (
            <span className="event-shared-by">
              <Lock
                size={
                  10
                }
              />

              @
              {
                sharedCiriloId
              }
            </span>
          )}

        {!isReceivedSharedEvent &&
          inviteCount >
            0 &&
          height >
            60 && (
            <span className="event-shared-by">
              <Users
                size={
                  10
                }
              />

              Shared with{' '}
              {
                inviteCount
              }
            </span>
          )}

        {event.visibility ===
          'public' &&
          height >
            70 && (
            <span className="event-shared-by">
              {isMunicipalityCard
                ? 'Official public event'
                : 'Public card'}
            </span>
          )}

        {height >
          72 &&
          event.location && (
            <span className="event-meta">
              <MapPin
                size={
                  11
                }
              />

              {
                event.location
              }
            </span>
          )}

        {height >
          92 &&
          event.people && (
            <span className="event-meta">
              <Users
                size={
                  11
                }
              />

              {
                event.people
              }
            </span>
          )}
      </button>

      {!isReceivedSharedEvent &&
        height >
          78 && (
          <button
            className="event-share-button"

            onClick={
              clickEvent => {
                clickEvent.stopPropagation()

                onShare?.(
                  event
                )
              }
            }
          >
            Share
          </button>
        )}

      {!isReceivedSharedEvent && (
        <button
          className="resize-handle"

          aria-label="Extend event by 30 minutes"

          onPointerDown={
            pointerEvent =>
              pointerEvent.stopPropagation()
          }

          onClick={
            clickEvent => {
              clickEvent.stopPropagation()

              onResize(
                event.id,
                30
              )
            }
          }
        />
      )}
    </article>
  )
}