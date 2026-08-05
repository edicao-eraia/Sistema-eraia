import React, { useState } from 'react';
import { Sparkles, Calendar, Loader2, Check, X, Trash2, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const DAY_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function nextMonday(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? 1 : (8 - day);
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  authFetch: (url: string, options?: any) => Promise<Response>;
  students: any[];
  onScheduled?: () => void;
}

export const AutoScheduleView: React.FC<Props> = ({ authFetch, students, onScheduled }) => {
  const [studentId, setStudentId] = useState('');
  const [weekStart, setWeekStart] = useState(nextMonday());
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);   // { proposal, unmet, summary, weekStart, sessionMinutes }
  const [kept, setKept] = useState<Set<number>>(new Set());
  const [committed, setCommitted] = useState<any>(null); // { created, skipped }

  const generate = async () => {
    if (!studentId) { setError('Selecione um aluno.'); return; }
    setError(''); setResult(null); setCommitted(null); setLoading(true);
    try {
      const res = await authFetch('/api/ai/auto-schedule', {
        method: 'POST',
        body: JSON.stringify({ studentId, weekStartDate: weekStart }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar a proposta.');
      setResult(data);
      setKept(new Set((data.proposal || []).map((_: any, i: number) => i)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (i: number) => {
    setKept(prev => {
      const n = new Set(prev);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  };

  const commit = async () => {
    const sessions = (result?.proposal || []).filter((_: any, i: number) => kept.has(i));
    if (sessions.length === 0) { setError('Nenhuma aula selecionada para agendar.'); return; }
    setError(''); setCommitting(true);
    try {
      const res = await authFetch('/api/ai/auto-schedule/commit', {
        method: 'POST',
        body: JSON.stringify({ sessions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao agendar.');
      setCommitted(data);
      setResult(null);
      if (onScheduled) onScheduled();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCommitting(false);
    }
  };

  const studentName = (id: string) => students.find((s: any) => s.id === id)?.name || '';

  return (
    <div className="animate-fade-in w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-support-blue" />
        <h1 className="text-xl font-bold text-slate-800">Agenda com IA</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">
        O motor cruza a disponibilidade do aluno, dos professores e das salas — respeitando o saldo de horas
        do contrato e a carga dos planos táticos — e sugere uma agenda da semana para você aprovar.
      </p>

      {/* Controles */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3 sm:items-end mb-5">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 mb-1">Aluno</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-support-blue/40"
          >
            <option value="">— selecione —</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">Semana (segunda-feira)</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-support-blue/40"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-support-blue text-white font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Gerar proposta
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Resultado do commit */}
      {committed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 text-green-700 font-bold mb-1">
            <CheckCircle className="w-5 h-5" /> {committed.created?.length || 0} aula(s) agendada(s) com sucesso!
          </div>
          {committed.skipped?.length > 0 && (
            <p className="text-sm text-amber-700">{committed.skipped.length} pulada(s) por conflito de horário.</p>
          )}
          <p className="text-xs text-slate-500 mt-1">Veja em "Agendamentos".</p>
        </div>
      )}

      {/* Proposta */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          <div className="p-4 border-b border-slate-100 bg-bg-secondary">
            <p className="text-sm text-slate-700 flex items-start gap-2">
              <Info className="w-4 h-4 text-support-blue shrink-0 mt-0.5" /> {result.summary}
            </p>
          </div>

          {(result.proposal || []).length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Nenhuma aula pôde ser sugerida (veja os avisos abaixo).</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {result.proposal.map((p: any, i: number) => (
                <li key={i} className={`flex items-center gap-3 px-4 py-3 ${kept.has(i) ? '' : 'opacity-40'}`}>
                  <div className="w-14 text-center">
                    <div className="text-[10px] font-bold text-support-blue uppercase">{DAY_LABEL[p.dayOfWeek] || ''}</div>
                    <div className="text-xs text-slate-400">{p.date?.slice(8)}/{p.date?.slice(5, 7)}</div>
                  </div>
                  <div className="w-24 font-mono text-sm text-slate-700">{p.startTime}–{p.endTime}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-800">{p.subject}</div>
                    <div className="text-xs text-slate-500">{p.teacherName} · {p.roomName}</div>
                  </div>
                  <button
                    onClick={() => toggle(i)}
                    title={kept.has(i) ? 'Remover da proposta' : 'Reincluir'}
                    className={`p-2 rounded-lg transition-colors ${kept.has(i) ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-green-600 hover:bg-green-50'}`}
                  >
                    {kept.has(i) ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Avisos do que não coube */}
          {result.unmet?.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-amber-50/50">
              <div className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Não coube tudo
              </div>
              <ul className="space-y-1">
                {result.unmet.map((u: any, i: number) => (
                  <li key={i} className="text-xs text-slate-600">
                    <b>{u.subject}</b>: {u.reason}
                    {u.requestedHours != null && ` (pedido ${u.requestedHours}h, alocado ${u.allocatedHours}h)`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.proposal || []).length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">{kept.size} de {result.proposal.length} selecionada(s)</span>
              <button
                onClick={commit}
                disabled={committing || kept.size === 0}
                className="bg-green-600 text-white font-bold px-5 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
              >
                {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Aprovar e agendar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
