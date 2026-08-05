import React, { useState, useEffect } from "react";
import { Toaster, toast } from 'react-hot-toast';

import { 
  fetchStudentsFromFirebase, createStudentInFirebase, updateStudentInFirebase, deleteStudentInFirebase, 
  fetchGuardiansFromFirebase, createGuardianInFirebase, updateGuardianInFirebase, deleteGuardianInFirebase,
  fetchTeachersFromFirebase, createTeacherInFirebase, updateTeacherInFirebase, deleteTeacherInFirebase,
  fetchRoomsFromFirebase, createRoomInFirebase, updateRoomInFirebase, deleteRoomInFirebase,
  fetchClassGroupsFromFirebase, createClassGroupInFirebase, updateClassGroupInFirebase, deleteClassGroupInFirebase, subscribeToBookings, deleteBookingInFirebase, updateBookingInFirebase
} from './lib/db';
// (Firebase removido — auth agora é JWT próprio do servidor via /api/auth/login)

import {  Menu, Inbox, Calendar, 
  Users, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Target,
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
   
  Search, 
  ChevronRight, 
  Check, 
  RefreshCw,
  AlertTriangle,
  Info,
  Sliders,
  HelpCircle
, Mic, Square, X, FileText, LogOut, Edit2, Download, Trash2, Save, AlertCircle, Upload, Loader2 } from "lucide-react";
import { Student, Teacher, Room, Booking, AISuggestion, AvailabilitySlot, Guardian } from "./types";
import { StudentProfileModal } from "./components/StudentProfileModal";
import { BookingEditModal } from './components/BookingEditModal';
import { UsersManagement } from './components/UsersManagement';
import { UserProfile } from './components/UserProfile';
import { TeacherProfile } from './components/TeacherProfile';
import { TeacherAgenda } from './components/TeacherAgenda';
import { User, Database, UserPen, UsersRound, Archive } from 'lucide-react';

