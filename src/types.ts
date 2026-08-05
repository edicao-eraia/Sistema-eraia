export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SchoolHistory {
  schoolName: string;
  year: string;
  notes: string;
}

export interface SubjectPerformance {
  subject: string;
  level: "Excelente" | "Bom" | "Regular" | "Com Dificuldade";
}

export interface MedicalRecord {
  condition: string; // e.g. TDAH, Dislexia
  notes: string;
}

export interface DidacticSequence {
  front?: string;
  content: string;
  order: number;
  completed?: boolean;
}

export interface TacticalPlan {
  subject: string;
  weeklyHours: number;
  strategy: string;
  sequences?: DidacticSequence[];
}

export interface CredentialsVault {
  schoolPortalUrl: string;
  username: string;
  encryptedPasswordHash: string; // Stored securely
}

export interface StudentProfile360 {
  // Perfil do Estudante
  behavioralProfile: string;
  medicalRecords: MedicalRecord[];
  
  // Trajetória Escolar
  schoolHistories: SchoolHistory[];
  
  // Informações Escolares Compiladas
  currentSchool?: string;
  city?: string;
  state?: string;
  schoolYear?: string;
  shift?: string;
  performanceEvaluation?: string;
  difficultSubjects?: string;
  easySubjects?: string;
  hasDoneVestibular?: string; // "Sim", "Não"
  vestibularExams?: {
    name: string;
    year: string;
    scoreLinguagens?: string;
    scoreHumanas?: string;
    scoreNatureza?: string;
    scoreMatematica?: string;
    scoreRedacao?: string;
  }[];
  
  // Objetivos
  targetCourse: string;
  targetUniversities: string[];
  
  // Expectativas
  primaryGoal?: string;
  reasonToStart?: string;
  expectedRoutineChange?: string;
  
  // Afinidades e Desempenho
  performances: SubjectPerformance[];
  recentTestScores: string;
  recentExamsResults?: string;
  reportCard?: string;
  
  // Proposta Pedagógica
  tacticalPlans: TacticalPlan[];
  
  // Cofre de Credenciais
  credentials?: CredentialsVault;
}

export interface ContractInfo {
  startDate: string;
  endDate: string;
  totalHours: number;
  usedHours: number;
  canceledHours: number;
  contractNotes?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  level: string;
  modality?: "Turma" | "Individual" | "Híbrido";
  currentSchool?: string;
  birthDate?: string;
  instagram?: string;
  city?: string;
  state?: string;
  availability: AvailabilitySlot[];
  photoUrl?: string;
  fixedActivities?: string[];
  profile360?: StudentProfile360;
  contract?: ContractInfo;
  rawDraftData?: Record<string, any>;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  availability: AvailabilitySlot[];
  photoUrl?: string;
  hourlyRateIndividual?: number;
  hourlyRateGroup?: number;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  resources: string[];
}

export interface Booking {
  id: string;
  studentId?: string;
  studentIds?: string[];
  classGroupId?: string;
  seriesId?: string;
  teacherId: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "agendada" | "realizada_presenca" | "realizada_falta" | "desmarcada" | "cancelada";
  createdAt: string;
  subject?: string;
  front?: string;
  topic?: string;
  topicFinished?: boolean;
  observations?: string;
  materials?: string;

}

export interface AISuggestion {
  recommendedSlot: {
    startTime: string;
    endTime: string;
    matchScore: number;
    reasoning: string;
  };
  allOptions: {
    startTime: string;
    endTime: string;
    matchScore: number;
    reasoning: string;
  }[];
  insight: string;
}

export interface StudentDraft {
  contractNotes?: string;
  id: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  submittedAt: string;
  
  // Mapped from Forms
  nomeCompleto: string;
  modality?: "Turma" | "Individual" | "Híbrido";
  cpf: string;
  email: string;
  whatsapp: string;
  instagram: string;
  escolaAtual: string;
  cidade: string;
  estado: string;
  anoEscolar: string;
  turno: string;
  portalAlunoLink: string;
  portalAlunoLogin: string;
  portalAlunoSenhaRaw: string;
  boletimUrl: string;
  avaliacaoDesempenho: string;
  materiasDificuldade: string;
  materiasFacilidade: string;
  jaFezVestibular: string;
  vestibularParticipei: string;
  vestibularAno: string;
  notaLinguagens: string;
  notaHumanas: string;
  notaNatureza: string;
  notaMatematica: string;
  notaRedacao: string;
  estudaFora: string;
  cursosExtracurriculares: string;
  atividadeFisica: string;
  rotinaSemanal: string;
  rotinaEstudosFora: string;
  conteudosRevisar: string;
  conteudosPrimeiraSemana: string;
  mantemRotinaEstudos: string;
  maiorDificuldade: string;
  tempoEstudoPorDia: string;
  costumaRevisar: string;
  principalObjetivo: string;
  cursoOuArea: string;
  motivoAcompanhamento: string;
  esperaMudancaRotina: string;
  dataNascimento: string;
  contractStartDate?: string;
  contractEndDate?: string;
  contractTotalHours?: number;
  rawResponses?: Record<string, any>;
}

export interface Guardian {
  id: string;
  studentIds?: string[];
  name: string;
  email: string;
  phone: string;
  cpf: string;
  studentId?: string; // Vinculado a qual aluno
  studentName?: string;
  relationship: string; // Ex: Pai, Mãe, etc
  financialResponsible: boolean;
  profissao?: string;
  contracts?: { name: string, data: string, type: string }[];
}

export interface GuardianDraft {
  studentIds?: string[]; // Vinculados antes da aprovação
  id: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  submittedAt: string;
  
  // Basic Info
  nomeCompleto: string;
  email: string;
  whatsapp: string;
  cpf: string;
  profissao?: string;
  contracts?: { name: string, data: string, type: string }[];
  
  // Link
  nomeAluno: string; // To help link to student
  parentesco: string;
  responsavelFinanceiro: boolean;
  
  rawResponses?: Record<string, any>;
}

export interface ClassGroupSchedule {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
  workload: number;
  subjects?: string[];
  schedules?: ClassGroupSchedule[];
}

export interface MicroContent {
  id: string;
  name: string;
  description: string;
}

export interface MacroContent {
  id: string;
  name: string;
  microContents: MicroContent[];
}

export interface DisciplineSyllabus {
  id: string;
  disciplineName: string;
  macroContents: MacroContent[];
}
