import React, { useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, Loader2 } from 'lucide-react';

const authHeader = (): Record<string, string> => {
  try {
    const t = JSON.parse(localStorage.getItem('eraia_auth') || '{}').token;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
};

// Botão de upload de planilha (.xlsx/.csv) que envia p/ um endpoint de import
// e mostra o resultado (importados / já existiam).
export const SheetImportButton: React.FC<{ endpoint: string; label?: string; onDone?: () => void }> = ({ endpoint, label = 'Importar planilha', onDone }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(endpoint, { method: 'POST', headers: authHeader(), body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha na importação');
      toast.success(`${data.imported} importado(s); ${data.skipped} já existiam.`);
      if (onDone) onDone();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao importar');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handle} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-support-blue/10 text-support-blue hover:bg-support-blue/20 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {label}
      </button>
    </>
  );
};
