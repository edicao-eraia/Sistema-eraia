
function compileStudentFixedActivities(data: any): string[] {
  if (!data) return [];
  const activities: string[] = [];
  if (data.cursosExtracurriculares) {
    activities.push(`Curso Extracurricular: ${data.cursosExtracurriculares}`);
  }
  if (data.atividadeFisica) {
    activities.push(`Atividade Física: ${data.atividadeFisica}`);
  }
  if (data.rotinaSemanal) {
    activities.push(`Rotina Semanal: ${data.rotinaSemanal}`);
  }
  return activities;
}

function compileBehavioralProfileText(data: any): string {
  if (!data) return "";
  const sections: string[] = [];

  if (data.rotinaSemanal) {
    sections.push(`Rotina Semanal: ${data.rotinaSemanal}`);
  }

  const habitLines: string[] = [];
  if (data.estudaFora) {
    habitLines.push(`Estuda fora da escola atualmente: ${data.estudaFora}`);
  }
  if (data.rotinaEstudosFora) {
    habitLines.push(`Rotina de estudos fora da escola: ${data.rotinaEstudosFora}`);
  }
  if (data.mantemRotinaEstudos) {
    habitLines.push(`Consegue manter rotina de estudos: ${data.mantemRotinaEstudos}`);
  }
  if (data.tempoEstudoPorDia) {
    habitLines.push(`Tempo de estudo por dia (fora da escola): ${data.tempoEstudoPorDia}`);
  }
  if (data.costumaRevisar) {
    habitLines.push(`Costuma revisar conteúdo: ${data.costumaRevisar}`);
  }

  if (habitLines.length > 0) {
    sections.push(`Hábitos & Contexto de Estudos Fora da Escola:\n- ${habitLines.join('\n- ')}`);
  }

  if (data.maiorDificuldade) {
    sections.push(`Maior Dificuldade Relatada: ${data.maiorDificuldade}`);
  }

  if (sections.length === 0 && data.behavioralProfile) {
    return data.behavioralProfile;
  }

  return sections.join('\n\n').trim();
}

import express from "express";
import path from "path";
import multer from "multer";
import { parse } from "csv-parse/sync";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);


import { initializeApp as initFirebaseServer } from 'firebase/app';
import { getFirestore as getFirestoreServer, doc as firestoreDoc, setDoc as firestoreSetDoc, collection as firestoreCollection, getDocs as firestoreGetDocs, query as firestoreQuery, where as firestoreWhere, updateDoc as firestoreUpdateDoc, deleteDoc as firestoreDeleteDoc } from 'firebase/firestore';
const firebaseConfigObj = JSON.parse(fsNode.readFileSync('firebase-applet-config.json', 'utf8'));
const serverFirebaseApp = initFirebaseServer(firebaseConfigObj);
const serverDb = getFirestoreServer(serverFirebaseApp, firebaseConfigObj.firestoreDatabaseId);
import dotenv from "dotenv";
import { loadState, saveState } from "./src/lib/store.server";
import { encryptSecret, decryptSecret, vaultConfigured } from "./src/lib/vault.server";

dotenv.config({ path: fsNode.existsSync('.env.local') ? '.env.local' : '.env' });

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export type Role = 'Administrador' | 'Professor' | 'Aluno';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  linkedId?: string; // Links to Student ID or Teacher ID
}



// Seed master user in Firestore if not exists

import fsNode from 'fs';
const DB_FILE = 'local_db.json';

async function loadDb() {
  try {
    const data = await loadState();
    users = data.users;
    systemBackups = data.systemBackups;
    students = data.students;
    teachers = data.teachers;
    rooms = data.rooms;
    classGroups = data.classGroups;
    bookings = data.bookings;
    studentDrafts = data.studentDrafts;
    guardianDrafts = data.guardianDrafts;
    guardians = data.guardians;
    curriculums = data.curriculums;
  } catch (e) {
    console.error('Failed to load DB from Postgres', e);
  }
}

// Salvamentos serializados (fila) p/ evitar transações concorrentes.
let savePromise: Promise<void> = Promise.resolve();
function saveDb(): Promise<void> {
  savePromise = savePromise.then(() =>
    saveState({
      users, systemBackups, students, teachers, rooms,
      classGroups, bookings, studentDrafts, guardianDrafts, guardians, curriculums,
    })
  ).catch((e) => console.error('Failed to save DB to Postgres', e));
  return savePromise;
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
    await saveDb();
  }
};



const JWT_SECRET = process.env.JWT_SECRET || "eraia_default_secret_2026";
let users: any[] = [];

let students: any[] = [];
let teachers: any[] = [];
let rooms: any[] = [];
let classGroups: any[] = [];
let bookings: any[] = [];
let systemBackups: any[] = [];
let studentDrafts: any[] = [];
let guardianDrafts: any[] = [];
let guardians: any[] = [];
let curriculums: any[] = [];

let mutexLocked = false;
const acquireMutex = async () => {
  while (mutexLocked) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  mutexLocked = true;
};
const releaseMutex = () => {
  mutexLocked = false;
};

const getDayOfWeek = (dateString: string) => {
  const date = new Date(dateString + "T00:00:00");
  const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  return days[date.getDay()];
};

const timeToMinutes = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const rangesOverlap = (start1: string, end1: string, start2: string, end2: string) => {
  return timeToMinutes(start1) < timeToMinutes(end2) && timeToMinutes(end1) > timeToMinutes(start2);
};

const validateCollisions = (ignoreId: string | null, studentId: string, teacherId: string, roomId: string, date: string, startTime: string, endTime: string) => {
  for (const b of bookings) {
    if (ignoreId && b.id === ignoreId) continue;
    if (b.status === "cancelada" || b.status === "desmarcada") continue;
    if (b.date === date && rangesOverlap(b.startTime, b.endTime, startTime, endTime)) {
      if (b.teacherId === teacherId) return { success: false, error: "Conflito de professor." };
      if (b.roomId === roomId) return { success: false, error: "Conflito de sala." };
    }
  }
  return { success: true };
};

// Cifra a senha do portal do aluno (texto puro -> AES-256-GCM). Preserva a
// cifra anterior quando nenhuma senha nova é enviada (evita perder/re-cifrar).
function secureCredentials(student: any, prev?: any) {
  const cred = student?.profile360?.credentials;
  if (!cred) return;
  // O campo `encryptedPasswordHash` é o INPUT do front: se vier preenchido,
  // é uma senha nova em texto puro pra cifrar. A cifra em si mora em
  // `encryptedHash`/`iv`/`authTag` e esse campo é sempre zerado após cifrar.
  const typed = (cred.encryptedPasswordHash || '').toString();
  if (typed.trim() !== '') {
    if (vaultConfigured()) {
      const enc = encryptSecret(typed);
      cred.encryptedHash = enc.encryptedHash;
      cred.iv = enc.iv;
      cred.authTag = enc.authTag;
      cred.encryptedPasswordHash = ''; // nunca persiste texto puro
    } else {
      console.warn('[vault] VAULT_MASTER_KEY ausente — senha do portal NÃO foi cifrada.');
    }
  } else if (prev?.profile360?.credentials) {
    const p = prev.profile360.credentials; // sem senha nova: preserva a cifra existente
    if (p.encryptedHash) { cred.encryptedHash = p.encryptedHash; cred.iv = p.iv; cred.authTag = p.authTag; }
    cred.encryptedPasswordHash = '';
  }
}

interface Booking {
  id: string;
  studentId?: string;
  teacherId?: string;
  roomId?: string;
  subject?: string;
  topic?: string;
  front?: string;
  topicFinished?: boolean;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const app = express();
const upload = multer();
app.use((req, res, next) => {
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && res.statusCode >= 200 && res.statusCode < 300) {
      saveDb();
    }
  });
  next();
});

const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

const requireRole = (roles: Role[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso Negado" });
    }
    next();
  };
};

// Healthcheck aberto (usado por Railway/Render p/ saber se o app está vivo)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post('/api/auth/login', async (req, res) => {
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
    id: `usr-${Date.now()}`,
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
});

