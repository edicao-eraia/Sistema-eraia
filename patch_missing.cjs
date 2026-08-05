const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

if (!server.includes('const JWT_SECRET')) {
  server = server.replace('const app = express();', 'const JWT_SECRET = process.env.JWT_SECRET || "eraia_default_secret_2026";\nconst app = express();');
}
if (!server.includes('let users:')) {
  server = server.replace('const app = express();', 'let users: any[] = [];\nconst app = express();');
}

fs.writeFileSync('server.ts', server, 'utf8');
