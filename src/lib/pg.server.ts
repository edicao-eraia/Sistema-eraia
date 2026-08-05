// Pool de conexão Postgres (Supabase) para uso NO SERVIDOR (server.ts).
// Fonte única de dados do app — substitui local_db.json e o Firestore-client.
import pkg from 'pg';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Carrega o .env AQUI (este módulo é importado antes do corpo do server.ts rodar,
// então o dotenv.config() de lá ainda não teria populado process.env).
dotenv.config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' });

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.warn('[pg] DATABASE_URL ausente — defina no .env.local antes de subir o servidor.');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// helper: retorna as linhas de uma query
export async function q<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// helper: retorna a primeira linha (ou null)
export async function one<T = any>(text: string, params?: any[]): Promise<T | null> {
  const res = await pool.query(text, params);
  return (res.rows[0] as T) ?? null;
}