app.post("/api/webhooks/google-forms", async (req, res) => {
  const token = req.headers['authorization'];
  const WEBHOOK_TOKEN = process.env.WEBHOOK_TOKEN || 'MEU_TOKEN_SUPER_SECRETO_123';
  if (token !== `Bearer ${WEBHOOK_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized webhook access" });
  }
  const rawData = req.body;
  const sanitizeStr = (str: any) => (str || "").toString().trim();
  const formatName = (str: any) => sanitizeStr(str).replace(/\b\w/g, (l: string) => l.toUpperCase());
  const removePunctuation = (str: any) => sanitizeStr(str).replace(/[.()\s-]/g, '');
  const newDraftId = `draft-${Date.now()}`;
  const newDraft = {
    id: newDraftId,
    status: 'Pendente',
    submittedAt: new Date().toISOString(),
    nomeCompleto: formatName(rawData.nomeCompleto),
    cpf: removePunctuation(rawData.cpf),
    email: sanitizeStr(rawData.email).toLowerCase(),
    whatsapp: removePunctuation(rawData.whatsapp),
    instagram: sanitizeStr(rawData.instagram),
    escolaAtual: sanitizeStr(rawData.escolaAtual),
    cidade: sanitizeStr(rawData.cidade),
    estado: sanitizeStr(rawData.estado),
    anoEscolar: sanitizeStr(rawData.anoEscolar),
    turno: sanitizeStr(rawData.turno),
    portalAlunoLink: sanitizeStr(rawData.portalAlunoLink),
    portalAlunoLogin: sanitizeStr(rawData.portalAlunoLogin),
    portalAlunoSenhaRaw: sanitizeStr(rawData.portalAlunoSenhaRaw),
    boletimUrl: sanitizeStr(rawData.boletimUrl),
    avaliacaoDesempenho: sanitizeStr(rawData.avaliacaoDesempenho),
    materiasDificuldade: sanitizeStr(rawData.materiasDificuldade),
    materiasFacilidade: sanitizeStr(rawData.materiasFacilidade),
    jaFezVestibular: sanitizeStr(rawData.jaFezVestibular),
    vestibularParticipei: sanitizeStr(rawData.vestibularParticipei),
    vestibularAno: sanitizeStr(rawData.vestibularAno),
    notaLinguagens: sanitizeStr(rawData.notaLinguagens),
    notaHumanas: sanitizeStr(rawData.notaHumanas),
    notaNatureza: sanitizeStr(rawData.notaNatureza),
    notaMatematica: sanitizeStr(rawData.notaMatematica),
    notaRedacao: sanitizeStr(rawData.notaRedacao),
    estudaFora: sanitizeStr(rawData.estudaFora),
    cursosExtracurriculares: sanitizeStr(rawData.cursosExtracurriculares),
    atividadeFisica: sanitizeStr(rawData.atividadeFisica),
    rotinaSemanal: sanitizeStr(rawData.rotinaSemanal),
    rotinaEstudosFora: sanitizeStr(rawData.rotinaEstudosFora),
    conteudosRevisar: sanitizeStr(rawData.conteudosRevisar),
    conteudosPrimeiraSemana: sanitizeStr(rawData.conteudosPrimeiraSemana),
    mantemRotinaEstudos: sanitizeStr(rawData.mantemRotinaEstudos),
    maiorDificuldade: sanitizeStr(rawData.maiorDificuldade),
    tempoEstudoPorDia: sanitizeStr(rawData.tempoEstudoPorDia),    costumaRevisar: sanitizeStr(rawData.costumaRevisar),    principalObjetivo: sanitizeStr(rawData.principalObjetivo),    cursoOuArea: sanitizeStr(rawData.cursoOuArea),    motivoAcompanhamento: sanitizeStr(rawData.motivoAcompanhamento),    esperaMudancaRotina: sanitizeStr(rawData.esperaMudancaRotina),    dataNascimento: sanitizeStr(rawData.dataNascimento),    rawResponses: rawData
  };
  try {
    studentDrafts.push(newDraft);
    saveDb();
    
    res.json({ message: "Draft received" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to write draft" });
  }
});

app.get("/api/drafts", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  
  res.json({ drafts: studentDrafts });
});


app.put("/api/drafts/:id", authenticateToken, requireRole(["Administrador"]), (req, res) => {
  const { id } = req.params;
  const draftIndex = studentDrafts.findIndex(d => d.id === id);
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  studentDrafts[draftIndex] = { ...studentDrafts[draftIndex], ...req.body };
  res.json({ message: "Draft updated", draft: studentDrafts[draftIndex] });
});

app.post("/api/drafts/:id/approve", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  const draftIndex = studentDrafts.findIndex((d: any) => d.id === id);
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  
  const draft = studentDrafts[draftIndex];
  
  const newStudent: any = {
    id: `stud-${Date.now()}`,
    name: draft.nomeCompleto,
    email: draft.email,
    phone: draft.whatsapp,
    cpf: draft.cpf,
    level: draft.anoEscolar || 'Ensino Médio',
    currentSchool: draft.escolaAtual,
    walletBalance: 0,
    profile360: {
      targetCourse: draft.cursoOuArea,
      targetUniversities: draft.vestibularParticipei ? [draft.vestibularParticipei] : [],
      behavioralProfile: compileBehavioralProfileText(draft),
      fixedActivities: compileStudentFixedActivities(draft),
      availability: [],
      medicalRecords: [],
      schoolHistories: [],
      tacticalPlans: []
    }
  };

  // Credenciais do portal vindas do formulário → cifradas no cofre
  if (draft.portalAlunoSenhaRaw || draft.portalAlunoLink || draft.portalAlunoLogin) {
    newStudent.profile360.credentials = {
      schoolPortalUrl: draft.portalAlunoLink || '',
      username: draft.portalAlunoLogin || '',
      encryptedPasswordHash: draft.portalAlunoSenhaRaw || '',
    };
    secureCredentials(newStudent);
  }

  students.push(newStudent);
  studentDrafts[draftIndex].status = 'Aprovado';
  studentDrafts[draftIndex].portalAlunoSenhaRaw = ''; // scrub do texto puro no draft
  saveDb();

  res.json({ message: "Student approved and created", student: newStudent });
});

app.post("/api/drafts/:id/reject", authenticateToken, requireRole(["Administrador"]), (req, res) => {
  const { id } = req.params;
  const draftIndex = studentDrafts.findIndex(d => d.id === id);
  
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  
  studentDrafts[draftIndex].status = 'Rejeitado';
  res.json({ message: "Student draft rejected" });
});


// Google Sheets Sync - Guardians
async function syncGoogleSheetsGuardiansDrafts() {
  try {
    const url = "https://docs.google.com/spreadsheets/d/1SOouxiiG-VaC-Pmhqb0Zz7g1hmwNmUaqHDCry8qS-q4/export?format=csv";
    const res = await fetch(url);
    if (!res.ok) return;
    const text = await res.text();
    
    const records = parse(text, {
      columns: (headers) => {
        const counts = {};
        return headers.map(h => {
          counts[h] = (counts[h] || 0) + 1;
          return counts[h] > 1 ? `${h}_${counts[h]}` : h;
        });
      },
      skip_empty_lines: true
    });
    
    const sanitizeStr = (str) => (str || "").toString().trim();
    const removePunctuation = (str) => sanitizeStr(str).replace(/[.()\s-]/g, '');
    const formatName = (str) => sanitizeStr(str).replace(/\b\w/g, (l) => l.toUpperCase());

    for (const rawData of records) {
      // Find the columns since headers are a bit messy
      const studentNameCol = Object.keys(rawData).find(k => k.startsWith('Nome completo:'));
      const studentName = studentNameCol ? formatName(rawData[studentNameCol]) : '';
      
      const email = sanitizeStr(rawData['E-mail:_2'] || rawData['Endereço de e-mail']).toLowerCase();
      const cpf = removePunctuation(rawData[' CPF:']);
      const guardianName = formatName(rawData['VilnaNome do responsável: ']);
      const phone = removePunctuation(rawData['Telefone:']);
      
      const professionCol = Object.keys(rawData).find(k => k.toLowerCase().includes('profissão') || k.toLowerCase().includes('profissao'));
      const profession = professionCol ? sanitizeStr(rawData[professionCol]) : '';
      
      // Basic validation
      if (!email && !guardianName) continue;
      
      // Check if we already have it in drafts or approved guardians
      if (guardianDrafts.some(d => removePunctuation(d.cpf) === cpf || d.email === email)) continue;
      if (guardians.some(g => removePunctuation(g.cpf) === cpf || g.email === email)) continue;
      
      const newDraft = {
        id: `draft-g-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'Pendente' as const,
        submittedAt: new Date().toISOString(),
        nomeCompleto: guardianName,
        email: email,
        whatsapp: phone,
        cpf: cpf,
        nomeAluno: studentName,
        parentesco: "Responsável", // Not in form
        responsavelFinanceiro: true, // Always true for this form
        profissao: profession,
        rawResponses: rawData
      };
      
      guardianDrafts.push(newDraft);
      saveDb();
      
    }
  } catch (err) {
    console.error("Failed to sync guardians google sheets:", err);
  }
}


// Standard REST API Endpoints

app.get("/api/guardians/drafts", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await syncGoogleSheetsGuardiansDrafts();
  res.json({ drafts: guardianDrafts });
});


app.put("/api/guardians/drafts/:id", authenticateToken, requireRole(["Administrador"]), (req, res) => {
  const { id } = req.params;
  const draftIndex = guardianDrafts.findIndex(d => d.id === id);
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  guardianDrafts[draftIndex] = { ...guardianDrafts[draftIndex], ...req.body };
  res.json({ message: "Draft updated", draft: guardianDrafts[draftIndex] });
});

