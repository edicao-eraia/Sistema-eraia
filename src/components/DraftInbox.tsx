import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { Check, X, Inbox, UserPlus, AlertCircle, ChevronDown, ChevronUp, FileText, Edit2, Save } from 'lucide-react';
import type { StudentDraft } from '../types';
import { subscribeToStudentDrafts, approveStudentDraft, rejectStudentDraft, updateStudentDraft } from '../lib/db';


const DRAFT_FIELDS = [
  { key: "nomeCompleto", label: "Nome Completo" },
  { key: "modality", label: "Modalidade do Aluno" },
  { key: 'email', label: 'E-mail' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'cpf', label: 'CPF' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'estado', label: 'Estado' },
  { key: 'escolaAtual', label: 'Escola Atual' },
  { key: 'anoEscolar', label: 'Ano Escolar' },
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
  { key: 'contractTotalHours', label: 'Saldo Total de Horas' }
];

export const DraftInbox: React.FC<{
  onDraftApproved: (student?: any) => void;
}> = ({ onDraftApproved }) => {
  const [drafts, setDrafts] = useState<StudentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftFormData, setDraftFormData] = useState<Partial<StudentDraft>>({});
  const [missingFieldsAlert, setMissingFieldsAlert] = useState<string[] | null>(null);
  const [filterStatus, setFilterStatus] = useState<"Pendente" | "Aprovado" | "Rejeitado" | "Todos">("Pendente");

  const toggleExpand = (id: string) => {
    setExpandedDraftId(expandedDraftId === id ? null : id);
  };

  // Fetch using subscription setup in useEffect instead

  useEffect(() => {
    const unsub = subscribeToStudentDrafts((data) => {
      setDrafts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (id: string) => {
    const draftToApprove = drafts.find(d => d.id === id);
    if (!draftToApprove) return;

    const REQUIRED_FIELDS_KEYS = [
      'nomeCompleto',
      'email',
      'whatsapp',
      'cpf',
      'anoEscolar',
      'dataNascimento',
      'contractStartDate',
      'contractEndDate',
      'contractTotalHours'
    ];

    const missingFields: string[] = [];
    const isTurma = draftToApprove.modality === 'Turma';

    for (const field of DRAFT_FIELDS) {
      if (REQUIRED_FIELDS_KEYS.includes(field.key)) {
        let val = draftToApprove[field.key as keyof StudentDraft];
        
        if (field.key === 'contractTotalHours') {
          const numVal = Number(val) || 0;
          if (isTurma) {
            // For Turma, accept 0 or empty
            continue;
          } else {
            // For Individual, must be > 0
            if (numVal <= 0) {
              missingFields.push(field.label);
              continue;
            }
          }
        } else {
          // Normal check for other fields
          if (val === undefined || val === null || String(val).trim() === '') {
            missingFields.push(field.label);
          }
        }
      }
    }

    if (missingFields.length > 0) {
      setMissingFieldsAlert(missingFields);
      return;
    }

    try {
      const authData = JSON.parse(localStorage.getItem('eraia_auth') || '{}');
    if (!authData?.user?.id) { toast.error("Usuário não autenticado"); return; }
    
    try {
      const newStudent = await approveStudentDraft(id, draftToApprove, authData.user.id);
      toast.success('Cadastro aprovado com sucesso!');
      onDraftApproved(newStudent);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aprovar: " + err.message);
    }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'Rejeitado' } : d));
      await rejectStudentDraft(id);
    } catch (e) {
      console.error(e);
    }
  };


  const handleEditClick = (draft) => {
    setEditingDraftId(draft.id);
    setDraftFormData({ ...draft });
    if (expandedDraftId !== draft.id) setExpandedDraftId(draft.id);
  };

  const handleCancelEdit = () => {
    setEditingDraftId(null);
    setDraftFormData({});
  };

  const handleSaveDraft = async (id) => {
    try {
      await updateStudentDraft(id, draftFormData);
    setEditingDraftId(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-bold">Carregando fila de triagem...</div>;
  }



  const filteredDrafts = drafts.filter(d => filterStatus === "Todos" || d.status === filterStatus);
  return (
    <div className="space-y-4 animate-fade-in">
      {missingFieldsAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-danger">
              <AlertCircle className="w-8 h-8" />
              <h3 className="text-xl font-bold">Atenção!</h3>
            </div>
            <p className="text-sm text-slate-600 font-medium mb-4">
              Não é possível aprovar este cadastro. As seguintes informações estão faltando ou não foram preenchidas:
            </p>
            <div className="bg-bg-secondary border border-slate-200 rounded-lg p-3 max-h-64 overflow-y-auto mb-6">
              <ul className="list-disc pl-5 space-y-1">
                {missingFieldsAlert.map((field, i) => (
                  <li key={i} className="text-xs font-bold text-slate-700">{field}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setMissingFieldsAlert(null)}
                className="bg-success hover:opacity-90 text-slate-900 font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Inbox className="text-support-blue" /> Triagem de Matrículas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Valide as respostas do formulário e consulte o histórico.</p>
        </div>
        <div className="flex gap-2">
          {["Pendente", "Aprovado", "Rejeitado", "Todos"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                filterStatus === status 
                  ? 'bg-success text-slate-900 border-support-blue' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-bg-secondary'
              }`}
            >
              {status} {status === 'Pendente' && `(${drafts.filter(d => d.status === 'Pendente').length})`}
            </button>
          ))}
        </div>
      </div>

      
      {filteredDrafts.length === 0 ? (
        <div className="p-12 text-center flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Nenhum registro</h3>
          <p className="text-slate-500 mt-2">Não há cadastros nesta categoria no momento.</p>
        </div>
      ) : (
      <div className="grid gap-4">
        {filteredDrafts.map(draft => (
          <div key={draft.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                
                <div className="flex-1 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-support-blue/20 text-support-blue rounded-xl flex items-center justify-center text-xl font-black shrink-0">
                      {draft.nomeCompleto.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800">{draft.nomeCompleto}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">{draft.email}</span>
                        <span className="text-xs font-bold text-slate-500">|</span>
                        <span className="text-xs font-bold text-slate-500">{draft.whatsapp}</span>
                        <span className="text-xs font-bold text-slate-500">|</span>
                        <span className="text-xs font-bold text-support-purple bg-indigo-50 px-2 py-0.5 rounded">{draft.anoEscolar}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-secondary p-4 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escola & Curso</span>
                      <p className="text-sm font-medium text-slate-700 mt-1">{draft.escolaAtual} • {draft.cursoOuArea}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Objetivo Principal</span>
                      <p className="text-sm font-medium text-slate-700 mt-1">{draft.principalObjetivo || "Não informado"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col items-center md:items-stretch gap-2 shrink-0">
                  {editingDraftId === draft.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        onClick={() => handleSaveDraft(draft.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-success hover:opacity-90 text-slate-900 font-bold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
                      >
                        <Save className="w-4 h-4" /> Salvar Edição
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-600 font-bold py-2.5 px-4 rounded-lg border border-slate-200 transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleApprove(draft.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-success hover:opacity-90 text-slate-900 font-bold py-2.5 px-4 rounded-lg transition-colors text-sm shadow-sm"
                      >
                        <Check className="w-4 h-4" /> Aprovar
                      </button>
                      <button
                        onClick={() => handleEditClick(draft)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-support-blue/10 text-support-blue font-bold py-2.5 px-4 rounded-lg border border-slate-200 hover:border-support-blue/30 transition-colors text-sm"
                      >
                        <Edit2 className="w-4 h-4" /> Editar
                      </button>
                      <button
                        onClick={() => handleReject(draft.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-danger/10 text-danger font-bold py-2.5 px-4 rounded-lg border border-slate-200 hover:border-danger/30 transition-colors text-sm"
                      >
                        <X className="w-4 h-4" /> Descartar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Expand Toggle Button */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => toggleExpand(draft.id)}
                  className="w-full flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-support-blue transition-colors py-1"
                >
                  <FileText className="w-4 h-4" />
                  {expandedDraftId === draft.id ? 'Ocultar Respostas Completas' : 'Ver Respostas Completas do Formulário'}
                  {expandedDraftId === draft.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

                        {/* Expanded Details Content */}
            {expandedDraftId === draft.id && (
              <div className="bg-bg-secondary border-t border-slate-200 p-5 space-y-6">
                {editingDraftId === draft.id ? (
                  <div className="space-y-4">
                    
                    <div className="border-b border-slate-200 pb-4 mb-4">
                      <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                         Informações de Contrato (Adicionar antes de aprovar)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Início</label>
                          <input
                            type="date"
                            value={draftFormData.contractStartDate || ''}
                            onChange={(e) => setDraftFormData({ ...draftFormData, contractStartDate: e.target.value })}
                            className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Fim (Previsão)</label>
                          <input
                            type="date"
                            value={draftFormData.contractEndDate || ''}
                            onChange={(e) => setDraftFormData({ ...draftFormData, contractEndDate: e.target.value })}
                            className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Saldo Total de Horas</label>
                          <input
                            type="number"
                            value={draftFormData.contractTotalHours || 0}
                            onChange={(e) => setDraftFormData({ ...draftFormData, contractTotalHours: Number(e.target.value) })}
                            className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { key: "nomeCompleto", label: "Nome Completo" },
  { key: "modality", label: "Modalidade do Aluno" },
                        { key: 'email', label: 'E-mail' },
                        { key: 'whatsapp', label: 'WhatsApp' },
                        { key: 'cpf', label: 'CPF' },
                        { key: 'cidade', label: 'Cidade' },
                        { key: 'estado', label: 'Estado' },
                        { key: 'escolaAtual', label: 'Escola Atual' },
                        { key: 'anoEscolar', label: 'Ano Escolar' },
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
                      ].map((field) => (
                        <div key={field.key}>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{field.label}</label>
                          {field.key === 'modality' ? (
                            <select
                              value={draftFormData[field.key as keyof StudentDraft] || 'Individual'}
                              onChange={(e) => setDraftFormData({ ...draftFormData, [field.key]: e.target.value })}
                              className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                            >
                              <option value="Individual">Individual</option>
                              <option value="Turma">Turma</option>
                              <option value="Híbrido">Híbrido (Turma e Individual)</option>
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={draftFormData[field.key as keyof StudentDraft] || ''}
                              onChange={(e) => setDraftFormData({ ...draftFormData, [field.key]: e.target.value })}
                              className="w-full border border-slate-300 rounded-md p-2 text-sm bg-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                
                {/* Section: Dados Pessoais */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Dados Pessoais & Escolares</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Data de Nascimento</p>
                      <p className="text-sm text-slate-800">{draft.dataNascimento || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">CPF</p>
                      <p className="text-sm text-slate-800">{draft.cpf || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Instagram</p>
                      <p className="text-sm text-slate-800">{draft.instagram || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Cidade/Estado</p>
                      <p className="text-sm text-slate-800">{draft.cidade} - {draft.estado}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Turno</p>
                      <p className="text-sm text-slate-800">{draft.turno || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Desempenho e Afinidades */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Desempenho & Afinidades</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Avaliação de Desempenho Atual</p>
                      <p className="text-sm text-slate-800">{draft.avaliacaoDesempenho || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Matérias com Maior Dificuldade</p>
                      <p className="text-sm text-danger font-medium">{draft.materiasDificuldade || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Matérias com Mais Facilidade</p>
                      <p className="text-sm text-success font-medium">{draft.materiasFacilidade || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Qual a sua maior dificuldade hoje?</p>
                      <p className="text-sm text-slate-800">{draft.maiorDificuldade || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Rotina */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Rotina & Hábitos de Estudo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Rotina Semanal Descrita</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{draft.rotinaSemanal || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Rotina de Estudos Fora da Escola</p>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{draft.rotinaEstudosFora || '-'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Estuda Fora da Escola?</p>
                      <p className="text-sm text-slate-800">{draft.estudaFora || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Tempo Médio de Estudo/Dia</p>
                      <p className="text-sm text-slate-800">{draft.tempoEstudoPorDia || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Consegue Manter Rotina?</p>
                      <p className="text-sm text-slate-800">{draft.mantemRotinaEstudos || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Costuma Revisar Conteúdo?</p>
                      <p className="text-sm text-slate-800">{draft.costumaRevisar || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Cursos Extracurriculares</p>
                      <p className="text-sm text-slate-800">{draft.cursosExtracurriculares || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Atividade Física</p>
                      <p className="text-sm text-slate-800">{draft.atividadeFisica || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Vestibulares */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Histórico de Vestibulares</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Já Fez Vestibular?</p>
                      <p className="text-sm text-slate-800">{draft.jaFezVestibular || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Modalidade Participação</p>
                      <p className="text-sm text-slate-800">{draft.vestibularParticipei || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Ano do Vestibular</p>
                      <p className="text-sm text-slate-800">{draft.vestibularAno || '-'}</p>
                    </div>
                  </div>
                  {(draft.notaLinguagens || draft.notaMatematica || draft.notaRedacao) && (
                    <div className="grid grid-cols-5 gap-2 mt-4 bg-white p-3 rounded border border-slate-200 text-center">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Linguagens</p>
                        <p className="text-sm font-bold text-support-blue">{draft.notaLinguagens || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Humanas</p>
                        <p className="text-sm font-bold text-support-blue">{draft.notaHumanas || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Natureza</p>
                        <p className="text-sm font-bold text-support-blue">{draft.notaNatureza || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Matemática</p>
                        <p className="text-sm font-bold text-support-blue">{draft.notaMatematica || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Redação</p>
                        <p className="text-sm font-bold text-support-purple">{draft.notaRedacao || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section: Expectativas */}
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Expectativas do Acompanhamento</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Por que decidiu iniciar o acompanhamento?</p>
                      <p className="text-sm text-slate-800">{draft.motivoAcompanhamento || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">O que espera que mude na sua rotina?</p>
                      <p className="text-sm text-slate-800">{draft.esperaMudancaRotina || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Conteúdos para revisar (1º ano)</p>
                      <p className="text-sm text-slate-800">{draft.conteudosRevisar || '-'}</p>
                    </div>
                    <div className="bg-white p-3 rounded border border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Conteúdo abordado na 1ª semana</p>
                      <p className="text-sm text-slate-800">{draft.conteudosPrimeiraSemana || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section: Portal do Aluno (Credentials) */}
                {(draft.portalAlunoLink || draft.portalAlunoLogin) && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Credenciais (Portal do Aluno)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Link do Portal</p>
                        <p className="text-sm text-support-blue truncate">
                          {draft.portalAlunoLink ? <a href={draft.portalAlunoLink.startsWith('http') ? draft.portalAlunoLink : `https://${draft.portalAlunoLink}`} target="_blank" rel="noreferrer" className="hover:underline">{draft.portalAlunoLink}</a> : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Login</p>
                        <p className="text-sm text-slate-800">{draft.portalAlunoLogin || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Senha Fornecida</p>
                        <p className="text-sm font-mono text-slate-800 bg-slate-200 px-2 py-0.5 rounded inline-block">{draft.portalAlunoSenhaRaw ? '*** (Fornecida)' : '-'}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {draft.boletimUrl && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">Anexos</h4>
                    <a href={draft.boletimUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-support-blue hover:text-support-blue font-bold text-sm bg-support-blue/10 px-4 py-2 rounded-lg transition-colors">
                      <FileText className="w-4 h-4" />
                      Visualizar Boletim Anexado
                    </a>
                  </div>
                )}
                
                {draft.rawResponses && Object.keys(draft.rawResponses).length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider border-b border-slate-200 pb-2">
                      Informações Completas (Planilha Original)
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(draft.rawResponses).map(([key, value]) => (
                        <div key={key} className="bg-white p-3 rounded border border-slate-200">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">{key}</p>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap">{String(value) || '-'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
};