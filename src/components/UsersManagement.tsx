import { toast } from "react-hot-toast";
import React, { useState, useEffect } from 'react';
import { User, ShieldAlert, Plus, Edit2, Trash2 } from 'lucide-react';

export function UsersManagement({ authFetch, usersState, setUsersState, students, teachers }: { authFetch: any, usersState: any[], setUsersState: any, students: any[], teachers: any[] }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<any>({ email: '', password: '', name: '', role: 'Aluno', linkedId: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await authFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsersState(data);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch(isEditing ? `/api/users/${formData.id}` : '/api/users', {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowModal(false);
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao salvar usuário");
      }
    } catch(err) {
      toast.error("Erro de conexão");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-slate-100 mb-4 gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-support-purple" />
            Gestão de Usuários
          </h2>
          <p className="text-xs text-slate-500 mt-1">Criação de acessos, definição de perfis (RBAC) e senhas</p>
        </div>
        <button 
          onClick={() => { setFormData({ email: '', password: '', name: '', role: 'Aluno', linkedId: '' }); setIsEditing(false); setShowModal(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all self-start"
        >
          <Plus className="w-4 h-4" /> Novo Acesso
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
              <th className="py-3 px-4">Nome / E-mail</th>
              <th className="py-3 px-4">Perfil</th>
              <th className="py-3 px-4">ID Vinculado (Ref)</th>
              <th className="py-3 px-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {usersState.map((u: any) => (
              <tr key={u.id} className="hover:bg-bg-secondary transition-colors">
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-800">{u.name}</div>
                  <div className="text-[10px] text-slate-500">{u.email}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    u.role === 'Administrador' ? 'bg-danger/10 text-danger border border-danger/30' :
                    u.role === 'Professor' ? 'bg-success/20 text-slate-900 border border-success/50' :
                    'bg-support-blue/10 text-support-blue border border-support-blue/30'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-slate-500 text-[10px]">{u.linkedId || '-'}</td>
                <td className="py-3 px-4 text-right">
                  <button 
                    onClick={() => { setFormData({...u, password: ''}); setIsEditing(true); setShowModal(true); }}
                    className="text-slate-400 hover:text-support-blue p-1 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-black text-slate-800 text-lg mb-1">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
            <p className="text-xs text-slate-500 mb-6">Defina o nível de permissão (Role) do acesso.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail (Login)</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Senha {isEditing && <span className="text-slate-400 normal-case font-normal">(Deixe em branco para não alterar)</span>}</label>
                <input required={!isEditing} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Perfil (Role)</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value, linkedId: ''})} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white">
                  <option value="Aluno">Aluno</option>
                  <option value="Professor">Professor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              {formData.role !== 'Administrador' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vinculado a ({formData.role})</label>
                  <select 
                    value={formData.linkedId} 
                    onChange={e => setFormData({...formData, linkedId: e.target.value})} 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value="">-- Selecione para vincular --</option>
                    {formData.role === 'Aluno' && students.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                    ))}
                    {formData.role === 'Professor' && teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Selecione o {formData.role.toLowerCase()} cadastrado no sistema para vincular ao acesso.</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors">Salvar Acesso</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
