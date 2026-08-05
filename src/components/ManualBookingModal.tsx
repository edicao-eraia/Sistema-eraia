import { createBookingInFirebase } from '../lib/db';
import React, { useState } from 'react';
import { Booking, Student, Teacher, Room, ClassGroup } from '../types';
import { AlertTriangle } from 'lucide-react';

interface ManualBookingModalProps {
  students: Student[];
  teachers: Teacher[];
  rooms: Room[];
  classGroups: ClassGroup[];
  onClose: () => void;
  onSuccess: (bookings: Booking[]) => void;
  auth: any;
  authFetch: any;
}

export const ManualBookingModal: React.FC<ManualBookingModalProps> = ({ students, teachers, rooms, classGroups, onClose, onSuccess, auth, authFetch }) => {
  const [newBooking, setNewBooking] = useState({
    bookingType: 'individual' as 'individual' | 'class',
    studentIds: [] as string[],
    classGroupId: "",
    teacherId: "",
    roomId: "",
    date: new Date().toISOString().split('T')[0],
    startTime: "09:00",
    endTime: "10:00",
    recurrence: {
      enabled: false,
      daysOfWeek: [] as number[],
      occurrences: 4
    },
    forceSchedule: false
  });
  const [bookingSubmitError, setBookingSubmitError] = useState<string | null>(null);
  const [bookingSubmitSuccess, setBookingSubmitSuccess] = useState<string | null>(null);
  const [bookingConflicts, setBookingConflicts] = useState<string[]>([]);

  const handleManualBookingSubmit = async (e: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    setBookingSubmitError(null);
    setBookingSubmitSuccess(null);
    setBookingConflicts([]);

    try {
      const payload = { ...newBooking, forceSchedule: force };
      
      const response = await authFetch("/api/bookings/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409 && data.conflicts) {
          setBookingConflicts(data.conflicts);
          return;
        }
        setBookingSubmitError(data.error || "Erro ao criar agendamento");
        return;
      }
      
      setBookingSubmitSuccess("Agendamento(s) criado(s) com sucesso!");
      
      setTimeout(() => {
        onSuccess(data.bookings || []);
      }, 1500);
      
    } catch (err) {
      setBookingSubmitError("Erro de conexão ao servidor");
    }
  };

  const handleDayToggle = (day: number) => {
    const currentDays = newBooking.recurrence.daysOfWeek;
    if (currentDays.includes(day)) {
      setNewBooking({ ...newBooking, recurrence: { ...newBooking.recurrence, daysOfWeek: currentDays.filter(d => d !== day) }});
    } else {
      setNewBooking({ ...newBooking, recurrence: { ...newBooking.recurrence, daysOfWeek: [...currentDays, day] }});
    }
  };

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Novo Agendamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {bookingSubmitSuccess && (
            <div className="mb-4 p-3 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-bold">
              {bookingSubmitSuccess}
            </div>
          )}
          
          {bookingSubmitError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold">
              {bookingSubmitError}
            </div>
          )}

          {bookingConflicts.length > 0 && (
            <div className="mb-4 p-4 bg-[#FF2E8A]/10 border border-[#FF2E8A]/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-[#FF2E8A]">
                <AlertTriangle className="w-5 h-5" />
                <strong className="text-sm">Conflitos de Agendamento</strong>
              </div>
              <ul className="list-disc pl-5 text-xs text-[#FF2E8A]/80 space-y-1 mb-4">
                {bookingConflicts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              
              {auth?.user?.role === "Administrador" ? (
                <button 
                  onClick={(e) => handleManualBookingSubmit(e, true)}
                  className="w-full bg-[#FF2E8A] hover:bg-[#FF2E8A]/90 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Agendar mesmo assim
                </button>
              ) : (
                <p className="text-[10px] text-slate-500 italic">Somente um Administrador pode forçar este agendamento.</p>
              )}
            </div>
          )}

          <form onSubmit={(e) => handleManualBookingSubmit(e, false)} className="space-y-4">
            
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                className={`flex-1 text-xs py-1.5 rounded-md font-bold ${newBooking.bookingType === 'individual' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                onClick={() => setNewBooking({...newBooking, bookingType: 'individual', classGroupId: ''})}
              >
                Aula Individual
              </button>
              <button
                type="button"
                className={`flex-1 text-xs py-1.5 rounded-md font-bold ${newBooking.bookingType === 'class' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                onClick={() => setNewBooking({...newBooking, bookingType: 'class', studentIds: []})}
              >
                Aula em Turma
              </button>
            </div>

            {newBooking.bookingType === 'individual' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Alunos</label>
                <select
                  required
                  multiple
                  value={newBooking.studentIds}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions, (option: any) => option.value);
                    setNewBooking({ ...newBooking, studentIds: opts });
                  }}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none min-h-[80px]"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.level})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Segure CTRL/CMD para selecionar múltiplos alunos.</p>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Turma</label>
                <select
                  required
                  value={newBooking.classGroupId}
                  onChange={(e) => setNewBooking({ ...newBooking, classGroupId: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
                >
                  <option value="">Selecione...</option>
                  {classGroups.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Professor</label>
              <select
                required
                value={newBooking.teacherId}
                onChange={(e) => setNewBooking({ ...newBooking, teacherId: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
              >
                <option value="">Selecione...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} - {t.subject}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sala</label>
              <select
                required
                value={newBooking.roomId}
                onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
              >
                <option value="">Selecione...</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Data Início</label>
                <input 
                  type="date"
                  required
                  value={newBooking.date}
                  onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Início</label>
                <input 
                  type="time"
                  required
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking({ ...newBooking, startTime: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Fim</label>
                <input 
                  type="time"
                  required
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking({ ...newBooking, endTime: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary font-mono"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input 
                  type="checkbox" 
                  checked={newBooking.recurrence.enabled}
                  onChange={e => setNewBooking({...newBooking, recurrence: {...newBooking.recurrence, enabled: e.target.checked}})}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Agendamento Recorrente</span>
              </label>

              {newBooking.recurrence.enabled && (
                <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dias da Semana</label>
                    <div className="flex gap-1">
                      {days.map((d, idx) => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => handleDayToggle(idx)}
                          className={`flex-1 py-1 text-[10px] rounded border ${newBooking.recurrence.daysOfWeek.includes(idx) ? 'bg-indigo-600 text-white border-indigo-600 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Limite de Ocorrências</label>
                    <input 
                      type="number"
                      min="1"
                      max="50"
                      value={newBooking.recurrence.occurrences}
                      onChange={(e) => setNewBooking({...newBooking, recurrence: {...newBooking.recurrence, occurrences: parseInt(e.target.value)}})}
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Máximo de 50 ocorrências geradas de uma vez.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 bg-success text-slate-900 text-xs font-bold py-2.5 rounded-lg hover:opacity-90"
              >
                Confirmar Reserva
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 border border-slate-200 text-slate-500 text-xs py-2.5 rounded-lg hover:bg-bg-secondary"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
