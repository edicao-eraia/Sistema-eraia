const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const regex = /guardianDrafts\.push\(newDraft\);/g;
server = server.replace(regex, `guardianDrafts.push(newDraft);
      saveDb();
      try {
        await firestoreSetDoc(firestoreDoc(serverDb, 'guardianDrafts', newDraft.id), newDraft);
      } catch (e) {
        console.error('Firebase save failed for new guardian draft', e);
      }`);

fs.writeFileSync('server.ts', server, 'utf8');
