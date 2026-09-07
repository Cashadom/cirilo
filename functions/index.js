const { setGlobalOptions } = require("firebase-functions/v2")
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https")
const { defineSecret } = require("firebase-functions/params")
const { initializeApp } = require("firebase-admin/app")
const { getFirestore, FieldValue } = require("firebase-admin/firestore")
const Stripe = require("stripe")

initializeApp()

setGlobalOptions({
  region: "europe-west1",
  maxInstances: 10,
  invoker: "public",
})

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY")
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET")

const CIRILO_PRO_PRICE_ID = "price_1UCcO9HxMqmoGA0zDtiH87Hn"

function getStripe() {
  return new Stripe(STRIPE_SECRET_KEY.value())
}

function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be signed in to Cirilo."
    )
  }

  return request.auth.uid
}

async function getOrCreateStripeCustomer({
  stripe,
  uid,
  email,
  displayName,
}) {
  const db = getFirestore()
  const userRef = db.collection("users").doc(uid)
  const userSnap = await userRef.get()
  const userData = userSnap.exists ? userSnap.data() : {}

  if (userData?.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(
        userData.stripeCustomerId
      )

      if (!customer.deleted) {
        return customer
      }
    } catch (error) {
      console.warn(
        "Stored Stripe customer could not be retrieved:",
        error.message
      )
    }
  }

  const customer = await stripe.customers.create({
    email: email || undefined,
    name: displayName || undefined,
    metadata: {
      firebaseUid: uid,
      app: "cirilo",
    },
  })

  await userRef.set(
    {
      stripeCustomerId: customer.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return customer
}

exports.createCheckoutSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
  },
  async (request) => {
    const uid = requireAuth(request)
    const stripe = getStripe()

    const returnUrl =
      typeof request.data?.returnUrl === "string" &&
      request.data.returnUrl.startsWith("http")
        ? request.data.returnUrl.replace(/\/$/, "")
        : "http://localhost:5173"

    const email = request.auth.token.email || ""
    const displayName = request.auth.token.name || ""

    const customer = await getOrCreateStripeCustomer({
      stripe,
      uid,
      email,
      displayName,
    })

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 20,
    })

    const alreadyActive = subscriptions.data.some((subscription) =>
      ["active", "trialing", "past_due"].includes(subscription.status)
    )

    if (alreadyActive) {
      throw new HttpsError(
        "already-exists",
        "This Cirilo account already has a Stripe subscription."
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [
        {
          price: CIRILO_PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url:
        `${returnUrl}/?view=plans&stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:
        `${returnUrl}/?view=plans&stripe=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: uid,
      metadata: {
        firebaseUid: uid,
        plan: "pro",
      },
      subscription_data: {
        metadata: {
          firebaseUid: uid,
          plan: "pro",
        },
      },
    })

    return {
      url: session.url,
    }
  }
)

exports.createCustomerPortalSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
  },
  async (request) => {
    const uid = requireAuth(request)
    const stripe = getStripe()
    const db = getFirestore()

    const returnUrl =
      typeof request.data?.returnUrl === "string" &&
      request.data.returnUrl.startsWith("http")
        ? request.data.returnUrl
        : "http://localhost:5173/?view=plans"

    const userSnap = await db.collection("users").doc(uid).get()

    if (!userSnap.exists) {
      throw new HttpsError(
        "failed-precondition",
        "Cirilo profile not found."
      )
    }

    const stripeCustomerId = userSnap.data()?.stripeCustomerId

    if (!stripeCustomerId) {
      throw new HttpsError(
        "failed-precondition",
        "No Stripe customer is linked to this Cirilo account."
      )
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    })

    return {
      url: portal.url,
    }
  }
)

async function applySubscriptionToFirestore(subscription) {
  const db = getFirestore()

  let uid = subscription.metadata?.firebaseUid || ""

  if (!uid && subscription.customer) {
    const stripe = getStripe()
    const customer = await stripe.customers.retrieve(
      subscription.customer
    )

    if (!customer.deleted) {
      uid = customer.metadata?.firebaseUid || ""
    }
  }

  if (!uid) {
    console.error(
      "Stripe subscription has no firebaseUid:",
      subscription.id
    )
    return
  }

  const activeStatuses = new Set([
    "active",
    "trialing",
  ])

  const plan = activeStatuses.has(subscription.status)
    ? "pro"
    : "free"

  const currentPeriodEnd =
    subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null

  await db.collection("users").doc(uid).set(
    {
      plan,
      subscriptionStatus: subscription.status,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id || "",
      stripeSubscriptionId: subscription.id,
      stripePriceId:
        subscription.items?.data?.[0]?.price?.id || "",
      currentPeriodEnd,
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

exports.stripeWebhook = onRequest(
  {
    secrets: [
      STRIPE_SECRET_KEY,
      STRIPE_WEBHOOK_SECRET,
    ],
  },
  async (request, response) => {
    const stripe = getStripe()

    const signature = request.headers["stripe-signature"]

    if (!signature) {
      response.status(400).send("Missing Stripe signature.")
      return
    }

    let event

    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET.value()
      )
    } catch (error) {
      console.error(
        "Stripe webhook signature verification failed:",
        error.message
      )
      response.status(400).send("Invalid webhook signature.")
      return
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object

          if (
            session.mode === "subscription" &&
            session.subscription
          ) {
            const subscription =
              await stripe.subscriptions.retrieve(
                session.subscription
              )

            await applySubscriptionToFirestore(
              subscription
            )
          }

          break
        }

        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          await applySubscriptionToFirestore(
            event.data.object
          )
          break
        }

        default:
          console.log(
            `Unhandled Stripe event: ${event.type}`
          )
      }

      response.status(200).json({ received: true })
    } catch (error) {
      console.error(
        "Stripe webhook processing error:",
        error
      )
      response.status(500).send("Webhook processing failed.")
    }
  }
)