app.post("/api/guardians/drafts/:id/approve", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  const { studentIds } = req.body;
  const draftIndex = guardianDrafts.findIndex((d: any) => d.id === id);
  
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  
  const draft = guardianDrafts[draftIndex];
  
  let finalStudentName = draft.nomeAluno || "";
  if (studentIds && studentIds.length > 0) {
    const sNames: string[] = [];
    for (const sid of studentIds) {
      if (sid) {
        const student = students.find((s: any) => s.id === sid);
        if (student) sNames.push(student.name);
      }
    }
    if (sNames.length > 0) finalStudentName = sNames.join(", ");
  }

  const newGuardian: any = {
    id: `guard-${Date.now()}`,
    name: draft.nomeCompleto,
    email: draft.email,
    phone: draft.whatsapp,
    cpf: draft.cpf,
    studentIds: studentIds || [],
    studentName: finalStudentName,
    relationship: draft.parentesco,
    financialResponsible: draft.responsavelFinanceiro,
    profissao: draft.profissao,
    contracts: draft.contracts || []
  };
  
  guardians.push(newGuardian);
  guardianDrafts[draftIndex].status = 'Aprovado';
  saveDb();

  res.json({ message: "Guardian approved and created", guardian: newGuardian });
});

app.post("/api/guardians/drafts/:id/reject", authenticateToken, requireRole(["Administrador"]), (req, res) => {
  const { id } = req.params;
  const draftIndex = guardianDrafts.findIndex(d => d.id === id);
  
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  
  guardianDrafts[draftIndex].status = 'Rejeitado';
  res.json({ message: "Guardian draft rejected" });
});

app.get("/api/guardians", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  res.json({ guardians });
});


function recalculateStudentContracts() {
  const duration = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    return Math.max(0, (eH + eM/60) - (sH + sM/60));
  };

  students.forEach(student => {
    if (student.contract) {
      let used = 0;
      let canceled = 0;
      bookings.filter(b => b.studentId === student.id).forEach(b => {
        if (b.status === 'realizada_presenca' || b.status === 'realizada_falta') {
          used += duration(b.startTime, b.endTime);
        } else if (b.status === 'desmarcada' || b.status === 'cancelada') {
          canceled += duration(b.startTime, b.endTime);
        }
      });
      student.contract.usedHours = Math.round(used * 100) / 100;
      student.contract.canceledHours = Math.round(canceled * 100) / 100;
    }
  });
}

app.get("/api/data", authenticateToken, (req, res) => {
  recalculateStudentContracts();
  res.json({ students, teachers, rooms, bookings, classGroups });
});




