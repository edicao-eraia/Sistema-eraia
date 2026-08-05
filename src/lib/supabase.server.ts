// Cliente Supabase para uso NO SERVIDOR (server.ts).
// Usa a SERVICE_ROLE key — bypassa RLS. NUNCA importe isto no frontend.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn(
    '[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes — ' +
    'defina-os no .env.local antes de subir o servidor.'
  );
}

export const supabase = createClient(url || '', serviceKey || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});
