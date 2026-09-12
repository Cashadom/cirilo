CIRILO — MUNICIPALITY VERIFICATION V1
=====================================

WHAT THIS PACK DOES
-------------------
1. Keeps Personal / Public / Company profile types.
2. Adds Public organization type.
3. Municipality accounts must submit:
   - official municipality name
   - city
   - postal code
   - official address
   - official website
   - professional email
   - requester name
   - requester role
4. Status:
   unverified -> pending -> verified / rejected
5. The user CANNOT self-verify.
6. Cyril receives:
   "Cirilo — Mairie en attente de validation"
   at cyril.ragonet@gmail.com
7. Admin access is server-protected by the authenticated email:
   cyril.ragonet@gmail.com
8. Verified municipalities publish official public events FREE.
9. Normal creators still need Cirilo Pro/Business for public publishing.
10. Municipality event form changes:
    Culture
    Sports
    Works & Traffic
    Environment
    Civic & Municipal
    Education
    Social & Health
    Local life
    Other
    Priority / People / Reminder are removed for municipality events.
11. Public municipality events are mirrored to /publicEvents and Discover subscribes to them.

FILES TO REPLACE
----------------
firebase.json
firestore.rules
src/App.jsx
src/firebase.js
src/index.css
src/components/ProfileView.jsx
src/components/EventModal.jsx
src/components/PlansView.jsx
src/components/PublicProfilePage.jsx
src/context/CalendarContext.jsx
src/services/userService.js
src/services/eventService.js
src/utils/profileType.js

FILES TO CREATE
---------------
src/components/AdminVerificationView.jsx
src/services/verificationService.js

functions-municipality/
  package.json
  index.js
  .gitignore

IMPORTANT ABOUT YOUR EXISTING STRIPE FUNCTIONS
----------------------------------------------
Cirilo previously used the DEFAULT Firebase Functions codebase for Stripe.
This pack deliberately uses a SECOND codebase:
  functions-municipality
  codebase: municipality

That means the municipality deployment does NOT replace or delete the
existing Stripe functions.

Do NOT delete your old functions/ folder if it exists.
Do NOT deploy the default functions codebase from this pack.

SET UP EMAIL (RESEND)
---------------------
Create a Resend account and obtain an API key.

From:
C:\Users\cyril\Desktop\cirilo

Run:

npx firebase-tools functions:secrets:set RESEND_API_KEY --project cirilo-app

Paste the Resend API key when asked.

For V1 the function sends from:
Cirilo <onboarding@resend.dev>

For production, verify cirilo.fr in Resend and later replace that sender
with an address on cirilo.fr.

INSTALL MUNICIPALITY FUNCTION DEPENDENCIES
------------------------------------------
cd C:\Users\cyril\Desktop\cirilo\functions-municipality
npm install
cd ..

TEST FRONTEND
-------------
npm run build

DEPLOY ONLY THE MUNICIPALITY CODEBASE + RULES
---------------------------------------------
npx firebase-tools deploy --only functions:municipality,firestore:rules --project cirilo-app

Do NOT use:
firebase deploy --only functions

because your existing Stripe functions are in another codebase.

ADMIN
-----
Sign into Cirilo using:
cyril.ragonet@gmail.com

An "Admin" tab becomes visible automatically.
Only this authenticated email can call the server-side approve/reject
functions.

FIRESTORE SECURITY
------------------
This pack also fixes an important security issue:
the client can no longer modify its own:
- plan
- Stripe IDs/status
- municipality verification status

/publicEvents can only be created when the owner is:
- Pro
- Business
- OR a verified municipality

Municipality verification writes are server-only.

GIT
---
After testing:

git add .
git commit -m "Add verified municipality profiles and municipal public events"
git push origin main