app.post("/api/extract-schedule", authenticateToken, async (req: any, res: any) => {
  const { pdfBase64, mimeType } = req.body;
  if (!pdfBase64 || !mimeType) {
    return res.status(400).json({ error: "PDF data is required." });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Extraia a grade de horários de aulas a partir deste PDF. Retorne uma lista de horários contendo dia da semana, hora de início, hora de término e nome da disciplina.' },
            { inlineData: { mimeType: mimeType, data: pdfBase64 } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista de horários de aula",
          items: {
            type: Type.OBJECT,
            properties: {
              dayOfWeek: { type: Type.INTEGER, description: "Dia da semana (1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado, 0=Domingo)" },
              startTime: { type: Type.STRING, description: "Horário de início (ex: 08:00)" },
              endTime: { type: Type.STRING, description: "Horário de término (ex: 09:00)" },
              subject: { type: Type.STRING, description: "Nome da disciplina (ex: Matemática, Física)" }
            },
            required: ["dayOfWeek", "startTime", "endTime", "subject"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
       return res.status(500).json({ error: "Failed to extract schedule" });
    }
    const schedules = JSON.parse(text);
    res.json({ schedules });
  } catch (err: any) {
    console.error("Extract schedule error:", err);
    res.status(500).json({ error: "Failed to process PDF." });
  }
});

// --- ClassGroups ---
app.get("/api/class-groups", authenticateToken, (req: any, res: any) => {
  res.json({ classGroups });
});

// Helper to generate future bookings for a class group
function syncClassGroupBookings(group) {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // 1. Remove future "agendada" bookings for this class group
  bookings = bookings.filter(b => {
    if (b.classGroupId !== group.id) return true;
    if (b.status !== "agendada") return true;
    const bDate = new Date(b.date);
    return bDate < today;
  });

  // 2. Generate new bookings for the next 3 months
  if (!group.schedules || group.schedules.length === 0) return;
  
  const end = new Date(today);
  end.setMonth(end.getMonth() + 3); // 3 months in advance

  let current = new Date(today);
  while (current <= end) {
    const dow = current.getDay();
    const scheds = group.schedules.filter(s => s.dayOfWeek === dow);
    for (const s of scheds) {
      if (s.teacherId) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`;
        const exists = bookings.some(b => b.classGroupId === group.id && b.date === dateStr && b.startTime === s.startTime && b.status !== "agendada");
        if (exists) continue;
        bookings.push({
          id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          classGroupId: group.id,
          studentIds: group.studentIds || [],
          teacherId: s.teacherId,
          roomId: s.roomId || "",
          date: `${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}-${String(current.getDate()).padStart(2,'0')}`,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject,
          status: "agendada",
          createdAt: new Date().toISOString()
        });
      }
    }
    current.setDate(current.getDate() + 1);
  }
}

app.post("/api/class-groups", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const data = req.body;
  if (!data.name || !data.workload) return res.status(400).json({ error: "Nome e Carga Horária são obrigatórios." });
  
  await acquireMutex();
  try {
    const newGroup: any = {
      ...data,
      id: `class-${Date.now()}`,
      teacherIds: data.teacherIds || [],
      studentIds: data.studentIds || [],
      subjects: data.subjects || []
    };
    classGroups.push(newGroup);
    syncClassGroupBookings(newGroup);
    res.json({ message: "Turma cadastrada com sucesso", classGroup: newGroup });
  } finally {
    releaseMutex();
  }
});

app.put("/api/class-groups/:id", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = classGroups.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: "Turma não encontrada" });
    
    classGroups[index] = { ...classGroups[index], ...req.body };
    syncClassGroupBookings(classGroups[index]);
    res.json({ message: "Turma atualizada", classGroup: classGroups[index] });
  } finally {
    releaseMutex();
  }
});

app.delete("/api/class-groups/:id", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = classGroups.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: "Turma não encontrada" });
    const deletedGroup = classGroups[index];
    classGroups.splice(index, 1);
    // Remove all future agendada bookings for this group
    const today = new Date();
    today.setHours(0,0,0,0);
    bookings = bookings.filter(b => {
      if (b.classGroupId !== deletedGroup.id) return true;
      if (b.status !== "agendada") return true;
      const bDate = new Date(b.date);
      return bDate < today;
    });
    res.json({ message: "Turma deletada" });
  } finally {
    releaseMutex();
  }
});

// --- Currículos / Ementas (F3: front usava Firestore direto) ---
app.get("/api/curriculums", authenticateToken, (req: any, res: any) => {
  res.json({ curriculums });
});

// Substitui todo o conjunto (usado por saveAllCurriculumsInFirebase)
app.put("/api/curriculums", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  curriculums = Array.isArray(req.body?.curriculums) ? req.body.curriculums
              : Array.isArray(req.body) ? req.body : [];
  res.json({ message: "Currículos salvos", curriculums });
});

// Delete de agendamento (F3: front usava Firestore direto)
app.delete("/api/bookings/:id", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = bookings.findIndex((b: any) => b.id === id);
    if (index === -1) return res.status(404).json({ error: "Agendamento não encontrado" });
    bookings.splice(index, 1);
    res.json({ message: "Agendamento excluído" });
  } finally {
    releaseMutex();
  }
});

// Create or update Student
app.post("/api/students/manual", authenticateToken, requireRole(["Administrador"]), (req, res) => {
  const manualData = req.body;
  const newStudent = {
    id: `stud-${Date.now()}`,
    name: manualData.nomeCompleto || manualData.name,
    email: manualData.email,
    phone: manualData.whatsapp || manualData.phone,
    level: manualData.anoEscolar || manualData.level,
    currentSchool: manualData.escolaAtual || manualData.currentSchool,
    city: manualData.cidade || manualData.city,
    state: manualData.estado || manualData.state,
    birthDate: manualData.dataNascimento || manualData.birthDate,
    instagram: manualData.instagram,
    modality: manualData.modality || "Individual",
    availability: manualData.availability || [],
    fixedActivities: (manualData.fixedActivities && manualData.fixedActivities.length > 0) ? manualData.fixedActivities : compileStudentFixedActivities(manualData),
    contract: {
      startDate: manualData.contractStartDate || '',
      endDate: manualData.contractEndDate || '',
      totalHours: Number(manualData.contractTotalHours) || 0,
      usedHours: 0,
      canceledHours: 0,
      contractNotes: manualData.contractNotes || ''
    },
    profile360: {
      behavioralProfile: compileBehavioralProfileText(manualData) || ((manualData.rotinaSemanal || '') + "\n" + (manualData.rotinaEstudosFora || '')),
      targetCourse: manualData.cursoOuArea || '',
      medicalRecords: [],
      schoolHistories: [],
      targetUniversities: manualData.vestibularParticipei ? [manualData.vestibularParticipei] : [],
      performances: [
        { subject: "Dificuldades", level: "Com Dificuldade" as "Com Dificuldade", notes: manualData.materiasDificuldade || '' },
        { subject: "Facilidades", level: "Excelente" as "Excelente", notes: manualData.materiasFacilidade || '' }
      ],
      recentTestScores: manualData.notaLinguagens ? `Linguagens: ${manualData.notaLinguagens}, Mat: ${manualData.notaMatematica}` : '',
      reportCard: manualData.boletimUrl || '',
      tacticalPlans: [],
      credentials: {
        schoolPortalUrl: manualData.portalAlunoLink || '',
        username: manualData.portalAlunoLogin || '',
        encryptedPasswordHash: manualData.portalAlunoSenhaRaw || ''
      }
    },
    rawDraftData: manualData // For saving all flat fields if needed
  };
  
  secureCredentials(newStudent);
  students.push(newStudent);
  res.status(201).json({ message: "Student created manually", student: newStudent });
});

app.post("/api/students", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  const studentData = req.body;
  if (!studentData.name || !studentData.email) {
    return res.status(400).json({ error: "Nome e Email são obrigatórios." });
  }

  if (studentData.id) {
    const idx = students.findIndex((s: any) => s.id === studentData.id);
    if (idx !== -1) {
      const prev = students[idx];
      students[idx] = { ...prev, ...studentData };
      secureCredentials(students[idx], prev);
      return res.json({ message: "Aluno atualizado com sucesso", student: students[idx] });
    }
    res.json({ message: "Aluno atualizado com sucesso", student: studentData });
  } else {
    const newStudent: any = {
      ...studentData,
      id: `stud-${Date.now()}`,
      availability: studentData.availability || []
    };
    secureCredentials(newStudent);
    students.push(newStudent);
    res.status(211).json({ message: "Aluno cadastrado com sucesso", student: newStudent });
  }
});

// Create or update Teacher

app.put("/api/teachers/:id", authenticateToken, (req: any, res: any) => {
  const { id } = req.params;
  const teacherIndex = teachers.findIndex((t: any) => t.id === id);
  if (teacherIndex === -1) return res.status(404).json({ error: "Teacher not found" });
  
  // Teachers can only edit their own profile, unless Admin
  if (req.user.role !== 'Administrador' && req.user.linkedId !== id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const currentTeacher = teachers[teacherIndex];
  const updatedTeacher = { ...currentTeacher, ...req.body };
  teachers[teacherIndex] = updatedTeacher;

  // Also update corresponding user if linked
  const linkedUserIndex = users.findIndex((u: any) => u.linkedId === id);
  if (linkedUserIndex !== -1) {
    if (req.body.name) users[linkedUserIndex].name = req.body.name;
    if (req.body.email) users[linkedUserIndex].email = req.body.email;
  }

  res.json(teachers[teacherIndex]);
});

app.post("/api/teachers", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  const teacherData = req.body;
  if (!teacherData.name || !teacherData.email || !teacherData.subject) {
    return res.status(400).json({ error: "Nome, Email e Matéria são obrigatórios." });
  }

  if (teacherData.id) {
    teachers = teachers.map((t) => (t.id === teacherData.id ? { ...t, ...teacherData } : t));
    res.json({ message: "Professor atualizado com sucesso", teacher: teacherData });
  } else {
    const newTeacher: any = {
      ...teacherData,
      id: `teach-${Date.now()}`,
      availability: teacherData.availability || []
    };
    teachers.push(newTeacher);
    res.status(211).json({ message: "Professor cadastrado com sucesso", teacher: newTeacher });
  }
});

// Create or update Room

// Create Guardian
app.post("/api/guardians", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const newGuardian = req.body;
  await acquireMutex();
  try {
    const guardian = {
      ...newGuardian,
      id: `guard-${Date.now()}`,
    };
    // Fetch student details if linked
    if (guardian.studentId) {
       const student = students.find(s => s.id === guardian.studentId);
       if (student) {
         guardian.studentName = student.name;
         guardian.studentIds = [guardian.studentId];
       }
    } else if (guardian.studentIds && guardian.studentIds.length > 0) {
       const sNames = [];
       for (const sid of guardian.studentIds) {
         if (sid) {
           const student = students.find(s => s.id === sid);
           if (student) sNames.push(student.name);
         }
       }
       guardian.studentName = sNames.join(", ");
    }
    guardians.push(guardian);
    res.json(guardian);
  } finally {
    releaseMutex();
  }
});

app.post("/api/rooms", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  const roomData = req.body;
  if (!roomData.name || !roomData.capacity) {
    return res.status(400).json({ error: "Nome e Capacidade são obrigatórios." });
  }

  if (roomData.id) {
    rooms = rooms.map((r) => (r.id === roomData.id ? { ...r, ...roomData } : r));
    res.json({ message: "Sala atualizada com sucesso", room: roomData });
  } else {
    const newRoom: any = {
      ...roomData,
      id: `room-${Date.now()}`,
      resources: roomData.resources || []
    };
    rooms.push(newRoom);
    res.status(211).json({ message: "Sala cadastrada com sucesso", room: newRoom });
  }
});

// Update Student (F3: rota que faltava — o front atualizava via Firestore)
app.put("/api/students/:id", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = students.findIndex((s: any) => s.id === id);
    if (index === -1) return res.status(404).json({ error: "Aluno não encontrado." });
    const prev = students[index];
    students[index] = { ...prev, ...req.body, id };
    secureCredentials(students[index], prev);
    res.json({ message: "Aluno atualizado com sucesso", student: students[index] });
  } finally {
    releaseMutex();
  }
});

// Revela (decifra) a senha do portal do aluno — admin only
app.get("/api/students/:id/credentials/reveal", authenticateToken, requireRole(["Administrador"]), (req: any, res: any) => {
  const s = students.find((x: any) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Aluno não encontrado." });
  const c = s.profile360?.credentials;
  if (!c || !c.encryptedHash || !c.iv || !c.authTag) {
    return res.json({ schoolPortalUrl: c?.schoolPortalUrl || '', username: c?.username || '', password: '' });
  }
  try {
    const password = decryptSecret(c.encryptedHash, c.iv, c.authTag);
    res.json({ schoolPortalUrl: c.schoolPortalUrl || '', username: c.username || '', password });
  } catch (e) {
    res.status(500).json({ error: "Não foi possível decifrar (VAULT_MASTER_KEY ausente/incorreta ou dados corrompidos)." });
  }
});

// Update Guardian (F3: rota que faltava)
app.put("/api/guardians/:id", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = guardians.findIndex((g: any) => g.id === id);
    if (index === -1) return res.status(404).json({ error: "Responsável não encontrado." });
    const updated: any = { ...guardians[index], ...req.body, id };
    if (req.body.studentIds) {
      const sNames: string[] = [];
      for (const sid of req.body.studentIds) {
        const s = students.find((x: any) => x.id === sid);
        if (s) sNames.push(s.name);
      }
      updated.studentName = sNames.join(", ");
    }
    guardians[index] = updated;
    res.json({ message: "Responsável atualizado com sucesso", guardian: updated });
  } finally {
    releaseMutex();
  }
});

// Delete Student
app.delete("/api/students/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = students.findIndex((s) => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Aluno não encontrado." });
    }
    const activeBookings = bookings.filter(b => b.studentId === id && b.status !== "desmarcada" && b.status !== "cancelada");
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir o aluno pois existem agendamentos ativos vinculados a ele.", activeBookings });
    }
    students.splice(index, 1);
    res.json({ message: "Aluno excluído com sucesso." });
  } finally {
    releaseMutex();
  }
});

// Delete Teacher
app.delete("/api/teachers/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = teachers.findIndex((t) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Professor não encontrado." });
    }
    const activeBookings = bookings.filter(b => b.teacherId === id && b.status !== "desmarcada" && b.status !== "cancelada");
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir o professor pois existem agendamentos ativos vinculados a ele.", activeBookings });
    }
    teachers.splice(index, 1);
    res.json({ message: "Professor excluído com sucesso." });
  } finally {
    releaseMutex();
  }
});

// Delete Guardian
app.delete("/api/guardians/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  await acquireMutex();
  try {
    const index = guardians.findIndex((g) => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Responsável não encontrado." });
    }
    const guardian = guardians[index];
    const guardianStudentIds = guardian.studentIds || (guardian.studentId ? [guardian.studentId] : []);
    const activeBookings = bookings.filter(b => guardianStudentIds.includes(b.studentId) && b.status !== "desmarcada" && b.status !== "cancelada");
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir o responsável pois existem agendamentos ativos vinculados aos seus alunos.", activeBookings });
    }
    guardians.splice(index, 1);
    res.json({ message: "Responsável excluído com sucesso." });
  } finally {
    releaseMutex();
  }
});

// Delete Room
app.delete("/api/rooms/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  const { id } = req.params;
  
  await acquireMutex();
  try {
    const index = rooms.findIndex((r) => r.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Sala não encontrada." });
    }
    
    // Optional: check if room is used in bookings
    const activeBookings = bookings.filter(b => b.roomId === id && b.status !== "desmarcada" && b.status !== "cancelada");
    if (activeBookings.length > 0) {
      return res.status(400).json({ error: "Não é possível excluir a sala pois existem agendamentos ativos vinculados a ela.", activeBookings });
    }

    rooms.splice(index, 1);
    res.json({ message: "Sala excluída com sucesso." });
  } finally {
    releaseMutex();
  }
});


// --- BEGIN NEW SCHEDULING ENGINE ---

function validateBookingSlot(
  slotDate: string,
  startTime: string,
  endTime: string,
  teacherId: string,
  studentIds: string[],
  classGroupId: string | undefined,
  ignoreBookingIds: string[] = []
) {
  const conflicts: string[] = [];

  // Teacher collision
  const teacherConflict = bookings.find(
    (b) =>
      !ignoreBookingIds.includes(b.id) &&
      b.status !== "cancelada" && b.status !== "desmarcada" &&
      b.teacherId === teacherId &&
      b.date === slotDate &&
      rangesOverlap(b.startTime, b.endTime, startTime, endTime)
  );
  if (teacherConflict) {
    const teacher = teachers.find(t => t.id === teacherId);
    conflicts.push(`Professor(a) ${teacher?.name || teacherId} já possui aula em ${slotDate} (${teacherConflict.startTime} - ${teacherConflict.endTime}).`);
  }

  // Student collisions
  const targetStudents = classGroupId 
    ? (classGroups.find(c => c.id === classGroupId)?.studentIds || [])
    : (studentIds || []);

  for (const sId of targetStudents) {
    const studentConflict = bookings.find(
      (b) =>
        !ignoreBookingIds.includes(b.id) &&
        b.status !== "cancelada" && b.status !== "desmarcada" &&
        b.date === slotDate &&
        rangesOverlap(b.startTime, b.endTime, startTime, endTime) &&
        (b.studentId === sId || (b.studentIds && b.studentIds.includes(sId)) || (b.classGroupId && classGroups.find(c => c.id === b.classGroupId)?.studentIds.includes(sId)))
    );
    if (studentConflict) {
      const student = students.find(s => s.id === sId);
      conflicts.push(`Aluno(a) ${student?.name || sId} já possui aula em ${slotDate} (${studentConflict.startTime} - ${studentConflict.endTime}).`);
    }
  }

  return conflicts;
}

// Balance check
function validateStudentBalances(studentIds: string[], classGroupId: string | undefined, requiredHours: number) {
  const conflicts: string[] = [];
  const targetStudents = classGroupId 
    ? (classGroups.find(c => c.id === classGroupId)?.studentIds || [])
    : (studentIds || []);

  for (const sId of targetStudents) {
    const student = students.find(s => s.id === sId);
    if (student?.contract) {
      const available = student.contract.totalHours - student.contract.usedHours;
      if (available < requiredHours) {
        conflicts.push(`Aluno(a) ${student.name} não possui saldo suficiente. Necessário: ${requiredHours}, Disponível: ${available}.`);
      }
    }
  }
  return conflicts;
}

app.post("/api/bookings/advanced", authenticateToken, async (req: any, res: any) => {
  const { studentIds, classGroupId, teacherId, roomId, date, startTime, endTime, recurrence, forceSchedule } = req.body;

  if ((!studentIds || studentIds.length === 0) && !classGroupId) {
    return res.status(400).json({ error: "É necessário informar alunos individuais ou uma turma." });
  }

  // Generate slots
  const slots: { date: string, startTime: string, endTime: string }[] = [];
  if (recurrence && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    let currentDate = new Date(date + "T00:00:00");
    let occurrencesCount = 0;
    const maxOccurrences = recurrence.occurrences || 50; // hard limit
    const endLimitDate = recurrence.endDate ? new Date(recurrence.endDate + "T00:00:00") : null;

    // We assume timezone issues are minimal by using local T00:00:00 and getDay()
    while (occurrencesCount < maxOccurrences) {
      if (endLimitDate && currentDate > endLimitDate) break;
      
      if (recurrence.daysOfWeek.includes(currentDate.getDay())) {
        slots.push({
          date: currentDate.toISOString().split('T')[0],
          startTime,
          endTime
        });
        occurrencesCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  } else {
    slots.push({ date, startTime, endTime });
  }

  if (slots.length === 0) {
    return res.status(400).json({ error: "Nenhuma data gerada para o agendamento." });
  }

  await acquireMutex();
  try {
    const allConflicts: string[] = [];

    // Check slot conflicts
    for (const slot of slots) {
      const slotConflicts = validateBookingSlot(slot.date, slot.startTime, slot.endTime, teacherId, studentIds, classGroupId);
      allConflicts.push(...slotConflicts);
    }

    // Check balance
    // 1 hour = 1 unit? 45 min = 1 unit? 
    // We will just calculate total hours requested based on duration
    const startMins = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMins = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    const durationMins = endMins - startMins;
    const hoursPerSlot = durationMins / 60; // simple hour calc for balance
    const totalRequired = hoursPerSlot * slots.length;

    const balanceConflicts = validateStudentBalances(studentIds, classGroupId, totalRequired);
    allConflicts.push(...balanceConflicts);

    if (allConflicts.length > 0 && !forceSchedule) {
      releaseMutex();
      return res.status(409).json({ conflicts: allConflicts });
    }

    if (forceSchedule) {
      if (req.user.role !== "Administrador") {
        releaseMutex();
        return res.status(403).json({ error: "Somente administradores podem forçar um agendamento com conflitos." });
      }
    }

    const seriesId = recurrence ? `series-${Date.now()}` : undefined;
    const newBookings = slots.map(slot => {
      const newB = {
        id: `book-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        studentIds: studentIds || [],
        classGroupId: classGroupId,
        studentId: studentIds && studentIds.length === 1 ? studentIds[0] : (studentIds && studentIds.length > 0 ? studentIds[0] : ""), // retro compatibility
        teacherId,
        roomId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "agendada" as const,
        createdAt: new Date().toISOString(),
        seriesId
      };
      bookings.push(newB);
      return newB;
    });

    releaseMutex();
    return res.json({ message: "Agendamento(s) criado(s) com sucesso.", bookings: newBookings });

  } catch (err) {
    releaseMutex();
    return res.status(500).json({ error: "Erro interno ao processar agendamento." });
  }
});

