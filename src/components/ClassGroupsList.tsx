import { toast } from "react-hot-toast";
import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, X, FileText, Check, RefreshCw, ArrowUp, ArrowDown, BookOpen } from 'lucide-react';
import { ClassGroup, ClassGroupPlan, DidacticSequence, Teacher, Student, Room } from '../types';
import { createClassGroupInFirebase, updateClassGroupInFirebase, deleteClassGroupInFirebase } from '../lib/db';
import { mergeImportedSequences, normalizePlansForSubjects } from '../lib/class-group-planning';
import { CurriculumImporterModal } from './CurriculumImporterModal';


const AVAILABLE_SUBJECTS = ["Inglês", "Espanhol", "Francês", "Alemão", "Matemática", "Física", "Química", "Biologia", "História", "Português", "Artes", "Geografia", "Gramática", "Literatura", "Redação", "Filosofia", "Sociologia", "Organização de Estudos", "Mentalidade"];

function createEmptyForm(): Partial<ClassGroup> {
  return {
    name: "",
    workload: 0,
    teacherIds: [""],
    studentIds: [""],
    subjects: [""],
    schedules: [],
    plans: [],
  };
}

function createEmptyPlan(subject: string): ClassGroupPlan {
  return { subject, weeklyHours: 0, strategy: '', sequences: [] };
}

