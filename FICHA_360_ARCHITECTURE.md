# Arquitetura e Modelagem Ficha 360° do Aluno

## 1. Modelagem do Banco de Dados (Schema)

Abaixo está um exemplo de modelagem relacional usando **Prisma Schema** para estruturar a vida acadêmica e estratégica do estudante.

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // PostgreSQL (Cloud SQL)
  url      = env("DATABASE_URL")
}

model Student {
  id                String             @id @default(uuid())
  name              String
  email             String             @unique
  phone             String?
  behavioralProfile String?            @db.Text
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  // Relacionamentos 1:1 e 1:N
  medicalRecords    MedicalRecord[]
  schoolHistory     SchoolHistory[]
  tacticalPlans     TacticalPlan[]
  credentialsVault  CredentialsVault?  // 1:1 - Cofre de Credenciais
  grades            Grade[]
}

model MedicalRecord {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  condition String   // Ex: "TDAH", "Dislexia"
  notes     String?  @db.Text
  createdAt DateTime @default(now())
}

model TacticalPlan {
  id          String   @id @default(uuid())
  studentId   String
  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  subject     String
  weeklyHours Int
  strategy    String   @db.Text
}

model CredentialsVault {
  id              String   @id @default(uuid())
  studentId       String   @unique
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  schoolPortalUrl String
  username        String
  encryptedHash   String   // Senha criptografada bidirecional (AES-256-GCM)
  iv              String   // Vetor de inicialização da criptografia
  authTag         String   // Tag de autenticação (GCM)
  updatedAt       DateTime @updatedAt
}
```

---

## 2. Arquitetura de Segurança (Cofre e RBAC)

Para o **Cofre de Credenciais**, senhas de escolas de alunos devem ser criptografadas bidirecionalmente (não podem usar `bcrypt` pois o sistema precisa utilizá-las).

### Exemplo em Node.js (AES-256-GCM)

```typescript
// backend/security/vault.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
// Chave Mestra mantida SEGURA no ambiente (nunca no código)
const MASTER_KEY = Buffer.from(process.env.VAULT_MASTER_KEY!, 'hex'); 

export function encryptPassword(plainText: string) {
  // Cria um vetor de inicialização (IV) único para cada senha
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedHash: encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

export function decryptPassword(encryptedHash: string, ivHex: string, authTagHex: string) {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedHash, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Exemplo Middleware RBAC (Medical Records)

```typescript
// backend/middlewares/rbac.ts
import { Request, Response, NextFunction } from 'express';

export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role; // Extraído do token JWT
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: "Acesso Negado: Você não tem permissão para visualizar dados médicos sensíveis." 
      });
    }
    next();
  };
}

// Em rotas:
// router.get('/students/:id/medical', requireRole(['Coordenador', 'Psicologia']), getMedicalRecords);
```

---

## 3. Prompt de Integração IA (Motor de Agendamento)

Abaixo é um exemplo de como formatar os dados da ficha 360 em JSON e o prompt ideal para passar à IA (Gemini).

```json
{
  "student": {
    "name": "João Pedro",
    "medical_conditions": ["TDAH - Dificuldade de concentração após 45 min", "Sensibilidade visual"],
    "tactical_plan": [
      { "subject": "Física", "hours": 4, "strategy": "Foco em exercícios práticos curtos." },
      { "subject": "Redação", "hours": 2, "strategy": "Leituras densas, prefere manhãs." }
    ],
    "availability": [
      { "day": "Segunda", "start": "08:00", "end": "12:00" },
      { "day": "Quarta", "start": "14:00", "end": "18:00" }
    ]
  },
  "teachers": [ ... ]
}
```

### O Prompt do Sistema para a IA:

> Você é a IA de agendamento do NexusScheduler. Sua missão é cruzar a disponibilidade dos professores com as metas e restrições médicas do aluno listado no JSON abaixo.
> 
> **Regras Absolutas:**
> 1. Respeite as condições médicas (ex: se o aluno possui "TDAH - limite de 45 min", você DEVE dividir o bloco de Física de 4 horas em slots de no máximo 45 minutos com intervalos).
> 2. Aloque a carga horária exata do `tactical_plan`.
> 3. Aloque disciplinas densas (ex: Redação) preferencialmente no primeiro horário de disponibilidade do dia, quando a carga cognitiva do aluno está zerada.
> 4. Explique seu raciocínio pedagógico para as escolhas (campo `reasoning`).
