import React, { useState, useEffect } from 'react';
import { User, Check, Trash2, Plus, Camera, Edit2, X } from 'lucide-react';
import { Teacher } from '../types';

export function TeacherProfile({ authFetch, user, teacherId, teachers, setTeachers, setAuth }: { authFetch: any, user: any, teacherId: string, teachers: Teacher[], setTeachers: any, setAuth?: any }) {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  const teacher = teachers.find(t => t.id === teacherId);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>(teacher || {});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (teacher) {
      setTeacherForm(teacher);
    }
  }, [teacher]);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/teachers/${teacherId}`, {
        method: 'PUT',
        body: JSON.stringify(teacherForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setTeachers(teachers.map(t => t.id === teacherId ? updated : t));
        if (setAuth) {
          setAuth((prev: any) => {
            if (!prev) return prev;
            const newAuth = { ...prev, user: { ...prev.user, name: updated.name, email: updated.email } };
            localStorage.setItem('eraia_auth', JSON.stringify(newAuth));
            return newAuth;
          });
        }
        setMessage("Perfil atualizado com sucesso.");
        setIsEditing(false); // return to view mode
      } else {
        setMessage("Erro ao atualizar perfil.");
      }
    } catch(err) {
      setMessage("Erro de conexão.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-fade-in max-w-2xl mx-auto mt-6">
      <div className="flex flex-col items-center mb-8 border-b border-slate-100 pb-6">
        <div className="relative group">
          <div className="w-20 h-20 bg-support-blue/20 text-support-blue rounded-full flex items-center justify-center mb-4 text-3xl font-black overflow-hidden border-4 border-white shadow-sm">
            {teacherForm.photoUrl ? (
              <img src={teacherForm.photoUrl} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              teacherForm.name?.charAt(0) || <User className="w-8 h-8" />
            )}
          </div>
          <label className="absolute bottom-4 right-0 bg-success text-slate-900 p-1.5 rounded-full cursor-pointer hover:opacity-90 shadow-md transition-colors">
            <Camera className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                  if (ev.target?.result) {
                    setTeacherForm({...teacherForm, photoUrl: ev.target.result as string});
                  }
                };
                reader.readAsDataURL(e.target.files[0]);
              }
            }} />
          </label>
        </div>
        <h2 className="text-2xl font-black text-slate-800">{teacherForm.name || user?.name}</h2>
        <p className="text-sm font-bold text-support-blue uppercase mt-1">Professor</p>
        <p className="text-xs text-slate-400">{teacherForm.email || user?.email}</p>
      </div>

      
      {!isEditing ? (
        <div className="flex flex-col items-center">
           <button onClick={() => setIsEditing(true)} className="mb-6 flex items-center gap-2 bg-support-blue/10 text-support-blue px-4 py-2 rounded-lg font-bold hover:bg-support-blue/20 transition-colors">
             <Edit2 className="w-4 h-4" /> Editar Informações e Senha
           </button>
           <div className="w-full max-w-md bg-bg-secondary p-6 rounded-xl border border-slate-100 space-y-4">
             <div>
               <p className="text-xs font-bold text-slate-500 uppercase">Matéria/Especialidade</p>
               <p className="text-sm text-slate-800 font-medium">{teacherForm.subject || 'Não definida'}</p>
             </div>
             <div>
               <p className="text-xs font-bold text-slate-500 uppercase mb-2">Disponibilidade</p>
               <div className="space-y-1">
                 {teacherForm.availability?.map((a, i) => {
                   const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
                   return (
                     <p key={i} className="text-sm text-slate-800 bg-white p-2 rounded border border-slate-200">
                       <span className="font-bold">{days[a.dayOfWeek]}:</span> {a.startTime} - {a.endTime}
                     </p>
                   );
                 })}
                 {(!teacherForm.availability || teacherForm.availability.length === 0) && (
                   <p className="text-sm text-slate-500">Nenhum horário cadastrado</p>
                 )}
               </div>
             </div>
           </div>
           {message && (
             <div className="mt-4 p-3 bg-success/20 border border-success/50 rounded-lg flex items-center gap-2">
               <Check className="w-4 h-4 text-success" />
               <p className="text-xs font-bold text-slate-900">{message}</p>
             </div>
           )}
        </div>
      ) : (
        <div className="relative">
          <button onClick={() => setIsEditing(false)} className="absolute -top-12 right-0 text-slate-400 hover:text-slate-600 p-2">
            <X className="w-5 h-5" />
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Atualizar Perfil</h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
              <input 
                required 
                type="text" 
                value={teacherForm.name || ''} 
                onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">E-mail</label>
              <input 
                required 
                type="email" 
                value={teacherForm.email || ''} 
                onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Matéria/Especialidade</label>
              <input 
                required 
                type="text" 
                value={teacherForm.subject || ''} 
                onChange={e => setTeacherForm({...teacherForm, subject: e.target.value})} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disponibilidade</label>
              <div className="bg-bg-secondary border border-slate-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {teacherForm.availability?.map((avail, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={avail.dayOfWeek}
                      onChange={(e) => {
                        const updated = [...(teacherForm.availability || [])];
                        updated[idx].dayOfWeek = Number(e.target.value);
                        setTeacherForm({ ...teacherForm, availability: updated });
                      }}
                      className="text-[10px] border border-slate-200 rounded p-1 bg-white flex-1"
                    >
                      <option value={1}>Segunda</option>
                      <option value={2}>Terça</option>
                      <option value={3}>Quarta</option>
                      <option value={4}>Quinta</option>
                      <option value={5}>Sexta</option>
                      <option value={6}>Sábado</option>
                      <option value={0}>Domingo</option>
                    </select>
                    <input 
                      type="text" 
                      value={avail.startTime}
                      onChange={(e) => {
                        const updated = [...(teacherForm.availability || [])];
                        updated[idx].startTime = e.target.value;
                        setTeacherForm({ ...teacherForm, availability: updated });
                      }}
                      className="text-[10px] border border-slate-200 rounded p-1 bg-white w-14 text-center"
                    />
                    <input 
                      type="text" 
                      value={avail.endTime}
                      onChange={(e) => {
                        const updated = [...(teacherForm.availability || [])];
                        updated[idx].endTime = e.target.value;
                        setTeacherForm({ ...teacherForm, availability: updated });
                      }}
                      className="text-[10px] border border-slate-200 rounded p-1 bg-white w-14 text-center"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        const updated = (teacherForm.availability || []).filter((_, i) => i !== idx);
                        setTeacherForm({ ...teacherForm, availability: updated });
                      }}
                      className="text-slate-400 hover:text-danger"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const updated = [...(teacherForm.availability || []), { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }];
                    setTeacherForm({ ...teacherForm, availability: updated });
                  }}
                  className="w-full text-[10px] py-1 border border-dashed border-support-blue/50 text-support-blue rounded-md hover:bg-support-blue/10 flex items-center justify-center gap-1 font-bold"
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </button>
              </div>
            </div>

            <button type="submit" className="w-full bg-success hover:opacity-90 text-slate-900 font-bold py-2 rounded-lg transition-colors shadow-sm">
              Salvar Perfil
            </button>
          </form>
        </div>

        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-4">Acesso ao Sistema</h3>
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nova Senha</label>
              <input 
                required 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-bg-secondary focus:ring-2 focus:ring-slate-400 outline-none" 
              />
            </div>
            <button type="submit" className="w-full bg-success hover:opacity-90 text-slate-900 font-bold py-2 rounded-lg transition-colors shadow-sm">
              Atualizar Senha
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 bg-success/20 border border-success/50 rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 text-success" />
              <p className="text-xs font-bold text-slate-900">{message}</p>
            </div>
          )}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

      