# Cirilo V2 — Contacts, Favorites, Teams & universal sharing

This pack keeps the existing Cirilo sharing engines and adds one common recipient picker.

## Replace / add exactly these files

### New
- `src/components/SharePicker.jsx`
- `src/services/contactService.js`
- `src/share.css`

### Replace
- `src/components/ShareEventDialog.jsx`
- `src/components/NoteShareDialog.jsx`
- `src/components/EventModal.jsx`
- `src/components/TambaJobModal.jsx`
- `src/components/InboxView.jsx`
- `src/services/tambaService.js`
- `firestore.rules`

`src/App.jsx` does not need to change for this pack.

## Behaviour

- Contacts are private to their owner.
- A saved contact displays as `cirilo_154875 [Gilles Lebel]`.
- Any contact can be marked as Favorite.
- Teams are personal lists of contacts, not shared workspaces.
- Selecting a Team expands to its people; final recipients are deduplicated.
- The same SharePicker is used for Events, Notes and Field Work.
- Notes keep the existing immutable/private/shareable thread system.
- Field Work is shared to each recipient Inbox only.
- Field Work does NOT auto-create an agenda event on the recipient account.
- In Inbox, a recipient independently chooses `Add to Field Work` and/or `Add to agenda`.
- No client/executor/viewer roles are introduced.
- Sender deletion does not delete an already received Inbox copy.

## Firestore

After copying `firestore.rules`, publish the rules in the Firebase project used by Cirilo.

New private subcollections:
- `/users/{uid}/contacts/{ciriloId}`
- `/users/{uid}/teams/{teamId}`

## Git

```bash
git add .
git commit -m "Add Cirilo contacts favorites teams and universal sharing"
git push origin main
```
