// Camada de dados do FRONT — agora fala com o servidor via REST (não mais Firestore).
// Mantém os MESMOS nomes de função de antes, então App.tsx e os componentes que
// importam daqui não precisam mudar. O 1º parâmetro `userId` é aceito e ignorado
// (o servidor identifica o dono pelo JWT); mantido só p/ compatibilidade de assinatura.

export type Unsubscribe = () => void;

// --- HTTP helper ----------------------------------------------------------
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('eraia_auth');
    return raw ? (JSON.parse(raw).token || null) : null;
  } catch {
    return null;
  }
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { ...(options.headers as any) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(json?.error || `Erro ${res.status} em ${url}`);
  }
  return json;
}

const jbody = (data: any) => JSON.stringify(data);

// Carrega o pacote geral (students, teachers, rooms, bookings, classGroups)
async function getData(): Promise<any> {
  return apiFetch('/api/data');
}

// --- STUDENTS -------------------------------------------------------------
export async function fetchStudentsFromFirebase(_userId?: string): Promise<any[]> {
  return (await getData()).students || [];
}
export async function createStudentInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/students', { method: 'POST', body: jbody(data) });
  return r.student || r;
}
export async function updateStudentInFirebase(_userId: string, id: string, data: any): Promise<any> {
  const r = await apiFetch(`/api/students/${id}`, { method: 'PUT', body: jbody(data) });
  return r.student || r;
}
export async function deleteStudentInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/students/${id}`, { method: 'DELETE' });
}

// --- TEACHERS -------------------------------------------------------------
export async function fetchTeachersFromFirebase(_userId?: string): Promise<any[]> {
  return (await getData()).teachers || [];
}
export async function createTeacherInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/teachers', { method: 'POST', body: jbody(data) });
  return r.teacher || r;
}
export async function updateTeacherInFirebase(_userId: string, id: string, data: any): Promise<any> {
  return apiFetch(`/api/teachers/${id}`, { method: 'PUT', body: jbody(data) });
}
export async function deleteTeacherInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/teachers/${id}`, { method: 'DELETE' });
}

// --- ROOMS ----------------------------------------------------------------
export async function fetchRoomsFromFirebase(_userId?: string): Promise<any[]> {
  return (await getData()).rooms || [];
}
export async function createRoomInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/rooms', { method: 'POST', body: jbody(data) });
  return r.room || r;
}
export async function updateRoomInFirebase(_userId: string, id: string, data: any): Promise<any> {
  // A rota POST /api/rooms atualiza quando recebe um id no corpo.
  const r = await apiFetch('/api/rooms', { method: 'POST', body: jbody({ ...data, id }) });
  return r.room || r;
}
export async function deleteRoomInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/rooms/${id}`, { method: 'DELETE' });
}

// --- GUARDIANS ------------------------------------------------------------
export async function fetchGuardiansFromFirebase(_userId?: string): Promise<any[]> {
  return (await apiFetch('/api/guardians')).guardians || [];
}
export async function createGuardianInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/guardians', { method: 'POST', body: jbody(data) });
  return r.guardian || r;
}
export async function updateGuardianInFirebase(_userId: string, id: string, data: any): Promise<any> {
  const r = await apiFetch(`/api/guardians/${id}`, { method: 'PUT', body: jbody(data) });
  return r.guardian || r;
}
export async function deleteGuardianInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/guardians/${id}`, { method: 'DELETE' });
}

