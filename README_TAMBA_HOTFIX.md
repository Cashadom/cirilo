# Cirilo — Tasks & Tamba Hotfix 1

This is a complete replacement pack for the Tamba MVP files.

## What this fixes

1. App startup crash:
   `Cannot read properties of null (reading 'uid')`
   The Tamba calendar memo no longer dereferences `firebaseUser.uid` before authentication has resolved.

2. Firestore:
   Adds explicit rules for:
   - `users/{uid}/tambaJobs/{jobId}`
   - `users/{uid}/tambaTemplates/{templateId}`
   - owner job creation/editing
   - assigned recipient copy creation
   - assigned worker operational updates (status, checklist, notes, proof URL and timestamps)

3. Tamba status persistence:
   Starting/completing a job now also persists the current checklist, notes and proof-photo URL, instead of only the status.

## Replace these files

- `src/App.jsx`
- `src/firebase.js`
- `src/index.css`
- `src/components/TasksView.jsx`
- `src/components/TambaJobModal.jsx`
- `src/components/TambaTemplateModal.jsx`
- `src/services/tambaService.js`
- `firestore.rules`

## Important

Proof-photo upload uses Firebase Storage. This pack does not overwrite `storage.rules` because your current Storage rules were not provided. The rest of Tamba works without uploading a proof image.

## Then

Publish `firestore.rules` to the Cirilo Firebase project, restart Vite if needed, and test sign-in first.

Git:
git add .
git commit -m "Fix Tamba auth startup and Firestore permissions"
git push origin main