// Update for recurring editing
app.put("/api/bookings/advanced/:id", authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { studentIds, classGroupId, teacherId, roomId, date, startTime, endTime, editMode } = req.body;
  // editMode: 'single' | 'following'

  await acquireMutex();
  try {
    const booking = bookings.find(b => b.id === id);
    if (!booking) {
      releaseMutex();
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    const isFollowing = editMode === 'following' && booking.seriesId;
    let targetBookings = [booking];
    
    if (isFollowing) {
      targetBookings = bookings.filter(b => b.seriesId === booking.seriesId && b.date >= booking.date);
    }

    // Determine the time shift if startTime or date changes
    // For simplicity, we just apply the same startTime, endTime, teacher, room, students to all targets, but KEEP their original dates if it's 'following' and date wasn't strictly overridden for all. 
    // Wait, if it's 'following', usually we just update the time/room/teacher, but date remains their respective scheduled date.
    
    const allConflicts: string[] = [];
    
    // Check conflicts for all targets
    for (const b of targetBookings) {
      // If single edit, use the provided date, else use the booking's own date
      const targetDate = isFollowing ? b.date : (date || b.date);
      const targetStart = startTime || b.startTime;
      const targetEnd = endTime || b.endTime;
      const targetTeacher = teacherId || b.teacherId;
      const targetStudents = studentIds || b.studentIds || (b.studentId ? [b.studentId] : []);
      const targetClass = classGroupId || b.classGroupId;

      const slotConflicts = validateBookingSlot(targetDate, targetStart, targetEnd, targetTeacher, targetStudents, targetClass, targetBookings.map(tb => tb.id));
      allConflicts.push(...slotConflicts);
    }

    if (allConflicts.length > 0 && !req.body.forceSchedule) {
      releaseMutex();
      return res.status(409).json({ conflicts: allConflicts });
    }

    if (req.body.forceSchedule) {
      if (req.user.role !== "Administrador") {
        releaseMutex();
        return res.status(403).json({ error: "Somente administradores podem forçar um agendamento com conflitos." });
      }
    }

    for (const b of targetBookings) {
      if (!isFollowing || (isFollowing && b.id === booking.id)) {
        if (date) b.date = date;
      }
      if (startTime) b.startTime = startTime;
      if (endTime) b.endTime = endTime;
      if (teacherId) b.teacherId = teacherId;
      if (roomId) b.roomId = roomId;
      if (studentIds) b.studentIds = studentIds;
      if (classGroupId) b.classGroupId = classGroupId;
    }

    releaseMutex();
    return res.json({ message: "Agendamento(s) atualizado(s) com sucesso.", bookings: targetBookings });
  } catch (err) {
    releaseMutex();
    return res.status(500).json({ error: "Erro interno ao atualizar." });
  }
});
// --- END NEW SCHEDULING ENGINE ---

