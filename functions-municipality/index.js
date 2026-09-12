const { initializeApp } = require('firebase-admin/app')

const {
  FieldValue,
  getFirestore,
} = require('firebase-admin/firestore')

const {
  HttpsError,
  onCall,
} = require('firebase-functions/v2/https')

const {
  defineSecret,
} = require('firebase-functions/params')

initializeApp()

const db = getFirestore()

const REGION = 'europe-west1'
const ADMIN_EMAIL = 'cyril.ragonet@gmail.com'
const RESEND_API_KEY = defineSecret('RESEND_API_KEY')

function clean(value, max = 500) {
  return String(value || '')
    .trim()
    .slice(0, max)
}

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in to continue.'
    )
  }

  return request.auth.uid
}

function requireAdmin(request) {
  requireAuth(request)

  const email = String(
    request.auth?.token?.email || ''
  ).toLowerCase()

  if (email !== ADMIN_EMAIL) {
    throw new HttpsError(
      'permission-denied',
      'Cirilo administrator access required.'
    )
  }
}

function validateWebsite(value) {
  if (!value) return ''

  try {
    const url = new URL(value)

    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      throw new Error('protocol')
    }

    return url.toString()
  } catch {
    throw new HttpsError(
      'invalid-argument',
      'Enter a valid official website URL.'
    )
  }
}

async function sendEmail({
  to,
  subject,
  html,
}) {
  const apiKey = RESEND_API_KEY.value()

  if (!apiKey) {
    console.warn(
      'RESEND_API_KEY is not configured. Email skipped.'
    )

    return false
  }

  try {
    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          from: 'Cirilo <onboarding@resend.dev>',
          to: [to],
          subject,
          html,
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()

      console.error(
        'Resend error:',
        response.status,
        body
      )

      return false
    }

    return true
  } catch (error) {
    console.error(
      'Could not send Cirilo email:',
      error
    )

    return false
  }
}

exports.submitMunicipalityVerification = onCall(
  {
    region: REGION,
    secrets: [RESEND_API_KEY],
  },

  async request => {
    const uid = requireAuth(request)
    const data = request.data || {}

    const organizationName = clean(
      data.organizationName,
      160
    )

    const municipalityCity = clean(
      data.municipalityCity,
      120
    )

    const municipalityPostalCode = clean(
      data.municipalityPostalCode,
      20
    )

    const municipalityAddress = clean(
      data.municipalityAddress,
      250
    )

    const organizationWebsite = validateWebsite(
      clean(data.organizationWebsite, 300)
    )

    const organizationEmail = clean(
      data.organizationEmail,
      180
    ).toLowerCase()

    const requesterName = clean(
      data.requesterName,
      160
    )

    const requesterRole = clean(
      data.requesterRole,
      160
    )

    if (
      !organizationName ||
      !municipalityCity ||
      !municipalityPostalCode ||
      !municipalityAddress ||
      !organizationWebsite ||
      !organizationEmail ||
      !requesterName ||
      !requesterRole
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Complete every municipality verification field.'
      )
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        organizationEmail
      )
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Enter a valid professional email.'
      )
    }

    const userRef = db.doc(`users/${uid}`)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      throw new HttpsError(
        'failed-precondition',
        'Cirilo profile not found.'
      )
    }

    const user = userSnap.data()

    const payload = {
      uid,

      ciriloId:
        user.ciriloId || '',

      accountEmail:
        request.auth.token.email ||
        user.email ||
        '',

      organizationName,
      municipalityCity,
      municipalityPostalCode,
      municipalityAddress,
      organizationWebsite,
      organizationEmail,
      requesterName,
      requesterRole,

      status: 'pending',

      submittedAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),

      adminNote: '',
    }

    await db
      .doc(`organizationVerifications/${uid}`)
      .set(
        payload,
        { merge: true }
      )

    await userRef.set(
      {
        profileType: 'public',
        organizationType: 'municipality',

        organizationName,
        municipalityCity,
        municipalityPostalCode,
        organizationWebsite,

        municipalityVerificationStatus:
          'pending',

        updatedAt:
          FieldValue.serverTimestamp(),
      },

      { merge: true }
    )

    if (user.ciriloId) {
      await db
        .doc(`publicUsers/${user.ciriloId}`)
        .set(
          {
            uid,
            ciriloId: user.ciriloId,

            profileType: 'public',
            organizationType: 'municipality',

            organizationName,
            municipalityCity,
            municipalityPostalCode,
            organizationWebsite,

            municipalityVerificationStatus:
              'pending',

            updatedAt:
              FieldValue.serverTimestamp(),
          },

          { merge: true }
        )
    }

    await sendEmail({
      to: ADMIN_EMAIL,

      subject:
        'Cirilo — Mairie en attente de validation',

      html: `
        <h2>Nouvelle mairie en attente de validation</h2>

        <p>
          <strong>${organizationName}</strong>
        </p>

        <p>
          ${municipalityAddress}<br>
          ${municipalityPostalCode} ${municipalityCity}
        </p>

        <p>
          <strong>Site :</strong>
          ${organizationWebsite}
        </p>

        <p>
          <strong>Email professionnel :</strong>
          ${organizationEmail}
        </p>

        <p>
          <strong>Demandeur :</strong>
          ${requesterName}
        </p>

        <p>
          <strong>Fonction :</strong>
          ${requesterRole}
        </p>

        <p>
          <strong>Cirilo ID :</strong>
          ${user.ciriloId || '—'}
        </p>

        <p>
          Ouvre Cirilo avec ton compte administrateur
          puis l'onglet <strong>Admin</strong>
          pour valider ou refuser.
        </p>
      `,
    })

    return {
      ok: true,
      status: 'pending',
    }
  }
)

