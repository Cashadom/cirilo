import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import { db } from '../firebase'

import {
  normalizeOrganizationType,
  normalizeProfileType,
} from '../utils/profileType'

const makeId = () =>
  `cirilo_${Math.floor(100000 + Math.random() * 900000)}`

function isLockedVerifiedMunicipality(profile = {}) {
  return (
    profile.municipalityVerificationStatus === 'verified' &&
    normalizeProfileType(profile.profileType) === 'public' &&
    normalizeOrganizationType(profile.organizationType) === 'municipality'
  )
}

async function reserveId(uid) {
  for (let i = 0; i < 15; i += 1) {
    const ciriloId = makeId()

    try {
      await runTransaction(db, async tx => {
        const ref = doc(db, 'ciriloIds', ciriloId)
        const snap = await tx.get(ref)

        if (snap.exists()) {
          throw new Error('taken')
        }

        tx.set(ref, {
          uid,
          createdAt: serverTimestamp(),
        })
      })

      return ciriloId
    } catch (error) {
      if (error.message !== 'taken' && i === 14) {
        throw error
      }
    }
  }

  throw new Error('Could not create a Cirilo ID.')
}

function normalizedExistingProfile(uid, current = {}) {
  return {
    uid,
    ...current,

    bio:
      current.bio ?? '',

    location:
      current.location ?? '',

    slug:
      current.slug ??
      current.ciriloId ??
      '',

    profileType:
      normalizeProfileType(
        current.profileType
      ),

    organizationType:
      normalizeOrganizationType(
        current.organizationType
      ),

    organizationName:
      current.organizationName ?? '',

    municipalityCity:
      current.municipalityCity ?? '',

    municipalityPostalCode:
      current.municipalityPostalCode ?? '',

    organizationWebsite:
      current.organizationWebsite ?? '',

    municipalityVerificationStatus:
      current.municipalityVerificationStatus ??
      'unverified',
  }
}

function publicProfilePayload(uid, current, next) {
  return {
    uid,

    ciriloId:
      current.ciriloId,

    displayName:
      next.displayName,

    photoURL:
      next.photoURL,

    bio:
      next.bio,

    location:
      next.location,

    role:
      next.role,

    slug:
      next.slug,

    profileType:
      next.profileType,

    organizationType:
      next.organizationType,

    organizationName:
      next.organizationName,

    municipalityCity:
      next.municipalityCity,

    municipalityPostalCode:
      next.municipalityPostalCode,

    organizationWebsite:
      next.organizationWebsite,

    publicProfile:
      current.publicProfile === true,

    updatedAt:
      serverTimestamp(),
  }
}

export async function ensureUserProfile(user) {
  const ref = doc(
    db,
    'users',
    user.uid
  )

  const snap =
    await getDoc(ref)

  /*
   * COMPTE EXISTANT :
   *
   * IMPORTANT :
   * aucune écriture automatique au login.
   *
   * AuthContext doit pouvoir charger le profil
   * même si publicUsers possède encore un ancien format.
   */
  if (snap.exists()) {
    return normalizedExistingProfile(
      user.uid,
      snap.data()
    )
  }

  /*
   * NOUVEAU COMPTE UNIQUEMENT
   */
  const ciriloId =
    await reserveId(
      user.uid
    )

  const profile = {
    ciriloId,

    displayName:
      user.displayName ||
      'Cirilo user',

    email:
      user.email ||
      '',

    photoURL:
      user.photoURL ||
      '',

    bio: '',

    location: '',

    slug:
      ciriloId,

    plan:
      'free',

    profileType:
      'personal',

    organizationType:
      '',

    organizationName:
      '',

    municipalityCity:
      '',

    municipalityPostalCode:
      '',

    organizationWebsite:
      '',

    municipalityVerificationStatus:
      'unverified',

    publicProfile:
      false,

    role:
      'user',

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  }

  await setDoc(
    ref,
    profile
  )

  /*
   * publicUsers est un miroir secondaire.
   *
   * S'il échoue, on ne casse PAS la création
   * du vrai profil users/{uid}.
   */
  try {
    await setDoc(
      doc(
        db,
        'publicUsers',
        ciriloId
      ),
      {
        uid:
          user.uid,

        ciriloId,

        displayName:
          profile.displayName,

        photoURL:
          profile.photoURL,

        bio:
          profile.bio,

        location:
          profile.location,

        role:
          profile.role,

        slug:
          profile.slug,

        profileType:
          profile.profileType,

        organizationType:
          '',

        organizationName:
          '',

        municipalityCity:
          '',

        municipalityPostalCode:
          '',

        organizationWebsite:
          '',

        municipalityVerificationStatus:
          'unverified',

        publicProfile:
          false,

        updatedAt:
          serverTimestamp(),
      }
    )
  } catch (error) {
    console.warn(
      'Private Cirilo profile created, but public profile mirror could not be created:',
      error
    )
  }

  return {
    uid:
      user.uid,

    ...profile,
  }
}

