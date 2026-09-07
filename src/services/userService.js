import { doc, getDoc, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const makeId = () => `cirilo_${Math.floor(100000 + Math.random() * 900000)}`

async function reserveId(uid) {
  for (let i = 0; i < 15; i += 1) {
    const ciriloId = makeId()

    try {
      await runTransaction(db, async tx => {
        const ref = doc(db, 'ciriloIds', ciriloId)
        const snap = await tx.get(ref)

        if (snap.exists()) throw new Error('taken')

        tx.set(ref, {
          uid,
          createdAt: serverTimestamp(),
        })
      })

      return ciriloId
    } catch (e) {
      if (e.message !== 'taken' && i === 14) throw e
    }
  }

  throw new Error('Could not create a Cirilo ID.')
}

export async function ensureUserProfile(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)

  if (snap.exists()) {
    const current = snap.data()
    const patch = {}

    if (current.bio === undefined) patch.bio = ''
    if (current.location === undefined) patch.location = ''
    if (current.slug === undefined) patch.slug = current.ciriloId || ''

    if (Object.keys(patch).length) {
      await setDoc(
        ref,
        {
          ...patch,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    }

    return {
      uid: user.uid,
      ...current,
      ...patch,
    }
  }

  const ciriloId = await reserveId(user.uid)

  const profile = {
    ciriloId,
    displayName: user.displayName || 'Cirilo user',
    email: user.email || '',
    photoURL: user.photoURL || '',
    bio: '',
    location: '',
    slug: ciriloId,
    plan: 'free',
    publicProfile: false,
    role: 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(ref, profile)

  await setDoc(doc(db, 'publicUsers', ciriloId), {
    uid: user.uid,
    ciriloId,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    bio: profile.bio,
    location: profile.location,
    role: profile.role,
    slug: profile.slug,
    publicProfile: false,
    updatedAt: serverTimestamp(),
  })

  return {
    uid: user.uid,
    ...profile,
  }
}

export async function updateUserProfile(uid, changes = {}) {
  if (!uid) throw new Error('Missing user ID.')

  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    throw new Error('Cirilo profile not found.')
  }

  const current = snap.data()

  const next = {
    displayName:
      String(changes.displayName ?? current.displayName ?? 'Cirilo user').trim() ||
      'Cirilo user',
    photoURL: String(changes.photoURL ?? current.photoURL ?? ''),
    bio: String(changes.bio ?? current.bio ?? '').trim(),
    location: String(changes.location ?? current.location ?? '').trim(),
    role: String(changes.role ?? current.role ?? 'user').trim() || 'user',
    slug: String(changes.slug ?? current.slug ?? current.ciriloId ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, ''),
  }

  await setDoc(
    ref,
    {
      ...next,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  if (current.ciriloId) {
    await setDoc(
      doc(db, 'publicUsers', current.ciriloId),
      {
        uid,
        ciriloId: current.ciriloId,
        ...next,
        publicProfile: current.publicProfile === true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  }

  return {
    uid,
    ...current,
    ...next,
  }
}

export async function getUserProfile(uid) {
  if (!uid) return null

  const snap = await getDoc(doc(db, 'users', uid))

  if (!snap.exists()) return null

  return {
    uid,
    ...snap.data(),
  }
}

export async function getCiriloIdByUid(uid) {
  const profile = await getUserProfile(uid)
  return profile?.ciriloId || ''
}
