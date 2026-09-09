# Tamba Field Work — actions + agenda + archive

Replace only these files:

- src/App.jsx
- src/components/TambaJobModal.jsx
- src/components/ArchiveView.jsx
- src/services/tambaService.js
- src/tamba.css
- firestore.rules

What changes:
- Right action rail in Job Details
- Export PDF
- WhatsApp share
- Share to Cirilo ID
- Add to my Cirilo agenda
- If a Cirilo ID is entered when saving/sharing:
  - Inbox share is created/updated
  - job is automatically added to that Cirilo user's agenda
- Archive Job moves the Tamba job out of active Tamba and into Archive
- Archived Tamba jobs are shown in ArchiveView
- Cirilo ID stays optional

Publish firestore.rules in the CIRILO Firebase project after replacing the files.
