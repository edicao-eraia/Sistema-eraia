const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

const startIdx = server.indexOf("app.post('/api/auth/login'");
const endPattern = "app.post(\"/api/webhooks/google-forms\"";
const endIdx = server.indexOf(endPattern);

const newBlock = `app.post('/api/auth/login', async (req, res) => {
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
});

app.get('/api/users', authenticateToken, requireRole(['Administrador']), (req, res) => {
  const safeUsers = users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, linkedId: u.linkedId }));
  res.json(safeUsers);
});

app.post('/api/users', authenticateToken, requireRole(['Administrador']), async (req, res) => {
  const { email, password, name, role, linkedId } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ error: "Usuário já existe" });
  
  const hash = await bcrypt.hash(password, 10);
  const newUser = {
    id: \`usr-\${Date.now()}\`,
    email,
    passwordHash: hash,
    name,
    role,
    linkedId
  };
  users.push(newUser);
  res.status(201).json({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, linkedId: newUser.linkedId });
});

app.put('/api/users/:id', authenticateToken, requireRole(['Administrador']), async (req, res) => {
  const { id } = req.params;
  const { email, password, name, role, linkedId } = req.body;
  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  
  users[userIndex].email = email;
  users[userIndex].name = name;
  users[userIndex].role = role;
  users[userIndex].linkedId = linkedId;
  
  if (password) {
    users[userIndex].passwordHash = await bcrypt.hash(password, 10);
  }
  
  res.json({ id, email, name, role, linkedId });
});

app.delete('/api/users/:id', authenticateToken, requireRole(['Administrador']), (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex((u: any) => u.id === id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  users.splice(userIndex, 1);
  res.json({ success: true });
});

app.put('/api/users/me/password', authenticateToken, async (req: any, res: any) => {
  const { password } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  
  users[userIndex].passwordHash = await bcrypt.hash(password, 10);
  res.json({ message: 'Senha atualizada' });
});\n\n`;

server = server.substring(0, startIdx) + newBlock + server.substring(endIdx);
fs.writeFileSync('server.ts', server, 'utf8');
