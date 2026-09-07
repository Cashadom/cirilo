// In App.jsx, add:
import { shareEventToCirilo } from './services/shareService'

// Replace EventModal's onSave handler with this full handler:
onSave={async payload => {
  if (payload.visibility === 'public' && !canPublishPublic) {
    setModalOpen(false)
    setView('plans')
    return
  }

  const next =
    payload.visibility === 'public' && !payload.publicId
      ? { ...payload, publicId: `public-${payload.id}` }
      : payload

  const alreadyExists = events.some(
    event => event.id === next.id
  )

  if (alreadyExists) {
    await updateEvent(next)
  } else {
    await addEvent(next)
  }

  if (
    next.visibility === 'shared' &&
    next.people?.trim()
  ) {
    await shareEventToCirilo({
      senderUid: firebaseUser.uid,
      senderCiriloId: authProfile.ciriloId,
      senderName:
        authProfile.displayName ||
        firebaseUser.displayName ||
        'Cirilo user',
      recipientCiriloId: next.people,
      event: next,
    })
  }

  setModalOpen(false)
}}
