// Roda um arquivo .sql contra o DATABASE_URL do .env.local
// Uso: node scripts/run-migration.mjs supabase/migrations/0001_init.sql
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pkg from 'pg';

const { Client } = pkg;
dotenv.config({ path: '.env.local' });

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/run-migration.mjs <arquivo.sql>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL ausente no .env.local');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`[migration] conectado. Rodando ${file} ...`);
  await client.query(sql);
  console.log('[migration] OK — SQL aplicado sem erros.');
} catch (e) {
  console.error('[migration] FALHOU:', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
