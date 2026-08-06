// Integração Google Agenda (OAuth 2.0 + Calendar API), sem lib externa (fetch).
// O refresh_token de cada professor é guardado CIFRADO (vault AES) no cadastro.
const OAUTH_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN = 'https://oauth2.googleapis.com/token';
const CAL = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const CAL_TZ = 'America/Sao_Paulo';

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(): string {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI
    || `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/google/callback`;
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',   // pede refresh_token
    prompt: 'consent',        // força retornar refresh_token
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTH}?${p.toString()}`;
}

// Troca o code por tokens (retorna { access_token, refresh_token, expires_in, ... })
export async function exchangeCode(code: string): Promise<any> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  });
  const r = await fetch(OAUTH_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  return r.json();
}

// Novo access_token a partir do refresh_token
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    grant_type: 'refresh_token',
  });
  const r = await fetch(OAUTH_TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json();
  if (!j.access_token) throw new Error('Falha ao renovar token Google: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

// Descobre o e-mail da conta conectada (só p/ mostrar na UI)
export async function getUserEmail(accessToken: string): Promise<string> {
  try {
    const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
    const j = await r.json();
    return j.email || '';
  } catch { return ''; }
}

function eventBody(b: { date: string; startTime: string; endTime: string; summary: string; description?: string; location?: string }) {
  return {
    summary: b.summary,
    description: b.description || '',
    location: b.location || '',
    start: { dateTime: `${b.date}T${b.startTime}:00`, timeZone: CAL_TZ },
    end: { dateTime: `${b.date}T${b.endTime}:00`, timeZone: CAL_TZ },
  };
}

export async function createEvent(accessToken: string, ev: any): Promise<string | null> {
  const r = await fetch(`${CAL}/calendars/primary/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(ev)),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('createEvent: ' + JSON.stringify(j).slice(0, 200));
  return j.id || null;
}

export async function updateEvent(accessToken: string, eventId: string, ev: any): Promise<void> {
  const r = await fetch(`${CAL}/calendars/primary/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(eventBody(ev)),
  });
  if (!r.ok) throw new Error('updateEvent: ' + (await r.text()).slice(0, 200));
}

export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  const r = await fetch(`${CAL}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410 = já removido; tratamos como ok
  if (!r.ok && r.status !== 410 && r.status !== 404) throw new Error('deleteEvent: ' + (await r.text()).slice(0, 200));
}
