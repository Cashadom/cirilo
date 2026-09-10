export function normalizeSharePolicy(value = '') {
  const normalized = String(value || '').toLowerCase()

  if (normalized === 'shared' || normalized === 'shareable') {
    return 'shareable'
  }

  return 'private'
}

export function isClosedEntity(entity = {}) {
  return Boolean(
    entity.closed ||
      entity.isClosed ||
      entity.status === 'closed' ||
      entity.threadStatus === 'closed'
  )
}

export function isReceivedEntity(entity = {}, currentUid = '') {
  // A copy explicitly saved into the current user's Notes is a local,
  // independent document. Historical provenance must not lock it.
  if (
    currentUid &&
    entity.localOwnerUid === currentUid &&
    entity.ownerUid === currentUid &&
    entity.lockedForRecipient !== true
  ) {
    return false
  }

  return Boolean(
    entity.isReceivedShared ||
      entity.lockedForRecipient ||
      entity.sourceShareId ||
      entity.receivedSnapshot ||
      entity.originalSenderCiriloId
  )
}

export function getSharePolicy(entity = {}) {
  return normalizeSharePolicy(
    entity.sharePolicy || entity.visibility || 'private'
  )
}

export function canEditOriginal(entity = {}, currentUid = '') {
  if (!currentUid || isClosedEntity(entity)) return false
  if (isReceivedEntity(entity, currentUid)) return false

  return Boolean(
    !entity.ownerUid || entity.ownerUid === currentUid
  )
}

export function canDeleteLocalCopy(entity = {}, currentUid = '') {
  if (!currentUid) return false

  if (entity.localOwnerUid) {
    return entity.localOwnerUid === currentUid
  }

  if (entity.ownerUid && !isReceivedEntity(entity, currentUid)) {
    return entity.ownerUid === currentUid
  }

  return true
}

export function canReply(entity = {}, currentUid = '') {
  if (!currentUid || isClosedEntity(entity)) return false

  return Boolean(
    entity.threadId ||
      entity.senderUid ||
      entity.originalSenderUid ||
      entity.isReceivedShared
  )
}

export function canForward(entity = {}, currentUid = '') {
  if (!currentUid || isClosedEntity(entity)) return false
  return getSharePolicy(entity) === 'shareable'
}

export function canClose(entity = {}, currentUid = '') {
  if (!currentUid || isClosedEntity(entity)) return false

  const organizerUid =
    entity.organizerUid || entity.ownerUid || entity.createdByUid || ''

  return Boolean(organizerUid && organizerUid === currentUid)
}

export function canChangePrivacy(entity = {}, currentUid = '') {
  return canEditOriginal(entity, currentUid)
}

export function immutableSourceFields(entity = {}) {
  return {
    title: entity.title || '',
    universe: entity.universe || 'personal',
    visibility: entity.visibility || 'private',
    sharePolicy: getSharePolicy(entity),
    items: entity.items || [],
    ownerUid: entity.ownerUid || '',
    ownerCiriloId: entity.ownerCiriloId || '',
    organizerUid: entity.organizerUid || entity.ownerUid || '',
    organizerCiriloId:
      entity.organizerCiriloId || entity.ownerCiriloId || '',
    originalSenderUid: entity.originalSenderUid || entity.senderUid || '',
    originalSenderCiriloId:
      entity.originalSenderCiriloId || entity.senderCiriloId || '',
    createdAt: entity.createdAt || null,
  }
}
