const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /app\.get\('\/api\/users', authenticateToken, requireRole\(\['Administrador'\]\), async \(req, res\) => \{[\s\S]*?\}\);/m,
  `app.get('/api/users', authenticateToken, requireRole(['Administrador']), (req, res) => {
  const safeUsers = users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, linkedId: u.linkedId }));
  res.json(safeUsers);
});`
);

server = server.replace(
  /app\.post\('\/api\/users', authenticateToken, requireRole\(\['Administrador'\]\), async \(req, res\) => \{[\s\S]*?\}\);/m,
  `app.post('/api/users', authenticateToken, requireRole(['Administrador']), async (req, res) => {
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
});`
);

server = server.replace(
  /app\.put\('\/api\/users\/:id', authenticateToken, requireRole\(\['Administrador'\]\), async \(req, res\) => \{[\s\S]*?\}\);/m,
  `app.put('/api/users/:id', authenticateToken, requireRole(['Administrador']), async (req, res) => {
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
});`
);

server = server.replace(
  /app\.put\('\/api\/users\/me\/password', authenticateToken, async \(req: any, res: any\) => \{[\s\S]*?\}\);/m,
  `app.put('/api/users/me/password', authenticateToken, async (req: any, res: any) => {
  const { password } = req.body;
  const userIndex = users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  
  users[userIndex].passwordHash = await bcrypt.hash(password, 10);
  res.json({ message: 'Senha atualizada' });
});`
);

fs.writeFileSync('server.ts', server, 'utf8');
