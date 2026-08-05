import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import type { Booking } from '../types';

interface DashboardIndicatorsProps {
  bookings: Booking[];
}

const STATUS_COLORS: Record<string, string> = {
  "agendada": "#0ea5e9", // bg-sky-500
  "realizada_presenca": "#10b981", // bg-emerald-500
  "realizada_falta": "#f59e0b", // bg-amber-500
  "desmarcada": "#64748b", // bg-slate-500
  "cancelada": "#ef4444" // bg-red-500
};

const STATUS_LABELS: Record<string, string> = {
  "agendada": "Agendada",
  "realizada_presenca": "Realizada (Presença)",
  "realizada_falta": "Realizada (Falta)",
  "desmarcada": "Desmarcada",
  "cancelada": "Cancelada"
};

export const DashboardIndicators: React.FC<DashboardIndicatorsProps> = ({ bookings }) => {
  // Chart 1: Classes per subject
  const subjectData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      const subject = b.subject || 'Não Informada';
      counts[subject] = (counts[subject] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([name, count]) => ({ name, quantidade: count }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [bookings]);

  // Chart 2: Booking status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    bookings.forEach(b => {
      counts[b.status] = (counts[b.status] || 0) + 1;
    });
    
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "#94a3b8",
    }));
  }, [bookings]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in mb-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Aulas por Disciplina</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f1f5f9' }}
              />
              <Bar dataKey="quantidade" name="Aulas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Status dos Agendamentos</h3>
        <div className="h-72 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                iconType="circle"
                formatter={(value, entry: any) => <span className="text-sm text-slate-600 font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