// Create Booking with strict MUTEX verification to guarantee zero race conditions
app.post("/api/bookings", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { studentId, teacherId, roomId, date, startTime, endTime } = req.body;

  if (!studentId || !teacherId || !roomId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: "Todos os campos de agendamento são obrigatórios." });
  }

  // Acquire database mutex
  await acquireMutex();

  try {
    // 1. Validate ACID Anti-collision rules
    const validation = validateCollisions(null, studentId, teacherId, roomId, date, startTime, endTime);
    if (!validation.success) {
      return res.status(409).json({ error: validation.error });
    }

    // 2. Validate student availability
    const studentObj = students.find((s) => s.id === studentId);
    const dayOfWeek = getDayOfWeek(date);
    const studentAvail = studentObj?.availability.find((av) => av.dayOfWeek === dayOfWeek);
    
    if (!studentAvail) {
      return res.status(400).json({
        error: `Aviso de Escopo: O aluno ${studentObj?.name || ""} não cadastrou disponibilidade para este dia da semana.`
      });
    } else {
      // Check if slot falls outside availability range
      const sStart = timeToMinutes(studentAvail.startTime);
      const sEnd = timeToMinutes(studentAvail.endTime);
      const bStart = timeToMinutes(startTime);
      const bEnd = timeToMinutes(endTime);
      if (bStart < sStart || bEnd > sEnd) {
        return res.status(400).json({
          error: `Aviso de Escopo: O horário escolhido (${startTime} - ${endTime}) está fora do horário disponível do aluno para este dia (${studentAvail.startTime} - ${studentAvail.endTime}).`
        });
      }
    }

    // 3. Validate teacher availability
    const teacherObj = teachers.find((t) => t.id === teacherId);
    const teacherAvail = teacherObj?.availability.find((av) => av.dayOfWeek === dayOfWeek);

    if (!teacherAvail) {
      return res.status(400).json({
        error: `Aviso de Escopo: O professor ${teacherObj?.name || ""} não cadastrou disponibilidade para este dia da semana.`
      });
    } else {
      const tStart = timeToMinutes(teacherAvail.startTime);
      const tEnd = timeToMinutes(teacherAvail.endTime);
      const bStart = timeToMinutes(startTime);
      const bEnd = timeToMinutes(endTime);
      if (bStart < tStart || bEnd > tEnd) {
        return res.status(400).json({
          error: `Aviso de Escopo: O horário escolhido está fora do horário disponível do professor para este dia (${teacherAvail.startTime} - ${teacherAvail.endTime}).`
        });
      }
    }

    // Extrair planejamento
    let subject = teacherObj?.subject;
    let front = undefined;
    let topic = undefined;

    if (studentObj && studentObj.profile360 && studentObj.profile360.tacticalPlans) {
      const plan = studentObj.profile360.tacticalPlans.find(p => p.subject === subject);
      if (plan && plan.sequences) {
        const nextSequence = plan.sequences.find(seq => !seq.completed);
        if (nextSequence) {
          front = nextSequence.front;
          topic = nextSequence.content;
        }
      }
    }

    // All clear! Save the booking safely
    const newBooking: Booking = {
      id: `book-${Date.now()}`,
      studentId,
      teacherId,
      roomId,
      date,
      startTime,
      endTime,
      status: "agendada",
      createdAt: new Date().toISOString(),
      subject,
      front,
      topic,
      topicFinished: false
    };

    bookings.push(newBooking);
    res.status(201).json({ message: "Agendamento confirmado com sucesso!", booking: newBooking });

  } catch (err: any) {
    res.status(500).json({ error: "Erro interno ao processar o agendamento." });
  } finally {
    // Release lock
    releaseMutex();
  }
});

// Update booking status (e.g. Cancel / Restore)
app.patch("/api/bookings/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, topicFinished } = req.body;

  await acquireMutex();

  try {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) {
      return res.status(404).json({ error: "Agendamento não encontrado." });
    }

    if (status === "agendada") {
      // Re-validate collision before confirming again
      const validation = validateCollisions(id, booking.studentId, booking.teacherId, booking.roomId, booking.date, booking.startTime, booking.endTime);
      if (!validation.success) {
        return res.status(409).json({ error: validation.error });
      }
    }

    booking.status = status;
    if (topicFinished !== undefined) {
      booking.topicFinished = topicFinished;
    }

    // Handle topicFinished state in the tactical plan
    if (booking.subject && booking.topic) {
      const studentObj = students.find((s) => s.id === booking.studentId);
      if (studentObj && studentObj.profile360 && studentObj.profile360.tacticalPlans) {
        const plan = studentObj.profile360.tacticalPlans.find(p => p.subject === booking.subject);
        if (plan && plan.sequences) {
          const sequence = plan.sequences.find(seq => seq.content === booking.topic);
          if (sequence) {
            if (booking.topicFinished && booking.status.startsWith('realizada')) {
              sequence.completed = true;
            } else if (topicFinished === false) {
              // If explicitly unchecked
              sequence.completed = false;
            }
          }
        }
      }
    }

    const duration = (start, end) => {
      const [sH, sM] = start.split(':').map(Number);
      const [eH, eM] = end.split(':').map(Number);
      return (eH + eM/60) - (sH + sM/60);
    };

    const student = students.find(s => s.id === booking.studentId);
    if (student && student.contract) {
      let used = 0;
      let canceled = 0;
      bookings.filter(b => b.studentId === student.id).forEach(b => {
        if (b.status === 'realizada_presenca' || b.status === 'realizada_falta') {
          used += duration(b.startTime, b.endTime);
        } else if (b.status === 'desmarcada') {
          canceled += duration(b.startTime, b.endTime);
        }
      });
      student.contract.usedHours = used;
      student.contract.canceledHours = canceled;
    }

    res.json({ message: "Status do agendamento atualizado com sucesso.", booking, student });
  } catch (err) {
    res.status(500).json({ error: "Erro interno ao atualizar agendamento." });
  } finally {
    releaseMutex();
  }
});

