CIRILO — TALENTS + DISCOVER V1
================================

OBJECTIVE
- Keep the existing Cirilo features intact.
- Add Tasks > Talents.
- Make Discover -> Add to Week deterministic and immediate.
- Keep the new module responsive.
- Add private Firestore + Storage support for candidate profiles and CV PDFs.

FILES TO REPLACE
1. src/App.jsx
2. src/components/TasksView.jsx
3. src/context/CalendarContext.jsx
4. firestore.rules
5. firebase.json

FILES TO ADD
6. src/components/TalentsView.jsx
7. src/components/TalentCard.jsx
8. src/components/TalentModal.jsx
9. src/services/talentService.js
10. src/talents.css
11. storage.rules

WHAT TALENTS DOES
- Tasks | Tamba Field Work | Talents
- Add/search/filter candidates
- Separate CV status: To review / Validated
- Recruitment status: New / Interview / Pending / Hired / Rejected
- Upload/open PDF CV
- Add interview to Week using the existing EventModal flow
- Create an interview report in Notes
- Candidate records stored in:
  /users/{uid}/talents/{talentId}
- CV PDFs stored in:
  /users/{uid}/talents/{talentId}/cv/...

DISCOVER FIX
- App keeps the existing Discover flow.
- Discover IDs are deterministic when a publicId/id is absent.
- CalendarContext now updates local state immediately before Firestore returns.
- This means Add to Week is visible immediately after switching to Week.
- Existing CalendarContext API is unchanged.

IMPORTANT
- Firebase project: CIRILO only.
- No Ronda deployment.
- Talents data is private to the logged-in owner.
- The storage rule is owner-only and also preserves existing Tamba uploads under /users/{uid}/...

INSTALL
Copy the files to the exact paths shown above.

Then from:
C:\Users\cyril\Desktop\cirilo

Run:
npm run dev

If the app starts correctly, deploy Firebase rules:
npx firebase-tools deploy --only firestore:rules,storage --project cirilo-app

Then push:
git add .
git status
git commit -m "Add Talents and fix Discover add to Week"
git push origin main
git status