export function ClassGroupsList({ userId, classGroups, setClassGroups, teachers, students, rooms, fetchData }: { userId: string, classGroups: ClassGroup[], setClassGroups: React.Dispatch<React.SetStateAction<ClassGroup[]>>, teachers: Teacher[], students: Student[], rooms: Room[], fetchData: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ClassGroup>>(createEmptyForm);
  const [activePlanningSubject, setActivePlanningSubject] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [extractedSchedules, setExtractedSchedules] = useState<any[] | null>(null);

  const updatePlan = (subject: string, update: (plan: ClassGroupPlan) => ClassGroupPlan) => {
    setForm(current => {
      const plans = current.plans || [];
      const existing = plans.find(plan => plan.subject === subject);
      const updated = update(existing || createEmptyPlan(subject));
      return {
        ...current,
        plans: existing
          ? plans.map(plan => plan.subject === subject ? updated : plan)
          : [...plans, updated],
      };
    });
  };

  const updateSequence = (subject: string, index: number, values: Partial<DidacticSequence>) => {
    updatePlan(subject, plan => ({
      ...plan,
      sequences: plan.sequences.map((sequence, sequenceIndex) => (
        sequenceIndex === index ? { ...sequence, ...values } : sequence
      )),
    }));
  };

  const moveSequence = (subject: string, index: number, direction: -1 | 1) => {
    updatePlan(subject, plan => {
      const destination = index + direction;
      if (destination < 0 || destination >= plan.sequences.length) return plan;
      const sequences = [...plan.sequences];
      [sequences[index], sequences[destination]] = [sequences[destination], sequences[index]];
      return {
        ...plan,
        sequences: sequences.map((sequence, sequenceIndex) => ({ ...sequence, order: sequenceIndex + 1 })),
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Str = (reader.result as string).split(',')[1];
        const res = await authFetch('/api/extract-schedule', {
          method: 'POST',
          body: JSON.stringify({ pdfBase64: base64Str, mimeType: file.type })
        });
        if (res.ok) {
          const data = await res.json();
          setExtractedSchedules(data.schedules.map((s: any) => ({...s, teacherId: "", roomId: ""})));
        } else {
          toast.error("Erro ao extrair horários do PDF.");
        }
        setIsUploading(false);
        e.target.value = ''; // reset file input
      };
    } catch (err) {
      toast.error("Erro ao enviar o PDF");
      setIsUploading(false);
    }
  };

  const auth = JSON.parse(localStorage.getItem('eraia_auth') || '{}');
  const authFetch = async (url: string, options: any = {}) => {
    const headers = { ...options.headers, 'Authorization': `Bearer ${auth?.token}` };
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjects = form.subjects?.filter(sub => sub && sub.trim() !== "") || [];
    const { active, orphaned } = normalizePlansForSubjects(form.plans || [], subjects);
    if (orphaned.length > 0) {
      const orphanedSubjects = orphaned.map(plan => plan.subject).join(', ');
      const shouldDiscard = window.confirm(
        `Os planejamentos de ${orphanedSubjects} não pertencem mais às disciplinas da turma. Deseja descartá-los e salvar?`,
      );
      if (!shouldDiscard) return;
    }

    const payload = {
      ...form,
      workload: Number(form.workload),
      teacherIds: form.teacherIds?.filter(id => id && id.trim() !== "") || [],
      studentIds: form.studentIds?.filter(id => id && id.trim() !== "") || [],
      subjects,
      plans: active,
    };

    try {
      if (editingId) {
        await updateClassGroupInFirebase(userId, editingId, payload);
        setClassGroups(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } as any : c));
        toast.success("Turma atualizada com sucesso");
      } else {
        const newGroup = await createClassGroupInFirebase(userId, payload);
        setClassGroups(prev => [...prev, newGroup as any]);
        toast.success("Turma criada com sucesso");
      }
      setShowModal(false);
      setEditingId(null);
      setActivePlanningSubject(null);
      setForm(createEmptyForm());
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao salvar turma: " + (e.message || String(e)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar esta turma?")) return;
    try {
      setClassGroups(prev => prev.filter(c => c.id !== id));
      await deleteClassGroupInFirebase(id);
      toast.success("Turma deletada com sucesso");
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao deletar: " + (e.message || String(e)));
    }
  };

  const handleEdit = (c: ClassGroup) => {
    setForm({
      name: c.name,
      workload: c.workload,
      teacherIds: c.teacherIds && c.teacherIds.length > 0 ? c.teacherIds : [""],
      studentIds: c.studentIds && c.studentIds.length > 0 ? c.studentIds : [""],
      subjects: c.subjects && c.subjects.length > 0 ? c.subjects : [""],
      schedules: c.schedules || [],
      plans: c.plans || [],
    });
    setEditingId(c.id);
    setShowModal(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full animate-fade-in">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-support-blue" />
            Turmas
          </h2>
          <p className="text-xs text-slate-500 mt-1">Gerenciamento de turmas, alunos e professores</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setActivePlanningSubject(null);
            setForm(createEmptyForm());
            setShowModal(true);
          }}
          className="bg-success hover:opacity-90 text-slate-900 text-xs font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Cadastrar Turma
        </button>
      </div>

      <div className="overflow-x-auto flex-1 p-5">
        {classGroups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhuma turma cadastrada</h3>
            <p className="text-xs text-slate-500">Clique em "Cadastrar Turma" para começar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classGroups.map(c => (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{c.name}</h3>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Carga Horária: {c.workload}h
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(c)}
                      className="p-1.5 text-slate-500 hover:text-support-blue bg-slate-50 hover:bg-blue-50 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support-blue"
                      title="Editar"
                      aria-label="Editar turma"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="p-1.5 text-slate-500 hover:text-danger bg-slate-50 hover:bg-red-50 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      title="Excluir"
                      aria-label="Excluir turma"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 flex-1 text-sm">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Disciplinas ({c.subjects?.length || 0})</h4>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {(c.subjects || []).map((sub, i) => (
                        <span key={i} className="bg-support-orange/10 border border-support-orange/20 text-support-orange px-2 py-0.5 rounded text-[10px] font-bold">
                          {sub}
                        </span>
                      ))}
                      {(!c.subjects || c.subjects.length === 0) && <span className="text-xs text-slate-400 italic">Nenhuma disciplina</span>}
                    </div>
                    {(c.plans || []).some(plan => plan.sequences.length > 0) && (
                      <div className="space-y-1 rounded-lg border border-blue-100 bg-blue-50/60 p-2">
                        {(c.plans || [])
                          .filter(plan => plan.sequences.length > 0)
                          .map(plan => (
                            <div key={plan.subject} className="flex items-center gap-1.5 text-[11px] font-medium text-blue-800">
                              <BookOpen className="h-3 w-3 shrink-0" />
                              <span>{plan.subject}: {plan.sequences.length} tópicos</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Professores ({c.teacherIds?.length || 0})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.teacherIds || []).map(tId => {
                        const t = teachers.find(t => t.id === tId);
                        return t ? (
                          <span key={t.id} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                            {t.name}
                          </span>
                        ) : null;
                      })}
                      {(!c.teacherIds || c.teacherIds.length === 0) && <span className="text-xs text-slate-400 italic">Nenhum professor</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Alunos ({c.studentIds?.length || 0})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(c.studentIds || []).map(sId => {
                        const s = students.find(s => s.id === sId);
                        return s ? (
                          <span key={s.id} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">
                            {s.name}
                          </span>
                        ) : null;
                      })}
                      {(!c.studentIds || c.studentIds.length === 0) && <span className="text-xs text-slate-400 italic">Nenhum aluno</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-support-blue" />
                {editingId ? "Editar Turma" : "Nova Turma"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Turma *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Turma ITA 2027"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Carga Horária (horas) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.workload || ''}
                  onChange={e => setForm({ ...form, workload: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 40"
                />
              </div>

              {/* Disciplinas */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                  <span>Disciplinas Ofertadas</span>
                </label>
                
                <div className="mt-2 bg-bg-secondary border border-slate-200/80 p-2.5 rounded-lg">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Selecione as disciplinas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_SUBJECTS.map((subj) => {
                      const currentList = form.subjects || [];
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
                            const hasPlan = (form.plans || []).some(plan => plan.subject === subj);
                            setForm({
                              ...form,
                              subjects: newList,
                              plans: !isSelected && !hasPlan
                                ? [...(form.plans || []), createEmptyPlan(subj)]
                                : form.plans || [],
                            });
                          }}
                          className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            isSelected
                              ? "bg-support-blue border-support-blue text-white shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {subj}
                          {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Planejamento por disciplina */}
              <div className="pt-2 border-t border-slate-100">
                <div className="mb-3">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Planejamento por disciplina</h4>
                  <p className="mt-1 text-xs text-slate-400">Defina a carga semanal, a estratégia e a ordem dos tópicos compartilhados pela turma.</p>
                </div>

                <div className="space-y-4">
                  {(form.subjects || []).filter(Boolean).map(subject => {
                    const plan = (form.plans || []).find(candidate => candidate.subject === subject) || createEmptyPlan(subject);
                    return (
                      <section key={subject} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800">{subject}</h5>
                            <p className="text-[11px] text-slate-400">{plan.sequences.length} tópicos no plano</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActivePlanningSubject(subject)}
                            className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-support-blue transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support-blue"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            Importar do Planejamento
                          </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                          <label className="text-xs font-bold text-slate-500">
                            Horas semanais
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={plan.weeklyHours}
                              onChange={event => updatePlan(subject, current => ({ ...current, weeklyHours: Number(event.target.value) }))}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-support-blue"
                            />
                          </label>
                          <label className="text-xs font-bold text-slate-500">
                            Estratégia
                            <textarea
                              value={plan.strategy}
                              onChange={event => updatePlan(subject, current => ({ ...current, strategy: event.target.value }))}
                              rows={2}
                              placeholder="Ex: teoria, exercícios e revisão quinzenal"
                              className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal text-slate-700 outline-none focus:ring-2 focus:ring-support-blue"
                            />
                          </label>
                        </div>

                        <div className="mt-4 space-y-2">
                          {plan.sequences.map((sequence, sequenceIndex) => (
                            <div key={`${subject}-${sequenceIndex}`} className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="grid gap-2 sm:grid-cols-[0.8fr_1.4fr]">
                                <label className="text-[10px] font-bold uppercase text-slate-400">
                                  Frente
                                  <input
                                    type="text"
                                    value={sequence.front || ''}
                                    onChange={event => updateSequence(subject, sequenceIndex, { front: event.target.value })}
                                    placeholder="Ex: Álgebra"
                                    className="mt-1 w-full rounded-md border border-slate-200 p-2 text-xs font-normal normal-case text-slate-700 outline-none focus:ring-2 focus:ring-support-blue"
                                  />
                                </label>
                                <label className="text-[10px] font-bold uppercase text-slate-400">
                                  Conteúdo
                                  <input
                                    type="text"
                                    value={sequence.content}
                                    onChange={event => updateSequence(subject, sequenceIndex, { content: event.target.value })}
                                    placeholder="Ex: Funções"
                                    className="mt-1 w-full rounded-md border border-slate-200 p-2 text-xs font-normal normal-case text-slate-700 outline-none focus:ring-2 focus:ring-support-blue"
                                  />
                                </label>
                              </div>
                              <div className="mt-2 flex flex-wrap justify-end gap-1">
                                <button
                                  type="button"
                                  disabled={sequenceIndex === 0}
                                  onClick={() => moveSequence(subject, sequenceIndex, -1)}
                                  aria-label={`Subir ${sequence.content || 'tópico'}`}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support-blue"
                                >
                                  <ArrowUp className="h-3 w-3" /> Subir
                                </button>
                                <button
                                  type="button"
                                  disabled={sequenceIndex === plan.sequences.length - 1}
                                  onClick={() => moveSequence(subject, sequenceIndex, 1)}
                                  aria-label={`Descer ${sequence.content || 'tópico'}`}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support-blue"
                                >
                                  <ArrowDown className="h-3 w-3" /> Descer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePlan(subject, current => ({
                                    ...current,
                                    sequences: current.sequences
                                      .filter((_, index) => index !== sequenceIndex)
                                      .map((item, index) => ({ ...item, order: index + 1 })),
                                  }))}
                                  aria-label={`Remover ${sequence.content || 'tópico'}`}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-bold text-danger hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                                >
                                  <Trash2 className="h-3 w-3" /> Remover
                                </button>
                              </div>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => updatePlan(subject, current => ({
                              ...current,
                              sequences: [...current.sequences, { front: '', content: '', order: current.sequences.length + 1 }],
                            }))}
                            className="flex items-center gap-1 text-xs font-bold text-support-blue hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-support-blue"
                          >
                            <Plus className="h-3 w-3" /> Adicionar manualmente
                          </button>
                        </div>
                      </section>
                    );
                  })}

                  {(form.subjects || []).filter(Boolean).length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                      Selecione uma disciplina para criar o planejamento.
                    </p>
                  )}
                </div>
              </div>

              {/* Professores */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                  <span>Professores Vinculados</span>
                </label>
                {(form.teacherIds || [""]).map((tId, index) => (
                  <div key={`t-${index}`} className="flex gap-2 mb-2">
                    <select
                      value={tId}
                      onChange={e => {
                        const newTeacherIds = [...(form.teacherIds || [""])];
                        newTeacherIds[index] = e.target.value;
                        setForm({ ...form, teacherIds: newTeacherIds });
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Selecione um professor...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.subject})</option>
                      ))}
                    </select>
                    {(form.teacherIds || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTeacherIds = [...(form.teacherIds || [""])];
                          newTeacherIds.splice(index, 1);
                          setForm({ ...form, teacherIds: newTeacherIds });
                        }}
                        className="text-slate-400 hover:text-danger p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, teacherIds: [...(form.teacherIds || []), ""] })}
                  className="text-xs font-bold text-support-blue hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar outro professor
                </button>
              </div>

              {/* Alunos */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                  <span>Alunos Vinculados</span>
                </label>
                {(form.studentIds || [""]).map((sId, index) => (
                  <div key={`s-${index}`} className="flex gap-2 mb-2">
                    <select
                      value={sId}
                      onChange={e => {
                        const newStudentIds = [...(form.studentIds || [""])];
                        newStudentIds[index] = e.target.value;
                        setForm({ ...form, studentIds: newStudentIds });
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all bg-white"
                    >
                      <option value="">Selecione um aluno...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {(form.studentIds || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newStudentIds = [...(form.studentIds || [""])];
                          newStudentIds.splice(index, 1);
                          setForm({ ...form, studentIds: newStudentIds });
                        }}
                        className="text-slate-400 hover:text-danger p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, studentIds: [...(form.studentIds || []), ""] })}
                  className="text-xs font-bold text-support-blue hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3 h-3" /> Adicionar outro aluno
                </button>
              </div>

                            {/* Horários / Schedules */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between items-center">
                  <span>Horários de Aula por Disciplina</span>
                </label>
                {(form.schedules || []).map((sch, index) => (
                  <div key={`sch-${index}`} className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex gap-2">
                      <select
                        value={sch.dayOfWeek}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].dayOfWeek = Number(e.target.value);
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
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
                        type="time"
                        value={sch.startTime}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].startTime = e.target.value;
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm"
                      />
                      <input
                        type="time"
                        value={sch.endTime}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].endTime = e.target.value;
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={sch.subject}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].subject = e.target.value;
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      >
                        <option value="">Disciplina...</option>
                        {(form.subjects || []).filter(s => s).map((sub, i) => (
                          <option key={i} value={sub}>{sub}</option>
                        ))}
                      </select>
                      <select
                        value={sch.teacherId}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].teacherId = e.target.value;
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      >
                        <option value="">Professor...</option>
                        {teachers.filter(t => Array.isArray(form.teacherIds) && form.teacherIds.includes(t.id)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <select
                        value={sch.roomId || ""}
                        onChange={e => {
                          const newSch = [...(form.schedules || [])];
                          newSch[index].roomId = e.target.value;
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="flex-1 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                      >
                        <option value="">Sala...</option>
                        {rooms && rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const newSch = [...(form.schedules || [])];
                          newSch.splice(index, 1);
                          setForm({ ...form, schedules: newSch });
                        }}
                        className="text-slate-400 hover:text-danger p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, schedules: [...(form.schedules || []), { dayOfWeek: 1, startTime: "08:00", endTime: "09:00", subject: "", teacherId: "", roomId: "" }] })}
                    className="text-xs font-bold text-support-blue hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar horário
                  </button>
                  <label className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 transition-colors">
                    {isUploading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                    {isUploading ? "Processando PDF..." : "Importar Grade em PDF"}
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-support-blue hover:opacity-90 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </form>
          </div>
      </div>
      )}

      {activePlanningSubject && (
        <CurriculumImporterModal
          subject={activePlanningSubject}
          onClose={() => setActivePlanningSubject(null)}
          onImport={sequences => {
            updatePlan(activePlanningSubject, plan => ({
              ...plan,
              sequences: mergeImportedSequences(plan.sequences, sequences),
            }));
            setActivePlanningSubject(null);
          }}
        />
      )}

      {extractedSchedules && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60] animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 text-lg">Revisar Horários Importados</h3>
                <p className="text-xs text-slate-500">O preenchimento automático leu o PDF. Confirme ou edite as disciplinas abaixo.</p>
              </div>
              <button onClick={() => setExtractedSchedules(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              {extractedSchedules.map((sch, index) => (
                <div key={`ext-${index}`} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex gap-2">
                    <select
                      value={sch.dayOfWeek}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].dayOfWeek = Number(e.target.value);
                        setExtractedSchedules(newSch);
                      }}
                      className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
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
                      type="time"
                      value={sch.startTime}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].startTime = e.target.value;
                        setExtractedSchedules(newSch);
                      }}
                      className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm"
                    />
                    <input
                      type="time"
                      value={sch.endTime}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].endTime = e.target.value;
                        setExtractedSchedules(newSch);
                      }}
                      className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Disciplina..."
                      value={sch.subject}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].subject = e.target.value;
                        setExtractedSchedules(newSch);
                      }}
                      className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                    />
                    <select
                      value={sch.teacherId}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].teacherId = e.target.value;
                        setExtractedSchedules(newSch);
                      }}
                      className="w-1/3 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                    >
                      <option value="">Professor...</option>
                      {teachers.filter(t => Array.isArray(form.teacherIds) && form.teacherIds.includes(t.id)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <select
                      value={sch.roomId || ""}
                      onChange={e => {
                        const newSch = [...extractedSchedules];
                        newSch[index].roomId = e.target.value;
                        setExtractedSchedules(newSch);
                      }}
                      className="flex-1 border border-slate-200 rounded-lg p-2 text-sm bg-white"
                    >
                      <option value="">Sala...</option>
                      {rooms && rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const newSch = [...extractedSchedules];
                        newSch.splice(index, 1);
                        setExtractedSchedules(newSch);
                      }}
                      className="text-slate-400 hover:text-danger p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setExtractedSchedules(null)}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const newFormSubjects = new Set(form.subjects || []);
                  extractedSchedules.forEach(s => {
                    if (s.subject) newFormSubjects.add(s.subject);
                  });
                  setForm({
                    ...form,
                    subjects: Array.from(newFormSubjects),
                    schedules: [...(form.schedules || []), ...extractedSchedules]
                  });
                  setExtractedSchedules(null);
                }}
                className="bg-support-blue hover:opacity-90 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Adicionar à Turma
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
