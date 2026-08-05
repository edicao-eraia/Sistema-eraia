const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const restoreCode = `
import fsNode from 'fs';
const DB_FILE = 'local_db.json';

function loadDb() {
  try {
    if (fsNode.existsSync(DB_FILE)) {
      const data = JSON.parse(fsNode.readFileSync(DB_FILE, 'utf8'));
      if (data.users) users = data.users;
      if (data.systemBackups) systemBackups = data.systemBackups;
    }
  } catch (e) {
    console.error('Failed to load DB', e);
  }
  seedMasterUser();
}

function saveDb() {
  const data = {
    users,
    systemBackups
  };
  fsNode.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const seedMasterUser = async () => {
  if (!users.find((u: any) => u.email === 'eraiaeducacaoguiada@gmail.com')) {
    const hash = await bcrypt.hash('eraia@2026', 10);
    users.push({
      id: 'usr-master',
      email: 'eraiaeducacaoguiada@gmail.com',
      passwordHash: hash,
      name: 'Administrador e-RaIA',
      role: 'Administrador'
    });
    saveDb();
  }
};
`;

server = server.replace(/const seedMasterUser = async \(\) => \{[\s\S]*?function saveDb\(\) \{[\s\S]*?\}/, restoreCode);

// Restore login
server = server.replace(
  /app\.post\('\/api\/auth\/login', async \(req, res\) => \{[\s\S]*?\}\);/m,
  `app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = users.find((u: any) => u.email === email);
    if (!user) return res.status(400).json({ error: "Credenciais inválidas" });
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(400).json({ error: "Credenciais inválidas" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, linkedId: user.linkedId }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, linkedId: user.linkedId } });
  } catch (e) {
    res.status(500).json({ error: "Erro de servidor" });
  }
});`
);

fs.writeFileSync('server.ts', server, 'utf8');

