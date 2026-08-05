const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// 1. Fix loadDb and saveDb
const loadDbRegex = /function loadDb\(\) \{[\s\S]*?seedMasterUser\(\);\n\}/;
const newLoadDb = `function loadDb() {
  try {
    if (fsNode.existsSync(DB_FILE)) {
      const data = JSON.parse(fsNode.readFileSync(DB_FILE, 'utf8'));
      if (data.users) users = data.users;
      if (data.systemBackups) systemBackups = data.systemBackups;
      if (data.students) students = data.students;
      if (data.teachers) teachers = data.teachers;
      if (data.rooms) rooms = data.rooms;
      if (data.classGroups) classGroups = data.classGroups;
      if (data.bookings) bookings = data.bookings;
      if (data.studentDrafts) studentDrafts = data.studentDrafts;
      if (data.guardianDrafts) guardianDrafts = data.guardianDrafts;
      if (data.guardians) guardians = data.guardians;
    }
  } catch (e) {
    console.error('Failed to load DB', e);
  }
  seedMasterUser();
}`;
server = server.replace(loadDbRegex, newLoadDb);

const saveDbRegex = /function saveDb\(\) \{[\s\S]*?fsNode\.writeFileSync\(DB_FILE, JSON\.stringify\(data, null, 2\), 'utf8'\);\n\}/;
const newSaveDb = `function saveDb() {
  const data = {
    users,
    systemBackups,
    students,
    teachers,
    rooms,
    classGroups,
    bookings,
    studentDrafts,
    guardianDrafts,
    guardians
  };
  fsNode.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}`;
server = server.replace(saveDbRegex, newSaveDb);

// 2. Fix the webhook to push to memory array as well
const webhookRegex = /app\.post\("\/api\/webhooks\/google-forms", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: "Failed to write draft" \}\);\n  \}\n\}\);/;
const newWebhook = `app.post("/api/webhooks/google-forms", async (req, res) => {
  const token = req.headers['authorization'];
  if (token !== 'Bearer MEU_TOKEN_SUPER_SECRETO_123') {
    return res.status(401).json({ error: "Unauthorized webhook access" });
  }
  const rawData = req.body;
  const sanitizeStr = (str: any) => (str || "").toString().trim();
  const formatName = (str: any) => sanitizeStr(str).replace(/\\b\\w/g, (l: string) => l.toUpperCase());
  const removePunctuation = (str: any) => sanitizeStr(str).replace(/[.()\\s-]/g, '');
  const newDraftId = \`draft-\${Date.now()}\`;
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
    try {
      await firestoreSetDoc(firestoreDoc(serverDb, 'studentDrafts', newDraftId), newDraft);
    } catch(e) {
      console.error('Firebase save failed for studentDraft', e);
    }
    res.json({ message: "Draft received" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to write draft" });
  }
});`;
server = server.replace(webhookRegex, newWebhook);

// 3. Update student draft approve to save to Firebase
const approveStudentRegex = /app\.post\("\/api\/drafts\/:id\/approve", \(req, res\) => \{[\s\S]*?res\.json\(\{ message: "Student approved and created", student: newStudent \}\);\n\}\);/;
const newApproveStudent = `app.post("/api/drafts/:id/approve", async (req, res) => {
  const { id } = req.params;
  const draftIndex = studentDrafts.findIndex((d: any) => d.id === id);
  if (draftIndex === -1) return res.status(404).json({ error: "Draft not found" });
  
  const draft = studentDrafts[draftIndex];
  
  const newStudent: any = {
    id: \`stud-\${Date.now()}\`,
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

  students.push(newStudent);
  studentDrafts[draftIndex].status = 'Aprovado';
  saveDb();
  
  try {
    await firestoreSetDoc(firestoreDoc(serverDb, 'students', newStudent.id), newStudent);
    await firestoreSetDoc(firestoreDoc(serverDb, 'studentDrafts', draft.id), studentDrafts[draftIndex]);
  } catch(e) {
    console.error('Firebase save failed for student approval', e);
  }
  
  res.json({ message: "Student approved and created", student: newStudent });
});`;
server = server.replace(approveStudentRegex, newApproveStudent);


// 4. Update guardian draft approve to save to Firebase
const approveGuardianRegex = /app\.post\("\/api\/guardians\/drafts\/:id\/approve", \(req, res\) => \{[\s\S]*?res\.json\(\{ message: "Guardian approved and created", guardian: newGuardian \}\);\n\}\);/;
const newApproveGuardian = `app.post("/api/guardians/drafts/:id/approve", async (req, res) => {
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
    id: \`guard-\${Date.now()}\`,
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
  
  try {
    await firestoreSetDoc(firestoreDoc(serverDb, 'guardians', newGuardian.id), newGuardian);
    await firestoreSetDoc(firestoreDoc(serverDb, 'guardianDrafts', draft.id), guardianDrafts[draftIndex]);
  } catch(e) {
    console.error('Firebase save failed for guardian approval', e);
  }
  
  res.json({ message: "Guardian approved and created", guardian: newGuardian });
});`;
server = server.replace(approveGuardianRegex, newApproveGuardian);


fs.writeFileSync('server.ts', server, 'utf8');