export async function updateUserProfile(
  uid,
  changes = {}
) {
  if (!uid) {
    throw new Error(
      'Missing user ID.'
    )
  }

  const ref = doc(
    db,
    'users',
    uid
  )

  const snap =
    await getDoc(ref)

  if (!snap.exists()) {
    throw new Error(
      'Cirilo profile not found.'
    )
  }

  const current =
    snap.data()

  /*
   * UNE MAIRIE N'EST VERROUILLÉE QUE SI :
   *
   * - profileType === public
   * - organizationType === municipality
   * - municipalityVerificationStatus === verified
   *
   * Un Personal ou Company normal reste libre.
   */
  const municipalityLocked =
    isLockedVerifiedMunicipality(
      current
    )

  const next = {
    displayName:
      String(
        changes.displayName ??
        current.displayName ??
        'Cirilo user'
      ).trim() ||
      'Cirilo user',

    photoURL:
      String(
        changes.photoURL ??
        current.photoURL ??
        ''
      ),

    bio:
      String(
        changes.bio ??
        current.bio ??
        ''
      ).trim(),

    location:
      String(
        changes.location ??
        current.location ??
        ''
      ).trim(),

    role:
      String(
        changes.role ??
        current.role ??
        'user'
      ).trim() ||
      'user',

    slug:
      String(
        changes.slug ??
        current.slug ??
        current.ciriloId ??
        ''
      )
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9_-]/g,
          ''
        ),

    profileType:
      municipalityLocked
        ? 'public'
        : normalizeProfileType(
            changes.profileType ??
            current.profileType
          ),

    organizationType:
      municipalityLocked
        ? 'municipality'
        : normalizeOrganizationType(
            changes.organizationType ??
            current.organizationType
          ),

    organizationName:
      String(
        changes.organizationName ??
        current.organizationName ??
        ''
      ).trim(),

    municipalityCity:
      String(
        changes.municipalityCity ??
        current.municipalityCity ??
        ''
      ).trim(),

    municipalityPostalCode:
      String(
        changes.municipalityPostalCode ??
        current.municipalityPostalCode ??
        ''
      ).trim(),

    organizationWebsite:
      String(
        changes.organizationWebsite ??
        current.organizationWebsite ??
        ''
      ).trim(),
  }

  /*
   * Personal / Company ne gardent pas
   * organizationType.
   */
  if (
    !municipalityLocked &&
    next.profileType !== 'public'
  ) {
    next.organizationType = ''
  }

  /*
   * users/{uid} = SOURCE DE VÉRITÉ
   */
  await setDoc(
    ref,
    {
      ...next,

      updatedAt:
        serverTimestamp(),
    },
    {
      merge:
        true,
    }
  )

  /*
   * publicUsers = miroir secondaire.
   *
   * Si ça échoue :
   * le profil principal est quand même sauvegardé.
   */
  if (current.ciriloId) {
    try {
      await setDoc(
        doc(
          db,
          'publicUsers',
          current.ciriloId
        ),

        publicProfilePayload(
          uid,
          current,
          next
        ),

        {
          merge:
            true,
        }
      )
    } catch (error) {
      console.warn(
        'Profile saved, but publicUsers mirror sync failed:',
        error
      )
    }
  }

  return {
    uid,
    ...current,
    ...next,
  }
}

export async function getUserProfile(uid) {
  if (!uid) {
    return null
  }

  const snap =
    await getDoc(
      doc(
        db,
        'users',
        uid
      )
    )

  if (!snap.exists()) {
    return null
  }

  return normalizedExistingProfile(
    uid,
    snap.data()
  )
}

export async function getCiriloIdByUid(uid) {
  const profile =
    await getUserProfile(
      uid
    )

  return profile?.ciriloId || ''
}