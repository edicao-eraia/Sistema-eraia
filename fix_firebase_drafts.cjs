const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// 1. Webhook student drafts
server = server.replace(
  /try \{\n\s*await firestoreSetDoc\(firestoreDoc\(serverDb, 'studentDrafts', newDraftId\), newDraft\);\n\s*\} catch\(e\) \{\n\s*console\.error\('Firebase save failed for studentDraft', e\);\n\s*\}/,
  ""
);

// 2. Student draft approval
server = server.replace(
  /await firestoreSetDoc\(firestoreDoc\(serverDb, 'studentDrafts', draft\.id\), studentDrafts\[draftIndex\]\);/,
  ""
);

// 3. Guardian draft sheets sync
server = server.replace(
  /try \{\n\s*await firestoreSetDoc\(firestoreDoc\(serverDb, 'guardianDrafts', newDraft\.id\), newDraft\);\n\s*\} catch \(e\) \{\n\s*console\.error\('Firebase save failed for new guardian draft', e\);\n\s*\}/,
  ""
);

// 4. Guardian draft approval
server = server.replace(
  /await firestoreSetDoc\(firestoreDoc\(serverDb, 'guardianDrafts', draft\.id\), guardianDrafts\[draftIndex\]\);/,
  ""
);

fs.writeFileSync('server.ts', server, 'utf8');
