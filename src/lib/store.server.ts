// Camada de persistência do servidor sobre o Postgres (Supabase).
// - Usuários (auth) vão para a tabela real `app_users`.
// - Demais coleções são persistidas como JSONB por coleção em `kv_state`
//   (mesmo formato do antigo local_db.json), preservando 100% das formas
//   atuais sem perda. Normalização relacional plena = fase F4.
import { pool } from './pg.server';

const COLLECTIONS = [
  'students', 'teachers', 'rooms', 'classGroups', 'bookings',
  'studentDrafts', 'guardianDrafts', 'guardians', 'systemBackups', 'curriculums',
] as const;

export interface AppState {
  users: any[];
  students: any[];
  teachers: any[];
  rooms: any[];
  classGroups: any[];
  bookings: any[];
  studentDrafts: any[];
  guardianDrafts: any[];
  guardians: any[];
  systemBackups: any[];
  curriculums: any[];
}

export async function ensureSchema(): Promise<void> {
  await pool.query(`
    create table if not exists kv_state (
      collection text primary key,
      items      jsonb not null default '[]'::jsonb,
      updated_at timestamptz not null default now()
    )
  `);
}

export async function loadState(): Promise<AppState> {
  await ensureSchema();
  const u = await pool.query(
    `select id, email, password_hash as "passwordHash", name, role, linked_id as "linkedId"
       from app_users order by created_at`
  );
  const r = await pool.query(`select collection, items from kv_state`);
  const map: Record<string, any> = {};
  for (const row of r.rows) map[row.collection] = row.items;

  const out: any = { users: u.rows };
  for (const c of COLLECTIONS) out[c] = Array.isArray(map[c]) ? map[c] : [];
  return out as AppState;
}

export async function saveState(state: AppState): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');

    // Usuários -> app_users. Guarda anti-wipe: só substitui se houver usuários
    // (evita apagar o admin caso um load tenha falhado e o array esteja vazio).
    if (Array.isArray(state.users) && state.users.length > 0) {
      await client.query('delete from app_users');
      for (const usr of state.users) {
        await client.query(
          `insert into app_users (id, email, password_hash, name, role, linked_id)
           values ($1, $2, $3, $4, $5, $6)`,
          [usr.id, usr.email, usr.passwordHash, usr.name, usr.role || 'Aluno', usr.linkedId ?? null]
        );
      }
    }

    // Demais coleções -> kv_state (JSONB, upsert)
    for (const c of COLLECTIONS) {
      await client.query(
        `insert into kv_state (collection, items, updated_at)
         values ($1, $2, now())
         on conflict (collection)
         do update set items = excluded.items, updated_at = now()`,
        [c, JSON.stringify((state as any)[c] || [])]
      );
    }

    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}
