const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

server = server.replace(
  /app\.delete\('\/api\/users\/:id', authenticateToken, requireRole\(\['Administrador'\]\), async \(req, res\) => \{[\s\S]*?\}\);/m,
  `app.delete('/api/users/:id', authenticateToken, requireRole(['Administrador']), (req, res) => {
  const { id } = req.params;
  const userIndex = users.findIndex((u: any) => u.id === id);
  if (userIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
  users.splice(userIndex, 1);
  res.json({ success: true });
});`
);
fs.writeFileSync('server.ts', server, 'utf8');
