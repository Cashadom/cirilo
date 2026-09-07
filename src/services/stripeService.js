import {
  getFunctions,
  httpsCallable,
} from 'firebase/functions'
import { app } from '../firebase'

const functions = getFunctions(
  app,
  'europe-west1'
)

const createCheckoutSession =
  httpsCallable(
    functions,
    'createCheckoutSession'
  )

const createCustomerPortalSession =
  httpsCallable(
    functions,
    'createCustomerPortalSession'
  )

function returnUrl() {
  return window.location.origin
}

export async function startProCheckout() {
  const result =
    await createCheckoutSession({
      returnUrl: returnUrl(),
    })

  const url = result.data?.url

  if (!url) {
    throw new Error(
      'Stripe Checkout URL was not returned.'
    )
  }

  window.location.assign(url)
}

export async function openBillingPortal() {
  const result =
    await createCustomerPortalSession({
      returnUrl:
        `${returnUrl()}/?view=plans`,
    })

  const url = result.data?.url

  if (!url) {
    throw new Error(
      'Stripe Customer Portal URL was not returned.'
    )
  }

  window.location.assign(url)
}
