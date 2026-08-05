const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');
if (!server.includes('let systemBackups')) {
  server = server.replace('const app = express();', 'let systemBackups: any[] = [];\nconst app = express();');
}
fs.writeFileSync('server.ts', server, 'utf8');
