import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Book, FileText, ChevronDown, ChevronRight, Save, Trash2, List, Target, Edit2, X, Plus, Check } from 'lucide-react';
import { DisciplineSyllabus, MacroContent, MicroContent } from '../types';
import { saveAllCurriculumsInFirebase, fetchCurriculumsFromFirebase } from '../lib/db';

export function CurriculumPlanner({ auth }: { auth?: any }) {
  const [syllabuses, setSyllabuses] = useState<DisciplineSyllabus[]>([]);
  const [activeDiscipline, setActiveDiscipline] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);
  
  const [expandedMacros, setExpandedMacros] = useState<string[]>([]);
  
  // Edit states
  const [editingMicro, setEditingMicro] = useState<string | null>(null);
  const [editingMacro, setEditingMacro] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    const loadData = async () => {
      // Tenta carregar do LocalStorage primeiro para exibição rápida
      const saved = localStorage.getItem('eraia_curriculums');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSyllabuses(parsed);
          if (parsed.length > 0) {
            setActiveDiscipline(parsed[0].id);
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Se estiver logado, sincroniza com o Firebase (sobrescrevendo o local se necessário ou carregando mais atualizado)
      if (auth?.user?.id) {
        try {
          const firebaseData = await fetchCurriculumsFromFirebase(auth.user.id);
          if (firebaseData && firebaseData.length > 0) {
            setSyllabuses(firebaseData as DisciplineSyllabus[]);
            localStorage.setItem('eraia_curriculums', JSON.stringify(firebaseData));
            if (!activeDiscipline) {
              setActiveDiscipline(firebaseData[0].id);
            }
          }
        } catch (error) {
          console.error("Erro ao carregar planejamentos do Firebase", error);
        }
      }
    };
    
    loadData();
  }, [auth?.user?.id]);

  const saveToLocal = (data: DisciplineSyllabus[]) => {
    setSyllabuses(data);
    localStorage.setItem('eraia_curriculums', JSON.stringify(data));
  };

  const syncWithFirebase = async (data: DisciplineSyllabus[]) => {
    if (!auth?.user?.id) return;
    try {
      await saveAllCurriculumsInFirebase(auth.user.id, data);
      //toast.success('Sincronizado com a nuvem');
    } catch (error) {
      console.error("Erro na sincronização", error);
      toast.error('Erro ao sincronizar com a nuvem');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const newSyllabuses: DisciplineSyllabus[] = [];
        
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
          
          if (rows.length === 0) return;
          
          let headerRowIndex = -1;
          let macroIdx = -1, microIdx = -1, descIdx = -1;
          
          // Procurar a linha de cabeçalho nas primeiras 10 linhas
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const rowStr = rows[i].map(h => String(h || '').toLowerCase().trim());
            macroIdx = rowStr.findIndex(h => h.includes('macro'));
            microIdx = rowStr.findIndex(h => h.includes('micro') || h.includes('tópico') || h.includes('topico'));
            descIdx = rowStr.findIndex(h => h.includes('descri'));
            
            if (macroIdx !== -1 || microIdx !== -1) {
              headerRowIndex = i;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            // Se não encontrou cabeçalho claro, assume colunas 0, 1, 2 e começa da linha 0 ou 1
            macroIdx = 0; microIdx = 1; descIdx = 2;
            headerRowIndex = 0;
          }
          
          if (macroIdx === -1) macroIdx = 0;
          if (microIdx === -1) microIdx = 1;
          if (descIdx === -1) descIdx = 2;
          
          const macroMap = new Map<string, MacroContent>();
          let lastMacroName = 'Outros';
          
          for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;
            
            let macroStr = String(row[macroIdx] || '').trim();
            const microStr = String(row[microIdx] || '').trim();
            const descStr = String(row[descIdx] || '').trim();
            
            // Se a linha inteira for vazia, pular
            if (!macroStr && !microStr && !descStr) continue;
            
            // Lógica de "fill down" (mesclar células verticalmente)
            if (macroStr) {
              lastMacroName = macroStr;
            } else {
              macroStr = lastMacroName;
            }
            
            if (!macroStr && !microStr) continue;
            
            const mName = macroStr || 'Outros';
            if (!macroMap.has(mName)) {
              macroMap.set(mName, {
                id: crypto.randomUUID(),
                name: mName,
                microContents: []
              });
            }
            
            if (microStr) {
              macroMap.get(mName)!.microContents.push({
                id: crypto.randomUUID(),
                name: microStr,
                description: descStr
              });
            }
          }
          
          if (macroMap.size > 0) {
            newSyllabuses.push({
              id: crypto.randomUUID(),
              disciplineName: sheetName,
              macroContents: Array.from(macroMap.values())
            });
          }
        });
        
        const merged = [...syllabuses, ...newSyllabuses];
        saveToLocal(merged);
        syncWithFirebase(merged);
        if (merged.length > 0 && !activeDiscipline) {
          setActiveDiscipline(merged[0].id);
        }
        
      } catch (err) {
        console.error(err);
        toast.error('Erro ao processar o arquivo Excel.');
      }
      
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const clearData = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Dados',
      message: 'Tem certeza que deseja apagar todos os planejamentos importados?',
      onConfirm: () => {
        saveToLocal([]);
        syncWithFirebase([]);
        setActiveDiscipline(null);
        toast.success('Todos os planejamentos foram apagados.');
      }
    });
  };

  const toggleMacro = (id: string) => {
    setExpandedMacros(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // MACRO ACTIONS
  const startEditMacro = (macro: MacroContent) => {
    setEditingMacro(macro.id);
    setEditForm({ name: macro.name });
  };

  const saveMacro = (sylId: string, macroId: string) => {
    const updated = syllabuses.map(syl => {
      if (syl.id !== sylId) return syl;
      return {
        ...syl,
        macroContents: syl.macroContents.map(m => 
          m.id === macroId ? { ...m, name: editForm.name } : m
        )
      };
    });
    saveToLocal(updated);
    syncWithFirebase(updated);
    setEditingMacro(null);
    toast.success('Macroconteúdo atualizado');
  };

  const deleteMacro = (sylId: string, macroId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Macroconteúdo',
      message: 'Tem certeza que deseja excluir este macroconteúdo e todos os seus tópicos?',
      onConfirm: () => {
        const updated = syllabuses.map(syl => {
          if (syl.id !== sylId) return syl;
          return {
            ...syl,
            macroContents: syl.macroContents.filter(m => m.id !== macroId)
          };
        });
        saveToLocal(updated);
        syncWithFirebase(updated);
        toast.success('Macroconteúdo excluído');
      }
    });
  };

  // MICRO ACTIONS
  const startEditMicro = (micro: MicroContent) => {
    setEditingMicro(micro.id);
    setEditForm({ name: micro.name, description: micro.description || '' });
  };

  const saveMicro = (sylId: string, macroId: string, microId: string) => {
    const updated = syllabuses.map(syl => {
      if (syl.id !== sylId) return syl;
      return {
        ...syl,
        macroContents: syl.macroContents.map(m => {
          if (m.id !== macroId) return m;
          return {
            ...m,
            microContents: m.microContents.map(micro => 
              micro.id === microId ? { ...micro, name: editForm.name, description: editForm.description } : micro
            )
          };
        })
      };
    });
    saveToLocal(updated);
    syncWithFirebase(updated);
    setEditingMicro(null);
    toast.success('Tópico atualizado');
  };

  const deleteMicro = (sylId: string, macroId: string, microId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Tópico',
      message: 'Tem certeza que deseja excluir este tópico?',
      onConfirm: () => {
        const updated = syllabuses.map(syl => {
          if (syl.id !== sylId) return syl;
          return {
            ...syl,
            macroContents: syl.macroContents.map(m => {
              if (m.id !== macroId) return m;
              return {
                ...m,
                microContents: m.microContents.filter(micro => micro.id !== microId)
              };
            })
          };
        });
        saveToLocal(updated);
        syncWithFirebase(updated);
        toast.success('Tópico excluído');
      }
    });
  };

  const activeSyl = syllabuses.find(s => s.id === activeDiscipline);

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Target className="w-6 h-6 text-support-blue" />
            Planejamentos e Currículos
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Importe planilhas com a grade de disciplinas (Macro e Microconteúdos). Cada aba da planilha representa uma disciplina.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syllabuses.length > 0 && (
            <button 
              onClick={clearData}
              className="text-sm font-bold text-danger hover:bg-danger/10 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Limpar Dados
            </button>
          )}
          <label className="bg-support-blue hover:opacity-90 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-all shadow-sm">
            <Upload className="w-4 h-4" />
            Importar Planilha
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {syllabuses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 flex flex-col items-center justify-center text-center">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-700 text-lg">Nenhum planejamento importado</h3>
            <p className="text-sm text-slate-500 max-w-md mt-2">
              Faça o upload de uma planilha contendo as colunas de "Macroconteúdo", "Microconteúdo" e "Descrição" em abas separadas por disciplina.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Filters by Discipline */}
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {syllabuses.map(syl => (
                  <button
                    key={syl.id}
                    onClick={() => setActiveDiscipline(syl.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeDiscipline === syl.id 
                        ? 'bg-support-blue text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {syl.disciplineName}
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeDiscipline === syl.id ? 'bg-white/20' : 'bg-slate-200'
                    }`}>
                      {syl.macroContents.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Discipline Content */}
            {activeSyl && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{activeSyl.disciplineName}</h3>
                    <p className="text-xs text-slate-500">Tópicos e Macroconteúdos</p>
                  </div>
                </div>
                
                <div className="p-4 flex flex-col gap-4">
                  {activeSyl.macroContents.map(macro => (
                    <div key={macro.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
                        {editingMacro === macro.id ? (
                          <div className="flex-1 flex items-center gap-2 mr-4">
                            <input
                              type="text"
                              value={editForm.name}
                              onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-support-blue outline-none"
                              autoFocus
                            />
                            <button onClick={() => saveMacro(activeSyl.id, macro.id)} className="p-1.5 text-success hover:bg-success/10 rounded-lg">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingMacro(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="flex-1 flex items-center gap-2 cursor-pointer"
                            onClick={() => toggleMacro(macro.id)}
                          >
                            {expandedMacros.includes(macro.id) ? (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            )}
                            <h4 className="font-bold text-sm text-slate-700">{macro.name}</h4>
                            <span className="text-xs text-slate-400 ml-2">({macro.microContents.length} tópicos)</span>
                          </div>
                        )}
                        
                        {editingMacro !== macro.id && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEditMacro(macro)} className="p-1.5 text-slate-400 hover:text-support-blue hover:bg-blue-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteMacro(activeSyl.id, macro.id)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {expandedMacros.includes(macro.id) && (
                        <div className="p-3 flex flex-col gap-2 bg-white">
                          {macro.microContents.map(micro => (
                            <div key={micro.id} className="flex flex-col p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                              {editingMicro === micro.id ? (
                                <div className="flex flex-col gap-2">
                                  <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-1.5 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-support-blue outline-none"
                                    placeholder="Microconteúdo"
                                  />
                                  <textarea
                                    value={editForm.description}
                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-support-blue outline-none min-h-[60px]"
                                    placeholder="Descrição (opcional)"
                                  />
                                  <div className="flex justify-end gap-2 mt-1">
                                    <button onClick={() => setEditingMicro(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg">
                                      Cancelar
                                    </button>
                                    <button onClick={() => saveMicro(activeSyl.id, macro.id, micro.id)} className="px-3 py-1.5 text-xs font-bold bg-support-blue text-white hover:bg-blue-600 rounded-lg">
                                      Salvar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-2 flex-1">
                                    <List className="w-4 h-4 text-support-blue mt-0.5 shrink-0" />
                                    <div>
                                      <span className="text-sm font-bold text-slate-700 block">{micro.name}</span>
                                      {micro.description && (
                                        <p className="text-xs text-slate-500 mt-1">{micro.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => startEditMicro(micro)} className="p-1.5 text-slate-400 hover:text-support-blue hover:bg-blue-50 rounded-lg transition-colors">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteMicro(activeSyl.id, macro.id, micro.id)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                          {macro.microContents.length === 0 && (
                            <p className="text-xs text-slate-400 italic p-2 text-center">Nenhum tópico neste macroconteúdo.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {activeSyl.macroContents.length === 0 && (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                      <p className="text-sm text-slate-500">Nenhum conteúdo cadastrado para esta disciplina.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-sm text-slate-600 mb-6">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-white bg-danger hover:bg-red-600 rounded-xl transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
