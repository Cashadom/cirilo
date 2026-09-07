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
        tx.set(ref, { uid, createdAt: serverTimestamp() })
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
  if (snap.exists()) return { uid: user.uid, ...snap.data() }

  const ciriloId = await reserveId(user.uid)
  const profile = {
    ciriloId,
    displayName: user.displayName || 'Cirilo user',
    email: user.email || '',
    photoURL: user.photoURL || '',
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
    publicProfile: false,
    updatedAt: serverTimestamp(),
  })
  return { uid: user.uid, ...profile }
}

export async function getUserProfile(uid) {
  if (!uid) return null
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid, ...snap.data() }
}

export async function getCiriloIdByUid(uid) {
  const profile = await getUserProfile(uid)
  return profile?.ciriloId || ''
}
