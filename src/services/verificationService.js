import {
  doc,
  onSnapshot,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'

export function subscribeMunicipalityVerification(uid, callback, onError) {
  if (!uid) {
    callback?.(null)
    return () => {}
  }

  return onSnapshot(
    doc(db, 'organizationVerifications', uid),
    snapshot => {
      callback?.(
        snapshot.exists()
          ? { id: snapshot.id, ...snapshot.data() }
          : null
      )
    },
    onError
  )
}

export async function submitMunicipalityVerification(payload) {
  const callable = httpsCallable(
    functions,
    'submitMunicipalityVerification'
  )

  const result = await callable(payload)
  return result.data
}

export async function listMunicipalityVerifications() {
  const callable = httpsCallable(
    functions,
    'listMunicipalityVerifications'
  )

  const result = await callable()
  return result.data?.items || []
}

export async function reviewMunicipalityVerification({
  uid,
  decision,
  adminNote = '',
}) {
  const callable = httpsCallable(
    functions,
    'reviewMunicipalityVerification'
  )

  const result = await callable({
    uid,
    decision,
    adminNote,
  })

  return result.data
}
