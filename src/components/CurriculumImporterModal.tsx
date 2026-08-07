import React, { useState, useEffect } from 'react';
import { X, Search, CheckSquare, Square, Zap, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DisciplineSyllabus, DidacticSequence, MacroContent, MicroContent } from '../types';

interface CurriculumImporterModalProps {
  subject: string;
  onClose: () => void;
  onImport: (sequences: DidacticSequence[]) => void;
}

export function CurriculumImporterModal({ subject, onClose, onImport }: CurriculumImporterModalProps) {
  const [syllabuses, setSyllabuses] = useState<DisciplineSyllabus[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  
  const [selectedMicros, setSelectedMicros] = useState<Set<string>>(new Set());
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionNotes, setSuggestionNotes] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('eraia_curriculums');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as DisciplineSyllabus[];
        setSyllabuses(parsed);
        
        // Auto-select based on subject string match
        const match = parsed.find(p => {
          if (!p.disciplineName || !subject) return false;
          const pName = String(p.disciplineName).toLowerCase();
          const sName = String(subject).toLowerCase();
          return pName.includes(sName) || sName.includes(pName);
        });
        if (match) {
          setSelectedDisciplineId(match.id);
        } else if (parsed.length > 0) {
          setSelectedDisciplineId(parsed[0].id);
        }
      } catch (e) {
        console.error(e);
        toast.error('Não foi possível carregar os currículos salvos.');
      }
    }
  }, [subject]);

  const activeSyllabus = syllabuses.find(s => s.id === selectedDisciplineId);

  const toggleMicro = (id: string) => {
    const next = new Set(selectedMicros);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMicros(next);
  };

  const handleSuggest = () => {
    if (!activeSyllabus) return;
    setIsSuggesting(true);
    
    // Simulating AI suggestion: pick first 5 microcontents across different macros
    setTimeout(() => {
      const suggested = new Set<string>();
      let count = 0;
      for (const macro of activeSyllabus.macroContents) {
        if (macro.microContents.length > 0 && count < 5) {
          suggested.add(macro.microContents[0].id);
          count++;
        }
      }
      setSelectedMicros(suggested);
      setSuggestionNotes(`Sugestão baseada em nivelamento padrão: ${count} tópicos essenciais iniciais selecionados.`);
      setIsSuggesting(false);
    }, 1500);
  };

  const handleConfirm = () => {
    if (!activeSyllabus) return;
    
    const sequences: DidacticSequence[] = [];
    let order = 1;
    
    activeSyllabus.macroContents.forEach(macro => {
      macro.microContents.forEach(micro => {
        if (selectedMicros.has(micro.id)) {
          sequences.push({
            front: macro.name,
            content: micro.name,
            order: order++
          });
        }
      });
    });
    
    onImport(sequences);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70] animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl flex flex-col h-[85vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-lg">Importar do Planejamento</h3>
            <p className="text-xs text-slate-500">Selecione tópicos da grade curricular para adicionar ao plano.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disciplina Origem</label>
              <select 
                value={selectedDisciplineId}
                onChange={e => {
                  setSelectedDisciplineId(e.target.value);
                  setSelectedMicros(new Set());
                  setSuggestionNotes('');
                }}
                className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white focus:ring-2 focus:ring-support-blue focus:border-transparent outline-none"
              >
                {syllabuses.length === 0 && <option value="">Nenhum currículo encontrado</option>}
                {syllabuses.map(s => (
                  <option key={s.id} value={s.id}>{s.disciplineName}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleSuggest}
              disabled={isSuggesting || !activeSyllabus}
              className="w-full sm:w-auto bg-support-purple hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSuggesting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {isSuggesting ? "Analisando..." : "Sugerir Sequência"}
            </button>
          </div>
          
          {suggestionNotes && (
            <div className="mt-3 bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-support-blue shrink-0 mt-0.5" />
              <p className="text-xs text-support-blue">{suggestionNotes}</p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/50">
          {!activeSyllabus ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Selecione uma disciplina para ver os tópicos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeSyllabus.macroContents.map(macro => (
                <div key={macro.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="font-bold text-slate-700 text-sm">{macro.name}</h4>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{macro.microContents.length} tópicos</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {macro.microContents.map(micro => {
                      const isSelected = selectedMicros.has(micro.id);
                      return (
                        <div 
                          key={micro.id} 
                          onClick={() => toggleMicro(micro.id)}
                          className={`p-3 flex items-start gap-3 cursor-pointer transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/30' : ''}`}
                        >
                          <button className={`mt-0.5 shrink-0 ${isSelected ? 'text-support-blue' : 'text-slate-300'}`}>
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                          <div>
                            <p className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                              {micro.name}
                            </p>
                            {micro.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{micro.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {macro.microContents.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        Nenhum microconteúdo cadastrado.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={selectedMicros.size === 0}
            className="bg-support-blue hover:opacity-90 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Check className="w-4 h-4" />
            Adicionar {selectedMicros.size} Tópicos
          </button>
        </div>
      </div>
    </div>
  );
}
