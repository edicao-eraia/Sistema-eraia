import React, { useState, useMemo } from 'react';
import { Teacher, Booking, Student } from '../types';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface Props {
  teachers: Teacher[];
  bookings: Booking[];
  students: Student[];
}

export function TeacherFinancialSummary({ teachers, bookings, students }: Props) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1 to 12
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const stats = useMemo(() => {
    let totalEarnings = 0;
    const teacherStats: Record<string, {
      name: string;
      indMins: number;
      grpMins: number;
      indRate: number;
      grpRate: number;
      indHours: number;
      grpHours: number;
      totalEarned: number;
    }> = {};

    teachers.forEach(t => {
      teacherStats[t.id] = {
        name: t.name,
        indMins: 0,
        grpMins: 0,
        indRate: t.hourlyRateIndividual || 0,
        grpRate: t.hourlyRateGroup || 0,
        indHours: 0,
        grpHours: 0,
        totalEarned: 0
      };
    });

    const monthStr = selectedMonth.toString().padStart(2, '0');
    const prefix = `${selectedYear}-${monthStr}`;

    bookings.forEach(b => {
      if (!b.date.startsWith(prefix)) return;
      if (!["agendada", "realizada_presenca", "realizada_falta"].includes(b.status)) return;
      if (!teacherStats[b.teacherId]) return;

      const student = students.find(s => s.id === b.studentId);
      const isGroup = student?.modality === "Turma" || student?.modality === "Híbrido";

      const startParts = b.startTime.split(':');
      const endParts = b.endTime.split(':');
      if (startParts.length < 2 || endParts.length < 2) return;

      const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      let duration = endMins - startMins;
      if (duration < 0) duration += 24 * 60;

      if (isGroup) {
        teacherStats[b.teacherId].grpMins += duration;
      } else {
        teacherStats[b.teacherId].indMins += duration;
      }
    });

    // Calculate totals
    Object.values(teacherStats).forEach(ts => {
      ts.indHours = ts.indMins / 60;
      ts.grpHours = ts.grpMins / 45;
      ts.totalEarned = (ts.indHours * ts.indRate) + (ts.grpHours * ts.grpRate);
      totalEarnings += ts.totalEarned;
    });

    return {
      totalEarnings,
      teacherList: Object.values(teacherStats).sort((a, b) => b.totalEarned - a.totalEarned)
    };
  }, [teachers, bookings, students, selectedMonth, selectedYear]);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col w-full mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-success/20 text-slate-800 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Resumo Financeiro - Professores</h3>
            <p className="text-xs text-slate-500">Estimativa de Pagamentos por Hora/Aula</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary focus:outline-none"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg p-2 bg-bg-secondary w-20 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-center items-center text-center h-full">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total Estimado no Mês</p>
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-3xl font-black text-slate-800">
              R$ {stats.totalEarnings.toFixed(2)}
            </span>
          </div>
        </div>
        
        <div className="md:col-span-3">
          <div className="max-h-48 overflow-y-auto pr-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 sticky top-0 bg-white">Professor</th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 text-right sticky top-0 bg-white">Aulas Individuais</th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 text-right sticky top-0 bg-white">Aulas Turma</th>
                  <th className="py-2 px-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100 text-right sticky top-0 bg-white">Total a Receber</th>
                </tr>
              </thead>
              <tbody>
                {stats.teacherList.map((t, idx) => (
                  <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 text-xs font-bold text-slate-700">{t.name}</td>
                    <td className="py-2 px-3 text-right">
                      <p className="text-xs font-bold text-slate-800">{t.indHours.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">h/a</span></p>
                      <p className="text-[9px] text-slate-400">R$ {t.indRate}/h</p>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <p className="text-xs font-bold text-slate-800">{t.grpHours.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">h/a</span></p>
                      <p className="text-[9px] text-slate-400">R$ {t.grpRate}/h</p>
                    </td>
                    <td className="py-2 px-3 text-right text-sm font-black text-success">
                      R$ {t.totalEarned.toFixed(2)}
                    </td>
                  </tr>
                ))}
                {stats.teacherList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-xs text-slate-400">Nenhum dado encontrado para o mês selecionado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
