import React, { useState } from 'react';
import { User } from 'lucide-react';

export function UserProfile({ authFetch, user }: { authFetch: any, user: any }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/users/me/password', {
        method: 'PUT',
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        setMessage("Senha atualizada com sucesso.");
        setPassword('');
      } else {
        setMessage("Erro ao atualizar senha.");
      }
    } catch(err) {
      setMessage("Erro de conexão.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-fade-in max-w-md mx-auto mt-10">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-support-blue/20 text-support-blue rounded-full flex items-center justify-center mb-4">
          <User className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">{user?.name}</h2>
        <p className="text-sm font-bold text-slate-500 uppercase mt-1">{user?.role}</p>
        <p className="text-xs text-slate-400">{user?.email}</p>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Atualizar Senha</h3>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary focus:ring-2 focus:ring-blue-600 outline-none" 
            />
          </div>
          {message && <p className="text-xs font-bold text-success">{message}</p>}
          <button type="submit" className="w-full bg-success hover:opacity-90 text-slate-900 font-bold py-2 rounded-lg transition-colors shadow-sm">
            Atualizar
          </button>
        </form>
      </div>
    </div>
  );
}
