import React, { useState } from 'react';
import { Booking, Student, Teacher, Room } from '../types';

export function BookingEditModal({
  booking,
  students,
  teachers,
  rooms,
  userRole,
  onClose,
  onSave
}: {
  booking: Booking;
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  userRole: string;
  onClose: () => void;
  onSave: (id: string, updateData: Partial<Booking>) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState<'single'|'following'>('single');
  const [updateConflicts, setUpdateConflicts] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Booking>>({
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    studentId: booking.studentId,
    teacherId: booking.teacherId,
    roomId: booking.roomId,
    status: booking.status,
    topic: booking.topic || '',
    front: booking.front || '',
    observations: booking.observations || '',
    materials: booking.materials || '',
    topicFinished: booking.topicFinished || false
  });

  const isTeacher = userRole === 'Professor';
  const isStudent = userRole === 'Aluno';
  const isAdmin = userRole === 'Administrador';

  const handleSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setUpdateConflicts([]);
    
    try {
      const updateData = { ...formData, editMode, forceSchedule: force };
      await onSave(booking.id, updateData);
    } catch(err: any) {
      if (err.conflicts) {
        setUpdateConflicts(err.conflicts);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 text-lg">Detalhes da Aula</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {updateConflicts.length > 0 && (
            <div className="mb-4 p-4 bg-[#FF2E8A]/10 border border-[#FF2E8A]/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-[#FF2E8A]">
                <span className="w-5 h-5 font-bold text-xl">⚠️</span>
                <strong className="text-sm">Conflitos de Agendamento</strong>
              </div>
              <ul className="list-disc pl-5 text-xs text-[#FF2E8A]/80 space-y-1 mb-4">
                {updateConflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              
              {isAdmin ? (
                <button 
                  onClick={(e) => handleSubmit(e, true)}
                  className="w-full bg-[#FF2E8A] hover:bg-[#FF2E8A]/90 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Agendar mesmo assim
                </button>
              ) : (
                <p className="text-[10px] text-slate-500 italic">Somente um Administrador pode forçar este agendamento.</p>
              )}
            </div>
          )}
          <form id="edit-booking-form" onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Aluno</label>
                <select 
                  value={formData.studentId}
                  onChange={e => setFormData({...formData, studentId: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                >
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Professor</label>
                <select 
                  value={formData.teacherId}
                  onChange={e => setFormData({...formData, teacherId: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Data</label>
                <input 
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Início</label>
                <input 
                  type="time"
                  value={formData.startTime}
                  onChange={e => setFormData({...formData, startTime: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Término</label>
                <input 
                  type="time"
                  value={formData.endTime}
                  onChange={e => setFormData({...formData, endTime: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sala</label>
                <select 
                  value={formData.roomId}
                  onChange={e => setFormData({...formData, roomId: e.target.value})}
                  disabled={isTeacher || isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 bg-bg-secondary disabled:opacity-70"
                >
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  disabled={isStudent}
                  className="w-full text-sm font-bold border border-slate-200 rounded-lg p-2.5 bg-white disabled:opacity-70"
                >
                  <option value="agendada">Agendada</option>
                  <option value="realizada_presenca">Realizada (Presença)</option>
                  <option value="realizada_falta">Realizada (Falta)</option>
                  {isAdmin && <option value="desmarcada">Desmarcada</option>}
                  {isAdmin && <option value="cancelada">Cancelada</option>}
                </select>
              </div>
            </div>

            {booking.seriesId && !isTeacher && !isStudent && (
              <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-4 mt-4">
                <h4 className="font-bold text-sm text-indigo-800 mb-2">Série Recorrente</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editMode" value="single" checked={editMode === 'single'} onChange={() => setEditMode('single')} />
                    <span className="text-xs font-bold text-slate-700">Editar apenas este agendamento</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="editMode" value="following" checked={editMode === 'following'} onChange={() => setEditMode('following')} />
                    <span className="text-xs font-bold text-slate-700">Editar este e todos os posteriores</span>
                  </label>
                </div>
              </div>
            )}
            <hr className="my-4 border-slate-100" />
            <h4 className="font-bold text-slate-700 text-sm mb-2">Planejamento e Execução</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Conteúdo Planejado</label>
                <input 
                  type="text"
                  value={formData.topic}
                  onChange={e => setFormData({...formData, topic: e.target.value})}
                  disabled={isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 disabled:opacity-70"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Frente/Módulo</label>
                <input 
                  type="text"
                  value={formData.front}
                  onChange={e => setFormData({...formData, front: e.target.value})}
                  disabled={isStudent}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 disabled:opacity-70"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Observações</label>
              <textarea 
                value={formData.observations}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                disabled={isStudent}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 min-h-[80px] disabled:opacity-70"
              />
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Materiais Utilizados</label>
              <textarea 
                value={formData.materials}
                onChange={e => setFormData({...formData, materials: e.target.value})}
                disabled={isStudent}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5 min-h-[60px] disabled:opacity-70"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox"
                id="topicFinished"
                checked={formData.topicFinished}
                onChange={e => setFormData({...formData, topicFinished: e.target.checked})}
                disabled={isStudent}
                className="w-4 h-4 text-success rounded"
              />
              <label htmlFor="topicFinished" className="text-sm font-bold text-slate-700 cursor-pointer">
                Conteúdo Finalizado (Meta Atingida)
              </label>
            </div>

          </form>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-bg-secondary rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-sm text-slate-600 hover:text-slate-800">
            {isStudent ? 'Fechar' : 'Cancelar'}
          </button>
          {!isStudent && (
            <button 
              type="submit" 
              form="edit-booking-form"
              className="px-6 py-2 font-bold text-sm bg-success text-slate-900 rounded-lg hover:opacity-90 transition-colors shadow-sm"
            >
              Salvar Alterações
            </button>
          )}
          {isTeacher && formData.status === 'agendada' && (
            <button
              type="button"
              onClick={() => {
                setFormData({...formData, status: 'realizada_presenca'});
              }}
              className="px-6 py-2 font-bold text-sm bg-success text-slate-900 rounded-lg hover:opacity-90 transition-colors shadow-sm"
            >
              Marcar como Concluída
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
