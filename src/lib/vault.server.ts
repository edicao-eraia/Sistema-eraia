// Cofre de credenciais — cifra bidirecional AES-256-GCM para senhas de
// portal do aluno (precisam ser recuperáveis, então NÃO é bcrypt).
// Chave-mestra fica só no ambiente (VAULT_MASTER_KEY = 64 hex = 32 bytes).
import crypto from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getKey(): Buffer | null {
  const hex = process.env.VAULT_MASTER_KEY;
  if (!hex || hex.length !== 64) return null;
  try { return Buffer.from(hex, 'hex'); } catch { return null; }
}

export function vaultConfigured(): boolean {
  return getKey() !== null;
}

export function encryptSecret(plain: string): { encryptedHash: string; iv: string; authTag: string } {
  const key = getKey();
  if (!key) throw new Error('VAULT_MASTER_KEY não configurada.');
  const iv = crypto.randomBytes(12); // 96 bits, padrão p/ GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(plain, 'utf8', 'hex');
  enc += cipher.final('hex');
  return {
    encryptedHash: enc,
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
  };
}

export function decryptSecret(encryptedHash: string, ivHex: string, authTagHex: string): string {
  const key = getKey();
  if (!key) throw new Error('VAULT_MASTER_KEY não configurada.');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let dec = decipher.update(encryptedHash, 'hex', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}
