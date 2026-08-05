import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { Booking } from '../types';

export function TeacherAgenda({ bookings, students, rooms, teacherId, classGroups }: { bookings: Booking[], students: any[], rooms: any[], teacherId: string, classGroups: any[] }) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });

  const teacherBookings = bookings.filter(b => b.teacherId === teacherId);

  const getDaysOfWeek = (start: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const days = getDaysOfWeek(currentWeekStart);

  const nextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  const prevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
        <div>
          <h2 className="text-lg font-black text-slate-800">Minha Agenda</h2>
          <p className="text-xs text-slate-500">Visualização semanal de suas aulas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-bg-secondary"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-bold text-slate-700 mx-2">
            {days[0].toLocaleDateString('pt-BR')} - {days[6].toLocaleDateString('pt-BR')}
          </span>
          <button onClick={nextWeek} className="p-2 border border-slate-200 rounded-lg hover:bg-bg-secondary"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((date, idx) => {
          const dateString = date.toISOString().split('T')[0];
          const dayBookings = teacherBookings.filter(b => b.date === dateString).sort((a,b) => a.startTime.localeCompare(b.startTime));
          const isToday = new Date().toISOString().split('T')[0] === dateString;

          return (
            <div key={idx} className="flex flex-col border border-slate-200 rounded-xl overflow-hidden">
              <div className={`p-2 text-center border-b \${isToday ? 'bg-success text-slate-900' : 'bg-bg-secondary text-slate-700 border-slate-200'}`}>
                <div className="text-[10px] font-bold uppercase">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                <div className="text-lg font-black">{date.getDate()}</div>
              </div>
              <div className="p-2 flex-1 flex flex-col gap-2 min-h-[300px] bg-bg-secondary">
                {dayBookings.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-400 mt-4 font-medium italic">Livre</p>
                ) : (
                  dayBookings.map(b => {
                    const student = students.find(s => s.id === b.studentId);
                    const classGroup = b.classGroupId ? classGroups?.find(cg => cg.id === b.classGroupId) : null;
                    const room = rooms.find(r => r.id === b.roomId);
                    return (
                      <div key={b.id} className="bg-white border border-support-blue/30 rounded-lg p-2 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-support-blue/100"></div>
                        <div className="pl-1 text-[10px] font-bold text-support-blue flex items-center gap-1 mb-1">
                          <Clock className="w-3 h-3" /> {b.startTime} - {b.endTime}
                        </div>
                        <div className="pl-1 text-xs font-bold text-slate-800 leading-tight mb-1">
                          {classGroup ? `${classGroup.name} (Turma)` : student?.name || 'Aluno'}
                        </div>
                        <div className="pl-1 text-[9px] text-slate-500 flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3" /> {room?.name || 'Sala'}
                        </div>
                        <div className="pl-1 text-[9px] text-slate-400 mt-1 uppercase font-bold">
                          {b.status === 'agendada' ? 'Agendada' : b.status === 'realizada_presenca' ? 'Realizada' : b.status}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
