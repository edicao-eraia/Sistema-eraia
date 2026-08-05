import React, { useState, useRef } from 'react';
import { Sparkles, Mic, FileText, Send, X, AlertCircle, Save, Square } from 'lucide-react';
import toast from 'react-hot-toast';

interface ERaiaAssistantProps {
  auth: any;
  authFetch: (url: string, options?: any) => Promise<any>;
  contextContext: string;
  students: any[];
  teachers: any[];
  guardians: any[];
  onSaved: () => void;
}

export const ERaiaAssistant: React.FC<ERaiaAssistantProps> = ({ auth, authFetch, contextContext, students, teachers, guardians, onSaved }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  
  const [draftResult, setDraftResult] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Erro ao acessar microfone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('contextContext', contextContext);
    
    await processWithAI(formData);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contextContext', contextContext);
    
    await processWithAI(formData);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('text', textInput);
    formData.append('contextContext', contextContext);
    
    await processWithAI(formData);
    setTextInput('');
  };

  const processWithAI = async (formData: FormData) => {
    try {
      const response = await authFetch('/api/ai/auto-fill', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Failed to process AI input');
      
      const result = await response.json();
      
      // Post-process to detect conflicts (Update vs Create)
      let finalResult = { ...result };
      if (result.action === 'CREATE' && result.data && result.data.email) {
        // Check for duplicates
        if (result.entity === 'Student') {
          const exists = students.find(s => s.email === result.data.email);
          if (exists) {
            finalResult.action = 'UPDATE';
            finalResult.data.id = exists.id;
            finalResult.originalData = exists;
          }
        } else if (result.entity === 'Teacher') {
          const exists = teachers.find(t => t.email === result.data.email);
          if (exists) {
            finalResult.action = 'UPDATE';
            finalResult.data.id = exists.id;
            finalResult.originalData = exists;
          }
        } else if (result.entity === 'Guardian') {
          const exists = guardians.find(g => g.email === result.data.email || g.cpf === result.data.cpf);
          if (exists) {
            finalResult.action = 'UPDATE';
            finalResult.data.id = exists.id;
            finalResult.originalData = exists;
          }
        }
      }
      
      setDraftResult(finalResult);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar dados com IA.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draftResult) return;
    
    setIsProcessing(true);
    try {
      let endpoint = '';
      if (draftResult.entity === 'Student') endpoint = '/api/students';
      else if (draftResult.entity === 'Teacher') endpoint = '/api/teachers';
      else if (draftResult.entity === 'Guardian') endpoint = '/api/guardians';
      else if (draftResult.entity === 'Room') endpoint = '/api/rooms';
      else if (draftResult.entity === 'Booking') endpoint = '/api/bookings';
      
      if (!endpoint) throw new Error('Entidade desconhecida');

      // Note: If update, we might need a PUT instead, but according to server.ts, 
      // some POST endpoints handle updates if id is present, OR we use PUT.
      // Let's use PUT if UPDATE and id exists, else POST.
      const isUpdate = draftResult.action === 'UPDATE' && draftResult.data.id;
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `${endpoint}/${draftResult.data.id}` : endpoint;
      
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(draftResult.data)
      });
      
      if (!res.ok) {
         const err = await res.json();
         throw new Error(err.error || 'Erro ao salvar');
      }
      
      toast.success(`${draftResult.entity} ${isUpdate ? 'atualizado' : 'criado'} com sucesso!`);
      setDraftResult(null);
      onSaved();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar rascunho.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {isOpen && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-80 animate-fade-in origin-bottom-right">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-support-blue">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-sm">Preenchimento IA</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Envie um áudio, texto ou documento. A IA preencherá automaticamente os formulários.
            </p>
            
            <div className="flex flex-col gap-3">
              <textarea 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Ex: Cadastre o aluno João da Silva..."
                className="w-full text-xs p-3 rounded-lg border border-slate-200 bg-slate-50 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-support-blue"
              />
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${isRecording ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isRecording ? 'Parar' : 'Gravar Áudio'}
                </button>
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Documento
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,.pdf,.doc,.docx,audio/*" 
                />
              </div>
              
              <button 
                onClick={handleTextSubmit}
                disabled={isProcessing || !textInput.trim()}
                className="w-full py-2 rounded-lg text-xs font-bold bg-support-blue text-white hover:bg-blue-600 flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? 'Processando...' : 'Enviar Texto'}
                {!isProcessing && <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 bg-support-blue hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Draft Review Modal */}
      {draftResult && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-lg">Revisão de Dados (Rascunho)</h2>
                  <p className="text-xs text-slate-500">A IA extraiu as seguintes informações</p>
                </div>
              </div>
              <button onClick={() => setDraftResult(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {draftResult.action === 'UPDATE' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Registro Existente Detectado</h4>
                    <p className="text-xs mt-1">A IA identificou que este registro já existe no sistema. A ação foi alterada para <strong>Atualização</strong> em vez de Criação para evitar duplicidade.</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Metadados</h4>
                  <div className="space-y-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block mb-1">Entidade Detectada</span>
                      <span className="font-bold text-sm text-slate-700">{draftResult.entity}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 block mb-1">Ação Sugerida</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${draftResult.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {draftResult.action}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Campos Extraídos</h4>
                  <div className="space-y-3">
                    {draftResult.data && Object.keys(draftResult.data).length > 0 ? (
                      Object.entries(draftResult.data).map(([key, value]) => {
                        const originalValue = draftResult.originalData ? draftResult.originalData[key] : undefined;
                        const isDifferent = originalValue !== undefined && String(originalValue) !== String(value);
                        
                        return (
                        <div key={key} className={`bg-white border p-3 rounded-lg ${isDifferent ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block">{key}</label>
                            {isDifferent && <span className="text-[9px] uppercase font-bold text-amber-600 bg-amber-100 px-1.5 rounded">Alterado</span>}
                          </div>
                          <input 
                            type="text"
                            value={String(value || '')}
                            onChange={(e) => {
                              setDraftResult({
                                ...draftResult,
                                data: {
                                  ...draftResult.data,
                                  [key]: e.target.value
                                }
                              })
                            }}
                            className="w-full text-sm text-slate-800 bg-transparent border-none p-0 focus:ring-0 mb-1"
                          />
                          {isDifferent && (
                            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 mt-1 flex items-center gap-1">
                              <span className="line-through text-slate-400">{String(originalValue || 'vazio')}</span>
                            </div>
                          )}
                        </div>
                      )})
                    ) : (
                      <p className="text-sm text-slate-500 italic">Nenhum campo estruturado foi encontrado.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setDraftResult(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Descartar
              </button>
              
              {auth?.user?.role === 'Administrador' ? (
                <button 
                  onClick={handleSaveDraft}
                  disabled={isProcessing}
                  className="px-6 py-2 rounded-lg text-sm font-bold bg-support-blue text-white hover:bg-blue-600 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Salvando...' : 'Aprovar e Salvar'}
                  {!isProcessing && <Save className="w-4 h-4" />}
                </button>
              ) : (
                <div className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Apenas administradores podem aprovar
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
