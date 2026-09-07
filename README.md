# Cirilo

A clean weekly life planner for five worlds: Pro, Personal, Family, Friends and Tasks.

## Run

```bash
npm install
npm run dev
```

## Included in MVP

- Monday-to-Sunday weekly calendar
- Five color-coded life categories
- Detailed event/task editor
- Local persistence with localStorage
- Drag & drop between days
- Click-to-extend event duration
- Category filters
- Quick Add parser
- Ctrl/Cmd + K shortcut to focus Quick Add
- Weekly life-balance summary
- Responsive layout
- Demo data and reset button

All UI text is in English.

## Visual direction V2

- White-first interface with black typography
- Regular font weights only
- Cirilo diagonal Life Ribbon on event cards
- Lighter calendar grid and controls
- Compact in-app header

## V3 — Public Cards & Discover

- Week / Discover / Tasks navigation
- Public event cards
- Public event detail page
- Add public events directly to your own week
- Shared-by attribution in the calendar
- Private / Shared / Public visibility
- Public share links
- Mock public event data

Backend email delivery, accounts and real discovery are intentionally deferred.

## V4 — Profiles, Archive, paid publishing and SEO foundation

- Personal profile editor and public creator profile
- Read-only archive for past events
- New events cannot be created in the past
- Public publishing gated behind paid plans
- Cirilo Pro: €9.99/month
- Cirilo Business: €200/year, 5 users, annual payment only
- Plans page and prototype plan switching via localStorage
- SEO metadata for app, Discover, Plans, public events and public profiles
- JSON-LD Event and Person structured data
- robots.txt and sitemap.xml starter files

### Production notes
The pricing buttons are prototype switches only. Real billing should be connected to Stripe or another payment provider through a backend. For strong search-engine indexing of thousands of public event/profile pages, move public routes to SSR or static prerendering rather than relying only on client-rendered SPA metadata.


## V5 — Channels, weekly preview and direct sharing

New prototype features:
- Channels for schools, coaches, communities and organizations
- Follow / unfollow channel
- Public channel page with upcoming public events
- Weekly “Coming up” summary showing the next 3 events
- The summary attempts to alternate professional and personal-life events
- No Hugging Face or AI API is required for this MVP; the summary is deterministic, instant and private
- Direct event sharing UI by:
  - Cirilo ID, e.g. `cirilo_125621`
  - Email address
- Each profile can expose a unique Cirilo ID
- Shared event preview before sending

### Production delivery model
For Cirilo-ID sharing, the backend resolves `cirilo_XXXXXX` to a user account and writes an in-app notification/inbox item.
For email sharing, the backend creates a secure share token and sends a transactional email through a provider such as Resend, Postmark or Amazon SES.
The current MVP intentionally simulates delivery because authentication/database/email infrastructure is not yet connected.


## V6 — Firebase production foundation

Included: Google auth, email/password signup/login, password reset, email verification, persistent session, automatic Firestore profile, unique `cirilo_XXXXXX`, Firestore-backed events with localStorage migration, real Cirilo-ID sharing to Inbox, email share via secure Firestore card + mail client.

Before launch:
1. Firebase Console > Firestore > Rules: paste `firestore.rules` and Publish.
2. Firebase Authentication > Settings > Authorized domains: add `cirilo.fr` and `www.cirilo.fr` if used.
3. Run `npm install` then `npm run dev`.
4. Test Google login, email login, logout/relogin, event creation, Cirilo-ID sharing and email share link.