const FamilyIcon = ({ className = "w-4 h-4", ...props }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide lucide-family ${className}`}
    {...props}
  >
    <path d="M3 21v-2a4 4 0 0 1 4-4h1"></path>
    <circle cx="7" cy="7" r="3"></circle>
    <path d="M21 21v-2a4 4 0 0 0-4-4h-1"></path>
    <circle cx="17" cy="7" r="3"></circle>
    <path d="M10 21v-1a2 2 0 0 1 4 0v1"></path>
    <circle cx="12" cy="14" r="2"></circle>
  </svg>
);

import { DraftInbox } from "./components/DraftInbox";
import { GuardianInbox } from "./components/GuardianInbox";
import { ClassGroupsList } from "./components/ClassGroupsList";
import { seedDatabaseForTesting } from './lib/seed';
import { ManualBookingModal } from "./components/ManualBookingModal";
import { DashboardIndicators } from "./components/DashboardIndicators";
import { TeacherFinancialSummary } from "./components/TeacherFinancialSummary";
import { ERaiaAssistant } from "./components/ERaiaAssistant";
import { ScheduleMatrix } from "./components/ScheduleMatrix";
import { CurriculumPlanner } from "./components/CurriculumPlanner";



// Helper Time conversion utilities
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  const start1 = timeToMinutes(s1);
  const end1 = timeToMinutes(e1);
  const start2 = timeToMinutes(s2);
  const end2 = timeToMinutes(e2);
  return start1 < end2 && start2 < end1;
}

const AVAILABLE_SUBJECTS = ["Inglês", "Espanhol", "Francês", "Alemão", "Matemática", "Física", "Química", "Biologia", "História", "Português", "Artes", "Geografia", "Gramática", "Literatura", "Redação", "Filosofia", "Sociologia", "Organização de Estudos", "Mentalidade"];

const ACTIVITY_CATEGORIES = [
  {
    id: "escola",
    name: "Escola Regular",
    icon: "🏫",
    description: "Turno da manhã, tarde ou integral",
    options: ["Ensino Fundamental", "Ensino Médio", "Escola de Período Integral"]
  },
  {
    id: "idiomas",
    name: "Cursos de Idiomas",
    icon: "🌐",
    description: "Inglês, espanhol, etc. (geralmente 2x na semana)",
    options: ["Curso de Inglês", "Curso de Espanhol", "Curso de Francês", "Curso de Alemão"]
  },
  {
    id: "extracurriculares",
    name: "Cursos Extracurriculares",
    icon: "🎨",
    description: "Música, teatro, programação, robótica, artes",
    options: ["Aula de Violão", "Aula de Piano", "Aula de Teatro", "Aula de Programação", "Aula de Robótica", "Aula de Pintura / Artes"]
  },
  {
    id: "familiares",
    name: "Responsabilidades Familiares",
    icon: "🏠",
    description: "Cuidar de irmão, ajudar no negócio da família",
    options: ["Cuidar do irmão mais novo", "Ajudar no negócio da família", "Afazeres domésticos"]
  },
  {
    id: "esportivos",
    name: "Treinos Esportivos",
    icon: "⚽",
    description: "Futebol, natação, vôlei, judô, ballet, etc.",
    options: ["Escolinha de Futebol", "Natação", "Treino de Vôlei", "Judô / Karatê", "Aulas de Ballet"]
  },
  {
    id: "academia",
    name: "Academia / Preparação Física",
    icon: "💪",
    description: "Musculação, funcional, etc. (Ensino Médio)",
    options: ["Treino de Musculação", "Treino Funcional", "Crossfit"]
  },
  {
    id: "terapias",
    name: "Terapias e Consultas Regulares",
    icon: "🧠",
    description: "Psicólogo, fono, psicopedagoga ou fisio",
    options: ["Sessão de Psicólogo", "Sessão de Fonoaudiologia", "Sessão de Psicopedagoga", "Sessão de Fisioterapia"]
  },
  {
    id: "deslocamento",
    name: "Tempo de Deslocamento (Transit)",
    icon: "🚗",
    description: "Trânsito escola-casa ou casa-aula",
    options: ["Deslocamento Escola ➔ Casa", "Deslocamento Casa ➔ Escola", "Deslocamento para Atividades"]
  },
  {
    id: "refeicao",
    name: "Horários de Refeição",
    icon: "🍽️",
    description: "Janelas bloqueadas para almoço, lanche, jantar",
    options: ["Janela de Almoço", "Janela de Jantar", "Janela de Café/Lanche"]
  }
];


const DRAFT_FIELDS = [
  { key: "nomeCompleto", label: "Nome Completo" },
  { key: "modality", label: "Modalidade do Aluno" },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp / Telefone' },
  { key: 'cpf', label: 'CPF' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'escolaAtual', label: 'Escola Atual' },
  { key: 'anoEscolar', label: 'Ano Escolar / Nível' },
  { key: 'turno', label: 'Turno' },
  { key: 'portalAlunoLink', label: 'Link do Portal do Aluno' },
  { key: 'portalAlunoLogin', label: 'Login do Portal' },
  { key: 'portalAlunoSenhaRaw', label: 'Senha do Portal' },
  { key: 'boletimUrl', label: 'Boletim (Link/Anexo)' },
  { key: 'avaliacaoDesempenho', label: 'Avaliação de Desempenho' },
  { key: 'materiasDificuldade', label: 'Matérias com Dificuldade' },
  { key: 'materiasFacilidade', label: 'Matérias com Facilidade' },
  { key: 'jaFezVestibular', label: 'Já Fez Vestibular' },
  { key: 'vestibularParticipei', label: 'Modalidade (Vestibular)' },
  { key: 'vestibularAno', label: 'Ano do Vestibular' },
  { key: 'notaLinguagens', label: 'Nota: Linguagens' },
  { key: 'notaHumanas', label: 'Nota: Humanas' },
  { key: 'notaNatureza', label: 'Nota: Natureza' },
  { key: 'notaMatematica', label: 'Nota: Matemática' },
  { key: 'notaRedacao', label: 'Nota: Redação' },
  { key: 'estudaFora', label: 'Estuda Fora?' },
  { key: 'cursosExtracurriculares', label: 'Cursos Extracurriculares' },
  { key: 'atividadeFisica', label: 'Atividade Física' },
  { key: 'rotinaSemanal', label: 'Rotina Semanal' },
  { key: 'rotinaEstudosFora', label: 'Rotina de Estudos em Casa' },
  { key: 'conteudosRevisar', label: 'Conteúdos para Revisar' },
  { key: 'conteudosPrimeiraSemana', label: 'Conteúdo da 1ª Semana' },
  { key: 'mantemRotinaEstudos', label: 'Mantém Rotina?' },
  { key: 'maiorDificuldade', label: 'Maior Dificuldade' },
  { key: 'tempoEstudoPorDia', label: 'Tempo de Estudo por Dia' },
  { key: 'costumaRevisar', label: 'Costuma Revisar?' },
  { key: 'principalObjetivo', label: 'Principal Objetivo' },
  { key: 'cursoOuArea', label: 'Curso ou Área' },
  { key: 'motivoAcompanhamento', label: 'Motivo do Acompanhamento' },
  { key: 'esperaMudancaRotina', label: 'Espera Mudança na Rotina' },
  { key: 'dataNascimento', label: 'Data de Nascimento' },
  { key: 'contractStartDate', label: 'Data de Início do Contrato' },
  { key: 'contractEndDate', label: 'Data de Fim (Previsão) do Contrato' },
  { key: 'contractTotalHours', label: 'Saldo Total de Horas' },
  { key: 'contractNotes', label: 'Aditivos / Informações do Contrato' }
];


function LoginScreen({ setAuth }: { setAuth: any }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loginError, setLoginError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e?: any) => {
    if (e) e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Credenciais inválidas');
      setAuth(data);
      localStorage.setItem('eraia_auth', JSON.stringify(data));
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
          <div className="text-center mb-8 flex flex-col items-center">
            <div className="flex flex-col justify-center select-none cursor-pointer bg-bg-primary p-6 rounded-2xl shadow-sm mb-4 w-full">
              <span className="font-heading font-normal text-4xl tracking-tight text-white flex items-center justify-center leading-none">
                <span className="text-success mr-0.5">e</span>-Raia<span className="text-success">.</span>
              </span>
              <span className="text-[10px] text-white/90 font-sans tracking-[0.2em] leading-tight uppercase mt-1">Educação Guiada</span>
            </div>
            <p className="text-sm text-slate-500">Acesso ao Sistema</p>
          </div>
          <div className="space-y-4">
            {loginError && <p className="text-xs text-danger font-bold text-center">{loginError}</p>}
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                autoComplete="username"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-success/40"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoComplete="current-password"
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-success/40"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-bg-primary text-white font-bold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
              </button>
            </form>
          </div>
        </div>
      </div>
  );
}

function AppContent({ auth, setAuth }: { auth: any, setAuth: any }) {


  const handleLogout = async () => {
    setAuth(null);
    localStorage.removeItem('eraia_auth');
    setActiveTab("dashboard");
  };



  const authFetch = async (url: string, options: any = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${auth?.token}` };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  };

  // DB State
    const [classGroups, setClassGroups] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  
  

  

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [usersState, setUsersState] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  
  const [selectedStudentForProfile, setSelectedStudentForProfile] = useState<Student | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Filter & Selected UI States
  const [selectedDate, setSelectedDate] = useState<string>("2026-07-06"); // Seed date (Monday)
  const [activeTab, setActiveTab] = useState<any>("dashboard");
  const [activeDashboardTab, setActiveDashboardTab] = useState<"agenda" | "financeiro">("agenda");
  React.useEffect(() => {
    if (auth && auth.user?.role !== 'Administrador') {
      if (activeTab === 'dashboard') {
        setActiveTab('bookings');
      }
    }
  }, [auth]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [availableBackups, setAvailableBackups] = useState<any[]>([]);
  const [backupSearchQuery, setBackupSearchQuery] = useState("");
  const [backupComparison, setBackupComparison] = useState<{ id: string, label: string, diff: any } | null>(null);
  const [isProcessingSystem, setIsProcessingSystem] = useState(false);
  const [backupProgress, setBackupProgress] = useState<{ text: string, percentage: number } | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fetchBackups = async () => {
    try {
      const res = await authFetch('/api/system/backups');
      if (res.ok) {
        const data = await res.json();
        data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAvailableBackups(data);
      }
    } catch(e: any) { 
      if (e.message !== "Failed to fetch") console.error('Error fetching backups', e); 
    }
  };

  React.useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async (label = "Backup Automático") => {
    setIsProcessingSystem(true);
    setBackupProgress({ text: "Salvando dados no servidor...", percentage: 10 });
    try {
      const res = await authFetch('/api/system/backup', {
        method: "POST",
        body: JSON.stringify({ label })
      });
      if (res.ok) {
        setBackupProgress({ text: "Estruturando tabelas...", percentage: 50 });
        await res.json();
        await new Promise(r => setTimeout(r, 600)); // Smooth visual effect
        
        setBackupProgress({ text: "Registrando ponto de restauração...", percentage: 80 });
        await fetchBackups();
        
        setBackupProgress({ text: "Backup concluído com sucesso!", percentage: 100 });
        
        setTimeout(() => {
          setBackupProgress(null);
          setIsProcessingSystem(false);
        }, 1500);
      } else { 
        const errorData = await res.json().catch(() => ({}));
        setBackupError(errorData.error || "Erro no servidor ao criar backup.");
        setBackupProgress(null);
        setIsProcessingSystem(false);
      }
    } catch(e: any) {
      setBackupError(e.message || "Erro de conexão ao criar backup.");
      setBackupProgress(null);
      setIsProcessingSystem(false);
    }
  };

  const handleResetSystem = async () => {
    setIsProcessingSystem(true);
    await handleCreateBackup("Backup antes do Reset");
    try {
      const res = await authFetch('/api/system/reset', { method: "POST" });
      if (res.ok) {
        window.location.reload();
      } else {
        toast.error("Erro ao resetar");
      }
    } catch(e) {
      toast.error("Erro ao resetar");
    }
    setIsProcessingSystem(false);
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!confirm("Isso irá substituir todos os dados atuais pelos do backup. Confirmar?")) return;
    setIsProcessingSystem(true);
    try {
      const res = await authFetch('/api/system/restore', {
         method: "POST",
         body: JSON.stringify({ id: backupId })
      });
      if (res.ok) {
         window.location.reload();
      } else {
         const errorData = await res.json().catch(() => ({}));
         setBackupError(errorData.error || "Erro no servidor ao restaurar backup.");
      }
    } catch(e: any) {
      setBackupError(e.message || "Erro de conexão ao restaurar backup.");
    }
    setIsProcessingSystem(false);
  };

  const handleCompareBackup = async (backupId: string, label: string) => {
    setIsProcessingSystem(true);
    try {
      const res = await authFetch(`/api/system/backups/${backupId}/compare`);
      if (res.ok) {
        const diff = await res.json();
        setBackupComparison({ id: backupId, label, diff });
      } else {
        toast.error("Erro ao obter comparação");
      }
    } catch (e) {
      toast.error("Erro ao comparar");
    }
    setIsProcessingSystem(false);
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!confirm("Tem certeza que deseja excluir este backup permanentemente?")) return;
    setIsProcessingSystem(true);
    try {
      await authFetch(`/api/system/backups/${backupId}`, { method: "DELETE" });
      await fetchBackups();
    } catch (e) {
      toast.error("Erro ao excluir backup");
    }
    setIsProcessingSystem(false);
  };

  
  // AI Suggestions Selector State
  const [suggestStudentId, setSuggestStudentId] = useState("");
  const [suggestTeacherId, setSuggestTeacherId] = useState("");
  const [suggestRoomId, setSuggestRoomId] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Manual Booking Form State
  const [showManualBooking, setShowManualBooking] = useState(false);

  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  const handleUpdateBookingDetails = async (id: string, updateData: any) => {
    try {
      const isAdvanced = updateData.editMode || updateData.forceSchedule;
      const url = isAdvanced ? `/api/bookings/advanced/${id}` : `/api/bookings/${id}`;
      const res = await authFetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, ...updateData } : b));
        setEditingBooking(null);
        fetchData();
        return;
      } else {
        const error = await res.json();
        if (res.status === 409 && error.conflicts) {
           throw { conflicts: error.conflicts };
        } else {
           throw new Error(error.error || "Erro ao atualizar aula");
        }
      }
    } catch(err: any) {
      if (err.conflicts) throw err;
      toast.error(err.message || "Erro de conexão");
      throw err;
    }
  };

  const [newBooking, setNewBooking] = useState({
    studentIds: [""],
    teacherId: "",
    roomId: "",
    date: "2026-07-06",
    startTime: "09:00",
    endTime: "10:00"
  });
  

  // Dynamic Creation Modals / Forms States
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const startRecordingApp = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleAudioSubmitApp(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Erro ao acessar microfone", err);
      toast.error("Não foi possível acessar o microfone.");
    }
  };

  const stopRecordingApp = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmitApp = async (audioBlob: Blob) => {
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const fileData = [{ data: base64Data, mimeType: audioBlob.type || 'audio/webm' }];
        
        const response = await authFetch("/api/gemini/extract-student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileData })
        });
        
        if (response.ok) {
          const extractedData = await response.json();
          setStudentForm(prev => ({
            ...prev,
            ...extractedData,
            availability: prev.availability
          }));
        } else {
          toast.error("Falha ao extrair dados do áudio.");
        }
        setIsExtracting(false);
      };
    } catch (err) {
      console.error(err);
      toast.error("Erro ao extrair dados.");
      setIsExtracting(false);
    }
  };

  const [studentForm, setStudentForm] = useState<Partial<Student>>({
    name: "",
    email: "",
    phone: "",
    level: "Intermediário",
    currentSchool: "",
    birthDate: "",
    instagram: "",
    city: "",
    state: "",
    availability: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "13:00" },
      { dayOfWeek: 3, startTime: "13:00", endTime: "18:00" }
    ] as AvailabilitySlot[],
    fixedActivities: [] as string[], profile360: undefined
  });

  // Student Fixed Activity builder states
  const [selectedActivityCategory, setSelectedActivityCategory] = useState<any | null>(null);
  const [activityDetails, setActivityDetails] = useState({
    subName: "",
    days: [] as number[],
    shift: "custom", // manha, tarde, noite, integral, custom
    startTime: "08:00",
    endTime: "13:00"
  });

  const handleSelectActivityCategory = (category: any) => {
    setSelectedActivityCategory(category);
    
    // Sensible defaults based on category
    let initialDays = [1, 2, 3, 4, 5]; // Default weekday (Seg-Sex)
    let initialShift = "custom";
    let initialStart = "14:00";
    let initialEnd = "15:00";
    let initialSubName = category.options && category.options.length > 0 ? category.options[0] : "";

    if (category.id === "escola") {
      initialShift = "manha";
      initialStart = "08:00";
      initialEnd = "13:00";
    } else if (category.id === "idiomas" || category.id === "esportivos") {
      initialDays = [2, 4]; // Tue, Thu
      initialStart = "14:00";
      initialEnd = "15:30";
    } else if (category.id === "academia") {
      initialDays = [1, 3, 5]; // Mon, Wed, Fri
      initialStart = "16:00";
      initialEnd = "17:30";
    } else if (category.id === "terapias") {
      initialDays = [4]; // Thu
      initialStart = "15:00";
      initialEnd = "16:00";
    } else if (category.id === "refeicao") {
      initialDays = [1, 2, 3, 4, 5, 6, 0]; // All days, starting Monday
      initialShift = "custom";
      initialStart = "12:00";
      initialEnd = "13:00";
      initialSubName = "Almoço";
    } else if (category.id === "deslocamento") {
      initialStart = "12:00";
      initialEnd = "12:45";
    }

    setActivityDetails({
      subName: initialSubName,
      days: initialDays,
      shift: initialShift,
      startTime: initialStart,
      endTime: initialEnd
    });
  };

  const handleAddFixedActivity = () => {
    if (!selectedActivityCategory) return;
    if (activityDetails.days.length === 0) {
      toast.error("Por favor, selecione pelo menos um dia da semana.");
      return;
    }

    const customName = activityDetails.subName.trim();
    const dayNamesAbbrev = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const daysStr = activityDetails.days.map(d => dayNamesAbbrev[d]).join(", ");
    
    // Format descriptive string
    const activityStr = `${selectedActivityCategory.icon} ${selectedActivityCategory.name}${customName ? ` (${customName})` : ""} | ${daysStr} das ${activityDetails.startTime} às ${activityDetails.endTime}`;

    setStudentForm({
      ...studentForm,
      fixedActivities: [...(studentForm.fixedActivities || []), activityStr]
    });

    setSelectedActivityCategory(null);
  };

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    email: "",
    subject: "Inglês",
    availability: [
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }
    ] as AvailabilitySlot[],
    hourlyRateIndividual: 0,
    hourlyRateGroup: 0
  });

  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showGuardianModal, setShowGuardianModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [guardianForm, setGuardianForm] = useState<Partial<Guardian>>({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    relationship: "",
    profissao: "",
    financialResponsible: false,
    studentIds: [""]
  });
  const [roomForm, setRoomForm] = useState({
    name: "",
    capacity: 4,
    resourcesStr: "Projetor, Climatização"
  });
  const [entityToDelete, setEntityToDelete] = useState<{type: 'room'|'student'|'teacher'|'guardian', id: string, name: string} | null>(null);
  const [deleteError, setDeleteError] = useState<{message: string, activeBookings?: Booking[]} | null>(null);

  // Load backend data on startup
  
  const fetchGuardians = async () => {
    try {
      if (auth?.user?.id) {
        const firebaseGuardians = await fetchGuardiansFromFirebase(auth.user.id);
        setGuardians(firebaseGuardians as any);
      } else {
        setGuardians([]);
      }
    } catch (err) {
      console.error(err);
      setGuardians([]);
    }
  };

  const openContract = (contract: { data: string, type: string, name: string }) => {
    try {
      const byteCharacters = atob(contract.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contract.type || 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao abrir contrato.');
    }
  };

  const fetchData = async () => {
    try {
      setLoadingData(true);
      
      const backendPromise = Promise.resolve({ bookings: [] }); // Replaced by subscription
      const firebasePromise = Promise.all([
        fetchStudentsFromFirebase(auth.user.id).catch(() => []),
        fetchTeachersFromFirebase(auth.user.id).catch(() => []),
        fetchRoomsFromFirebase(auth.user.id).catch(() => []),
        fetchClassGroupsFromFirebase(auth.user.id).catch(() => []),
        fetchGuardiansFromFirebase(auth.user.id).catch(() => [])
      ]);

      const [data, [firebaseStudents, firebaseTeachers, firebaseRooms, firebaseClassGroups, firebaseGuardians]] = await Promise.all([
        backendPromise,
        firebasePromise
      ]);
      
      setStudents(firebaseStudents as any);
      setTeachers(firebaseTeachers as any[]);
      setRooms(firebaseRooms as any[]);
      setClassGroups(firebaseClassGroups as any[]);
      setGuardians(firebaseGuardians as any[]);

      setBookings(data.bookings || []);
      
      // Select first options as suggestions default
      if (firebaseStudents.length > 0 && !suggestStudentId) {
        setSuggestStudentId(firebaseStudents[0].id);
      }
      if (firebaseTeachers.length > 0 && !suggestTeacherId) {
        setSuggestTeacherId(firebaseTeachers[0].id);
      }
      if (firebaseRooms.length > 0 && !suggestRoomId) {
        setSuggestRoomId(firebaseRooms[0].id);
      }
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setTimeout(fetchData, 2000); // retry
      } else {
        console.error("Error loading initial data:", err);
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Dynamic AI recommendation request
  const handleRequestSuggestion = async () => {
    if (!suggestStudentId || !suggestTeacherId || !suggestRoomId || !selectedDate) {
      setAiError("Por favor, selecione um Aluno, Professor, Sala e Data.");
      return;
    }

    setLoadingAI(true);
    setAiError(null);
    setAiSuggestion(null);

    try {
      const response = await authFetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: suggestStudentId,
          teacherId: suggestTeacherId,
          roomId: suggestRoomId,
          date: selectedDate
        })
      });
      const resData = await response.json();
      if (!response.ok || !resData.success) {
        setAiError(resData.reason || resData.error || "Não foi possível gerar sugestões para a combinação selecionada.");
      } else {
        setAiSuggestion(resData.data);
      }
    } catch (err) {
      setAiError("Erro na conexão com o servidor de Inteligência Artificial.");
    } finally {
      setLoadingAI(false);
    }
  };

  // Handle quick approval of AI suggestion or customized options
  const handleApproveSuggestion = async (slot: { startTime: string; endTime: string }) => {
    toast.error(null);
    
    try {
      const response = await authFetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: suggestStudentId,
          teacherId: suggestTeacherId,
          roomId: suggestRoomId,
          date: selectedDate,
          startTime: slot.startTime,
          endTime: slot.endTime
        })
      });
      const resData = await response.json();

      if (!response.ok) {
        toast.error(resData.error || "Ocorreu um erro ao salvar o agendamento.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.success(`Agendamento de Inteligência Artificial aprovado com sucesso!`);
        setAiSuggestion(null);
        fetchData();
        // Clear message after 4s
        setTimeout(() => toast.success(null), 4000);
      }
    } catch (err) {
      toast.error("Erro ao salvar agendamento.");
    }
  };

  // Handle Manual Booking submission with ACID rules feedback

  // Toggle booking status (Cancel or Re-Confirm)
  const handleUpdateBookingStatus = async (bookingId: string, nextStatus: string, topicFinished?: boolean) => {
    
    try {
      const response = await authFetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, topicFinished })
      });
      const resData = await response.json();

      if (!response.ok) {
        toast.error(`Não foi possível alterar o status: ${resData.error}`);
      } else {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: nextStatus as any } : b));
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao alterar o status do agendamento.");
    }
  };

  // Create Student Handler
  
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsExtracting(true);
    try {
      const files = Array.from(e.target.files) as File[];
      const fileData = await Promise.all(files.map(async (file: File) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Data = (event.target?.result as string).split(",")[1];
            resolve({
              data: base64Data,
              mimeType: file.type
            });
          };
          reader.readAsDataURL(file);
        });
      }));

      const response = await authFetch("/api/gemini/extract-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileData })
      });

      if (response.ok) {
        const extractedData = await response.json();
        setStudentForm(prev => ({
          ...prev,
          ...extractedData,
          availability: prev.availability // Preserve availability
        }));
      } else {
        const errData = await response.json().catch(() => ({}));
        if (errData.error && typeof errData.error === "string" && (errData.error.includes("503") || errData.error.includes("UNAVAILABLE"))) {
          toast.error("A inteligência artificial está com alta demanda no momento. Por favor, aguarde alguns instantes e tente novamente.");
        } else {
          toast.error("Falha ao extrair dados do PDF.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao extrair dados.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudentId) {
        await updateStudentInFirebase(auth.user.id, editingStudentId, studentForm);
        setStudents(prev => prev.map(s => s.id === editingStudentId ? { ...s, ...studentForm } as any : s));
        setShowStudentModal(false);
        setEditingStudentId(null);
        setStudentForm({
          name: "", email: "", phone: "", level: "Intermediário", currentSchool: "", birthDate: "", instagram: "", city: "", state: "",
          availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "13:00" }, { dayOfWeek: 3, startTime: "13:00", endTime: "18:00" }],
          fixedActivities: []
        });
        toast.success("Aluno atualizado com sucesso.");
        fetchData();
        return;
      }
      
      const newStudent = await createStudentInFirebase(auth.user.id, studentForm as any);
      setStudents(prev => [...prev, newStudent as any]);
      setShowStudentModal(false);
      setStudentForm({
        name: "",
        email: "",
        phone: "",
        level: "Intermediário",
        currentSchool: "",
        birthDate: "",
        instagram: "",
        city: "",
        state: "",
        availability: [
          { dayOfWeek: 1, startTime: "08:00", endTime: "13:00" },
          { dayOfWeek: 3, startTime: "13:00", endTime: "18:00" }
        ],
        fixedActivities: []
      });
      toast.success("Aluno cadastrado com sucesso.");
      fetchData();
    } catch (err: any) {
      toast.error("Erro ao cadastrar aluno: " + (err.message || String(err)));
    }
  };

  // Create Teacher Handler
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!auth?.user?.id) {
        toast.error("Usuário não autenticado.");
        return;
      }
      if (editingTeacherId) {
        await updateTeacherInFirebase(auth.user.id, editingTeacherId, teacherForm);
        setTeachers(prev => prev.map(t => t.id === editingTeacherId ? { ...t, ...teacherForm } as any : t));
        setShowTeacherModal(false);
        setEditingTeacherId(null);
        setTeacherForm({ name: "", email: "", subject: "Inglês", availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }], hourlyRateIndividual: 0, hourlyRateGroup: 0 });
        toast.success("Professor atualizado com sucesso.");
        fetchData();
        return;
      }
      
      const newTeacher = await createTeacherInFirebase(auth.user.id, teacherForm);
      setTeachers(prev => [...prev, newTeacher as any]);
      setShowTeacherModal(false);
      setTeacherForm({
        name: "",
        email: "",
        subject: "Inglês",
        availability: [
          { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
          { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }
        ]
      });
      fetchData();
      toast.success("Professor cadastrado com sucesso.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao cadastrar professor: " + (err.message || String(err)));
    }
  };

  // Create Room Handler
  const handleCreateGuardian = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!auth?.user?.id) {
        toast.error("Usuário não autenticado.");
        return;
      }
      const payload = { ...guardianForm };
      if (payload.studentIds) {
        payload.studentIds = payload.studentIds.filter((id) => id && id.trim() !== "");
      }
      if (editingGuardianId) {
        await updateGuardianInFirebase(auth.user.id, editingGuardianId, payload);
        setGuardians(prev => prev.map(g => g.id === editingGuardianId ? { ...g, ...payload } as any : g));
        setShowGuardianModal(false);
        setEditingGuardianId(null);
        setGuardianForm({ name: "", email: "", phone: "", studentIds: [""], financialResponsible: false, address: "" } as any);
        fetchData();
        toast.success("Responsável atualizado com sucesso.");
        return;
      }
      
      const newGuardian = await createGuardianInFirebase(auth.user.id, payload);
      setGuardians(prev => [...prev, newGuardian as any]);
      toast.success("Responsável cadastrado com sucesso.");
      setShowGuardianModal(false);
      setGuardianForm({ name: "", email: "", phone: "", cpf: "", relationship: "", profissao: "", financialResponsible: false, studentIds: [""] } as any);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao cadastrar responsável: " + (err.message || String(err)));
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!auth?.user?.id) {
        toast.error("Usuário não autenticado.");
        return;
      }
      const resources = roomForm.resourcesStr.split(",").map(r => r.trim()).filter(Boolean);
      if (editingRoomId) {
        await updateRoomInFirebase(auth.user.id, editingRoomId, { ...roomForm, resources });
        setRooms(prev => prev.map(r => r.id === editingRoomId ? { ...r, ...roomForm, resources } as any : r));
        setShowRoomModal(false);
        setEditingRoomId(null);
        setRoomForm({ name: "", capacity: 1, type: "Sala Padrão", resourcesStr: "" } as any);
        fetchData();
        toast.success("Sala atualizada com sucesso.");
        return;
      }
      
      const newRoom = await createRoomInFirebase(auth.user.id, {
        name: roomForm.name,
        capacity: Number(roomForm.capacity),
        resources
      });
      setRooms(prev => [...prev, newRoom as any]);
      setShowRoomModal(false);
      setRoomForm({ name: "", capacity: 4, resourcesStr: "Projetor, Climatização" });
      fetchData();
      toast.success("Sala cadastrada com sucesso.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao cadastrar sala: " + (err.message || String(err)));
    }
  };

  // Delete Entity Handler
  const handleDeleteEntity = async () => {
    if (!entityToDelete) return;
    try {
      const typeNames = { room: 'Sala', student: 'Aluno', teacher: 'Professor', guardian: 'Responsável' };
      
      if (entityToDelete.type === 'student') {
        setStudents(prev => prev.filter(s => s.id !== entityToDelete.id));
        await deleteStudentInFirebase(entityToDelete.id);
        toast.success(`${typeNames[entityToDelete.type]} excluído(a) com sucesso.`);
        fetchData();
        setEntityToDelete(null);
        return;
      }
      
      if (entityToDelete.type === 'guardian') {
        setGuardians(prev => prev.filter(g => g.id !== entityToDelete.id));
        await deleteGuardianInFirebase(entityToDelete.id);
        toast.success(`${typeNames[entityToDelete.type]} excluído(a) com sucesso.`);
        fetchData();
        setEntityToDelete(null);
        return;
      }

      if (entityToDelete.type === 'teacher') {
        setTeachers(prev => prev.filter(t => t.id !== entityToDelete.id));
        await deleteTeacherInFirebase(entityToDelete.id);
        toast.success(`${typeNames[entityToDelete.type]} excluído(a) com sucesso.`);
        fetchData();
        setEntityToDelete(null);
        return;
      }

      if (entityToDelete.type === 'room') {
        setRooms(prev => prev.filter(r => r.id !== entityToDelete.id));
        await deleteRoomInFirebase(entityToDelete.id);
        toast.success(`${typeNames[entityToDelete.type]} excluído(a) com sucesso.`);
        fetchData();
        setEntityToDelete(null);
        return;
      }

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao excluir: " + (err.message || String(err)));
      setEntityToDelete(null);
    }
  };

  // Add individual availability slot helper
  const addStudentFormSlot = () => {
    setStudentForm({
      ...studentForm,
      availability: [...studentForm.availability, { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }]
    });
  };

  const removeStudentFormSlot = (idx: number) => {
    setStudentForm({
      ...studentForm,
      availability: studentForm.availability.filter((_, i) => i !== idx)
    });
  };

  const addTeacherFormSlot = () => {
    setTeacherForm({
      ...teacherForm,
      availability: [...teacherForm.availability, { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }]
    });
  };

  const removeTeacherFormSlot = (idx: number) => {
    setTeacherForm({
      ...teacherForm,
      availability: teacherForm.availability.filter((_, i) => i !== idx)
    });
  };

  // Match day names
  const getDayLabel = (dayNum: number): string => {
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days[dayNum];
  };

  // Get localized Day of Week number from YYYY-MM-DD
  const getDayOfWeek = (dateStr: string): number => {
    const date = new Date(dateStr + "T12:00:00");
    return date.getDay();
  };

  // Filter bookings for the selected date
  const activeDateBookings = bookings.filter(b => b.date === selectedDate && b.status === "agendada");

  // Time slots for interactive matrix
  const timeSlots = [
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
    { start: "17:00", end: "18:00" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-bg-secondary text-slate-900 font-sans antialiased">
      {/* Main Header styled to match "Professional Polish" */}
      <header id="app-header" className="h-16 border-b border-white/20 bg-bg-primary flex items-center justify-between px-4 sm:px-6 shrink-0 z-50 shadow-sm relative text-white">
        <div className="flex items-center gap-4">
          <button 
            className="lg:hidden p-2 -ml-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <XCircle className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          {/* e-Raia Logo Component */}
          <div className="flex items-center gap-2 relative">
            <div className="flex flex-col justify-center select-none cursor-pointer relative z-10 pt-1">
              <span className="font-heading font-normal text-3xl tracking-tight text-white flex items-center leading-none">
                <span className="text-success mr-[1px]">e</span>-Raia<span className="text-success font-sans">.</span>
              </span>
              <span className="text-[7.5px] text-white/90 font-sans tracking-[0.25em] leading-tight uppercase mt-0.5 ml-1">Educação Guiada</span>
            </div>
            
            {/* Swoosh element representing the dynamic track line */}
            <svg className="absolute -left-3 -right-6 top-1 bottom-0 w-full h-full text-success z-0 pointer-events-none opacity-80" viewBox="0 0 100 40" preserveAspectRatio="none">
              <path 
                d="M-5,35 Q30,-10 65,25 T110,5" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
              />
            </svg>
          </div>

          <div className="hidden md:flex ml-8 px-3 py-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase rounded-full tracking-wider items-center gap-1 z-10 relative">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(219,235,51,0.8)]"></div>
            SISTEMA ATIVO
          </div>
        </div>

        {/* Header Right Stats */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-6 text-xs text-white">
            <div className="flex flex-col text-right">
              <span className="text-white/80">Total de Aulas</span>
              <span className="font-bold text-white">{bookings.filter(b => b.status === "agendada").length} Ativas</span>
            </div>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex flex-col text-right">
              <span className="text-white/80">Salas de Aula</span>
              <span className="font-bold text-white">{rooms.length} Cadastradas</span>
            </div>
            <div className="h-6 w-px bg-white/20 font-bold"></div>
          </div>

          <div className="flex items-center gap-3 bg-bg-secondary border border-slate-200 p-1.5 rounded-lg">
            <button 
              id="btn-refresh-data"
              onClick={fetchData} 
              title="Sincronizar Banco"
              className="p-1.5 hover:bg-white text-slate-600 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
            </button>
            {auth?.user?.role === 'Administrador' && (
              <button 
                onClick={() => auth?.user?.id && seedDatabaseForTesting(auth.user.id)}
                title="Gerar Dados de Teste"
                className="p-1.5 hover:bg-support-blue hover:text-white text-support-blue rounded transition-colors border border-support-blue/30"
              >
                <Database className="w-4 h-4" />
              </button>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold leading-none">{auth?.user?.name || "Usuário"}</p>
              <p className="text-[10px] text-slate-400 font-mono">{auth?.user?.role || "Acesso Restrito"}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-support-blue/20 text-support-blue font-bold text-xs flex items-center justify-center border border-support-blue/30 uppercase">
              {auth?.user?.name ? auth.user.name.substring(0, 2) : "US"}
            </div>
            <button 
              onClick={handleLogout}
              title="Sair (Trocar de Usuário)"
              className="p-1.5 hover:bg-rose-100 text-danger rounded transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 flex-col lg:flex-row">
        
        {/* Navigation Sidebar */}
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed top-16 bottom-0 left-0 right-0 bg-slate-900/50 z-30 lg:hidden transition-opacity" 
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside id="sidebar-nav" className={`fixed lg:static top-16 lg:top-auto bottom-0 left-0 z-40 w-64 lg:w-60 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col gap-1 overflow-y-auto transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-2 px-3 tracking-widest mt-2 lg:mt-0">
            Navegação
          </div>
          
          {auth?.user?.role === "Administrador" && <button id="tab-dashboard"
            onClick={() => { setActiveTab("dashboard"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "dashboard" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            Painel Inteligente IA
          </button>}
          
          {auth?.user?.role === "Administrador" && <><div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 mt-3 px-3 tracking-widest">
            Inbox & Triagem
          </div>
          <button id="tab-inbox"
            onClick={() => { setActiveTab("inbox"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "inbox" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Inbox className="w-4 h-4 shrink-0" />
            Triagem Alunos
          </button></>}
          
          {auth?.user?.role === "Administrador" && <button 
            onClick={() => { setActiveTab("guardian-inbox"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "guardian-inbox" 
                ? "bg-success/20 text-slate-900 font-bold border-l-2 border-success" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Archive className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">Triagem Responsáveis</span>
          </button>}

          {auth?.user?.role === "Administrador" && <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 mt-3 px-3 tracking-widest">
            Cadastros
          </div>}
          {auth?.user?.role === "Administrador" ? <button
            id="tab-bookings"
            onClick={() => { setActiveTab("bookings"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "bookings" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Todas as Aulas ({bookings.length})
          </button> : <button
            id="tab-bookings"
            onClick={() => { setActiveTab("bookings"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "bookings" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            Minha Agenda ({bookings.filter(b => b.teacherId === auth?.user?.linkedId).length})
          </button>}

          {auth?.user?.role === "Administrador" ? <button
            id="tab-students"
            onClick={() => { setActiveTab("students"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "students" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <UserPen className="w-4 h-4 shrink-0" />
            Alunos ({students.length})
          </button> : <button
            id="tab-students"
            onClick={() => { setActiveTab("students"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "students" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <UserPen className="w-4 h-4 shrink-0" />
            Meus Alunos ({students.filter(s => bookings.some(b => b.teacherId === auth?.user?.linkedId && b.studentId === s.id)).length})
          </button>}
          
          {auth?.user?.role === "Administrador" && <button 
            onClick={() => { setActiveTab("class-groups"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "class-groups" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <UsersRound className="w-4 h-4 shrink-0" />
            Turmas ({classGroups.length})
          </button>}

          {auth?.user?.role === "Administrador" && <button 
            onClick={() => { setActiveTab("guardians"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "guardians" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <FamilyIcon className="w-4 h-4 shrink-0" />
            Responsáveis ({guardians.length})
          </button>}

          {auth?.user?.role === "Administrador" && <button id="tab-teachers"
            onClick={() => { setActiveTab("teachers"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "teachers" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            Professores ({teachers.length})
          </button>}


          {auth?.user?.role === "Professor" && (
            <>
              <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 mt-3 px-3 tracking-widest">
                Minha Conta
              </div>
              <button 
                id="tab-profile"
                onClick={() => { setActiveTab("profile"); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
                  activeTab === "profile" 
                    ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                    : "text-slate-600 hover:bg-bg-secondary"
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                Meu Perfil
              </button>
            </>
          )}
          
          {auth?.user?.role === "Administrador" && <button id="tab-curriculum"
            onClick={() => { setActiveTab("curriculum"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "curriculum" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Target className="w-4 h-4 shrink-0" />
            Planejamentos
          </button>}

          {auth?.user?.role === "Administrador" && <button id="tab-rooms"
            onClick={() => { setActiveTab("rooms"); setIsSidebarOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
              activeTab === "rooms" 
                ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                : "text-slate-600 hover:bg-bg-secondary"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            Salas / Espaços ({rooms.length})
          </button>}
          {auth?.user?.role === "Administrador" && (
            <>
              <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1 mt-3 px-3 tracking-widest">
                Configurações
              </div>
              <button 
                onClick={() => { setActiveTab("backups"); fetchBackups(); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
                  activeTab === "backups" 
                    ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                    : "text-slate-600 hover:bg-bg-secondary"
                }`}
              >
                <Save className="w-4 h-4 shrink-0" />
                Gerenciar Backups
              </button>
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full text-red-600 hover:bg-red-50 mt-1"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                Resetar Sistema
              </button>

              <button 
                id="tab-users"
                onClick={() => { setActiveTab("users"); setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors w-full ${
                  activeTab === "users" 
                    ? "bg-support-blue/10 text-support-blue font-bold border-l-2 border-support-blue" 
                    : "text-slate-600 hover:bg-bg-secondary"
                }`}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                Gestão de Usuários
              </button>
            </>
          )}

          {/* Golden Rules Reminder Card inside Navigation */}
          <div className="hidden lg:block mt-auto p-4 bg-bg-secondary border border-slate-200 rounded-xl">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-support-blue" />
              Prevenção de Conflitos
            </h4>
            <p className="text-[11px] text-slate-600 leading-relaxed space-y-1">
              <span>✓ Unicidade de Aluno</span><br/>
              <span>✓ Unicidade de Professor</span><br/>
              <span>✓ Lock de Sala Física</span>
            </p>
            <div className="mt-2 text-[9px] text-slate-400 font-mono text-center">
              ACID Locks: Habilitado
            </div>
          </div>
        
        
</aside>

        {/* Main Work Station */}
        <main className="flex-1 p-4 sm:p-6 bg-bg-secondary overflow-y-auto">
          
          {/* Main Dashboard Layout */}
          
            {activeTab === "inbox" && (
            <div className="animate-fade-in w-full max-w-7xl mx-auto">
              <DraftInbox onDraftApproved={(newStudent) => {
                if (newStudent) {
                  setStudents(prev => [...prev, newStudent as any]);
                }
                fetchData();
              }} />
            </div>
          )}
          {activeTab === "guardian-inbox" && (
            <div className="animate-fade-in w-full max-w-7xl mx-auto">
              <GuardianInbox auth={auth} students={students} onDraftApproved={(newGuardian) => {
                if (newGuardian) {
                  setGuardians(prev => [...prev, newGuardian as any]);
                }
                fetchGuardians();
              }} />
            </div>
          )}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              {/* Dashboard Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveDashboardTab("agenda")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                    activeDashboardTab === "agenda"
                      ? "bg-support-blue text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Montagem de Agenda
                </button>
                <button
                  onClick={() => setActiveDashboardTab("financeiro")}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                    activeDashboardTab === "financeiro"
                      ? "bg-support-blue text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Indicadores & Financeiro
                </button>
              </div>

              {activeDashboardTab === "financeiro" && auth?.user?.role === "Administrador" && (
                <>
                  <DashboardIndicators bookings={bookings} />
                  <TeacherFinancialSummary teachers={teachers} bookings={bookings} students={students} />
                </>
              )}

              {activeDashboardTab === "agenda" && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Column: AI Matchmaker Input & Response */}
              <div className="xl:col-span-4 flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-support-blue/20 text-support-blue rounded-lg">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">Cérebro da Agenda</h3>
                      <p className="text-xs text-slate-500">Otimização de aulas por Inteligência Artificial</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 bg-bg-secondary p-2.5 rounded-lg border border-slate-100">
                    Selecione os participantes e a data. Nossa IA cruzará as disponibilidades e sugerirá o horário ideal com base nos recursos e perfis pedagógicos.
                  </p>

                  {/* Selectors */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Data da Aula</label>
                      <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Aluno Alvo</label>
                      <select
                        value={suggestStudentId}
                        onChange={(e) => setSuggestStudentId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
                      >
                        <option value="">Selecione um aluno...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Professor Ideal</label>
                      <select
                        value={suggestTeacherId}
                        onChange={(e) => setSuggestTeacherId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
                      >
                        <option value="">Selecione um professor...</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} - {t.subject}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sala / Recurso Físico</label>
                      <select
                        value={suggestRoomId}
                        onChange={(e) => setSuggestRoomId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
                      >
                        <option value="">Selecione uma sala...</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.name} (Cap: {r.capacity})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      id="btn-trigger-ai"
                      onClick={handleRequestSuggestion}
                      disabled={loadingAI || !suggestStudentId || !suggestTeacherId || !suggestRoomId}
                      className="w-full mt-2 bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      {loadingAI ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processando Encaixe...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          Consultar Encaixe Perfeito
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI suggestion response block */}
                {aiError && (
                  <div className="bg-amber-50 border border-support-orange/50 rounded-2xl p-4 text-xs text-amber-800 animate-fade-in flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Aviso de Disponibilidade</p>
                        <p className="text-amber-700 leading-relaxed mt-1">{aiError}</p>
                      </div>
                    </div>
                  </div>
                )}

                {aiSuggestion && (
                  <div id="ai-suggestion-card" className="bg-white border-2 border-support-blue rounded-2xl p-5 shadow-lg animate-fade-in flex flex-col gap-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-support-blue px-2 py-0.5 bg-support-blue/10 rounded uppercase tracking-wide">
                          Proposta Recomendada
                        </span>
                        <h4 className="text-sm font-black text-slate-800 mt-1">Recomendação Inteligente</h4>
                      </div>
                      <div className="flex items-center gap-1.5 bg-success/20 border border-success/50 px-2.5 py-1 rounded-lg">
                        <span className="text-xs font-bold text-slate-900">{aiSuggestion.recommendedSlot.matchScore}%</span>
                        <span className="text-[9px] uppercase font-bold text-success">Fit</span>
                      </div>
                    </div>

                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-support-blue" />
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400">Horário Sugerido</p>
                          <p className="text-sm font-bold text-slate-800">
                            {aiSuggestion.recommendedSlot.startTime} às {aiSuggestion.recommendedSlot.endTime}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">1 Hora</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Justificativa Pedagógica (AI)</p>
                      <p className="text-xs text-slate-600 leading-relaxed bg-support-blue/10/40 p-3 rounded-lg border border-blue-50 italic">
                        "{aiSuggestion.recommendedSlot.reasoning}"
                      </p>
                    </div>

                    {aiSuggestion.insight && (
                      <div className="text-[11px] text-slate-500 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100 flex gap-2">
                        <span className="text-amber-600 font-bold shrink-0">Dica:</span>
                        <span>{aiSuggestion.insight}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApproveSuggestion(aiSuggestion.recommendedSlot)}
                        className="flex-1 bg-success text-slate-900 text-xs font-bold py-2.5 rounded-xl hover:opacity-90 shadow flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar e Agendar
                      </button>
                      <button
                        onClick={() => setAiSuggestion(null)}
                        className="px-3 border border-slate-200 text-slate-500 text-xs py-2.5 rounded-xl hover:bg-bg-secondary"
                      >
                        Recusar
                      </button>
                    </div>

                    {/* Other Candidate options */}
                    {aiSuggestion.allOptions && aiSuggestion.allOptions.length > 1 && (
                      <div className="mt-2 pt-3 border-t border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Alternativas Viáveis</p>
                        <div className="space-y-1.5">
                          {aiSuggestion.allOptions
                            .filter(opt => opt.startTime !== aiSuggestion.recommendedSlot.startTime)
                            .map((opt, i) => (
                              <div key={i} className="flex items-center justify-between text-xs p-2 bg-bg-secondary hover:bg-slate-100 rounded-lg transition-colors border border-slate-200/60">
                                <div>
                                  <span className="font-bold text-slate-700">{opt.startTime} - {opt.endTime}</span>
                                  <span className="text-[10px] text-slate-500 ml-2">Score: {opt.matchScore}%</span>
                                </div>
                                <button
                                  onClick={() => handleApproveSuggestion(opt)}
                                  className="text-[10px] bg-white border border-slate-300 text-slate-700 hover:border-support-blue hover:text-support-blue font-semibold px-2 py-1 rounded"
                                >
                                  Reservar
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Dynamic Scheduler Grid & Matrix */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                
                {/* Real-time matrix and controls */}
                <ScheduleMatrix 
                  bookings={bookings}
                  rooms={rooms}
                  students={students}
                  teachers={teachers}
                  classGroups={classGroups}
                  onAddBooking={(date, startTime, roomId) => {
                    setNewBooking({
                      studentId: suggestStudentId,
                      teacherId: suggestTeacherId,
                      roomId: roomId || rooms[0]?.id || "",
                      date,
                      startTime,
                      endTime: (() => {
                        const [h, m] = startTime.split(':').map(Number);
                        const endH = h + 1;
                        return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                      })()
                    });
                    setShowManualBooking(true);
                  }}
                  onBookingClick={(booking) => {
                    // Could open edit modal
                  }}
                />
                                {/* Simulated database quick diagnostics info */}
                <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 rounded-2xl shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <Sparkles className="w-5 h-5 text-yellow-300" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Pronto para Encaixes Complexos?</h4>
                      <p className="text-xs text-slate-300">
                        Insira novos alunos e professores com disponibilidades distintas para simular a tomada de decisão da IA.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            )}
            </div>
          )}
          

          {/* All Bookings Tab */}
          
            {activeTab === "bookings" && (
            auth?.user?.role === 'Professor' ? (
              <TeacherAgenda bookings={bookings} students={students} rooms={rooms} teacherId={auth?.user?.linkedId} classGroups={classGroups} />
            ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-800">Histórico & Controle de Aulas</h2>
                  <p className="text-xs text-slate-500">Acompanhamento de conflitos e cancelamentos de reservas</p>
                </div>
                {auth?.user?.role === 'Administrador' && (
                <button
                  onClick={() => setShowManualBooking(true)}
                  className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all self-start"
                >
                  <Plus className="w-4 h-4" /> Novo Agendamento
                </button>
                )}
              </div>

              {/* Filter inputs */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase">Filtrar por Data:</span>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg p-1.5 bg-bg-secondary focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Aluno</th>
                      <th className="py-3 px-4">Professor / Especialidade</th>
                      <th className="py-3 px-4">Planejamento / Conteúdo</th>
                      <th className="py-3 px-4">Sala reservada</th>
                      <th className="py-3 px-4">Data & Horário</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {bookings.map((booking) => {
                      const student = students.find(s => s.id === booking.studentId);
                      const classGroup = booking.classGroupId ? classGroups.find(cg => cg.id === booking.classGroupId) : null;
                      const teacher = teachers.find(t => t.id === booking.teacherId);
                      const room = rooms.find(r => r.id === booking.roomId);

                      return (
                        <tr key={booking.id} className="hover:bg-bg-secondary transition-colors">
                          <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                            {booking.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {classGroup ? `${classGroup.name} (Turma)` : student ? student.name : "Aluno Indefinido"}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {classGroup ? 'Nível Misto' : 'Level: ' + (student?.level || '-')}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700">
                            {teacher ? teacher.name : "Professor Indefinido"}
                            <span className="block text-[10px] text-slate-400 font-normal">Matéria: {teacher?.subject}</span>
                          </td>
                          <td className="py-3 px-4">
                            {booking.topic ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-slate-700">{booking.topic}</span>
                                {booking.front && <span className="text-[10px] text-slate-400 font-bold uppercase">{booking.front}</span>}
                                {booking.status.startsWith('realizada') && (
                                  <label className="flex items-center gap-1 mt-1 cursor-pointer">
                                    <input 
                                      type="checkbox" 
                                      checked={booking.topicFinished || false} 
                                      onChange={(e) => handleUpdateBookingStatus(booking.id, booking.status, e.target.checked)}
                                      className="w-3 h-3 text-success"
                                    />
                                    <span className="text-[10px] text-slate-500 font-bold">Conteúdo Finalizado</span>
                                  </label>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Sem Planejamento</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {room ? room.name : "Sala Indefinida"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {booking.date}
                            <span className="block text-[10px] text-slate-500 font-mono font-bold">
                              {booking.startTime} - {booking.endTime}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              (booking.status === "realizada_presenca" || booking.status === "realizada_falta")
                                 ? "bg-success/20 text-slate-900 border border-success/50"
                                 : booking.status === "agendada"
                                 ? "bg-support-blue/10 text-support-blue border border-support-blue/30"
                                 : "bg-danger/10 text-danger border border-danger/30"
                            }`}>
                              {{
                                agendada: "Agendada",
                                realizada_presenca: "Realizada (P)",
                                realizada_falta: "Realizada (F)",
                                desmarcada: "Desmarcada",
                                cancelada: "Cancelada"
                              }[booking.status || "agendada"]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right flex justify-end gap-2">
                            {auth?.user?.role === 'Administrador' && (
                              <select
                                value={booking.status || "agendada"}
                                onChange={(e) => handleUpdateBookingStatus(booking.id, e.target.value)}
                                className="text-xs font-semibold px-2 py-1 rounded border border-slate-200 bg-white"
                              >
                                <option value="agendada">Agendada</option>
                                <option value="realizada_presenca">Realizada (Presença)</option>
                                <option value="realizada_falta">Realizada (Falta)</option>
                                <option value="desmarcada">Desmarcada</option>
                                <option value="cancelada">Cancelada</option>
                              </select>
                            )}
                            <button
                              onClick={() => setEditingBooking(booking)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                            >
                              Editar / Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                          Nenhum agendamento ativo no sistema.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          

          
          {activeTab === "profile" && <UserProfile authFetch={authFetch} user={auth?.user} />}
          {activeTab === "users" && <UsersManagement authFetch={authFetch} usersState={usersState} setUsersState={setUsersState} students={students} teachers={teachers} />}

          {/* Students list tab */}

          
            {activeTab === "class-groups" && (
            <div className="animate-fade-in w-full max-w-7xl mx-auto">
              <ClassGroupsList 
                userId={auth.user.id}
                classGroups={classGroups} 
                setClassGroups={setClassGroups}
                teachers={teachers}
                students={students}
                rooms={rooms}
                fetchData={fetchData}
              />
            </div>
          )}
          {activeTab === "guardians" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Responsáveis</h2>
                  <p className="text-xs text-slate-500">Gestão de pais e responsáveis financeiros</p>
                </div>
                <button
                  onClick={() => {
                    setEditingGuardianId(null);
                    setGuardianForm({ name: "", email: "", phone: "", studentIds: [""], financialResponsible: false, address: "" });
                    setShowGuardianModal(true);
                  }}
                  className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Responsável
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="text-xs uppercase bg-bg-secondary text-slate-500 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">Contato</th>
                      <th className="px-4 py-3">Aluno Vinculado</th>
                      <th className="px-4 py-3">Financeiro?</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guardians.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic text-xs">
                          Nenhum responsável cadastrado. Aprovações na aba de Triagem.
                        </td>
                      </tr>
                    ) : (
                      guardians.map(g => (
                        <tr key={g.id} className="hover:bg-bg-secondary transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 flex items-center gap-2">
                              {g.name}
                              {g.contracts && g.contracts.length > 0 && g.contracts.map((contract, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openContract(contract); }}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-1 rounded flex items-center transition-colors"
                                  title={contract.name}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              ))}
                            </div>
                            <div className="text-xs text-slate-400">{g.relationship}{g.profissao ? ` • ${g.profissao}` : ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-600">{g.email}</div>
                            <div className="text-slate-500">{g.phone}</div>
                          </td>
                          <td className="px-4 py-3 font-medium text-support-blue">
                            {g.studentName || '-'}
                            {(g.studentIds || []).map(sId => {
                              const s = students.find(st => st.id === sId);
                              if (s && s.contract && s.contract.contractNotes) {
                                return (
                                  <div key={s.id} className="mt-2 text-xs font-normal text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">
                                    <span className="font-bold text-slate-700 block mb-1">Aditivos ({s.name}):</span>
                                    {s.contract.contractNotes}
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </td>
                          <td className="px-4 py-3">
                            {g.financialResponsible ? (
                              <span className="bg-success/40 text-slate-900 px-2 py-1 rounded text-[10px] font-bold">SIM</span>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold">NÃO</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            
    <div className="flex gap-2 justify-end">
    <button
      onClick={() => {
        const payload = { ...g };
        if (payload.studentId && (!payload.studentIds || payload.studentIds.length === 0)) {
          payload.studentIds = [payload.studentId];
        } else if (!payload.studentIds || payload.studentIds.length === 0) {
          payload.studentIds = [""];
        }
        setGuardianForm(payload);
        setEditingGuardianId(g.id);
        setShowGuardianModal(true);
      }}
      className="text-support-blue/80 hover:text-support-blue transition-colors"
      title="Editar Responsável"
    >
      <Edit2 className="w-4 h-4" />
    </button>
    <button 
                              onClick={() => setEntityToDelete({type: 'guardian', id: g.id, name: g.name})}
                              className="text-danger/80 hover:text-danger transition-colors"
                              title="Excluir Responsável"
                            >
                              <Trash2 className="w-4 h-4 ml-auto" />
                            </button>
    </div>
  
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === "students" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">{auth?.user?.role === 'Professor' ? 'Meus Alunos' : 'Alunos Cadastrados'}</h2>
                  <p className="text-xs text-slate-500">{auth?.user?.role === 'Professor' ? 'Alunos com os quais você tem ou teve aulas agendadas' : 'Grades de horário e contatos individuais'}</p>
                </div>
                {auth?.user?.role === 'Administrador' && <button
                  onClick={() => setShowStudentModal(true)}
                  className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Aluno
                </button>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(auth?.user?.role === 'Professor' ? students.filter(s => bookings.some(b => b.teacherId === auth?.user?.linkedId && b.studentId === s.id)).sort((a,b) => a.name.localeCompare(b.name)) : students).map((student) => (
                  <div key={student.id} className="border border-slate-200 rounded-xl p-4 hover:border-support-blue/50 transition-colors bg-bg-secondary flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-800">{student.name}</h4>
                          <p className="text-xs text-slate-500">{student.email} • {student.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-support-blue/10 text-support-blue text-[10px] font-bold uppercase rounded">
                            {student.level}
                          </span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded">
                            {student.modality || "Individual"}
                          </span>
                          
    <button
      onClick={() => {
        setStudentForm(student);
        setEditingStudentId(student.id);
        setShowStudentModal(true);
      }}
      className="text-support-blue/80 hover:text-support-blue transition-colors"
      title="Editar Aluno"
    >
      <Edit2 className="w-4 h-4" />
    </button>
    <button 
                            onClick={() => setEntityToDelete({type: 'student', id: student.id, name: student.name})}
                            className="text-danger/80 hover:text-danger transition-colors"
                            title="Excluir Aluno"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
  
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-200/60">
                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Disponibilidades Semanais</p>
                        <div className="flex flex-wrap gap-1.5">
                          {student.availability.map((avail, i) => (
                            <span key={i} className="bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-1 rounded font-medium">
                              {getDayLabel(avail.dayOfWeek)}: {avail.startTime} - {avail.endTime}
                            </span>
                          ))}
                          {student.availability.length === 0 && (
                            <span className="text-slate-400 text-xs italic">Nenhuma disponibilidade informada.</span>
                          )}
                        </div>
                      </div>

                      {student.fixedActivities && student.fixedActivities.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Atividades Fixas Semanais</p>
                          <div className="flex flex-wrap gap-1.5">
                            {student.fixedActivities.map((act, i) => (
                              <span key={i} className="bg-amber-50 border border-support-orange/50 text-amber-800 text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setSelectedStudentForProfile(student)}
                      className="mt-4 w-full bg-slate-100 hover:bg-support-blue/10 text-slate-700 hover:text-support-blue font-bold text-xs py-2 rounded-lg border border-slate-200 transition-colors"
                    >
                      Ver Ficha 360° Completa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          

          {/* Teachers tab */}
          
            {activeTab === "teachers" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800">Docentes / Professores</h2>
                  <p className="text-xs text-slate-500">Disciplinas lecionadas e disponibilidade de grade horária</p>
                </div>
                <button
                  onClick={() => { setEditingTeacherId(null); setTeacherForm({ name: "", email: "", subject: "Inglês", availability: [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" }], hourlyRateIndividual: 0, hourlyRateGroup: 0 }); setShowTeacherModal(true); }}
                  className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Cadastrar Professor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachers.map((teacher) => (
                  <div key={teacher.id} className="border border-slate-200 rounded-xl p-4 hover:border-support-blue/50 transition-colors bg-bg-secondary">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{teacher.name}</h4>
                        <p className="text-xs text-slate-500">{teacher.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center justify-end max-w-[200px]">
                        <div className="flex flex-wrap gap-1 justify-end">
                        {teacher.subject.split(",").map((sub, sIdx) => {
                          const cleanedSub = sub.trim();
                          if (!cleanedSub) return null;
                          return (
                            <span key={sIdx} className="px-2 py-0.5 bg-success/20 border border-success/50 text-slate-900 text-[9px] font-bold uppercase rounded-md whitespace-nowrap">
                              {cleanedSub}
                            </span>
                          );
                        })}
                        </div>
                        
                        <button
                          onClick={() => {
                            setTeacherForm(teacher);
                            setEditingTeacherId(teacher.id);
                            setShowTeacherModal(true);
                          }}
                          className="text-support-blue/80 hover:text-support-blue transition-colors"
                          title="Editar Professor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setEntityToDelete({type: 'teacher', id: teacher.id, name: teacher.name})}
                          className="text-danger/80 hover:text-danger transition-colors"
                          title="Excluir Professor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60">
                      <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">Grade Disponível</p>
                      <div className="flex flex-wrap gap-1.5">
                        {teacher.availability.map((avail, i) => (
                          <span key={i} className="bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-1 rounded font-medium">
                            {getDayLabel(avail.dayOfWeek)}: {avail.startTime} - {avail.endTime}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Calculation Section */}
                    {(() => {
                      let individualMinutes = 0;
                      let groupMinutes = 0;
                      
                      const currentMonthPrefix = new Date().toISOString().substring(0, 7); // YYYY-MM
                      bookings
                        .filter(b => b.teacherId === teacher.id && b.date.startsWith(currentMonthPrefix) && (b.status === "agendada" || b.status === "realizada_presenca" || b.status === "realizada_falta"))
                        .forEach(b => {
                          const student = students.find(s => s.id === b.studentId);
                          const isGroup = student?.modality === "Turma" || student?.modality === "Híbrido";
                          
                          const startParts = b.startTime.split(':');
                          const endParts = b.endTime.split(':');
                          if(startParts.length < 2 || endParts.length < 2) return;
                          
                          const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                          const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
                          let durationMins = endMins - startMins;
                          if (durationMins < 0) durationMins += 24 * 60;
                          
                          if (isGroup) {
                            groupMinutes += durationMins;
                          } else {
                            individualMinutes += durationMins;
                          }
                        });
                        
                        const indClassHours = individualMinutes / 60;
                        const groupClassHours = groupMinutes / 45;
                        const totalReceivable = (indClassHours * (teacher.hourlyRateIndividual || 0)) + (groupClassHours * (teacher.hourlyRateGroup || 0));
                        
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-200/60 bg-slate-50/50 p-2 rounded-lg">
                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Relatório de Horas/Aula (Mês Atual)</p>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <p className="text-[10px] text-slate-500">Aulas Individuais</p>
                                <p className="text-xs font-bold text-slate-800">{indClassHours.toFixed(1)} h/a</p>
                                <p className="text-[10px] text-slate-400">({individualMinutes} min) - R$ {teacher.hourlyRateIndividual || 0}/h</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500">Aulas em Turma</p>
                                <p className="text-xs font-bold text-slate-800">{groupClassHours.toFixed(1)} h/a</p>
                                <p className="text-[10px] text-slate-400">({groupMinutes} min) - R$ {teacher.hourlyRateGroup || 0}/h</p>
                              </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Estimado</span>
                              <span className="text-sm font-black text-success">
                                R$ {totalReceivable.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
          

          {/* Rooms List */}
          
            

        {activeTab === "rooms" && (
          <div className="p-4 md:p-8 custom-scrollbar">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Salas e Espaços</h2>
                <p className="text-sm text-slate-500 mt-1">Gerencie os ambientes disponíveis.</p>
              </div>
              <button 
                onClick={() => {
                  setEditingRoomId(null);
                  setShowRoomModal(true);
                }}
                className="bg-support-blue hover:opacity-90 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all shadow-md shadow-support-blue/20"
              >
                <Plus className="w-4 h-4" />
                Nova Sala
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rooms.map(room => (
                <div key={room.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800">{room.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">Capacidade: {room.capacity} pessoas</p>
                    </div>
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingRoomId(room.id);
                          setShowRoomModal(true);
                        }}
                        className="text-support-blue/80 hover:text-support-blue transition-colors"
                        title="Editar Sala"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setEntityToDelete({type: 'room', id: room.id, name: room.name})}
                        className="text-danger/80 hover:text-danger transition-colors"
                        title="Excluir Sala"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Resources / Equipment */}
                  <div className="flex flex-wrap gap-1 mt-3">
                    {room.resources.map((res, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                        {res}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "curriculum" && (
          <CurriculumPlanner auth={auth} />
        )}


        {isResetModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-red-50">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-900">Resetar Sistema</h3>
                  <p className="text-sm text-red-600 font-medium">Atenção! Ação destrutiva.</p>
                </div>
              </div>
              <div className="p-6 text-sm text-slate-600">
                <p className="mb-4">
                  Você está prestes a apagar <strong>todos os dados do sistema</strong> (alunos, turmas, professores, salas, agendamentos).
                </p>
                <p className="mb-4">
                  Um backup será gerado automaticamente antes do reset. Mas certifique-se de que realmente deseja continuar.
                </p>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isProcessingSystem}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 justify-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleResetSystem}
                  disabled={isProcessingSystem}
                  className="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessingSystem ? "Aguarde..." : "Confirmar Reset"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "backups" && (
          <div className="p-4 sm:p-8 animate-fade-in max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex flex-col gap-6 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Save className="w-6 h-6 text-support-blue" />
                    Gerenciador de Backups
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">Crie e restaure pontos de restauração do sistema. ({availableBackups.length} salvos)</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col flex-1">
              
              <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <p className="text-xs sm:text-sm text-slate-600">
                  O backup salva todas as tabelas do banco de dados (alunos, turmas, agendamentos, etc).
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <label className={`w-full sm:w-auto justify-center px-3 py-2 sm:px-4 sm:py-2 bg-white border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${isProcessingSystem ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}>
                  {isProcessingSystem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Importar Arquivo
                  <input type="file" accept=".json" disabled={isProcessingSystem} className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      try {
                        const content = JSON.parse(ev.target?.result as string);
                        if (!confirm("Tem certeza que deseja restaurar o sistema a partir deste arquivo? Isso substituirá todos os dados atuais.")) return;
                        setIsProcessingSystem(true);
                        const res = await authFetch('/api/system/restore', {
                           method: "POST",
                           body: JSON.stringify({ data: content.data || content })
                        });
                        if (res.ok) {
                          window.location.reload();
                        } else {
                          const errorData = await res.json().catch(() => ({}));
                          setBackupError(errorData.error || "Erro no servidor ao restaurar arquivo.");
                        }
                      } catch (err: any) {
                        setBackupError(err.message || "Arquivo inválido ou erro de conexão.");
                      }
                      setIsProcessingSystem(false);
                    };
                    reader.readAsText(file);
                  }} />
                </label>
                <button
                  onClick={() => handleCreateBackup()}
                  disabled={isProcessingSystem}
                  className="w-full sm:w-auto justify-center px-3 py-2 sm:px-4 sm:py-2 bg-support-blue hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingSystem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isProcessingSystem ? "Aguarde..." : "Criar Backup"}
                </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {backupProgress && (
                  <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-6 text-center animate-fade-in flex flex-col items-center justify-center">
                    {backupProgress.percentage < 100 ? (
                      <Loader2 className="w-8 h-8 animate-spin text-support-blue mb-4" />
                    ) : (
                      <Save className="w-8 h-8 text-green-500 mb-4" />
                    )}
                    <p className="text-sm font-bold text-slate-800 mb-2">{backupProgress.text}</p>
                    <div className="w-full max-w-sm h-2 bg-blue-100 rounded-full overflow-hidden">
                       <div className={`h-full transition-all duration-500 ease-out ${backupProgress.percentage === 100 ? 'bg-green-500' : 'bg-support-blue'}`} style={{ width: `${backupProgress.percentage}%` }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">{backupProgress.percentage}%</p>
                  </div>
                )}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar backups por nome ou data..."
                      value={backupSearchQuery}
                      onChange={(e) => setBackupSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-support-blue focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {availableBackups.filter(b => 
                  (b.label || '').toLowerCase().includes(backupSearchQuery.toLowerCase()) || 
                  new Date(b.timestamp).toLocaleString('pt-BR').includes(backupSearchQuery)
                ).length === 0 ? (
                   <div className="text-center py-8 text-slate-500 text-sm">
                     Nenhum backup encontrado.
                   </div>
                ) : (
                  <div className="space-y-3">
                    {availableBackups.filter(b => 
                      (b.label || '').toLowerCase().includes(backupSearchQuery.toLowerCase()) || 
                      new Date(b.timestamp).toLocaleString('pt-BR').includes(backupSearchQuery)
                    ).map((b, idx, arr) => {
                      const isMostRecent = availableBackups.length > 0 && b.id === availableBackups[0].id;
                      return (
                      <div key={b.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white border ${isMostRecent ? 'border-support-blue ring-1 ring-support-blue/30' : 'border-slate-200'} rounded-xl hover:border-support-blue/30 transition-colors gap-3 sm:gap-0`}>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{b.label}</h4>
                            {isMostRecent && (
                              <span className="px-2 py-0.5 bg-blue-50 text-support-blue text-[10px] font-bold rounded-full uppercase tracking-wider border border-blue-100">
                                Mais Recente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Criado em: {new Date(b.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
                          <button
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = `/api/system/backups/download/${b.id}`;
                              const authDataStr = localStorage.getItem('eraia_auth'); const authHeader = authDataStr ? JSON.parse(authDataStr).token : null;
                              if (authHeader) {
                                // If using cookie auth, simple href works. But since we use Bearer token in local storage, we must fetch and then download
                                fetch(`/api/system/backups/download/${b.id}`, { headers: { Authorization: `Bearer ${authHeader}` } })
                                  .then(res => res.blob())
                                  .then(blob => {
                                     const url = URL.createObjectURL(blob);
                                     a.href = url;
                                     a.download = `${b.id}.json`;
                                     a.click();
                                     URL.revokeObjectURL(url);
                                  });
                              }
                            }}
                            disabled={isProcessingSystem}
                            className="p-1.5 text-slate-500 hover:text-support-blue hover:bg-blue-50 rounded-lg transition-colors"
                            title="Baixar Backup"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCompareBackup(b.id, b.label)}
                            disabled={isProcessingSystem}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            Comparar
                          </button>
                          <button
                            onClick={() => handleRestoreBackup(b.id)}
                            disabled={isProcessingSystem}
                            className="px-3 py-1.5 text-xs font-bold text-support-blue bg-support-blue/10 rounded-lg hover:bg-support-blue hover:text-white transition-colors"
                          >
                            Restaurar
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(b.id)}
                            disabled={isProcessingSystem}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir Backup"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>
        )}

        </main>

      </div>

      {backupComparison && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Comparar: {backupComparison.label}
              </h3>
              <button onClick={() => setBackupComparison(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <div>Tabela</div>
                <div className="text-center">Atual</div>
                <div className="text-center text-support-blue">No Backup</div>
              </div>
              {Object.entries(backupComparison.diff).map(([key, data]: [string, any]) => {
                const isDifferent = data.current !== data.backup;
                return (
                  <div key={key} className={`grid grid-cols-3 py-2 border-b ${isDifferent ? 'border-amber-100 bg-amber-50/30' : 'border-slate-100'}`}>
                    <div className="text-sm font-bold text-slate-700">{data.label}</div>
                    <div className="text-sm text-center font-medium text-slate-900">{data.current}</div>
                    <div className={`text-sm text-center font-bold ${isDifferent ? 'text-amber-600' : 'text-slate-500'}`}>
                      {data.backup}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setBackupComparison(null)}
                className="px-4 py-2 font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setBackupComparison(null);
                  handleRestoreBackup(backupComparison.id);
                }}
                className="px-4 py-2 font-bold text-white bg-support-blue hover:bg-blue-700 rounded-xl transition-colors"
              >
                Restaurar este Backup
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Manual Booking Modal */}
      
      {editingBooking && (
        <BookingEditModal
          booking={editingBooking}
          students={students}
          teachers={teachers}
          rooms={rooms}
          userRole={auth?.user?.role || 'Aluno'}
          onClose={() => setEditingBooking(null)}
          onSave={handleUpdateBookingDetails}
        />
      )}

      {showManualBooking && (
        <ManualBookingModal
          students={students}
          teachers={teachers}
          rooms={rooms}
          classGroups={classGroups}
          onClose={() => setShowManualBooking(false)}
          onSuccess={(newBookings) => {
            fetchData();
            setShowManualBooking(false);
          }}
          auth={auth}
          authFetch={authFetch}
        />
      )}
      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Novo Aluno</h3>
                <p className="text-xs text-slate-400">Atribuição de nível, atividades fixas e cadastro rápido de disponibilidade semanal</p>
              </div>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  <span className="text-support-purple">✨</span> e-RaIA: Preenchimento Automático
                </h4>
                <p className="text-xs text-indigo-700/70 mt-1">
                  Importe históricos, laudos em PDF ou áudios para gerar o cadastro e a Ficha 360º.
                </p>
              </div>
              
              <div className="flex gap-2 items-center">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecordingApp}
                    className="bg-danger/100 hover:bg-danger text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 animate-pulse"
                  >
                    <Square className="w-3.5 h-3.5" /> Gravando... (Parar)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecordingApp}
                    disabled={isExtracting}
                    className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                  >
                    <Mic className="w-3.5 h-3.5" /> Gravar Áudio
                  </button>
                )}
                <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                  {isExtracting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analisando...
                    </span>
                  ) : (
                    "Importar PDF/Áudio"
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept=".pdf,application/pdf,audio/*" 
                    onChange={handlePdfUpload}
                    disabled={isExtracting}
                  />
                </label>
              </div>

            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4 pt-4">
              <div className="bg-bg-secondary border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> Informações da Triagem (Ficha 360)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
                  {DRAFT_FIELDS.map(field => (
                    <div key={field.key}>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{field.label}</label>
                      {field.key === 'modality' ? (
                        <select
                          required
                          value={(studentForm as any)[field.key] || 'Individual'}
                          onChange={(e) => setStudentForm({ ...studentForm, [field.key]: e.target.value })}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        >
                          <option value="Individual">Individual</option>
                          <option value="Turma">Turma</option>
                          <option value="Híbrido">Híbrido (Turma e Individual)</option>
                        </select>
                      ) : (
                        <input 
                          type={field.key.includes('Data') || field.key.includes('Date') || field.key.includes('Nascimento') ? 'date' : field.key.includes('Hours') ? 'number' : 'text'}
                          required={field.key === 'nomeCompleto' || field.key === 'email'}
                          value={(studentForm as any)[field.key] || ''}
                          onChange={(e) => setStudentForm({ ...studentForm, [field.key]: e.target.value })}
                          placeholder={field.label}
                          className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Student Fixed Activities selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Atividades Fixas Semanais</label>
                
                {/* 1. Saved fixed activities list */}
                {studentForm.fixedActivities && studentForm.fixedActivities.length > 0 && (
                  <div className="mb-3 bg-amber-50/40 border border-support-orange/50/50 p-2.5 rounded-xl space-y-1.5 animate-fade-in">
                    <span className="block text-[10px] font-black text-amber-800 uppercase">Atividades Cadastradas para o Estudante:</span>
                    <div className="flex flex-col gap-1">
                      {studentForm.fixedActivities.map((actStr, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-support-orange/50/60 shadow-2xs">
                          <span className="text-xs text-slate-700 font-semibold">{actStr}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setStudentForm({
                                ...studentForm,
                                fixedActivities: studentForm.fixedActivities.filter((_, i) => i !== idx)
                              });
                            }}
                            className="text-slate-400 hover:text-danger transition-colors p-0.5"
                            title="Remover Atividade"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Interactive grid selector of categories */}
                <div className="bg-bg-secondary border border-slate-200 p-3 rounded-xl mb-4">
                  <span className="block text-[10px] font-black text-slate-500 uppercase mb-2">Clique em uma Categoria para Configurar Dias e Horários:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ACTIVITY_CATEGORIES.map((cat) => {
                      const isConfiguring = selectedActivityCategory?.id === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectActivityCategory(cat)}
                          className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between h-20 ${
                            isConfiguring
                              ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{cat.icon}</span>
                            <span className={`text-[11px] font-black leading-tight ${isConfiguring ? "text-white" : "text-slate-800"}`}>
                              {cat.name}
                            </span>
                          </div>
                          <span className={`text-[9px] leading-tight ${isConfiguring ? "text-amber-100" : "text-slate-400 font-semibold"}`}>
                            {cat.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* 3. Sub-form for configuring the selected category */}
                  {selectedActivityCategory && (
                    <div className="mt-3.5 bg-amber-50/80 border-2 border-amber-300/80 p-3.5 rounded-xl animate-scale-up space-y-3 shadow-xs">
                      <div className="flex justify-between items-center pb-1.5 border-b border-support-orange/50/60">
                        <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1.5">
                          <span className="text-base">{selectedActivityCategory.icon}</span>
                          Configurar: {selectedActivityCategory.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedActivityCategory(null)}
                          className="text-[10px] text-amber-700 hover:text-amber-900 font-extrabold"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Name / Options row */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase">Qual o evento/atividade específica?</label>
                        <input
                          type="text"
                          value={activityDetails.subName}
                          onChange={(e) => setActivityDetails({ ...activityDetails, subName: e.target.value })}
                          placeholder={`Ex: ${selectedActivityCategory.options[0]}`}
                          className="w-full text-xs border border-support-orange/50 rounded-lg p-2 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold text-slate-800"
                        />
                        {selectedActivityCategory.options && selectedActivityCategory.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {selectedActivityCategory.options.map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setActivityDetails({ ...activityDetails, subName: opt })}
                                className={`text-[9px] px-2 py-0.5 rounded border transition-all ${
                                  activityDetails.subName === opt
                                    ? "bg-amber-600 border-amber-600 text-white font-bold"
                                    : "bg-white border-amber-100 text-amber-800 hover:bg-amber-100/50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Day Toggles */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase">Em quais dias ocorre?</label>
                        <div className="flex gap-1 justify-between bg-white p-1.5 rounded-lg border border-support-orange/50">
                          {[
                            { num: 1, label: "S" },
                            { num: 2, label: "T" },
                            { num: 3, label: "Q" },
                            { num: 4, label: "Q" },
                            { num: 5, label: "S" },
                            { num: 6, label: "S" },
                            { num: 0, label: "D" }
                          ].map((d) => {
                            const isDaySelected = activityDetails.days.includes(d.num);
                            const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                            return (
                              <button
                                key={d.num}
                                type="button"
                                title={dayNames[d.num]}
                                onClick={() => {
                                  let newDays;
                                  if (isDaySelected) {
                                    newDays = activityDetails.days.filter(item => item !== d.num);
                                  } else {
                                    newDays = [...activityDetails.days, d.num].sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
                                  }
                                  setActivityDetails({ ...activityDetails, days: newDays });
                                }}
                                className={`w-8 h-8 rounded-full text-xs font-black transition-all flex items-center justify-center ${
                                  isDaySelected
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Slot Setup */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-amber-800 uppercase">Qual o horário/turno?</label>
                        
                        {/* Quick Turno Presets */}
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            { label: "🌅 Manhã", start: "08:00", end: "13:00", key: "manha" },
                            { label: "🌇 Tarde", start: "13:00", end: "18:00", key: "tarde" },
                            { label: "🌃 Noite", start: "18:00", end: "21:00", key: "noite" },
                            { label: "⚡ Integral", start: "08:00", end: "18:00", key: "integral" }
                          ].map((p) => {
                            const isPresetActive = activityDetails.shift === p.key;
                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => {
                                  setActivityDetails({
                                    ...activityDetails,
                                    shift: p.key,
                                    startTime: p.start,
                                    endTime: p.end
                                  });
                                }}
                                className={`text-[10px] py-1.5 rounded-lg border transition-all font-bold ${
                                  isPresetActive
                                    ? "bg-amber-600 border-amber-600 text-white"
                                    : "bg-white border-amber-100 text-amber-800 hover:bg-white/80"
                                }`}
                              >
                                {p.label} <span className="text-[8px] opacity-80 block font-mono font-medium">{p.start} - {p.end}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom hours setup */}
                        <div className="bg-white p-2 rounded-lg border border-support-orange/50 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActivityDetails({ ...activityDetails, shift: "custom" })}
                            className={`text-[10px] px-2.5 py-1 rounded font-bold border transition-all ${
                              activityDetails.shift === "custom"
                                ? "bg-amber-600 border-amber-600 text-white"
                                : "bg-bg-secondary border-slate-200 text-slate-500"
                            }`}
                          >
                            Customizar
                          </button>
                          
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={activityDetails.startTime}
                              onChange={(e) => setActivityDetails({ ...activityDetails, shift: "custom", startTime: e.target.value })}
                              placeholder="08:00"
                              className="w-14 border border-slate-200 rounded p-1 text-center text-xs font-mono font-bold"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                              type="text"
                              value={activityDetails.endTime}
                              onChange={(e) => setActivityDetails({ ...activityDetails, shift: "custom", endTime: e.target.value })}
                              placeholder="13:00"
                              className="w-14 border border-slate-200 rounded p-1 text-center text-xs font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddFixedActivity}
                        className="w-full bg-amber-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-xs"
                      >
                        ✓ Adicionar Atividade Fixa
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Weekly Quick Grid Time-Block Matrix for Students */}
              <div className="pt-2 border-t border-slate-100">
                <div className="bg-bg-secondary border border-slate-200 rounded-xl p-3 mb-4">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-support-blue" />
                      Entrada Rápida da Grade Semanal do Aluno
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentForm({ ...studentForm, availability: [] })}
                      className="text-[10px] text-danger font-extrabold hover:underline"
                    >
                      Limpar Tudo
                    </button>
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="mb-3">
                    <span className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Atalhos de Disponibilidade Comuns (Segunda a Sexta):</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const morningSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "08:00",
                            endTime: "13:00"
                          }));
                          setStudentForm({ ...studentForm, availability: morningSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">🌅</span>
                        <span>Todas as Manhãs</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">08:00 - 13:00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const afternoonSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "13:00",
                            endTime: "18:00"
                          }));
                          setStudentForm({ ...studentForm, availability: afternoonSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">🌇</span>
                        <span>Todas as Tardes</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">13:00 - 18:00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fullSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "08:00",
                            endTime: "18:00"
                          }));
                          setStudentForm({ ...studentForm, availability: fullSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">⚡</span>
                        <span>Período Integral</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">08:00 - 18:00</span>
                      </button>
                    </div>
                  </div>

                  {/* Day matrix selection */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Alternar por Dia & Turno (Clique para ligar/desligar):</span>
                    <div className="space-y-1">
                      {[
                        { num: 1, label: "Segunda" },
                        { num: 2, label: "Terça" },
                        { num: 3, label: "Quarta" },
                        { num: 4, label: "Quinta" },
                        { num: 5, label: "Sexta" },
                        { num: 6, label: "Sábado" },
                        { num: 0, label: "Domingo" }
                      ].map((day) => {
                        return (
                          <div key={day.num} className="grid grid-cols-4 gap-1.5 items-center bg-white p-1 rounded border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700 pl-1.5">{day.label}</span>
                            {[
                              { label: "Manhã", start: "08:00", end: "13:00" },
                              { label: "Tarde", start: "13:00", end: "18:00" },
                              { label: "Noite", start: "18:00", end: "21:00" }
                            ].map((shift) => {
                              const isActive = studentForm.availability.some(
                                (avail) => avail.dayOfWeek === day.num && avail.startTime === shift.start && avail.endTime === shift.end
                              );
                              return (
                                <button
                                  key={shift.label}
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      // Remove
                                      setStudentForm({
                                        ...studentForm,
                                        availability: studentForm.availability.filter(
                                          (avail) => !(avail.dayOfWeek === day.num && avail.startTime === shift.start && avail.endTime === shift.end)
                                        )
                                      });
                                    } else {
                                      // Add
                                      setStudentForm({
                                        ...studentForm,
                                        availability: [...studentForm.availability, {
                                          dayOfWeek: day.num,
                                          startTime: shift.start,
                                          endTime: shift.end
                                        }]
                                      });
                                    }
                                  }}
                                  className={`text-[9px] py-1 rounded font-extrabold text-center border transition-all ${
                                    isActive
                                      ? "bg-success border-success text-slate-900 shadow-2xs"
                                      : "bg-bg-secondary border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {shift.label}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Student Availability fine tuning */}
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Ajuste Fino de Horários Cadastrados</label>
                  <button 
                    type="button" 
                    onClick={addStudentFormSlot}
                    className="text-support-blue text-[10px] font-black hover:underline"
                  >
                    + Novo Horário Personalizado
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {studentForm.availability.map((avail, idx) => (
                    <div key={idx} className="flex gap-1.5 items-center bg-bg-secondary p-2 rounded border border-slate-200">
                      <select
                        value={avail.dayOfWeek}
                        onChange={(e) => {
                          const updated = [...studentForm.availability];
                          updated[idx].dayOfWeek = Number(e.target.value);
                          setStudentForm({ ...studentForm, availability: updated });
                        }}
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white flex-1 font-semibold"
                      >
                        <option value={1}>Segunda</option>
                        <option value={2}>Terça</option>
                        <option value={3}>Quarta</option>
                        <option value={4}>Quinta</option>
                        <option value={5}>Sexta</option>
                        <option value={6}>Sábado</option>
                        <option value={0}>Domingo</option>
                      </select>
                      <input 
                        type="text"
                        value={avail.startTime}
                        onChange={(e) => {
                          const updated = [...studentForm.availability];
                          updated[idx].startTime = e.target.value;
                          setStudentForm({ ...studentForm, availability: updated });
                        }}
                        placeholder="08:00"
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white w-14 text-center font-mono font-bold"
                      />
                      <span className="text-slate-400">-</span>
                      <input 
                        type="text"
                        value={avail.endTime}
                        onChange={(e) => {
                          const updated = [...studentForm.availability];
                          updated[idx].endTime = e.target.value;
                          setStudentForm({ ...studentForm, availability: updated });
                        }}
                        placeholder="13:00"
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white w-14 text-center font-mono font-bold"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeStudentFormSlot(idx)}
                        className="text-danger p-1 hover:bg-danger/10 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {studentForm.availability.length === 0 && (
                    <p className="text-xs text-slate-400 text-center italic py-2">Nenhum horário selecionado ainda.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-success text-slate-900 text-xs font-bold py-2.5 rounded-lg hover:opacity-90 shadow-md">
                  Salvar
                </button>
                <button type="button" onClick={() => setShowStudentModal(false)} className="px-4 border border-slate-200 text-slate-500 text-xs py-2.5 rounded-lg hover:bg-bg-secondary">
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">{editingTeacherId ? "Editar Professor" : "Novo Professor"}</h3>
                <p className="text-xs text-slate-400">Atribuição de múltiplas matérias e cadastro rápido de disponibilidade semanal</p>
              </div>
              <button onClick={() => setShowTeacherModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nome do Professor</label>
                  <input 
                    type="text"
                    required
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    placeholder="Ex: Prof. Carlos Rocha"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Email</label>
                  <input 
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder="professor@escola.com"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                  />
                </div>
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valor Hora/Aula (Individual)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={teacherForm.hourlyRateIndividual || 0}
                    onChange={(e) => setTeacherForm({ ...teacherForm, hourlyRateIndividual: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Valor Hora/Aula (Turma)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={teacherForm.hourlyRateGroup || 0}
                    onChange={(e) => setTeacherForm({ ...teacherForm, hourlyRateGroup: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Especialidades / Matérias Selecionadas</label>
                <input 
                  type="text"
                  required
                  value={teacherForm.subject}
                  onChange={(e) => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                  placeholder="Inglês, Física, Matemática..."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary font-medium"
                />
                
                <div className="mt-2 bg-bg-secondary border border-slate-200/80 p-2.5 rounded-lg">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Clique rápido para alternar matérias:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SUBJECTS.map((subj) => {
                      const currentList = teacherForm.subject
                        ? teacherForm.subject.split(",").map(s => s.trim()).filter(Boolean)
                        : [];
                      const isSelected = currentList.includes(subj);
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => {
                            let newList;
                            if (isSelected) {
                              newList = currentList.filter(s => s !== subj);
                            } else {
                              newList = [...currentList, subj];
                            }
                            setTeacherForm({
                              ...teacherForm,
                              subject: newList.join(", ")
                            });
                          }}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-support-blue border-support-blue text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          {subj}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Weekly Quick Grid Time-Block Matrix */}
              <div className="pt-2 border-t border-slate-100">
                <div className="bg-bg-secondary border border-slate-200 rounded-xl p-3 mb-4">
                  <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-200">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-support-blue" />
                      Entrada Rápida da Grade Semanal
                    </span>
                    <button
                      type="button"
                      onClick={() => setTeacherForm({ ...teacherForm, availability: [] })}
                      className="text-[10px] text-danger font-extrabold hover:underline"
                    >
                      Limpar Tudo
                    </button>
                  </div>

                  {/* Preset Shortcuts */}
                  <div className="mb-3">
                    <span className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Atalhos Semanais Úteis (Segunda a Sexta):</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const morningSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "08:00",
                            endTime: "13:00"
                          }));
                          setTeacherForm({ ...teacherForm, availability: morningSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">🌅</span>
                        <span>Todas as Manhãs</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">08:00 - 13:00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const afternoonSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "13:00",
                            endTime: "18:00"
                          }));
                          setTeacherForm({ ...teacherForm, availability: afternoonSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">🌇</span>
                        <span>Todas as Tardes</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">13:00 - 18:00</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const fullSlots = [1, 2, 3, 4, 5].map(day => ({
                            dayOfWeek: day,
                            startTime: "08:00",
                            endTime: "18:00"
                          }));
                          setTeacherForm({ ...teacherForm, availability: fullSlots });
                        }}
                        className="bg-white hover:bg-support-blue/10 border border-slate-200 hover:border-support-blue/50 text-[10px] py-1.5 px-2 rounded-lg font-bold text-slate-700 flex flex-col items-center justify-center transition-colors shadow-2xs"
                      >
                        <span className="text-base mb-0.5">⚡</span>
                        <span>Período Integral</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">08:00 - 18:00</span>
                      </button>
                    </div>
                  </div>

                  {/* Day matrix selection */}
                  <div>
                    <span className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Alternar por Dia & Turno (Clique para ligar/desligar):</span>
                    <div className="space-y-1">
                      {[
                        { num: 1, label: "Segunda" },
                        { num: 2, label: "Terça" },
                        { num: 3, label: "Quarta" },
                        { num: 4, label: "Quinta" },
                        { num: 5, label: "Sexta" },
                        { num: 6, label: "Sábado" },
                        { num: 0, label: "Domingo" }
                      ].map((day) => {
                        return (
                          <div key={day.num} className="grid grid-cols-4 gap-1.5 items-center bg-white p-1 rounded border border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700 pl-1.5">{day.label}</span>
                            {[
                              { label: "Manhã", start: "08:00", end: "13:00" },
                              { label: "Tarde", start: "13:00", end: "18:00" },
                              { label: "Noite", start: "18:00", end: "21:00" }
                            ].map((shift) => {
                              const isActive = teacherForm.availability.some(
                                (avail) => avail.dayOfWeek === day.num && avail.startTime === shift.start && avail.endTime === shift.end
                              );
                              return (
                                <button
                                  key={shift.label}
                                  type="button"
                                  onClick={() => {
                                    if (isActive) {
                                      // Remove
                                      setTeacherForm({
                                        ...teacherForm,
                                        availability: teacherForm.availability.filter(
                                          (avail) => !(avail.dayOfWeek === day.num && avail.startTime === shift.start && avail.endTime === shift.end)
                                        )
                                      });
                                    } else {
                                      // Add
                                      setTeacherForm({
                                        ...teacherForm,
                                        availability: [...teacherForm.availability, {
                                          dayOfWeek: day.num,
                                          startTime: shift.start,
                                          endTime: shift.end
                                        }]
                                      });
                                    }
                                  }}
                                  className={`text-[9px] py-1 rounded font-extrabold text-center border transition-all ${
                                    isActive
                                      ? "bg-success border-success text-slate-900 shadow-2xs"
                                      : "bg-bg-secondary border-slate-200 text-slate-500 hover:bg-slate-100"
                                  }`}
                                >
                                  {shift.label}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Teacher Availability fine tuning */}
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Ajuste Fino de Horários Cadastrados</label>
                  <button 
                    type="button" 
                    onClick={addTeacherFormSlot}
                    className="text-support-blue text-[10px] font-bold hover:underline flex items-center gap-0.5"
                  >
                    + Novo Horário Personalizado
                  </button>
                </div>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {teacherForm.availability.map((avail, idx) => (
                    <div key={idx} className="flex gap-1.5 items-center bg-bg-secondary p-2 rounded border border-slate-200">
                      <select
                        value={avail.dayOfWeek}
                        onChange={(e) => {
                          const updated = [...teacherForm.availability];
                          updated[idx].dayOfWeek = Number(e.target.value);
                          setTeacherForm({ ...teacherForm, availability: updated });
                        }}
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white flex-1 font-semibold"
                      >
                        <option value={1}>Segunda</option>
                        <option value={2}>Terça</option>
                        <option value={3}>Quarta</option>
                        <option value={4}>Quinta</option>
                        <option value={5}>Sexta</option>
                        <option value={6}>Sábado</option>
                        <option value={0}>Domingo</option>
                      </select>
                      <input 
                        type="text"
                        value={avail.startTime}
                        onChange={(e) => {
                          const updated = [...teacherForm.availability];
                          updated[idx].startTime = e.target.value;
                          setTeacherForm({ ...teacherForm, availability: updated });
                        }}
                        placeholder="08:00"
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white w-14 text-center font-mono"
                      />
                      <span className="text-slate-400">-</span>
                      <input 
                        type="text"
                        value={avail.endTime}
                        onChange={(e) => {
                          const updated = [...teacherForm.availability];
                          updated[idx].endTime = e.target.value;
                          setTeacherForm({ ...teacherForm, availability: updated });
                        }}
                        placeholder="12:00"
                        className="text-[11px] border border-slate-200 rounded p-1 bg-white w-14 text-center font-mono"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeTeacherFormSlot(idx)}
                        className="text-danger p-1 hover:bg-danger/10 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {teacherForm.availability.length === 0 && (
                    <p className="text-xs text-slate-400 text-center italic py-2">Nenhum horário selecionado ainda.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-success text-slate-900 text-xs font-bold py-2.5 rounded-lg hover:opacity-90 shadow-md">
                  Salvar
                </button>
                <button type="button" onClick={() => setShowTeacherModal(false)} className="px-4 border border-slate-200 text-slate-500 text-xs py-2.5 rounded-lg hover:bg-bg-secondary">
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Room Modal */}
      {/* Guardian Creation Modal */}
      {showGuardianModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-support-blue" />
                Cadastrar Responsável
              </h3>
              <button onClick={() => setShowGuardianModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGuardian} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={guardianForm.name || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, name: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Maria Silva"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CPF</label>
                  <input
                    type="text"
                    value={guardianForm.cpf || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, cpf: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Somente números"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={guardianForm.email || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, email: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    value={guardianForm.phone || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Parentesco *</label>
                  <input
                    type="text"
                    required
                    value={guardianForm.relationship || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Pai, Mãe, Avó"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profissão</label>
                  <input
                    type="text"
                    value={guardianForm.profissao || ""}
                    onChange={e => setGuardianForm({ ...guardianForm, profissao: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Engenheiro"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vincular Alunos (Opcional)</label>
                {(guardianForm.studentIds || [""]).map((sId, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={sId}
                      onChange={e => {
                        const newStudentIds = [...(guardianForm.studentIds || [""])];
                        newStudentIds[index] = e.target.value;
                        setGuardianForm({ ...guardianForm, studentIds: newStudentIds });
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    >
                      <option value="">Nenhum aluno vinculado no momento</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {((guardianForm.studentIds || []).length > 1) && (
                      <button
                        type="button"
                        onClick={() => {
                          const newStudentIds = [...(guardianForm.studentIds || [])];
                          newStudentIds.splice(index, 1);
                          setGuardianForm({ ...guardianForm, studentIds: newStudentIds });
                        }}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newStudentIds = [...(guardianForm.studentIds || [""]), ""];
                    setGuardianForm({ ...guardianForm, studentIds: newStudentIds });
                  }}
                  className="mt-1 text-xs font-bold text-support-blue hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar outro aluno
                </button>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contratos Anexados</label>
                <div className="space-y-2">
                  {(guardianForm.contracts || []).map((contract, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-support-blue shrink-0" />
                        <span className="text-sm text-slate-700 truncate">{contract.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <button type="button" onClick={() => openContract(contract)} className="text-support-blue hover:text-blue-700 p-1" title="Ver Arquivo">
                           <FileText className="w-4 h-4" />
                         </button>
                         <button
                           type="button"
                           onClick={() => {
                             const newContracts = [...(guardianForm.contracts || [])];
                             newContracts.splice(index, 1);
                             setGuardianForm({ ...guardianForm, contracts: newContracts });
                           }}
                           className="text-slate-400 hover:text-danger p-1"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  ))}
                  <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-sm font-bold text-support-blue flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Anexar Contrato
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf,image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        const files = Array.from(e.target.files) as File[];
                        const newContracts = await Promise.all(files.map(file => {
                          return new Promise<{ name: string, data: string, type: string }>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const base64Data = (event.target?.result as string).split(",")[1];
                              resolve({ name: file.name, data: base64Data, type: file.type || "application/pdf" });
                            };
                            reader.readAsDataURL(file);
                          });
                        }));
                        setGuardianForm({ ...guardianForm, contracts: [...(guardianForm.contracts || []), ...newContracts] });
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fin-resp"
                  checked={guardianForm.financialResponsible || false}
                  onChange={e => setGuardianForm({ ...guardianForm, financialResponsible: e.target.checked })}
                  className="w-4 h-4 text-support-blue rounded border-slate-300 focus:ring-blue-600"
                />
                <label htmlFor="fin-resp" className="text-sm font-bold text-slate-700 cursor-pointer">
                  É o Responsável Financeiro
                </label>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowGuardianModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-white bg-support-blue hover:opacity-90 rounded-lg transition-colors flex items-center gap-2"
                >
                  Salvar Responsável
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Nova Sala de Aula</h3>
                <p className="text-xs text-slate-400">Lock Físico de Recursos</p>
              </div>
              <button onClick={() => setShowRoomModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 pt-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Identificação / Nome</label>
                <input 
                  type="text"
                  required
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                  placeholder="Ex: Sala 201 - Tecnologia"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Capacidade (Alunos)</label>
                <input 
                  type="number"
                  required
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Recursos Extras (Separados por vírgula)</label>
                <input 
                  type="text"
                  value={roomForm.resourcesStr}
                  onChange={(e) => setRoomForm({ ...roomForm, resourcesStr: e.target.value })}
                  placeholder="Projetor, Lousa, Computadores"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="flex-1 bg-success text-slate-900 text-xs font-bold py-2.5 rounded-lg">
                  Salvar
                </button>
                <button type="button" onClick={() => setShowRoomModal(false)} className="px-4 border border-slate-200 text-slate-500 text-xs py-2.5 rounded-lg">
                  Voltar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student 360 Profile Modal */}
      {selectedStudentForProfile && (
        <StudentProfileModal
          student={selectedStudentForProfile}
          onClose={() => setSelectedStudentForProfile(null)}
          onSave={async (updatedStudent) => {
            try {
              const res = await authFetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedStudent)
              });
              if (res.ok) {
                setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
                setSelectedStudentForProfile(null);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        />
      )}

      {/* Entity Delete Confirmation Modal */}
      {entityToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4 text-danger">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-slate-800 text-lg">
                Excluir {entityToDelete.type === 'room' ? 'Sala' : entityToDelete.type === 'student' ? 'Aluno' : entityToDelete.type === 'teacher' ? 'Professor' : 'Responsável'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Tem certeza que deseja excluir <strong>{entityToDelete.name}</strong>? Esta ação não pode ser desfeita. Se houver agendamentos ativos vinculados, a exclusão será bloqueada.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEntityToDelete(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEntity}
                className="px-4 py-2 text-sm font-bold text-white bg-danger hover:opacity-90 rounded-lg transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Delete Error Modal */}
      {deleteError && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl flex flex-col">
            <div className="flex items-center gap-3 mb-4 text-danger">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="font-bold text-slate-800 text-lg">Exclusão Bloqueada</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 font-semibold">
              {deleteError.message}
            </p>
            {deleteError.activeBookings && deleteError.activeBookings.length > 0 && (
              <div className="bg-bg-secondary border border-slate-200 rounded-lg p-3 max-h-60 overflow-y-auto mb-6">
                <p className="text-xs font-bold text-slate-500 mb-2 uppercase">Agendamentos Ativos:</p>
                <ul className="space-y-2">
                  {deleteError.activeBookings.map(b => {
                    const student = students.find(s => s.id === b.studentId);
                    return (
                      <li key={b.id} className="text-xs text-slate-700 bg-white border border-slate-200 p-2 rounded shadow-sm">
                        <span className="font-bold block mb-1">Aluno: {student?.name || 'Indefinido'}</span>
                        <span className="block text-[10px]">Data: {b.date} ({b.startTime} - {b.endTime})</span>
                        <span className="block text-[10px] uppercase text-support-blue mt-1">Status: {b.status.replace('_', ' ')}</span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[10px] text-slate-400 mt-2 italic">Você precisa desmarcar ou cancelar estes agendamentos antes de excluir o registro.</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      
      {backupError && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              Aviso de Sistema
            </h3>
            <p className="text-sm text-slate-600 mb-6 font-medium">
              {backupError}
            </p>
            <button
              onClick={() => setBackupError(null)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors w-full"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
      
      {/* Footer Design */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white px-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 NexusScheduler Premium Suite. Inteligência Artificial e Respeito a ACID Ativo.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 cursor-pointer">Segurança de Dados</span>
            <span>•</span>
            <span className="hover:text-slate-600 cursor-pointer">Termos de Uso</span>
          </div>
        </div>
      </footer>
      
      <ERaiaAssistant 
        auth={auth} 
        authFetch={authFetch} 
        contextContext={activeTab} 
        students={students} 
        teachers={teachers} 
        guardians={guardians} 
        onSaved={fetchData} 
      />
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = React.useState<{ token: string, user: any } | null>(() => {
    const saved = localStorage.getItem('eraia_auth');
    return saved ? JSON.parse(saved) : null;
  });

  // Sessão restaurada do localStorage no initializer do useState acima.
  // (Auth agora é JWT próprio do servidor — Firebase removido.)

  return (
    <>
      <Toaster position="top-right" />
      {!auth ? <LoginScreen setAuth={setAuth} /> : <AppContent auth={auth} setAuth={setAuth} />}
    </>
  );
}
