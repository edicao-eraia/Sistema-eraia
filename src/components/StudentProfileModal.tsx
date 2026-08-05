import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { FileAudio, FileText } from 'lucide-react';
import { Student, StudentProfile360, SubjectPerformance, TacticalPlan, Booking, DidacticSequence } from '../types';
import { CurriculumImporterModal } from './CurriculumImporterModal';
import { Shield, BookOpen, Target, Brain, Key, Plus, Trash2, Lock, Activity, User, Save, X, Mic, Square, Check, AlertCircle, ArrowRight, CheckCircle, Lightbulb, GraduationCap, Calendar, Clock, Award, Sparkles, BookMarked } from 'lucide-react';

// Header com o JWT do servidor (rotas /api exigem auth).
const authHeaders = (): Record<string, string> => {
  let token: string | null = null;
  try { token = JSON.parse(localStorage.getItem('eraia_auth') || '{}').token || null; } catch { /* ignore */ }
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

interface StudentProfileModalProps {
  student: Student;
  onClose: () => void;
  onSave: (updatedStudent: Student) => void;
}

const DEFAULT_PROFILE: StudentProfile360 = {
  behavioralProfile: '',
  medicalRecords: [],
  schoolHistories: [],
  targetCourse: '',
  targetUniversities: [],
  performances: [],
  recentTestScores: '',
  tacticalPlans: [],
};

const SUBJECTS = ["Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Português", "Literatura", "Redação"];
const PERFORMANCE_LEVELS = ["Excelente", "Bom", "Regular", "Com Dificuldade"];

export function StudentProfileModal({ student, onClose, onSave }: StudentProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'perfil' | 'academico' | 'objetivos' | 'planejamento' | 'credenciais' | 'contrato'>('perfil');
  const [importingPlanIdx, setImportingPlanIdx] = useState<number | null>(null);
  const [profile, setProfile] = useState<StudentProfile360>(student.profile360 || DEFAULT_PROFILE);
  const [modality, setModality] = useState<"Turma" | "Individual" | "Híbrido">(student.modality || "Individual");
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);

  useEffect(() => {
    async function fetchBookings() {
      setIsLoadingBookings(true);
      try {
        const res = await fetch('/api/data', { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.bookings) {
            const filtered = data.bookings.filter((b: any) => b.studentId === student.id);
            setStudentBookings(filtered);

            const duration = (start: string, end: string) => {
              if (!start || !end) return 0;
              const [sH, sM] = start.split(':').map(Number);
              const [eH, eM] = end.split(':').map(Number);
              return Math.max(0, (eH + eM/60) - (sH + sM/60));
            };

            let used = 0;
            let canceled = 0;
            filtered.forEach((b: any) => {
              if (b.status === 'realizada_presenca' || b.status === 'realizada_falta') {
                used += duration(b.startTime, b.endTime);
              } else if (b.status === 'desmarcada' || b.status === 'cancelada') {
                canceled += duration(b.startTime, b.endTime);
              }
            });

            used = Math.round(used * 100) / 100;
            canceled = Math.round(canceled * 100) / 100;

            setContract((prev: any) => ({
              ...prev,
              usedHours: used,
              canceledHours: canceled
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao carregar agendamentos do aluno:", err);
      } finally {
        setIsLoadingBookings(false);
      }
    }
    fetchBookings();
  }, [student.id]);

  const [contract, setContract] = useState<any>(student.contract || {
    startDate: '',
    endDate: '',
    totalHours: 0,
    usedHours: 0,
    canceledHours: 0
  });

  const [fixedActivities, setFixedActivities] = useState<string[]>(student.fixedActivities || []);
  const [newActivityInput, setNewActivityInput] = useState('');

  // RBAC Mock State
  const [userRole, setUserRole] = useState<'Coordenador' | 'Professor' | 'Assistente'>('Coordenador');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [proposedChanges, setProposedChanges] = useState<StudentProfile360 | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);


  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await handleAudioSubmit(audioBlob);
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

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(",")[1];
        const fileData = [{ data: base64Data, mimeType: audioBlob.type || 'audio/webm' }];
        
        const response = await fetch("/api/gemini/extract-student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileData, currentProfile: profile })
        });
        
        if (response.ok) {
          const extractedData = await response.json();
          if (extractedData.profile360) {
            setProposedChanges(extractedData.profile360);
            setIsReviewing(true);
          }
        } else {
          toast.error("Falha ao processar o áudio.");
        }
        setIsExtracting(false);
      };
    } catch (err) {
      console.error(err);
      setIsExtracting(false);
      toast.error("Erro ao enviar áudio.");
    }
  };

  const applyChanges = () => {
    if (proposedChanges) {
      setProfile(prev => ({ ...prev, ...proposedChanges }));
    }
    setIsReviewing(false);
    setProposedChanges(null);
  };

  const discardChanges = () => {
    setIsReviewing(false);
    setProposedChanges(null);
  };

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
              mimeType: file.type || (file.name.endsWith(".m4a") ? "audio/m4a" : file.name.endsWith(".mp3") ? "audio/mp3" : file.name.endsWith(".wav") ? "audio/wav" : file.name.endsWith(".ogg") ? "audio/ogg" : file.name.endsWith(".pdf") ? "application/pdf" : "application/pdf")
            });
          };
          reader.readAsDataURL(file);
        });
      }));

      const response = await fetch("/api/gemini/extract-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: fileData, currentProfile: profile })
      });

      if (response.ok) {
        const extractedData = await response.json();
        if (extractedData.profile360) {
          setProposedChanges(extractedData.profile360);
          setIsReviewing(true);
        }
      } else {
        toast.error("Falha ao extrair dados do PDF/Áudio.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao extrair dados.");
    } finally {
      setIsExtracting(false);
    }
  };


  const handleSave = () => {
    onSave({
      ...student,
      modality: modality,
      profile360: profile,
      contract: contract,
      fixedActivities: fixedActivities
    });
  };

  const updateProfile = (updates: Partial<StudentProfile360>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const handleUnlockVault = () => {
    if (vaultPassword === 'admin123') { // Mock check
      setIsVaultUnlocked(true);
    } else {
      toast.error('Senha incorreta para desbloquear o cofre.');
    }
  };

  
  return (
      <>       {/* Review Changes Modal */}
      {isReviewing && proposedChanges && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-bg-secondary">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-indigo-500" />
                Revisar Alterações da IA
              </h2>
              <button onClick={discardChanges} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-bg-secondary">
              <p className="text-sm text-slate-600 mb-6">
                A IA analisou o áudio/documento e sugeriu as seguintes alterações no perfil do aluno. Por favor, confirme se deseja aplicar estas mudanças:
              </p>
              
              <div className="space-y-4">
                {/* Visual diffing per field */}
                {Object.keys(proposedChanges).map(key => {
                  const val = proposedChanges[key as keyof StudentProfile360];
                  const currVal = profile[key as keyof StudentProfile360];
                  
                  if (JSON.stringify(val) === JSON.stringify(currVal)) return null;
                  
                
                    return (
                    <div key={key} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                      
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {{
                          behavioralProfile: 'Perfil Comportamental',
                          medicalRecords: 'Laudos Médicos',
                          schoolHistories: 'Histórico Escolar',
                          targetCourse: 'Curso Alvo',
                          targetUniversities: 'Universidades Alvo',
                          performances: 'Desempenho por Matéria',
                          recentTestScores: 'Notas em Simulados',
                          recentExamsResults: 'Resultados em Vestibulares',
                          reportCard: 'Boletim Escolar',
                          tacticalPlans: 'Plano Pedagógico',
                          credentials: 'Cofre de Credenciais'
                        }[key] || key}
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        <div className="flex-1 bg-danger/10/50 border border-rose-100 p-3 rounded-lg text-sm text-danger w-full line-clamp-3 overflow-y-auto max-h-64">
                          {typeof currVal === 'object' ? (
                            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(currVal, null, 2)}</pre>
                          ) : (
                            String(currVal || 'Vazio')
                          )}
                        </div>
                        <div className="text-slate-300 hidden md:block">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                        <div className="flex-1 bg-success/20/50 border border-emerald-100 p-3 rounded-lg text-sm text-slate-900 w-full line-clamp-3 overflow-y-auto max-h-64">
                          {typeof val === 'object' ? (
                            <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>
                          ) : (
                            String(val)
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button onClick={discardChanges} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Descartar
              </button>
              <button onClick={applyChanges} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2">
                <Check className="w-4 h-4" />
                Confirmar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-bg-secondary border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-support-blue/20 text-support-blue rounded-xl flex items-center justify-center text-xl font-bold">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">{student.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded">{student.level}</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded">{student.modality || "Individual"}</span>
                <span className="text-xs text-slate-500 font-medium">Ficha 360° do Aluno</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">


            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 bg-white rounded-full border border-slate-200 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 bg-bg-secondary border-b md:border-b-0 md:border-r border-slate-200 p-4 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto md:overflow-y-auto">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'perfil' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-5 h-5" />
              Perfil & Saúde
            </button>
            <button
              onClick={() => setActiveTab('academico')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'academico' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <GraduationCap className="w-6 h-6 shrink-0" />
              Histórico Acadêmico
            </button>
            <button
              onClick={() => setActiveTab('objetivos')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'objetivos' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Target className="w-5 h-5" />
              Objetivos
            </button>
            <button
              onClick={() => setActiveTab('planejamento')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'planejamento' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Plano Pedagógico
            </button>
            <button
              onClick={() => setActiveTab('credenciais')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'credenciais' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shield className="w-5 h-5" />
              Cofre de Acesso
            </button>
            <button
              onClick={() => setActiveTab('contrato')}
              className={`whitespace-nowrap w-auto md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl font-bold transition-all ${
                activeTab === 'contrato' ? 'bg-success text-slate-900 shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Activity className="w-5 h-5" />
              Contrato e Saldo
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            
            {/* TAB: PERFIL & SAÚDE */}
            {activeTab === 'perfil' && (
              <div className="space-y-6 animate-fade-in">
                
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <span className="text-support-purple">✨</span> e-RaIA: Preenchimento Automático
                    </h4>
                    <p className="text-xs text-indigo-700/70 mt-1">
                      Importe históricos, laudos em PDF ou grave áudios para preencher a Ficha 360º automaticamente.
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {isRecording ? (
                      <button
                        onClick={stopRecording}
                        className="bg-danger/100 hover:bg-danger text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 animate-pulse"
                      >
                        <Square className="w-3.5 h-3.5" /> Gravando... (Parar)
                      </button>
                    ) : (
                      <button
                        onClick={startRecording}
                        disabled={isExtracting}
                        className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                      >
                        <Mic className="w-3.5 h-3.5" /> Gravar Áudio
                      </button>
                    )}
                    <label className="relative cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg transition-colors shadow-sm whitespace-nowrap">

                    {isExtracting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analisando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> <FileAudio className="w-3.5 h-3.5" /> Importar PDF/Áudio
                      </span>
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

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Brain className="w-5 h-5 text-indigo-600" /> Perfil Comportamental & Contexto Escolar
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Compilação escrita reunindo os dados da planilha Contexto Escolar (estudo fora da escola, rotina, manutenção da rotina, tempo diário e revisão de conteúdo).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = student.rawDraftData || {};
                        const estudaFora = d.estudaFora || "Sim";
                        const rotinaFora = d.rotinaEstudosFora || "Estuda no período vespertino fazendo resumos de conteúdos e resolução de listas de exercícios.";
                        const mantemRotina = d.mantemRotinaEstudos || "Sim, mantém rotina de estudos de segunda a quinta.";
                        const tempoDia = d.tempoEstudoPorDia || "1 a 2 horas/dia";
                        const revisa = d.costumaRevisar || "Sim, costuma revisar o conteúdo quinzenalmente e antes de provas.";

                        const formattedText = `Hábitos & Contexto de Estudos Fora da Escola:\n- Estuda fora da escola atualmente: ${estudaFora}\n- Rotina de estudos fora da escola: ${rotinaFora}\n- Consegue manter a rotina de estudos: ${mantemRotina}\n- Tempo de estudo por dia (fora da escola): ${tempoDia}\n- Costuma revisar conteúdo: ${revisa}`;
                        
                        updateProfile({ behavioralProfile: formattedText });
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/80 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Formatar do Contexto Escolar
                    </button>
                  </div>

                  {/* Visual chips of the 5 requested columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 pb-1">
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estuda Fora</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block truncate">
                        {student.rawDraftData?.estudaFora || 'Sim'}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rotina de Estudos</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block truncate">
                        {student.rawDraftData?.rotinaEstudosFora ? 'Definida' : 'Sim'}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Mantém Rotina</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block truncate">
                        {student.rawDraftData?.mantemRotinaEstudos || 'Sim'}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tempo Diário</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block truncate">
                        {student.rawDraftData?.tempoEstudoPorDia || '1h a 2h/dia'}
                      </span>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Costuma Revisar</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5 block truncate">
                        {student.rawDraftData?.costumaRevisar || 'Sim'}
                      </span>
                    </div>
                  </div>

                  <textarea
                    value={profile.behavioralProfile}
                    onChange={(e) => updateProfile({ behavioralProfile: e.target.value })}
                    className="w-full min-h-[180px] border border-slate-200 rounded-xl p-4 text-sm font-sans leading-relaxed text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y bg-slate-50/50 focus:bg-white transition-all"
                    placeholder="Descreva o perfil comportamental e de hábitos de estudo do estudante (estuda fora da escola, rotina, manutenção de rotina, tempo diário e hábitos de revisão)..."
                  />
                </div>

                {/* SECTION: DISPONIBILIDADE E ATIVIDADES FIXAS (CONTEXTO ESCOLAR | E-RAIA) */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-600" /> Disponibilidade & Atividades Fixas (Planilha Contexto Escolar)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Informações extraídas da planilha "Contexto Escolar | e-Raia" para preencher a disponibilidade e atividades fixas da rotina semanal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const d = student.rawDraftData || {};
                        const cursos = d.cursosExtracurriculares || "Inglês aos sábados, das 9h às 11h";
                        const atividadeFisica = d.atividadeFisica || "Natação nas segundas e quartas, das 18h às 19h";
                        const rotina = d.rotinaSemanal || "Aula pela manhã das 7h às 13h15; à tarde faço natação nas segundas e quartas, das 18h às 19h; inglês aos sábados, das 9h às 11h";

                        const newItems: string[] = [];
                        if (cursos) newItems.push(`Cursos Extracurriculares: ${cursos}`);
                        if (atividadeFisica) newItems.push(`Atividade Física: ${atividadeFisica}`);
                        if (rotina) newItems.push(`Rotina Semanal: ${rotina}`);

                        setFixedActivities(prev => {
                          const combined = new Set([...prev, ...newItems]);
                          return Array.from(combined);
                        });
                      }}
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Sincronizar Atividades Fixas
                    </button>
                  </div>

                  {/* Display the 3 requested columns from Contexto Escolar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Column 1: Cursos Extracurriculares */}
                    <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                        <BookMarked className="w-4 h-4 text-amber-600" /> Cursos Extracurriculares & Horários
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-100 min-h-[55px]">
                        {student.rawDraftData?.cursosExtracurriculares || "Inglês aos sábados, das 9h às 11h"}
                      </p>
                    </div>

                    {/* Column 2: Atividade Física */}
                    <div className="bg-emerald-50/40 border border-emerald-200/60 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                        <Award className="w-4 h-4 text-emerald-600" /> Atividade Física & Horários
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-emerald-100 min-h-[55px]">
                        {student.rawDraftData?.atividadeFisica || "Natação nas segundas e quartas, das 18h às 19h"}
                      </p>
                    </div>

                    {/* Column 3: Rotina Semanal */}
                    <div className="bg-blue-50/40 border border-blue-200/60 rounded-xl p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                        <Clock className="w-4 h-4 text-blue-600" /> Rotina Semanal Completa
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed bg-white/80 p-2.5 rounded-lg border border-blue-100 min-h-[55px]">
                        {student.rawDraftData?.rotinaSemanal || "Aula pela manhã das 7h às 13h15; à tarde faço natação nas segundas e quartas, das 18h às 19h; inglês aos sábados, das 9h às 11h"}
                      </p>
                    </div>
                  </div>

                  {/* Active Fixed Activities List */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Atividades Fixas Semanais Cadastradas ({fixedActivities.length})
                      </span>
                    </div>

                    {fixedActivities.length === 0 ? (
                      <div className="p-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                        Nenhuma atividade fixa cadastrada no momento. Clique em <strong className="text-amber-700 font-bold">"Sincronizar Atividades Fixas"</strong> para preencher a partir da planilha.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {fixedActivities.map((act, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800">
                            <span>{act}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setFixedActivities(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-400 hover:text-red-600 transition-colors p-1"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Manual Add Activity input */}
                    <div className="flex gap-2 pt-2">
                      <input
                        type="text"
                        value={newActivityInput}
                        onChange={(e) => setNewActivityInput(e.target.value)}
                        placeholder="Adicionar outra atividade fixa manual (ex: Terapia nas terças, 15h)..."
                        className="flex-1 text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newActivityInput.trim()) {
                            e.preventDefault();
                            setFixedActivities(prev => [...prev, newActivityInput.trim()]);
                            setNewActivityInput('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newActivityInput.trim()) {
                            setFixedActivities(prev => [...prev, newActivityInput.trim()]);
                            setNewActivityInput('');
                          }
                        }}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <Activity className="text-danger" /> Histórico Médico e Laudos
                    </h3>
                  </div>
                  
                  {userRole !== 'Coordenador' ? (
                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-6 text-center">
                      <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-slate-700">Acesso Restrito</h4>
                      <p className="text-xs text-slate-500 mt-1">Apenas usuários com perfil de Coordenação ou Psicologia podem visualizar ou editar laudos médicos (RBAC Ativo).</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile.medicalRecords.map((record, idx) => (
                        <div key={idx} className="bg-danger/10 border border-rose-100 rounded-xl p-4 relative group">
                          <button
                            onClick={() => {
                              const newRecords = [...profile.medicalRecords];
                              newRecords.splice(idx, 1);
                              updateProfile({ medicalRecords: newRecords });
                            }}
                            className="absolute top-4 right-4 text-rose-300 hover:text-danger transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-danger uppercase mb-1">Condição / Diagnóstico</label>
                              <input
                                type="text"
                                value={record.condition}
                                onChange={(e) => {
                                  const newRecords = [...profile.medicalRecords];
                                  newRecords[idx].condition = e.target.value;
                                  updateProfile({ medicalRecords: newRecords });
                                }}
                                className="w-full border border-danger/30 rounded-lg p-2 text-sm bg-white"
                                placeholder="Ex: TDAH, Dislexia, Ansiedade..."
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-danger uppercase mb-1">Observações e Acomodações</label>
                              <input
                                type="text"
                                value={record.notes}
                                onChange={(e) => {
                                  const newRecords = [...profile.medicalRecords];
                                  newRecords[idx].notes = e.target.value;
                                  updateProfile({ medicalRecords: newRecords });
                                }}
                                className="w-full border border-danger/30 rounded-lg p-2 text-sm bg-white"
                                placeholder="Ex: Necessita de pausas frequentes..."
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => updateProfile({ medicalRecords: [...profile.medicalRecords, { condition: '', notes: '' }] })}
                        className="flex items-center gap-2 text-sm font-bold text-danger hover:text-danger bg-danger/10 px-4 py-2 rounded-lg border border-danger/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Adicionar Registro Médico
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: OBJETIVOS */}
            {activeTab === 'objetivos' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Target className="text-success" /> Futuro Acadêmico
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Curso Almejado</label>
                      <input
                        type="text"
                        value={profile.targetCourse}
                        onChange={(e) => updateProfile({ targetCourse: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold bg-bg-secondary focus:bg-white"
                        placeholder="Ex: Medicina, Engenharia de Computação..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Universidades Foco (separadas por vírgula)</label>
                      <input
                        type="text"
                        value={profile.targetUniversities.join(', ')}
                        onChange={(e) => updateProfile({ targetUniversities: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm font-bold bg-bg-secondary focus:bg-white"
                        placeholder="Ex: USP, Unicamp, UNESP..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Lightbulb className="text-support-orange" /> Expectativa na e-Raia
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Qual seu principal objetivo hoje?</label>
                      <textarea
                        value={profile.primaryGoal || ""}
                        onChange={(e) => updateProfile({ primaryGoal: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-bg-secondary focus:bg-white min-h-[80px]"
                        placeholder="Objetivo principal..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Por que você decidiu iniciar o acompanhamento?</label>
                      <textarea
                        value={profile.reasonToStart || ""}
                        onChange={(e) => updateProfile({ reasonToStart: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-bg-secondary focus:bg-white min-h-[80px]"
                        placeholder="Motivação inicial..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">O que você espera que mude na sua rotina?</label>
                      <textarea
                        value={profile.expectedRoutineChange || ""}
                        onChange={(e) => updateProfile({ expectedRoutineChange: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm bg-bg-secondary focus:bg-white min-h-[80px]"
                        placeholder="Expectativa de mudança..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: HISTÓRICO ACADÊMICO */}
            {activeTab === 'academico' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Contexto Escolar Compilado */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-indigo-600" /> Contexto Escolar
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Escola Atual</span>
                      <span className="text-sm font-bold text-slate-800">{profile.currentSchool || '-'}</span>
                    </div>
                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Localidade</span>
                      <span className="text-sm font-bold text-slate-800">{(profile.city && profile.state) ? `${profile.city} - ${profile.state}` : '-'}</span>
                    </div>
                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ano Escolar</span>
                      <span className="text-sm font-bold text-slate-800">{profile.schoolYear || '-'}</span>
                    </div>
                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Turno</span>
                      <span className="text-sm font-bold text-slate-800">{profile.shift || '-'}</span>
                    </div>
                    <div className="bg-bg-secondary p-3 rounded-xl border border-slate-100 md:col-span-2">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Autoavaliação do Desempenho</span>
                      <span className="text-sm font-bold text-slate-800">{profile.performanceEvaluation || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-danger/5 p-4 rounded-xl border border-danger/20">
                      <span className="block text-[10px] font-bold text-danger uppercase mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Maior Dificuldade</span>
                      <p className="text-sm font-medium text-slate-700">{profile.difficultSubjects || '-'}</p>
                    </div>
                    <div className="bg-success/10 p-4 rounded-xl border border-success/30">
                      <span className="block text-[10px] font-bold text-success-dark uppercase mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Maior Facilidade</span>
                      <p className="text-sm font-medium text-slate-700">{profile.easySubjects || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Target className="text-support-orange" /> Histórico de Vestibulares
                  </h3>
                  
                  {(!profile.hasDoneVestibular || profile.hasDoneVestibular.trim().toLowerCase() === 'não') ? (
                    <div className="bg-bg-secondary border border-slate-200 rounded-xl p-6 text-center">
                      <p className="text-sm font-bold text-slate-600">O aluno ainda não realizou vestibulares ou processos seriados.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {profile.vestibularExams?.map((exam, idx) => (
                        <div key={idx} className="bg-bg-secondary border border-slate-200 rounded-xl p-4">
                           <div className="flex justify-between items-center mb-3">
                             <h4 className="text-md font-bold text-slate-800">{exam.name || "Vestibular"} {exam.year && `(${exam.year})`}</h4>
                           </div>
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">Linguagens</span>
                                <span className="text-sm font-black text-slate-800">{exam.scoreLinguagens || '-'}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">Humanas</span>
                                <span className="text-sm font-black text-slate-800">{exam.scoreHumanas || '-'}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">Natureza</span>
                                <span className="text-sm font-black text-slate-800">{exam.scoreNatureza || '-'}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">Matemática</span>
                                <span className="text-sm font-black text-slate-800">{exam.scoreMatematica || '-'}</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center">
                                <span className="block text-[9px] font-bold text-slate-500 uppercase">Redação</span>
                                <span className="text-sm font-black text-slate-800">{exam.scoreRedacao || '-'}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen className="text-support-blue" /> Desempenho por Disciplina (Autoavaliação)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SUBJECTS.map(subject => {
                      const perf = profile.performances.find(p => p.subject === subject);
                      return (
                        <div key={subject} className="bg-bg-secondary border border-slate-200 p-3 rounded-xl">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold text-slate-700">{subject}</span>
                          </div>
                          <select
                            value={perf?.level || ""}
                            onChange={(e) => {
                              const newLevel = e.target.value as any;
                              if (!newLevel) {
                                updateProfile({ performances: profile.performances.filter(p => p.subject !== subject) });
                              } else {
                                const newPerfs = [...profile.performances.filter(p => p.subject !== subject), { subject, level: newLevel }];
                                updateProfile({ performances: newPerfs });
                              }
                            }}
                            className={`w-full text-xs p-2 rounded-lg border font-bold ${
                              perf?.level === 'Excelente' ? 'bg-success/20 border-success/50 text-slate-900' :
                              perf?.level === 'Bom' ? 'bg-support-blue/10 border-support-blue/30 text-support-blue' :
                              perf?.level === 'Regular' ? 'bg-amber-50 border-support-orange/50 text-amber-700' :
                              perf?.level === 'Com Dificuldade' ? 'bg-danger/10 border-danger/30 text-danger' :
                              'bg-white border-slate-200 text-slate-500'
                            }`}
                          >
                            <option value="">Não avaliado</option>
                            {PERFORMANCE_LEVELS.map(lvl => (
                              <option key={lvl} value={lvl}>{lvl}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="pt-6 border-t border-slate-100 mt-6">
                  <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Target className="text-danger" /> Resultados e Avaliações Recentes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Últimos Resultados de Vestibulares Feitos</label>
                      <textarea
                        value={profile.recentExamsResults || ''}
                        onChange={(e) => updateProfile({ recentExamsResults: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-bg-secondary focus:bg-white min-h-[100px]"
                        placeholder="Ex: FUVEST 2023 - 56 pontos; ENEM 2023 - 750 (Mat)..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Boletim Escolar (Desempenho Geral)</label>
                      <textarea
                        value={profile.reportCard || ''}
                        onChange={(e) => updateProfile({ reportCard: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-bg-secondary focus:bg-white min-h-[100px]"
                        placeholder="Ex: Média 9.0 em exatas, 7.5 em humanas..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PLANO PEDAGÓGICO */}
            {activeTab === 'planejamento' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-support-blue/10 border border-blue-100 p-4 rounded-xl mb-6">
                  <h4 className="text-sm font-bold text-support-blue mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Integração com IA de Agendamento
                  </h4>
                  <p className="text-xs text-support-blue">
                    A carga horária definida aqui alimentará automaticamente o motor de agendamento, sugerindo grades baseadas na distribuição semanal definida e nas acomodações médicas (Ex: aulas mais curtas e pela manhã se houver TDAH).
                  </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-800">Carga Horária e Estratégia Tática</h3>
                  <button
                    onClick={() => updateProfile({ tacticalPlans: [...profile.tacticalPlans, { subject: SUBJECTS[0], weeklyHours: 2, strategy: '' }] })}
                    className="flex items-center gap-2 text-xs font-bold text-support-blue hover:text-support-blue bg-support-blue/10 px-3 py-1.5 rounded-lg border border-support-blue/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Disciplina
                  </button>
                </div>

                <div className="space-y-4">
                  {profile.tacticalPlans.map((plan, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                      <button
                        onClick={() => {
                          const newPlans = [...profile.tacticalPlans];
                          newPlans.splice(idx, 1);
                          updateProfile({ tacticalPlans: newPlans });
                        }}
                        className="absolute top-4 right-4 text-slate-300 hover:text-danger transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Disciplina</label>
                          <select
                            value={plan.subject}
                            onChange={(e) => {
                              const newPlans = [...profile.tacticalPlans];
                              newPlans[idx].subject = e.target.value;
                              updateProfile({ tacticalPlans: newPlans });
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary font-bold"
                          >
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horas / Semana</label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={plan.weeklyHours}
                            onChange={(e) => {
                              const newPlans = [...profile.tacticalPlans];
                              newPlans[idx].weeklyHours = Number(e.target.value);
                              updateProfile({ tacticalPlans: newPlans });
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm font-mono text-center"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estratégia Tática Específica</label>
                          <input
                            type="text"
                            value={plan.strategy}
                            onChange={(e) => {
                              const newPlans = [...profile.tacticalPlans];
                              newPlans[idx].strategy = e.target.value;
                              updateProfile({ tacticalPlans: newPlans });
                            }}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary"
                            placeholder="Ex: Foco total em mecânica clássica. Exercícios nível hard."
                          />
                        </div>
                      </div>

                      {/* Didactic Sequences */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Sequência Didática e Cronológica</label>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setImportingPlanIdx(idx)}
                              className="text-[10px] font-bold text-support-blue bg-blue-50 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                              <BookOpen className="w-3 h-3" /> Importar do Planejamento
                            </button>
                            <button
                              onClick={() => {
                                const newPlans = [...profile.tacticalPlans];
                                if (!newPlans[idx].sequences) newPlans[idx].sequences = [];
                                newPlans[idx].sequences!.push({ front: '', content: '', order: newPlans[idx].sequences!.length + 1 });
                                updateProfile({ tacticalPlans: newPlans });
                              }}
                              className="text-[10px] font-bold text-support-purple bg-indigo-50 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Manualmente
                            </button>
                          </div>

                        </div>
                        
                        <div className="space-y-2">
                          {plan.sequences && plan.sequences.length > 0 ? (
                            plan.sequences.map((seq, seqIdx) => (
                              <div key={seqIdx} className="flex items-center gap-2 bg-bg-secondary p-2 rounded-lg border border-slate-100">
                                <span className="text-xs font-bold text-slate-400 w-6 text-center">{seqIdx + 1}</span>
                                <input
                                  type="text"
                                  value={seq.front || ''}
                                  onChange={(e) => {
                                    const newPlans = [...profile.tacticalPlans];
                                    newPlans[idx].sequences![seqIdx].front = e.target.value;
                                    updateProfile({ tacticalPlans: newPlans });
                                  }}
                                  className="w-1/4 border border-slate-200 rounded text-xs p-1.5"
                                  placeholder="Frente (Ex: Mat 1)"
                                />
                                <input
                                  type="text"
                                  value={seq.content}
                                  onChange={(e) => {
                                    const newPlans = [...profile.tacticalPlans];
                                    newPlans[idx].sequences![seqIdx].content = e.target.value;
                                    updateProfile({ tacticalPlans: newPlans });
                                  }}
                                  className="flex-1 border border-slate-200 rounded text-xs p-1.5"
                                  placeholder="Conteúdo a ser estudado"
                                />
                                <button
                                  onClick={() => {
                                    const newPlans = [...profile.tacticalPlans];
                                    newPlans[idx].sequences!.splice(seqIdx, 1);
                                    updateProfile({ tacticalPlans: newPlans });
                                  }}
                                  className="text-slate-300 hover:text-danger p-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Nenhuma sequência cadastrada.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {profile.tacticalPlans.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                      Nenhum planejamento tático definido ainda.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: CONTRATO E SALDO */}
            {activeTab === 'contrato' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Banner de Resumo do Contrato */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden border border-slate-800">
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-400" /> Contrato e Saldo de Aulas
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          modality === 'Individual' ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' :
                          modality === 'Turma' ? 'bg-blue-400/20 text-blue-300 border-blue-400/30' :
                          'bg-purple-400/20 text-purple-300 border-purple-400/30'
                        }`}>
                          Modalidade: {modality}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white">Contrato & Gestão de Horas</h3>
                      <p className="text-slate-300 text-xs mt-1">
                        Acompanhe o modelo contratual, período de vigência e saldo deduzido automaticamente das aulas individuais realizadas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Modelo do Contrato + Vigência e Pacote */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Modelo do Contrato */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm md:col-span-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600" /> Modelo do Contrato
                      </label>
                      <p className="text-xs text-slate-500 mb-4">
                        Selecione o modelo de acompanhamento pedagógico contratado:
                      </p>
                      <div className="space-y-2">
                        {[
                          { id: 'Individual', label: 'Individual (Aulas 1-a-1)', desc: 'Consumo por saldo de horas de aulas agendadas' },
                          { id: 'Turma', label: 'Turma (Aulas Coletivas)', desc: 'Grade de aulas em grupo de turmas regulares' },
                          { id: 'Híbrido', label: 'Híbrido (Turma + Individual)', desc: 'Grade coletiva com pacote de horas 1-a-1' }
                        ].map((option) => (
                          <label
                            key={option.id}
                            onClick={() => setModality(option.id as any)}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              modality === option.id
                                ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500/20'
                                : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modality"
                              value={option.id}
                              checked={modality === option.id}
                              onChange={() => setModality(option.id as any)}
                              className="mt-1 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <span className="block text-xs font-bold text-slate-900">{option.label}</span>
                              <span className="block text-[10px] text-slate-500 mt-0.5">{option.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Vigência do Contrato & Saldo de Horas */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm md:col-span-2 space-y-5">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Calendar className="w-4 h-4 text-indigo-600" /> Periodo de Vigência e Saldo de Horas
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Data de Início
                        </label>
                        <input
                          type="date"
                          value={contract.startDate || ''}
                          onChange={(e) => setContract({ ...contract, startDate: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Data de Término
                        </label>
                        <input
                          type="date"
                          value={contract.endDate || ''}
                          onChange={(e) => setContract({ ...contract, endDate: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-xs font-bold bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                          Saldo Total Contratado (Horas)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={contract.totalHours || 0}
                            onChange={(e) => setContract({ ...contract, totalHours: Number(e.target.value) })}
                            className="w-full border border-slate-200 rounded-xl p-2.5 pr-8 text-xs font-black text-slate-900 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none"
                          />
                          <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">h</span>
                        </div>
                      </div>
                    </div>

                    {/* Resumo do Saldo de Horas */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Balanço de Horas para Aulas Individuais
                      </label>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase">Total Contratado</span>
                          <span className="text-xl font-black text-slate-800 mt-1 block">
                            {contract.totalHours || 0} <span className="text-xs font-medium text-slate-500">h</span>
                          </span>
                        </div>

                        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-center">
                          <span className="block text-[10px] font-semibold text-amber-700 uppercase">Horas Utilizadas</span>
                          <span className="text-xl font-black text-amber-900 mt-1 block">
                            {contract.usedHours || 0} <span className="text-xs font-medium text-amber-700">h</span>
                          </span>
                        </div>

                        <div className={`border rounded-xl p-3 text-center ${
                          (contract.totalHours - (contract.usedHours || 0)) <= 0
                            ? 'bg-rose-50 border-rose-200/80 text-rose-900'
                            : (contract.totalHours - (contract.usedHours || 0)) <= 5
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-emerald-50 border-emerald-200/80 text-emerald-900'
                        }`}>
                          <span className="block text-[10px] font-semibold uppercase">Saldo Restante</span>
                          <span className="text-xl font-black mt-1 block">
                            {Math.max(0, (contract.totalHours || 0) - (contract.usedHours || 0))} <span className="text-xs font-medium">h</span>
                          </span>
                        </div>
                      </div>

                      {/* Progresso visual */}
                      {/* Aditivos e Informações */}
                      <div className="pt-4 mt-4 border-t border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 text-left">
                          Aditivos / Informações do Contrato
                        </label>
                        <textarea
                          value={contract.contractNotes || ''}
                          onChange={(e) => setContract({ ...contract, contractNotes: e.target.value })}
                          placeholder="Ex: Aditivo de prorrogação até Dezembro, acréscimo de 10h, mudança de modalidade para híbrido..."
                          className="w-full border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none resize-none min-h-[80px]"
                        />
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between items-center text-xs text-slate-600 mb-1.5 font-medium">
                          <span>Consumo do Saldo ({contract.totalHours ? Math.min(100, Math.round(((contract.usedHours || 0) / contract.totalHours) * 100)) : 0}%)</span>
                          <span className="font-bold text-slate-800">{contract.usedHours || 0}h utilizadas de {contract.totalHours || 0}h</span>
                        </div>
                        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              (contract.totalHours - (contract.usedHours || 0)) <= 0
                                ? 'bg-rose-500'
                                : (contract.totalHours - (contract.usedHours || 0)) <= 5
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{
                              width: `${contract.totalHours ? Math.min(100, ((contract.usedHours || 0) / contract.totalHours) * 100) : 0}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extrato de Aulas Realizadas */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-emerald-600" /> Extrato de Aulas Realizadas (Deduções Automáticas)
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Aulas individuais finalizadas com presença ou falta confirmada que deduziram saldo do aluno.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg self-start sm:self-auto">
                      {studentBookings.filter(b => b.status === 'realizada_presenca' || b.status === 'realizada_falta').length} aulas contabilizadas
                    </span>
                  </div>

                  {isLoadingBookings ? (
                    <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      Carregando extrato de horas...
                    </div>
                  ) : studentBookings.filter(b => b.status === 'realizada_presenca' || b.status === 'realizada_falta').length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Nenhuma aula realizada até o momento.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Conforme as aulas forem concluídas e marcadas com presenças/faltas na agenda, as horas serão abatidas do saldo automaticamente.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                            <th className="py-2.5 px-3">Data</th>
                            <th className="py-2.5 px-3">Horário</th>
                            <th className="py-2.5 px-3">Disciplina / Conteúdo</th>
                            <th className="py-2.5 px-3">Duração Debitada</th>
                            <th className="py-2.5 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {studentBookings
                            .filter(b => b.status === 'realizada_presenca' || b.status === 'realizada_falta')
                            .map((b) => {
                              const getDurationHours = (start: string, end: string) => {
                                if (!start || !end) return 0;
                                const [sH, sM] = start.split(':').map(Number);
                                const [eH, eM] = end.split(':').map(Number);
                                return Math.max(0, (eH + eM/60) - (sH + sM/60));
                              };
                              const dur = getDurationHours(b.startTime, b.endTime);
                              return (
                                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 font-bold text-slate-800">
                                    {b.date ? new Date(b.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 font-mono">
                                    {b.startTime} - {b.endTime}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-800">
                                    <span className="font-bold">{b.subject || 'Geral'}</span>
                                    {b.topic && <span className="block text-[10px] text-slate-500 truncate">{b.topic}</span>}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-indigo-600">
                                    -{dur}h
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      b.status === 'realizada_presenca'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {b.status === 'realizada_presenca' ? 'Presença' : 'Falta'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: COFRE DE CREDENCIAIS */}
            {activeTab === 'credenciais' && (
              <div className="space-y-6 animate-fade-in max-w-2xl mx-auto mt-4">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
                    <Shield className="w-8 h-8 text-slate-900" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">Cofre de Credenciais</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    Armazene as credenciais do portal da escola regular do aluno.
                    Estes dados são protegidos por criptografia de ponta a ponta (AES-256) e requerem autenticação adicional para visualização.
                  </p>
                </div>

                {!isVaultUnlocked ? (
                  <div className="bg-bg-secondary border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
                    <Key className="w-6 h-6 text-slate-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 mb-4">Cofre Bloqueado</h4>
                    <div className="flex gap-2 max-w-sm mx-auto">
                      <input
                        type="password"
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        placeholder="Senha mestre (Dica: admin123)"
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={handleUnlockVault}
                        className="bg-success text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors"
                      >
                        Desbloquear
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-xl relative animate-fade-in">
                    <div className="absolute top-4 right-4 flex items-center gap-2 text-success bg-success/20 px-2 py-1 rounded-md text-xs font-bold border border-success/50">
                      <Lock className="w-3.5 h-3.5" /> Cofre Aberto
                    </div>
                    
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">URL do Portal da Escola</label>
                        <input
                          type="url"
                          value={profile.credentials?.schoolPortalUrl || ''}
                          onChange={(e) => updateProfile({ credentials: { ...profile.credentials!, schoolPortalUrl: e.target.value } })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-bg-secondary"
                          placeholder="https://portal.escola.com.br"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Usuário / RA</label>
                          <input
                            type="text"
                            value={profile.credentials?.username || ''}
                            onChange={(e) => updateProfile({ credentials: { ...profile.credentials!, username: e.target.value } })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-bg-secondary"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha (Criptografada no BD)</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={profile.credentials?.encryptedPasswordHash || ''}
                              onChange={(e) => updateProfile({ credentials: { ...profile.credentials!, encryptedPasswordHash: e.target.value } })}
                              className="flex-1 border border-slate-200 rounded-lg p-2.5 text-sm font-mono bg-amber-50 border-support-orange/50 text-amber-900"
                              placeholder="Digite p/ definir/trocar (fica cifrada)…"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const r = await fetch(`/api/students/${student.id}/credentials/reveal`, { headers: authHeaders() });
                                  const d = await r.json();
                                  if (r.ok) updateProfile({ credentials: { ...profile.credentials!, encryptedPasswordHash: d.password || '' } });
                                } catch { /* ignore */ }
                              }}
                              className="px-3 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap"
                            >
                              Revelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-bg-secondary border-t border-slate-200 px-6 py-4 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-support-blue hover:opacity-90 shadow-md transition-colors text-sm">
            <Save className="w-4 h-4" />
            Salvar Ficha Completa
          </button>
        </div>
      </div>
      </div>

      {importingPlanIdx !== null && (
        <CurriculumImporterModal 
          subject={profile.tacticalPlans[importingPlanIdx].subject}
          onClose={() => setImportingPlanIdx(null)}
          onImport={(importedSequences) => {
            const newPlans = [...profile.tacticalPlans];
            if (!newPlans[importingPlanIdx].sequences) {
              newPlans[importingPlanIdx].sequences = [];
            }
            
            // Append and reorder
            const currentLen = newPlans[importingPlanIdx].sequences!.length;
            const toAdd = importedSequences.map((seq, i) => ({
              ...seq,
              order: currentLen + i + 1
            }));
            
            newPlans[importingPlanIdx].sequences = [...newPlans[importingPlanIdx].sequences!, ...toAdd];
            updateProfile({ tacticalPlans: newPlans });
            setImportingPlanIdx(null);
          }}
        />
      )}

    </>
  );
}
