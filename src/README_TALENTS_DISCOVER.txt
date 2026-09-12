CIRILO — TALENTS + DISCOVER V2 — WITHOUT CV
================================================
Talents is now a lightweight candidate database only:
- First name / last name
- Job / position
- Email / phone
- Location
- Source
- Availability
- Salary / rate
- Recruitment status: New / Interview / Pending / Hired / Rejected
- Notes
- Add interview to Week
- Create interview report in Notes

No CV upload, no CV validation, no Firebase Storage dependency.

REPLACE:
src/App.jsx
src/components/TasksView.jsx
src/context/CalendarContext.jsx
firestore.rules

ADD:
src/components/TalentsView.jsx
src/components/TalentCard.jsx
src/components/TalentModal.jsx
src/services/talentService.js
src/talents.css

firebase.json:
Keep your existing firebase.json. Storage is no longer required for Talents.

storage.rules:
Not required for Talents anymore. If you created it only for Talent CVs, delete it and do not add a storage section to firebase.json.
If another Cirilo feature already uses Firebase Storage, keep that feature's existing storage.rules separately.

Deploy Firestore rules only:
npx firebase-tools deploy --only firestore:rules --project cirilo-app
