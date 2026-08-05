# Plano de Migração e Evolução — Gerenciador de Agenda (e-RaIA)

## Diagnóstico (o ponto de partida)
O app estava **split-brain**: os dados viviam em 3 lugares que não se enxergavam
— `local_db.json` (arrays em memória do `server.ts`), Firestore via client
(`src/lib/db.ts`, usado pelo front) e Firestore via server. Aluno cadastrado
pela tela ia pro Firestore; o motor de IA procurava no `local_db.json` → não
achava. **Unificar num banco só é o pré-requisito de tudo.**

## Arquitetura-alvo
**Tudo passa pelo servidor Express; o Supabase (Postgres) é o banco do servidor
via `service_role`. O front NÃO fala com o banco direto** (mata o Firestore-client
e o `local_db.json` de vez).

```
React (front)  ──REST /api──►  Express (server.ts)  ──service_role──►  Supabase/Postgres
                                      │
                                      ├─ Gemini (auto-fill + motor de agenda)
                                      └─ Google Calendar API (agenda do professor)
```

Auth continua a própria do app (JWT + bcrypt, tabela `app_users`) por enquanto —
Supabase Auth é fase futura (ver AGENTS.md: "Auth = risco, fazer por etapas").

## Fases
- [x] **F0 — Bugs de lógica** (independem do banco): motor de sugestão comparava
  `dayOfWeek` string × número (sempre falhava) — corrigido; anti-colisão ignorava
  status errado (`"Cancelada"` vs `"cancelada"`) — corrigido.
- [x] **F1 — Fundação Supabase**: schema relacional (`supabase/migrations/0001_init.sql`),
  cliente server (`src/lib/supabase.server.ts`), env (`.env.example`), dependência.
- [x] **F2 — Rewire do servidor** (feito 05/08, testado ao vivo): `loadDb/saveDb` agora
  leem/gravam no Postgres (`src/lib/store.server.ts`) — auth na tabela `app_users`, demais
  coleções como JSONB em `kv_state`. `local_db.json` e escritas Firestore-server removidos.
  Nenhuma lógica de rota mudou → todas as ~40 rotas passaram a persistir no Supabase.
  Validado: login (ok/erro), criar/listar/excluir sala com persistência conferida no banco.
  Pendências menores: imports Firestore ociosos no topo + `DB_FILE` sem uso (limpar depois).
- [x] **F3 — Rewire do front** (feito 05/08): `src/lib/db.ts` reescrito como cliente REST
  (mesmos nomes de função → os 6 componentes não mudaram); `subscribe*` viraram polling (15s);
  login trocado de Google/Firebase p/ email+senha em `/api/auth/login` (JWT real); Firebase
  removido do front (`auth.ts`/`sheets.ts` ficaram órfãos, não entram no bundle). Descoberta:
  a auth front↔back nunca esteve ligada (front mandava token do Firebase, server esperava JWT
  próprio → 403). Rotas adicionadas no server: `PUT /api/students/:id`, `PUT /api/guardians/:id`,
  `DELETE /api/bookings/:id`, `GET/PUT /api/curriculums`. Verificado: `tsc` limpo, `npm run build`
  ok, todos os endpoints testados ao vivo com JWT + persistência conferida. Falta só clique no
  navegador (login `eraiaeducacaoguiada@gmail.com` / `eraia@2026`).
- [ ] **F4 — Motor de agenda de verdade**: hoje é assistido (exige aluno+prof+sala+data).
  Evoluir p/ varrer professores/salas, respeitar saldo de horas do contrato e carga
  horária do plano tático, e gerar sugestão de semana inteira p/ o admin aprovar.
- [ ] **F5 — Google Agenda**: OAuth do professor (escopo `calendar.events`) +
  criar/atualizar/excluir evento na agenda do professor quando o booking muda.
- [ ] **F6 — Import de planilhas**: importar "Contexto Escolar" e "Dados Financeiros"
  (Google Sheets) p/ dentro do sistema. Corrigir o export quebrado (`sheets.ts`,
  template literals escapados).

## Passos manuais (só você faz)
1. Criar projeto no [supabase.com](https://supabase.com) (região São Paulo).
2. **SQL Editor** → colar e rodar `supabase/migrations/0001_init.sql`.
3. **Project Settings → API** → copiar `Project URL` e a chave `service_role`.
4. Preencher `.env.local` (baseado no `.env.example`): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `GEMINI_API_KEY`.
5. `npm install` (puxa `@supabase/supabase-js`).

Feito isso, sigo para F2/F3 (rewire) e testo contra o banco de verdade.
```
Usuário master (login inicial): eraiaeducacaoguiada@gmail.com / eraia@2026
```
