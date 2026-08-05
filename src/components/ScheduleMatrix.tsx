import React, { useState, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, BookOpen } from 'lucide-react';
import { Booking, Room, Student, Teacher, ClassGroup } from '../types';

interface ScheduleMatrixProps {
  bookings: Booking[];
  rooms: Room[];
  students: Student[];
  teachers: Teacher[];
  classGroups: ClassGroup[];
  onAddBooking: (date: string, startTime: string, roomId?: string) => void;
  onBookingClick?: (booking: Booking) => void;
}

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // px per hour

export function ScheduleMatrix({ bookings, rooms, students, teachers, classGroups, onAddBooking, onBookingClick }: ScheduleMatrixProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const currentWeek = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const changeDate = (days: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d);
  };

  const formatLocalDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const currentDateStr = formatLocalDate(currentDate);

  // Filter bookings based on view
  const visibleBookings = useMemo(() => {
    if (viewMode === 'day') {
      return bookings.filter(b => b.date === currentDateStr && b.status !== 'cancelada' && b.status !== 'desmarcada');
    } else {
      const weekStrs = currentWeek.map(formatLocalDate);
      return bookings.filter(b => weekStrs.includes(b.date) && b.status !== 'cancelada' && b.status !== 'desmarcada');
    }
  }, [bookings, viewMode, currentDateStr, currentWeek]);

  // Generate hour labels
  const hours = [];
  for (let i = START_HOUR; i <= END_HOUR; i++) {
    hours.push(`${String(i).padStart(2, '0')}:00`);
  }

  const handleGridClick = (e: React.MouseEvent, columnId: string, colDateStr: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const clickedMinute = (y / HOUR_HEIGHT) * 60;
    const totalMinutes = (START_HOUR * 60) + clickedMinute;
    
    // Snap to 30 min intervals
    const snappedMinutes = Math.floor(totalMinutes / 30) * 30;
    
    const startTime = minutesToTime(snappedMinutes);
    if (viewMode === 'day') {
      onAddBooking(colDateStr, startTime, columnId);
    } else {
      onAddBooking(colDateStr, startTime);
    }
  };

  const renderBookingCard = (b: Booking) => {
    const startMins = timeToMinutes(b.startTime) - (START_HOUR * 60);
    const endMins = timeToMinutes(b.endTime) - (START_HOUR * 60);
    const top = (startMins / 60) * HOUR_HEIGHT;
    const height = ((endMins - startMins) / 60) * HOUR_HEIGHT;

    const student = students.find(s => s.id === b.studentId);
    const teacher = teachers.find(t => t.id === b.teacherId);
    const room = rooms.find(r => r.id === b.roomId);
    const classGroup = b.classGroupId ? classGroups.find(cg => cg.id === b.classGroupId) : null;

    const isConfirmed = b.status === 'agendada' || b.status.startsWith('realizada');
    
    return (
      <div 
        key={b.id}
        onClick={(e) => { e.stopPropagation(); if(onBookingClick) onBookingClick(b); }}
        className={`absolute left-1 right-1 rounded-lg border p-1.5 shadow-sm overflow-hidden flex flex-col cursor-pointer transition-all hover:ring-2 hover:ring-support-blue hover:z-10 ${isConfirmed ? 'bg-support-blue/10 border-support-blue/30' : 'bg-white border-slate-200'}`}
        style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-[10px] font-bold text-slate-800 truncate">
            {classGroup ? `${classGroup.name}` : student?.name || 'Indefinido'}
          </span>
          <span className="text-[9px] font-mono text-slate-500 shrink-0">
            {b.startTime}-{b.endTime}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-slate-600 truncate mt-0.5">
          <User className="w-3 h-3 shrink-0" />
          <span className="truncate" title={teacher?.name}>{teacher?.name?.split(' ')[0] || 'Indefinido'}</span>
        </div>
        {(b.subject || teacher?.subject) && (
          <div className="flex items-center gap-1 text-[9px] text-slate-600 truncate mt-0.5">
            <BookOpen className="w-3 h-3 shrink-0" />
            <span className="truncate">{b.subject || teacher?.subject}</span>
          </div>
        )}
        {(b.topic || b.front) && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate mt-0.5 font-medium italic">
            <span className="truncate">{b.front ? `[${b.front}] ` : ''}{b.topic}</span>
          </div>
        )}
        {room && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 truncate mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{room.name}</span>
          </div>
        )}
      </div>
    );
  };

  const columns = viewMode === 'day' 
    ? rooms.map(r => ({ id: r.id, title: r.name, subtitle: `Cap: ${r.capacity}`, dateStr: currentDateStr }))
    : currentWeek.map(d => {
        const dateStr = formatLocalDate(d);
        const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        return { id: dateStr, title: `${dayName} ${d.getDate()}`, subtitle: '', dateStr: dateStr };
      });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[75vh]">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-slate-800 text-base">Matriz de Ocupação da Grade</h3>
          <button
            onClick={() => onAddBooking(currentDateStr, '08:00')}
            className="bg-success hover:opacity-90 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 transition-all"
          >
            Agendar Aula
          </button>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'day' ? 'bg-white shadow text-support-blue' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Dia (Salas)
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'week' ? 'bg-white shadow text-support-blue' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Semana (Dias)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => changeDate(viewMode === 'day' ? -1 : -7)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
            <CalendarIcon className="w-4 h-4 text-support-blue" />
            <span className="text-sm font-bold text-slate-700">
              {viewMode === 'day' 
                ? currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                : `${currentWeek[0].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - ${currentWeek[6].toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}`
              }
            </span>
          </div>
          <button onClick={() => changeDate(viewMode === 'day' ? 1 : 7)} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto custom-scrollbar flex">
        {/* Time Labels */}
        <div className="w-16 shrink-0 bg-slate-50 border-r border-slate-200 relative">
          <div className="h-12 border-b border-slate-200 bg-slate-50 sticky top-0 z-20"></div>
          <div className="relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
            {hours.map((hour, i) => (
              <div 
                key={hour} 
                className="absolute w-full text-right pr-2 text-[10px] font-mono font-bold text-slate-400"
                style={{ top: `${i * HOUR_HEIGHT - 6}px` }}
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        {/* Matrix Area */}
        <div className="flex-1 min-w-[600px] flex flex-col">
          {/* Columns Header */}
          <div className="flex h-12 border-b border-slate-200 sticky top-0 z-20 bg-white">
            {columns.map(col => (
              <div key={col.id} className="flex-1 border-r border-slate-200 flex flex-col items-center justify-center p-1">
                <span className="text-xs font-bold text-slate-700 uppercase">{col.title}</span>
                {col.subtitle && <span className="text-[9px] text-slate-500">{col.subtitle}</span>}
              </div>
            ))}
          </div>
          
          {/* Columns Body */}
          <div className="flex-1 relative flex bg-slate-50" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
            {/* Horizontal Grid Lines */}
            <div className="absolute inset-0 pointer-events-none">
              {hours.map((_, i) => (
                <div 
                  key={i} 
                  className="w-full border-t border-slate-200/60"
                  style={{ position: 'absolute', top: `${i * HOUR_HEIGHT}px` }}
                ></div>
              ))}
            </div>

            {/* Vertical Columns and Bookings */}
            {columns.map(col => {
              const colBookings = viewMode === 'day'
                ? visibleBookings.filter(b => b.roomId === col.id)
                : visibleBookings.filter(b => b.date === col.dateStr);

              return (
                <div 
                  key={col.id} 
                  className="flex-1 border-r border-slate-200 relative group"
                  onClick={(e) => handleGridClick(e, col.id, col.dateStr)}
                >
                  {/* Hover indicator for adding */}
                  <div className="absolute inset-0 bg-support-blue/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  
                  {colBookings.map(b => renderBookingCard(b))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