// --- CLASS GROUPS ---------------------------------------------------------
export async function fetchClassGroupsFromFirebase(_userId?: string): Promise<any[]> {
  return (await getData()).classGroups || [];
}
export async function createClassGroupInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/class-groups', { method: 'POST', body: jbody(data) });
  return r.classGroup || r.group || r;
}
export async function updateClassGroupInFirebase(_userId: string, id: string, data: any): Promise<any> {
  const r = await apiFetch(`/api/class-groups/${id}`, { method: 'PUT', body: jbody(data) });
  return r.classGroup || r.group || r;
}
export async function deleteClassGroupInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/class-groups/${id}`, { method: 'DELETE' });
}

// --- CURRICULUMS ----------------------------------------------------------
export async function fetchCurriculumsFromFirebase(_userId?: string): Promise<any[]> {
  return (await apiFetch('/api/curriculums')).curriculums || [];
}
export async function saveAllCurriculumsInFirebase(_userId: string, curriculums: any[]): Promise<void> {
  await apiFetch('/api/curriculums', { method: 'PUT', body: jbody({ curriculums }) });
}
export async function saveCurriculumInFirebase(userId: string, curriculumId: string, data: any): Promise<void> {
  const current = await fetchCurriculumsFromFirebase(userId);
  const next = current.filter((c: any) => c.id !== curriculumId);
  next.push({ ...data, id: curriculumId });
  await saveAllCurriculumsInFirebase(userId, next);
}
export async function deleteCurriculumInFirebase(curriculumId: string): Promise<void> {
  const current = await fetchCurriculumsFromFirebase('');
  await saveAllCurriculumsInFirebase('', current.filter((c: any) => c.id !== curriculumId));
}

// --- BOOKINGS -------------------------------------------------------------
export async function createBookingInFirebase(_userId: string, data: any): Promise<any> {
  const r = await apiFetch('/api/bookings', { method: 'POST', body: jbody(data) });
  return r.booking || r;
}
export async function updateBookingInFirebase(_userId: string, id: string, data: any): Promise<void> {
  await apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: jbody(data) });
}
export async function deleteBookingInFirebase(id: string): Promise<void> {
  await apiFetch(`/api/bookings/${id}`, { method: 'DELETE' });
}

// --- DRAFTS: SUBSCRIPTIONS (polling no lugar do realtime do Firestore) -----
const POLL_MS = 15000;

function poll(fetchOnce: () => Promise<any[]>, callback: (items: any[]) => void): Unsubscribe {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const items = await fetchOnce();
      if (!stopped) callback(items);
    } catch (e) {
      console.error('poll error', e);
    }
  };
  tick(); // dispara imediatamente
  const timer = setInterval(tick, POLL_MS);
  return () => { stopped = true; clearInterval(timer); };
}

export function subscribeToStudentDrafts(callback: (drafts: any[]) => void): Unsubscribe {
  return poll(async () => (await apiFetch('/api/drafts')).drafts || [], callback);
}
export function subscribeToGuardianDrafts(callback: (drafts: any[]) => void): Unsubscribe {
  return poll(async () => (await apiFetch('/api/guardians/drafts')).drafts || [], callback);
}
export function subscribeToBookings(callback: (bookings: any[]) => void): Unsubscribe {
  return poll(async () => (await getData()).bookings || [], callback);
}

// --- DRAFTS: APPROVE / REJECT / UPDATE ------------------------------------
export async function approveStudentDraft(draftId: string, _draftData: any, _userId: string): Promise<any> {
  const r = await apiFetch(`/api/drafts/${draftId}/approve`, { method: 'POST', body: jbody({}) });
  return r.student || r;
}
export async function rejectStudentDraft(draftId: string): Promise<void> {
  await apiFetch(`/api/drafts/${draftId}/reject`, { method: 'POST', body: jbody({}) });
}
export async function updateStudentDraft(draftId: string, data: any): Promise<void> {
  await apiFetch(`/api/drafts/${draftId}`, { method: 'PUT', body: jbody(data) });
}
export async function approveGuardianDraft(draftId: string, draftData: any, _userId: string): Promise<any> {
  const r = await apiFetch(`/api/guardians/drafts/${draftId}/approve`, {
    method: 'POST',
    body: jbody({ studentIds: draftData?.studentIds || [] }),
  });
  return r.guardian || r;
}
export async function rejectGuardianDraft(draftId: string): Promise<void> {
  await apiFetch(`/api/guardians/drafts/${draftId}/reject`, { method: 'POST', body: jbody({}) });
}
export async function updateGuardianDraft(draftId: string, data: any): Promise<void> {
  await apiFetch(`/api/guardians/drafts/${draftId}`, { method: 'PUT', body: jbody(data) });
}