// AI AUTO-FILL MULTIMODAL ENDPOINT
app.post("/api/ai/auto-fill", authenticateToken, upload.single('file'), async (req: any, res: any) => {
  try {
    const { text, contextContext } = req.body;
    const file = req.file;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let parts: any[] = [];
    
    const prompt = `Você é um assistente de IA focado em produtividade para um sistema de gestão educacional (e-Raia).
Sua tarefa é extrair as informações do áudio, texto, pdf ou imagem fornecida, e estruturar os dados para que o sistema possa criar um rascunho de preenchimento automático de formulário.
Se a entrada for áudio, extraia os dados falados.

Você deve retornar estritamente um JSON estruturado seguindo o esquema especificado.
Você deve identificar a Entidade (Student, Teacher, Guardian, Room, Booking) com base nos dados.
A ação deve ser "CREATE" ou "UPDATE" (use CREATE por padrão, a não ser que uma atualização seja explicitamente pedida).

Esquema de Retorno Esperado:
{
  "action": "CREATE" | "UPDATE",
  "entity": "Student" | "Teacher" | "Guardian" | "Room" | "Booking" | "Unknown",
  "data": { ... campos preenchidos ... }
}

Dicas para chaves em "data" (use os nomes das chaves do nosso sistema, preencha apenas o que encontrar):
- Student: name, email, phone, currentSchool, level
- Teacher: name, email, subject
- Guardian: name, email, phone, cpf
- Booking: date, startTime, endTime, subject, topic
- Room: name, capacity
`;

    parts.push(prompt);

    if (text) {
      parts.push(`Contexto atual da tela: ${contextContext || 'Geral'}. \nInput do Usuário: ${text}`);
    } else if (contextContext) {
      parts.push(`Contexto atual da tela: ${contextContext}. Por favor, extraia as informações deste arquivo considerando este contexto.`);
    }

    if (file) {
      parts.push({
        inlineData: {
          data: file.buffer.toString("base64"),
          mimeType: file.mimetype
        }
      });
    }

    if (parts.length === 1) {
      return res.status(400).json({ error: "Nenhum arquivo ou texto fornecido." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Error in AI auto-fill:", error);
    res.status(500).json({ error: "Erro ao processar dados com IA" });
  }
});

// AI PERFECT MATCH SUGGESTION ENDPOINT
app.post("/api/ai/suggest", authenticateToken, async (req, res) => {
  const { studentId, teacherId, roomId, date } = req.body;

  if (!studentId || !teacherId || !roomId || !date) {
    return res.status(400).json({ error: "ID do Aluno, Professor, Sala e Data são obrigatórios." });
  }

  const studentObj = students.find((s) => s.id === studentId);
  const teacherObj = teachers.find((t) => t.id === teacherId);
  const roomObj = rooms.find((r) => r.id === roomId);

  if (!studentObj || !teacherObj || !roomObj) {
    return res.status(404).json({ error: "Aluno, Professor ou Sala não encontrados." });
  }

  const dayOfWeek = getDayOfWeek(date);
  const dayNum = new Date(date + "T00:00:00").getDay(); // 0=Dom .. 6=Sáb (bate com o formato salvo)

  // 1. Calculate algorithmic availability overlap
  const studentAvail = (studentObj.availability || []).find((av) => Number(av.dayOfWeek) === dayNum);
  const teacherAvail = (teacherObj.availability || []).find((av) => Number(av.dayOfWeek) === dayNum);

  if (!studentAvail || !teacherAvail) {
    return res.json({
      success: false,
      reason: `Sem sobreposição de dias: ${!studentAvail ? studentObj.name : teacherObj.name} não possui horário de disponibilidade cadastrado para este dia da semana.`
    });
  }

  // Cross check overlap bounds
  const sStart = timeToMinutes(studentAvail.startTime);
  const sEnd = timeToMinutes(studentAvail.endTime);
  const tStart = timeToMinutes(teacherAvail.startTime);
  const tEnd = timeToMinutes(teacherAvail.endTime);

  const overlapStartMin = Math.max(sStart, tStart);
  const overlapEndMin = Math.min(sEnd, tEnd);

  if (overlapStartMin >= overlapEndMin) {
    return res.json({
      success: false,
      reason: `As grades horárias disponíveis do aluno (${studentAvail.startTime}-${studentAvail.endTime}) e do professor (${teacherAvail.startTime}-${teacherAvail.endTime}) não se sobrepõem hoje.`
    });
  }

  // We have a logical time window overlap on this day!
  // Generate candidate 1-hour slots inside this window
  const candidates: { startTime: string; endTime: string; status: string; reason?: string }[] = [];
  let currentMin = overlapStartMin;

  while (currentMin + 60 <= overlapEndMin) {
    const hStart = Math.floor(currentMin / 60).toString().padStart(2, "0");
    const mStart = (currentMin % 60).toString().padStart(2, "0");
    const hEnd = Math.floor((currentMin + 60) / 60).toString().padStart(2, "0");
    const mEnd = ((currentMin + 60) % 60).toString().padStart(2, "0");

    const slotStart = `${hStart}:${mStart}`;
    const slotEnd = `${hEnd}:${mEnd}`;

    // Validate anti-collision logic
    const collCheck = validateCollisions(null, studentId, teacherId, roomId, date, slotStart, slotEnd);

    if (collCheck.success) {
      candidates.push({
        startTime: slotStart,
        endTime: slotEnd,
        status: "disponivel"
      });
    } else {
      candidates.push({
        startTime: slotStart,
        endTime: slotEnd,
        status: "colisao",
        reason: collCheck.error
      });
    }

    currentMin += 60; // 1 hour step
  }

  const validCandidates = candidates.filter((c) => c.status === "disponivel");

  if (validCandidates.length === 0) {
    return res.json({
      success: false,
      reason: "Embora haja sobreposição na grade padrão, todos os slots possíveis geram colisão com compromissos já agendados."
    });
  }

  // 2. Feed the candidates and context to Gemini API to generate an intelligent recommendation and scoring
  try {
    const prompt = `
      Você é o cérebro de inteligência artificial de um sistema de agendamento escolar de alto nível de aulas individuais ("Gerenciador de Agenda").
      
      Seu objetivo é analisar as opções disponíveis de horários de cruzamento e sugerir o "Encaixe Perfeito" (Perfect Match) com base nos perfis.
      
      DADOS DO ALUNO:
      - Nome: ${studentObj.name}
      - Nível: ${studentObj.level}
      - Grade Geral no Dia: ${studentAvail.startTime} - ${studentAvail.endTime}
      
      DADOS DO PROFESSOR:
      - Nome: ${teacherObj.name}
      - Matéria/Especialidade: ${teacherObj.subject}
      - Grade Geral no Dia: ${teacherAvail.startTime} - ${teacherAvail.endTime}
      
      DADOS DA SALA:
      - Nome: ${roomObj.name}
      - Recursos: ${roomObj.resources.join(", ")}
      
      SLOTS LOGICAMENTE LIVRES (CANDIDATOS):
      ${validCandidates.map((c, i) => `[Slot ${i + 1}]: das ${c.startTime} às ${c.endTime}`).join("\\n")}
      
      INSTRUÇÃO:
      Escolha o melhor slot entre os livres.
      Crie uma justificativa brilhante e profissional em português para o "Encaixe Perfeito" recomendando este horário. Por exemplo, relacione o nível do aluno com a especialidade do professor, e os recursos da sala com a atividade proposta (ex: headsets na sala de idiomas para aula de inglês, ou lousa para matemática).
      Atribua uma nota de compatibilidade (Match Score de 0 a 100) para cada slot livre e explique a razão da nota.
      
      Gere uma resposta JSON estruturada estritamente no seguinte formato:
      {
        "recommendedSlot": {
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "matchScore": 95,
          "reasoning": "Texto justificando a recomendação"
        },
        "allOptions": [
          {
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "matchScore": 90,
            "reasoning": "Breve justificativa individual para este slot"
          }
        ],
        "insight": "Dica executiva para o gerenciador da agenda melhorar as aulas futuras ou otimizar a sala."
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedSlot: {
              type: Type.OBJECT,
              properties: {
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                matchScore: { type: Type.INTEGER },
                reasoning: { type: Type.STRING }
              },
              required: ["startTime", "endTime", "matchScore", "reasoning"]
            },
            allOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  startTime: { type: Type.STRING },
                  endTime: { type: Type.STRING },
                  matchScore: { type: Type.INTEGER },
                  reasoning: { type: Type.STRING }
                },
                required: ["startTime", "endTime", "matchScore", "reasoning"]
              }
            },
            insight: { type: Type.STRING }
          },
          required: ["recommendedSlot", "allOptions", "insight"]
        }
      }
    });

    const aiResult = JSON.parse(response.text.trim());
    res.json({
      success: true,
      data: aiResult
    });

  } catch (error: any) {
    console.error("Gemini Suggestion Error:", error);
    // Fallback if AI fails or key is missing: Return algorithmic match with placeholder AI description
    const firstFree = validCandidates[0];
    res.json({
      success: true,
      data: {
        recommendedSlot: {
          startTime: firstFree.startTime,
          endTime: firstFree.endTime,
          matchScore: 85,
          reasoning: `Sugestão Algorítmica Rápida: Este é o primeiro slot livre comum. O professor ${teacherObj.name} e o aluno ${studentObj.name} estão livres e a sala ${roomObj.name} está desocupada.`
        },
        allOptions: validCandidates.map((v) => ({
          startTime: v.startTime,
          endTime: v.endTime,
          matchScore: 80,
          reasoning: "Slot livre sem conflito de horário."
        })),
        insight: "Adicione mais recursos e personalize o perfil do aluno para obter sugestões de inteligência artificial ainda mais ricas."
      }
    });
  }
});


// ===================================================================
//  F4 — MOTOR DE AGENDA AUTÔNOMO
//  Gera uma proposta de agenda semanal cruzando disponibilidade de
//  aluno × professores × salas, respeitando o saldo de horas do
//  contrato e a carga horária dos planos táticos. NÃO cria os
//  agendamentos — devolve a proposta pro admin revisar/aprovar.
// ===================================================================
app.post("/api/ai/auto-schedule", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { studentId, weekStartDate, sessionMinutes } = req.body;
  const student = students.find((s: any) => s.id === studentId);
  if (!student) return res.status(404).json({ error: "Aluno não encontrado." });

  // Segunda-feira de referência (informada ou a próxima)
  const baseDate = weekStartDate
    ? new Date(weekStartDate + "T00:00:00")
    : (() => {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        const day = d.getDay();               // 0 dom .. 6 sáb
        const diff = day === 0 ? 1 : (8 - day); // próxima segunda
        d.setDate(d.getDate() + diff);
        return d;
      })();

  const availability = student.availability || student.profile360?.availability || [];
  const plans = student.profile360?.tacticalPlans || [];
  const contract = student.contract;
  const totalH = contract ? (contract.totalHours || 0) : 0;
  const usedH = contract ? (contract.usedHours || 0) : 0;
  let remainingMin = contract ? Math.max(0, totalH - usedH) * 60 : Infinity;

  // Restrição médica: TDAH/concentração → blocos de 45min
  const hasTDAH = (student.profile360?.medicalRecords || []).some((m: any) =>
    /tdah|concentra|déficit|deficit/i.test(`${m.condition || ""} ${m.notes || ""}`));
  const slotLen = Number(sessionMinutes) || (hasTDAH ? 45 : 60);

  const proposal: any[] = [];
  const fmt = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const dateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const activeBookings = () => bookings.filter((b: any) => b.status !== "cancelada" && b.status !== "desmarcada");

  // Professor OU aluno já ocupado nesse horário (independe de sala)
  const busyTeacherOrStudent = (teacherId: string, date: string, s: string, e: string) =>
    [...activeBookings(), ...proposal].some((b: any) =>
      b.date === date && rangesOverlap(b.startTime, b.endTime, s, e) &&
      (b.teacherId === teacherId || b.studentId === studentId));

  // Primeira sala livre nesse horário
  const findFreeRoom = (date: string, s: string, e: string) => {
    const all = [...activeBookings(), ...proposal];
    return rooms.find((r: any) => !all.some((b: any) =>
      b.date === date && b.roomId === r.id && rangesOverlap(b.startTime, b.endTime, s, e))) || null;
  };

  const unmet: any[] = [];

  for (const plan of plans) {
    const requestedMin = (plan.weeklyHours || 0) * 60;
    if (requestedMin <= 0) continue;
    if (remainingMin <= 0) { unmet.push({ subject: plan.subject, reason: "Saldo de horas do contrato esgotado." }); continue; }

    const teachersForSubject = teachers.filter((t: any) => {
      const ts = (t.subject || "").toLowerCase().trim();
      const ps = (plan.subject || "").toLowerCase().trim();
      return ts && ps && (ts.includes(ps) || ps.includes(ts));
    });
    if (teachersForSubject.length === 0) { unmet.push({ subject: plan.subject, reason: "Nenhum professor cadastrado para esta matéria." }); continue; }

    let needMin = Math.min(requestedMin, remainingMin);
    let allocatedMin = 0;

    // Distribui: no máx. uma sessão dessa matéria por dia útil
    for (let dow = 1; dow <= 5 && needMin > 0; dow++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + (dow - 1));
      const dateS = dateStr(dayDate);

      const studAv = availability.find((a: any) => Number(a.dayOfWeek) === dow);
      if (!studAv) continue;

      let placed = false;
      for (const teacher of teachersForSubject) {
        if (placed) break;
        const tAv = (teacher.availability || []).find((a: any) => Number(a.dayOfWeek) === dow);
        if (!tAv) continue;

        const winStart = Math.max(timeToMinutes(studAv.startTime), timeToMinutes(tAv.startTime));
        const winEnd = Math.min(timeToMinutes(studAv.endTime), timeToMinutes(tAv.endTime));

        for (let cur = winStart; cur + slotLen <= winEnd; cur += slotLen) {
          const s = fmt(cur), e = fmt(cur + slotLen);
          if (busyTeacherOrStudent(teacher.id, dateS, s, e)) continue;
          const room = findFreeRoom(dateS, s, e);
          if (!room) continue;

          proposal.push({
            studentId,
            studentName: student.name,
            teacherId: teacher.id,
            teacherName: teacher.name,
            roomId: room.id,
            roomName: room.name,
            date: dateS,
            dayOfWeek: dow,
            startTime: s,
            endTime: e,
            subject: plan.subject,
            reasoning: `${plan.subject} com ${teacher.name} na ${room.name}. Aluno e professor livres; sala sem conflito.${hasTDAH ? " Bloco de 45min (TDAH)." : ""}`,
          });
          needMin -= slotLen; remainingMin -= slotLen; allocatedMin += slotLen;
          placed = true;
          break;
        }
      }
    }

    if (allocatedMin < requestedMin) {
      unmet.push({
        subject: plan.subject,
        requestedHours: plan.weeklyHours,
        allocatedHours: Math.round((allocatedMin / 60) * 100) / 100,
        reason: allocatedMin === 0
          ? "Sem sobreposição de horário/sala disponível na semana."
          : "Encaixe parcial — não coube toda a carga horária.",
      });
    }
  }

  const summary =
    `${proposal.length} aula(s) sugerida(s) para ${student.name} na semana de ${dateStr(baseDate)}.` +
    (hasTDAH ? " Blocos de 45min por conta de TDAH." : "") +
    (contract
      ? ` Saldo restante após a proposta: ${remainingMin === Infinity ? "—" : (remainingMin / 60).toFixed(1)}h.`
      : " Aluno sem contrato cadastrado (saldo de horas não limitado).") +
    (plans.length === 0 ? " ⚠️ Aluno não tem planos táticos (matéria + carga horária) cadastrados — nada a agendar." : "");

  res.json({
    success: true,
    weekStart: dateStr(baseDate),
    sessionMinutes: slotLen,
    proposal,
    unmet,
    summary,
  });
});

// F4b — Aplica uma proposta aprovada: cria os agendamentos reais.
// Revalida colisão de cada sessão; devolve o que criou e o que pulou.
app.post("/api/ai/auto-schedule/commit", authenticateToken, requireRole(["Administrador"]), async (req: any, res: any) => {
  const { sessions } = req.body;
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return res.status(400).json({ error: "Nenhuma sessão para agendar." });
  }
  await acquireMutex();
  try {
    const created: any[] = [];
    const skipped: any[] = [];
    for (const s of sessions) {
      const coll = validateCollisions(null, s.studentId, s.teacherId, s.roomId, s.date, s.startTime, s.endTime);
      if (!coll.success) { skipped.push({ ...s, reason: coll.error }); continue; }
      const booking = {
        id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        studentId: s.studentId,
        teacherId: s.teacherId,
        roomId: s.roomId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        subject: s.subject,
        status: "agendada",
        createdAt: new Date().toISOString(),
      };
      bookings.push(booking);
      created.push(booking);
    }
    res.json({ success: true, created, skipped });
  } finally {
    releaseMutex();
  }
});

// Dev & Production serving configuration
async function startServer() {
  
// System endpoints
app.get("/api/system/backups", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    res.json(systemBackups.map(b => ({ id: b.id, label: b.label, timestamp: b.timestamp })));
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar backups" });
  }
});

app.post("/api/system/backup", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await acquireMutex();
  try {
    const backupData = {
      id: `eraia_backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: req.body.label || "Backup Automático",
      data: {
        users,
        guardianDrafts,
        guardians,
        studentDrafts,
        students,
        teachers,
        rooms,
        classGroups,
        bookings
      }
    };
    systemBackups.push(backupData);
    saveDb();
    res.json({ id: backupData.id, timestamp: backupData.timestamp, label: backupData.label });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar backup" });
  } finally {
    releaseMutex();
  }
});

app.post("/api/system/backups/import", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await acquireMutex();
  try {
    const importedData = req.body.data;
    if (!importedData) return res.status(400).json({ error: "Dados inválidos" });
    
    const backupData = {
      id: `eraia_backup_imported_${Date.now()}`,
      timestamp: new Date().toISOString(),
      label: req.body.label || "Backup Importado",
      data: importedData
    };
    systemBackups.push(backupData);
    saveDb();
    res.json({ id: backupData.id, timestamp: backupData.timestamp, label: backupData.label });
  } catch (error) {
    res.status(500).json({ error: "Erro ao importar backup" });
  } finally {
    releaseMutex();
  }
});

app.get("/api/system/backups/:id/compare", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const backup = systemBackups.find(b => b.id === req.params.id);
    if (!backup) return res.status(404).json({ error: "Backup não encontrado" });
    const bData = backup.data;
    const diff = {
       users: { label: 'Usuários', current: users.length, backup: (bData.users || []).length },
       guardians: { label: 'Responsáveis', current: guardians.length, backup: (bData.guardians || []).length },
       students: { label: 'Alunos', current: students.length, backup: (bData.students || []).length },
       teachers: { label: 'Professores', current: teachers.length, backup: (bData.teachers || []).length },
       rooms: { label: 'Salas', current: rooms.length, backup: (bData.rooms || []).length },
       classGroups: { label: 'Turmas', current: classGroups.length, backup: (bData.classGroups || []).length },
       bookings: { label: 'Agendamentos', current: bookings.length, backup: (bData.bookings || []).length },
    };
    res.json(diff);
  } catch (error) {
    res.status(500).json({ error: "Erro ao comparar backup" });
  }
});

