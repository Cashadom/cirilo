import React, { useState } from 'react'
import {
  Check,
  Building2,
  Globe2,
  LoaderCircle,
  Sparkles,
} from 'lucide-react'

export default function PlansView({
  plan,
  onChoose,
  isVerifiedMunicipality = false,
  municipalityVerificationStatus = 'unverified',
}) {
  const [loading, setLoading] =
    useState('')
  const [error, setError] =
    useState('')

  async function choose(choice) {
    if (loading) return

    setError('')
    setLoading(choice)

    try {
      await onChoose(choice)
    } catch (err) {
      console.error(err)
      setError(
        err?.message ||
        'Could not open Stripe. Please try again.'
      )
      setLoading('')
    }
  }

  const isPaid =
    plan === 'pro' ||
    plan === 'business'

  return (
    <section className="plans-view">
      <div className="plans-intro">
        <span className="eyebrow">
          Plans
        </span>

        <h2>
          Organize for free. Publish when you want reach.
        </h2>

        <p>
          Personal planning stays free. Public publishing is paid for creators and companies; verified municipalities publish municipal events free.
        </p>
      </div>

      {error && (
        <div className="form-error">
          {error}
        </div>
      )}

      <div className="plans-grid">
        <article className="plan-card">
          <span className="plan-kicker">
            Free
          </span>

          <h3>
            Personal
          </h3>

          <div className="plan-price">
            €0
          </div>

          <p>
            For your private week, tasks, Notes and shared cards.
          </p>

          <ul>
            <li>
              <Check size={14}/>
              Weekly planner
            </li>

            <li>
              <Check size={14}/>
              Notes and active memory
            </li>

            <li>
              <Check size={14}/>
              Private and shared cards
            </li>

            <li>
              <Check size={14}/>
              Discover public events
            </li>
          </ul>

          <button
            className="secondary-btn plan-button"
            disabled={plan === 'free' || Boolean(loading)}
            onClick={() => choose('free')}
          >
            {plan === 'free'
              ? 'Current plan'
              : loading === 'free'
                ? <>
                    <LoaderCircle size={14}/>
                    Opening…
                  </>
                : 'Manage subscription'}
          </button>
        </article>

        <article className="plan-card featured">
          <span className="plan-kicker">
            <Sparkles size={13}/>
            Cirilo Pro
          </span>

          <h3>
            Public creator
          </h3>

          <div className="plan-price">
            €9.99
            {' '}
            <small>
              / month
            </small>
          </div>

          <p>
            For coaches, hosts, communities and independent professionals.
          </p>

          <ul>
            <li>
              <Check size={14}/>
              Everything in Personal
            </li>

            <li>
              <Check size={14}/>
              Publish public events
            </li>

            <li>
              <Check size={14}/>
              Public creator profile
            </li>

            <li>
              <Check size={14}/>
              Public share links
            </li>

            <li>
              <Check size={14}/>
              Event views and joins
            </li>
          </ul>

          <button
            className="primary-btn plan-button"
            disabled={Boolean(loading)}
            onClick={() =>
              choose(
                plan === 'pro'
                  ? 'manage'
                  : 'pro'
              )
            }
          >
            {loading === 'pro' ||
            loading === 'manage' ? (
              <>
                <LoaderCircle size={14}/>
                Opening Stripe…
              </>
            ) : plan === 'pro' ? (
              'Manage Pro'
            ) : (
              'Choose Pro'
            )}
          </button>
        </article>

        <article className="plan-card">
          <span className="plan-kicker">
            <Building2 size={13}/>
            Business
          </span>

          <h3>
            Small team
          </h3>

          <div className="plan-price">
            €200
            {' '}
            <small>
              / year
            </small>
          </div>

          <p>
            One annual payment for up to 5 users.
          </p>

          <ul>
            <li>
              <Check size={14}/>
              5 creator seats
            </li>

            <li>
              <Check size={14}/>
              Public company profile
            </li>

            <li>
              <Check size={14}/>
              Team event publishing
            </li>

            <li>
              <Check size={14}/>
              Shared brand page
            </li>

            <li>
              <Check size={14}/>
              Annual billing only
            </li>
          </ul>

          <button
            className="secondary-btn plan-button"
            disabled
          >
            Coming soon
          </button>
        </article>
      </div>

      <div className="plans-note">
        <Globe2 size={15}/>
        {isVerifiedMunicipality
          ? 'Verified municipality: official municipal event publishing is free.'
          : municipalityVerificationStatus === 'pending'
            ? 'Municipality verification pending. Public municipal publishing unlocks after approval.'
            : 'Public creator event publishing requires Cirilo Pro.'}
      </div>
    </section>
  )
}
