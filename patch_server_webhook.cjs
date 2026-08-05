const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Insert firebase imports at the top
const firebaseImports = `
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
`;
content = content.replace('import dotenv from "dotenv";', firebaseImports + '\nimport dotenv from "dotenv";');

// Find webhook and update it
content = content.replace(/app\.post\("\/api\/webhooks\/google-forms",\s*\(req, res\) => {[\s\S]*?drafts\.push\(newDraft\);[\s\S]*?saveDb\(\);\s*res\.json\({ message: "Draft received" }\);\s*}\);/, `
app.post("/api/webhooks/google-forms", async (req, res) => {
  const token = req.headers['authorization'];
  if (token !== 'Bearer MEU_TOKEN_SUPER_SECRETO_123') {
    return res.status(401).json({ error: "Unauthorized webhook access" });
  }

  const rawData = req.body;
  
  const sanitizeStr = (str) => (str || "").toString().trim();
  const formatName = (str) => sanitizeStr(str).replace(/\\b\\w/g, l => l.toUpperCase());
  const removePunctuation = (str) => sanitizeStr(str).replace(/[.()\\s-]/g, '');

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
    tempoEstudoPorDia: sanitizeStr(rawData.tempoEstudoPorDia),
    costumaRevisar: sanitizeStr(rawData.costumaRevisar),
    principalObjetivo: sanitizeStr(rawData.principalObjetivo),
    cursoOuArea: sanitizeStr(rawData.cursoOuArea),
    motivoAcompanhamento: sanitizeStr(rawData.motivoAcompanhamento),
    esperaMudancaRotina: sanitizeStr(rawData.esperaMudancaRotina),
    dataNascimento: sanitizeStr(rawData.dataNascimento),
    rawResponses: rawData
  };

  try {
    await setDoc(doc(firestoreDb, 'studentDrafts', newDraftId), newDraft);
    res.json({ message: "Draft received" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to write draft" });
  }
});
`);

fs.writeFileSync('server.ts', content, 'utf8');