app.delete("/api/system/backups/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await acquireMutex();
  try {
    systemBackups = systemBackups.filter(b => b.id !== req.params.id);
    saveDb();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao excluir backup" });
  } finally {
    releaseMutex();
  }
});

app.get("/api/system/backups/download/:id", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  try {
    const backup = systemBackups.find(b => b.id === req.params.id);
    if (!backup) return res.status(404).json({ error: "Backup não encontrado" });
    res.setHeader('Content-disposition', 'attachment; filename=' + backup.id + '.json');
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  } catch (error) {
    res.status(500).json({ error: "Erro ao baixar backup" });
  }
});

app.post("/api/system/restore", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await acquireMutex();
  try {
    let backup = req.body.data;
    if (req.body.id) {
       const found = systemBackups.find(b => b.id === req.body.id);
       if (found) backup = found.data;
    }
    
    if (backup) {
      if (backup.users) users = backup.users;
      if (backup.guardianDrafts) guardianDrafts = backup.guardianDrafts;
      if (backup.guardians) guardians = backup.guardians;
      if (backup.studentDrafts) studentDrafts = backup.studentDrafts;
      if (backup.students) students = backup.students;
      if (backup.teachers) teachers = backup.teachers;
      if (backup.rooms) rooms = backup.rooms;
      if (backup.classGroups) classGroups = backup.classGroups;
      if (backup.bookings) bookings = backup.bookings;
      
      saveDb();
      res.json({ message: "Backup restaurado com sucesso." });
    } else {
      res.status(400).json({ error: "Dados inválidos." });
    }
  } catch (error) {
    res.status(500).json({ error: "Erro ao restaurar backup" });
  } finally {
    releaseMutex();
  }
});

app.post("/api/system/reset", authenticateToken, requireRole(["Administrador"]), async (req, res) => {
  await acquireMutex();
  try {
    users = users.filter(u => u.role === "Administrador");
    guardianDrafts = [];
    guardians = [];
    studentDrafts = [];
    students = [];
    teachers = [];
    rooms = [];
    classGroups = [];
    bookings = [];
    saveDb();
    res.json({ message: "Sistema resetado com sucesso." });
  } catch (error) {
    res.status(500).json({ error: "Erro ao resetar o sistema" });
  } finally {
    releaseMutex();
  }
});


  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

    await loadDb();
  await seedMasterUser();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GradeFácil App Server] Servidor ativo em http://localhost:${PORT}`);
  });
}

startServer();
