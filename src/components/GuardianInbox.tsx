import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { Check, X, Inbox, UserPlus, AlertCircle, ChevronDown, ChevronUp, Users, Trash2, FileText, Download, Plus, RefreshCw } from 'lucide-react';
import type { GuardianDraft, Guardian } from '../types';
import { createGuardianInFirebase, subscribeToGuardianDrafts, approveGuardianDraft, rejectGuardianDraft, updateGuardianDraft, fetchStudentsFromFirebase } from '../lib/db';

// Header com o JWT do servidor (rotas /api agora exigem auth).
const authHeaders = (): Record<string, string> => {
  let token: string | null = null;
  try { token = JSON.parse(localStorage.getItem('eraia_auth') || '{}').token || null; } catch { /* ignore */ }
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

export const GuardianInbox: React.FC<{
  onDraftApproved: (guardian?: any) => void;
  auth: any;
  students: any[];
}> = ({ onDraftApproved, auth, students: initialStudents }) => {
  const [drafts, setDrafts] = useState<GuardianDraft[]>([]);
  const [loading, setLoading] = useState(true);
  // Sort students alphabetically
  const students = [...initialStudents].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  
  // Edição de informações antes de aprovar
  const [editingDraft, setEditingDraft] = useState<GuardianDraft | null>(null);
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

  const [filterStatus, setFilterStatus] = useState<"Pendente" | "Aprovado" | "Rejeitado" | "Todos">("Pendente");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([""]);

  const toggleExpand = (id: string, draftStudentIds?: string[]) => {
    setExpandedDraftId(expandedDraftId === id ? null : id);
    setEditingDraft(null); // reseta edição ao expandir/recolher
    setSelectedStudentIds(draftStudentIds && draftStudentIds.length > 0 ? draftStudentIds : [""]);
  };

  // Replaced by subscription

  useEffect(() => {
    
  }, [auth?.user?.id]);

  const handleApprove = async (id: string, updatedData?: GuardianDraft) => {
    try {
      const draftToApprove = updatedData || drafts.find(d => d.id === id);
      if (!draftToApprove) return;
      
      const validStudentIds = selectedStudentIds.filter(sid => sid && sid.trim() !== "");
      if (!draftToApprove.studentIds || draftToApprove.studentIds.length === 0) {
        if (validStudentIds.length === 0) {
          toast.error("Atenção: É necessário vincular o responsável a pelo menos um aluno antes de aprovar.");
          return;
        }
        draftToApprove.studentIds = validStudentIds;
      } else {
        // Replace with selected if provided
        if (validStudentIds.length > 0) {
           draftToApprove.studentIds = validStudentIds;
        }
      }
      
      // Calculate finalStudentName
      let finalStudentName = draftToApprove.nomeAluno || "";
      if (draftToApprove.studentIds && draftToApprove.studentIds.length > 0) {
        const sNames = [];
        for (const sid of draftToApprove.studentIds) {
          if (sid) {
            const student = students.find(s => s.id === sid);
            if (student) sNames.push(student.name);
          }
        }
        if (sNames.length > 0) finalStudentName = sNames.join(", ");
      }

      // 1. Create in Firebase
      if (auth?.user?.id) {
        const payload = {
          name: draftToApprove.nomeCompleto,
          email: draftToApprove.email,
          phone: draftToApprove.whatsapp,
          cpf: draftToApprove.cpf,
          studentIds: draftToApprove.studentIds || [],
          studentName: finalStudentName,
          relationship: draftToApprove.parentesco,
          financialResponsible: draftToApprove.responsavelFinanceiro,
          profissao: draftToApprove.profissao,
          contracts: draftToApprove.contracts || []
        };
        const newGuardian = await createGuardianInFirebase(auth.user.id, payload);

        // 2. Mark draft as approved in backend
        const res = await fetch(`/api/guardians/drafts/${id}/approve`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(draftToApprove)
        });
        if (res.ok) {
          toast.success('Cadastro aprovado com sucesso!');
          setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'Aprovado' } : d));
          
          onDraftApproved(newGuardian);
        }
      } else {
        // Fallback for missing auth
        const res = await fetch(`/api/guardians/drafts/${id}/approve`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(draftToApprove)
        });
        if (res.ok) {
          toast.success('Cadastro aprovado com sucesso!');
          setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'Aprovado' } : d));
          
          onDraftApproved();
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao aprovar rascunho: " + (e.message || String(e)));
    }
  };

  const handleReject = async (id: string) => {
    try {
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'Rejeitado' } : d));
      await rejectGuardianDraft(id);
    } catch (e) {
      console.error(e);
    }
  };
  
  const startEditing = (draft: GuardianDraft) => {
    setEditingDraft({ ...draft });
  };
  
  const handleSaveEdit = async (id: string) => {
    if (editingDraft) {
      try {
        const payload = { ...editingDraft };
        const validStudentIds = selectedStudentIds.filter(sid => sid && sid.trim() !== "");
        if (validStudentIds.length > 0) {
           payload.studentIds = validStudentIds;
        }
        const res = await fetch(`/api/guardians/drafts/${id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setEditingDraft(null);
          
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const filteredDrafts = drafts.filter(d => filterStatus === "Todos" || d.status === filterStatus);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-success" /> Triagem de Responsáveis
          </h2>
          <p className="text-xs text-slate-500 mt-1">Valide os cadastros de responsáveis e verifique o vínculo com alunos.</p>
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
          <button onClick={() => {}} className="bg-white border border-slate-200 p-1.5 rounded-full text-slate-400 hover:text-slate-600 ml-2 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
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
          {filteredDrafts.map((draft) => (
              <div key={draft.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Header Row */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => toggleExpand(draft.id, draft.studentIds)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {draft.nomeCompleto.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {draft.nomeCompleto}
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">Novo Responsável</span>
                      </h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                        <span>{draft.email}</span>
                        <span>•</span>
                        <span>Aluno ref: {draft.nomeAluno}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(draft.submittedAt).toLocaleDateString()}
                    </span>
                    {expandedDraftId === draft.id ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedDraftId === draft.id && (
                  <div className="border-t border-slate-100 p-6 bg-bg-secondary">
                    
                    {/* Exibição e Edição */}
                    <div className="bg-white rounded-lg border border-slate-200 p-5 mb-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Dados do Responsável</h4>
                        {!editingDraft && (
                           <button onClick={(e) => { e.stopPropagation(); startEditing(draft); }} className="text-xs text-support-blue font-bold hover:underline">
                             Editar Dados
                           </button>
                        )}
                      </div>
                      
                      {editingDraft ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
                             <input type="text" value={editingDraft.nomeCompleto} onChange={e => setEditingDraft({...editingDraft, nomeCompleto: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Email</label>
                             <input type="email" value={editingDraft.email} onChange={e => setEditingDraft({...editingDraft, email: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp</label>
                             <input type="text" value={editingDraft.whatsapp} onChange={e => setEditingDraft({...editingDraft, whatsapp: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">CPF</label>
                             <input type="text" value={editingDraft.cpf} onChange={e => setEditingDraft({...editingDraft, cpf: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Aluno Vinculado</label>
                             <input type="text" value={editingDraft.nomeAluno} onChange={e => setEditingDraft({...editingDraft, nomeAluno: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Parentesco</label>
                             <input type="text" value={editingDraft.parentesco} onChange={e => setEditingDraft({...editingDraft, parentesco: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" />
                           </div>
                           <div>
                             <label className="text-[10px] font-bold text-slate-500 uppercase">Profissão</label>
                             <input type="text" value={editingDraft.profissao || ''} onChange={e => setEditingDraft({...editingDraft, profissao: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 mt-1" placeholder="Ex: Professor, Engenheiro..." />
                           </div>
                           <div className="col-span-2">
                             <label className="flex items-center gap-2 text-sm text-slate-800 mt-2">
                               <input type="checkbox" checked={editingDraft.responsavelFinanceiro} onChange={e => setEditingDraft({...editingDraft, responsavelFinanceiro: e.target.checked})} className="rounded border-slate-300" />
                               É o Responsável Financeiro
                             </label>
                           </div>
                         </div>
                      ) : (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">WhatsApp</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.whatsapp || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">CPF</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.cpf || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Responsável Financeiro?</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.responsavelFinanceiro ? 'Sim' : 'Não'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Aluno Vinculado</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.nomeAluno || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Parentesco</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.parentesco || '-'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Profissão</p>
                            <p className="text-sm text-slate-800 font-medium">{draft.profissao || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {draft.rawResponses && Object.keys(draft.rawResponses).length > 0 && (
                      <div className="mt-8 mb-6">
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

                    
                    {draft.status === 'Pendente' && (<>
                    <div className="mt-4 mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Contratos Anexados</label>
                      <div className="space-y-2">
                        {(draft.contracts || []).map((contract, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
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
                                 onClick={async () => {
                                   const newContracts = [...(draft.contracts || [])];
                                   newContracts.splice(index, 1);
                                   await fetch(`/api/guardians/drafts/${draft.id}`, {
                                     method: 'PUT',
                                     headers: authHeaders(),
                                     body: JSON.stringify({ ...draft, contracts: newContracts })
                                   });
                                   
                                 }}
                                 className="text-slate-400 hover:text-danger p-1"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                            </div>
                          </div>
                        ))}
                        <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 rounded cursor-pointer hover:bg-white transition-colors">
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
                              const files = Array.from(e.target.files as FileList);
                              const newContracts = await Promise.all(files.map(file => {
                                return new Promise<{name: string, data: string, type: string}>((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64Data = (event.target?.result as string).split(",")[1];
                                    resolve({ name: file.name, data: base64Data, type: file.type || "application/pdf" });
                                  };
                                  reader.readAsDataURL(file);
                                });
                              }));
                              await fetch(`/api/guardians/drafts/${draft.id}`, {
                                method: 'PUT',
                                headers: authHeaders(),
                                body: JSON.stringify({ ...draft, contracts: [...(draft.contracts || []), ...newContracts] })
                              });
                              
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 mb-4 p-4 bg-support-blue/10 border border-blue-100 rounded-lg">
                      <label className="block text-sm font-bold text-support-blue mb-2">Vincular Alunos Existentes</label>
                      {selectedStudentIds.map((sId, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <select 
                            className="w-full p-2 border border-support-blue/30 rounded text-sm bg-white"
                            value={sId}
                            onChange={e => {
                              const newStudentIds = [...selectedStudentIds];
                              newStudentIds[index] = e.target.value;
                              setSelectedStudentIds(newStudentIds);
                            }}
                          >
                            <option value="">-- Selecione o Aluno correspondente --</option>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                            ))}
                          </select>
                          {selectedStudentIds.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newStudentIds = [...selectedStudentIds];
                                newStudentIds.splice(index, 1);
                                setSelectedStudentIds(newStudentIds);
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded transition-colors border border-transparent hover:border-red-100"
                              title="Remover"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([...selectedStudentIds, ""])}
                        className="mt-1 text-xs font-bold text-support-blue hover:text-blue-700 flex items-center gap-1"
                      >
                        + Adicionar outro aluno
                      </button>
                      <p className="text-[10px] text-support-blue mt-1">Obrigatório para aprovação (Aluno informado na ficha: {draft.nomeAluno})</p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200">
                      {editingDraft ? (
                         <>
                           <button 
                             onClick={() => handleSaveEdit(draft.id)}
                             className="flex-1 bg-success hover:opacity-90 text-slate-900 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                           >
                             <Check className="w-5 h-5" />
                             Salvar Edição
                           </button>
                           <button 
                             onClick={() => setEditingDraft(null)}
                             className="flex-1 bg-white border border-slate-200 hover:bg-bg-secondary text-slate-700 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                           >
                             Cancelar Edição
                           </button>
                         </>
                      ) : (
                         <>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleApprove(draft.id); }}
                             className="flex-1 bg-success hover:opacity-90 text-slate-900 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                           >
                             <Check className="w-5 h-5" />
                             Aprovar e Criar Cadastro
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleReject(draft.id); }}
                             className="flex-1 bg-white border border-danger/30 hover:bg-danger/10 text-danger font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                           >
                             <X className="w-5 h-5" />
                             Rejeitar Cadastro
                           </button>
                         </>
                      )}
                    </div>
                    </>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