exports.listMunicipalityVerifications = onCall(
  {
    region: REGION,
  },

  async request => {
    requireAdmin(request)

    const snapshot = await db
      .collection('organizationVerifications')
      .where('status', '==', 'pending')
      .get()

    const items = snapshot.docs
      .map(document => ({
        id: document.id,
        ...document.data(),
      }))
      .sort((a, b) =>
        String(
          a.organizationName || ''
        ).localeCompare(
          String(
            b.organizationName || ''
          )
        )
      )

    return {
      items,
    }
  }
)

exports.reviewMunicipalityVerification = onCall(
  {
    region: REGION,
    secrets: [RESEND_API_KEY],
  },

  async request => {
    requireAdmin(request)

    const uid = clean(
      request.data?.uid,
      200
    )

    const decision = clean(
      request.data?.decision,
      20
    )

    const adminNote = clean(
      request.data?.adminNote,
      1000
    )

    if (
      !uid ||
      !['verified', 'rejected'].includes(
        decision
      )
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Invalid verification decision.'
      )
    }

    const verificationRef = db.doc(
      `organizationVerifications/${uid}`
    )

    const verificationSnap =
      await verificationRef.get()

    if (!verificationSnap.exists) {
      throw new HttpsError(
        'not-found',
        'Verification request not found.'
      )
    }

    const verification =
      verificationSnap.data()

    const userRef = db.doc(
      `users/${uid}`
    )

    const userSnap =
      await userRef.get()

    if (!userSnap.exists) {
      throw new HttpsError(
        'not-found',
        'User profile not found.'
      )
    }

    const user =
      userSnap.data()

    const now =
      FieldValue.serverTimestamp()

    await verificationRef.set(
      {
        status: decision,
        adminNote,

        reviewedAt: now,
        reviewedBy: ADMIN_EMAIL,

        updatedAt: now,
      },

      { merge: true }
    )

    const userVerificationUpdate = {
      municipalityVerificationStatus:
        decision,

      updatedAt: now,
    }

    if (decision === 'verified') {
      userVerificationUpdate.municipalityVerifiedAt =
        now

      userVerificationUpdate.municipalityVerifiedBy =
        ADMIN_EMAIL

      userVerificationUpdate.municipalityRejectedAt =
        FieldValue.delete()

      userVerificationUpdate.municipalityRejectedBy =
        FieldValue.delete()
    }

    if (decision === 'rejected') {
      userVerificationUpdate.municipalityRejectedAt =
        now

      userVerificationUpdate.municipalityRejectedBy =
        ADMIN_EMAIL

      userVerificationUpdate.municipalityVerifiedAt =
        FieldValue.delete()

      userVerificationUpdate.municipalityVerifiedBy =
        FieldValue.delete()
    }

    await userRef.set(
      userVerificationUpdate,
      { merge: true }
    )

    if (user.ciriloId) {
      const publicUpdate = {
        municipalityVerificationStatus:
          decision,

        updatedAt: now,
      }

      if (decision === 'verified') {
        publicUpdate.municipalityVerifiedAt =
          now
      } else {
        publicUpdate.municipalityVerifiedAt =
          FieldValue.delete()
      }

      await db
        .doc(`publicUsers/${user.ciriloId}`)
        .set(
          publicUpdate,
          { merge: true }
        )
    }

    const recipient =
      verification.organizationEmail ||
      verification.accountEmail

    if (recipient) {
      await sendEmail({
        to: recipient,

        subject:
          decision === 'verified'
            ? 'Cirilo — Votre mairie est vérifiée'
            : 'Cirilo — Vérification de votre mairie',

        html:
          decision === 'verified'
            ? `
              <h2>
                ${verification.organizationName}
                est vérifiée sur Cirilo ✓
              </h2>

              <p>
                Vous pouvez maintenant publier
                gratuitement les événements officiels
                de la commune.
              </p>
            `
            : `
              <h2>
                Votre demande de vérification
                nécessite une modification
              </h2>

              <p>
                ${
                  adminNote ||
                  'Merci de vérifier les informations transmises puis de soumettre à nouveau votre demande.'
                }
              </p>
            `,
      })
    }

    return {
      ok: true,
      status: decision,
    }
  }
)