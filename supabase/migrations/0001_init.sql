-- =====================================================================
--  Gerenciador de Agenda de Aulas (e-RaIA) — Schema inicial (Supabase)
--  Migração 0001 — unifica local_db.json + Firestore num Postgres único.
--
--  Decisões de modelagem (ver AGENTS.md / FICHA_360_ARCHITECTURE.md):
--   - PKs em TEXT (não uuid) p/ preservar os ids existentes ("stud-...",
--     "teacher-...") numa migração de dados sem quebrar referências.
--   - O que o MOTOR DE AGENDA e os RELATÓRIOS FINANCEIROS precisam é
--     100% relacional (disponibilidade, contrato, saldo de horas,
--     planos táticos, vínculo responsável↔aluno N:N).
--   - O restante do "profile 360" (campos de texto livre da ficha) fica
--     em JSONB (profile_extra) — normalizável depois sem quebrar nada
--     (retrocompat: coluna nullable).
--   - Colunas novas SEMPRE nullable ou com DEFAULT (regra 1 do AGENTS.md).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensões / helpers
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- trigger genérico p/ manter updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- USERS (auth própria do app: JWT + bcrypt — Supabase Auth é fase futura)
-- ---------------------------------------------------------------------
create table if not exists app_users (
  id            text primary key,
  email         text unique not null,
  password_hash text not null,
  name          text not null,
  role          text not null default 'Aluno'
                  check (role in ('Administrador','Professor','Aluno')),
  linked_id     text,                 -- aponta p/ students.id ou teachers.id
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_app_users_updated before update on app_users
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- STUDENTS
-- ---------------------------------------------------------------------
create table if not exists students (
  id             text primary key,
  owner_id       text,
  name           text not null,
  email          text,
  phone          text,
  level          text,
  modality       text check (modality in ('Turma','Individual','Híbrido')),
  current_school text,
  birth_date     text,
  instagram      text,
  city           text,
  state          text,
  photo_url      text,
  fixed_activities jsonb not null default '[]'::jsonb,   -- string[]
  profile_extra  jsonb not null default '{}'::jsonb,     -- resto do profile360 (texto livre)
  raw_draft_data jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_students_owner on students(owner_id);
create trigger trg_students_updated before update on students
  for each row execute function set_updated_at();

-- Disponibilidade do aluno (1:N) — dayOfWeek 0=Dom .. 6=Sáb
create table if not exists student_availability (
  id          bigint generated always as identity primary key,
  student_id  text not null references students(id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  start_time  text not null,   -- "HH:MM"
  end_time    text not null
);
create index if not exists idx_stud_avail_student on student_availability(student_id);

-- Contrato / saldo de horas (1:N — histórico de contratos por aluno)
create table if not exists contracts (
  id             text primary key default ('ctr-' || gen_random_uuid()),
  student_id     text not null references students(id) on delete cascade,
  start_date     text,
  end_date       text,
  total_hours    numeric not null default 0,
  used_hours     numeric not null default 0,
  canceled_hours numeric not null default 0,
  notes          text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_contracts_student on contracts(student_id);
create trigger trg_contracts_updated before update on contracts
  for each row execute function set_updated_at();

-- Registros médicos (1:N) — dado sensível, RBAC na aplicação
create table if not exists medical_records (
  id         bigint generated always as identity primary key,
  student_id text not null references students(id) on delete cascade,
  condition  text not null,   -- "TDAH", "Dislexia"
  notes      text
);
create index if not exists idx_medical_student on medical_records(student_id);

-- Planos táticos (1:N) — carga horária semanal usada pelo motor de agenda
create table if not exists tactical_plans (
  id           bigint generated always as identity primary key,
  student_id   text not null references students(id) on delete cascade,
  subject      text not null,
  weekly_hours int  not null default 0,
  strategy     text,
  sequences    jsonb not null default '[]'::jsonb   -- DidacticSequence[]
);
create index if not exists idx_tactical_student on tactical_plans(student_id);

-- Cofre de credenciais (1:1) — AES-256-GCM (bidirecional, NÃO bcrypt)
create table if not exists credentials_vault (
  student_id        text primary key references students(id) on delete cascade,
  school_portal_url text,
  username          text,
  encrypted_hash    text,   -- cifra
  iv                text,   -- vetor de inicialização
  auth_tag          text,   -- tag GCM
  updated_at        timestamptz not null default now()
);
create trigger trg_vault_updated before update on credentials_vault
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- GUARDIANS (responsáveis) + vínculo N:N com alunos
-- ---------------------------------------------------------------------
create table if not exists guardians (
  id                    text primary key,
  owner_id              text,
  name                  text not null,
  email                 text,
  phone                 text,
  cpf                   text,
  relationship          text,          -- Pai, Mãe, etc
  financial_responsible boolean not null default false,
  profissao             text,
  contracts_files       jsonb not null default '[]'::jsonb,  -- {name,data,type}[]
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_guardians_owner on guardians(owner_id);
create trigger trg_guardians_updated before update on guardians
  for each row execute function set_updated_at();

create table if not exists student_guardians (
  student_id  text not null references students(id) on delete cascade,
  guardian_id text not null references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

-- ---------------------------------------------------------------------
-- TEACHERS
-- ---------------------------------------------------------------------
create table if not exists teachers (
  id                    text primary key,
  owner_id              text,
  name                  text not null,
  email                 text,
  subject               text,
  photo_url             text,
  hourly_rate_individual numeric,
  hourly_rate_group      numeric,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_teachers_owner on teachers(owner_id);
create trigger trg_teachers_updated before update on teachers
  for each row execute function set_updated_at();

create table if not exists teacher_availability (
  id          bigint generated always as identity primary key,
  teacher_id  text not null references teachers(id) on delete cascade,
  day_of_week int  not null check (day_of_week between 0 and 6),
  start_time  text not null,
  end_time    text not null
);
create index if not exists idx_teach_avail_teacher on teacher_availability(teacher_id);

-- ---------------------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------------------
create table if not exists rooms (
  id         text primary key,
  owner_id   text,
  name       text not null,
  capacity   int not null default 1,
  resources  jsonb not null default '[]'::jsonb,   -- string[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_rooms_updated before update on rooms
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- CLASS GROUPS (turmas) + N:N professores/alunos + grade fixa
-- ---------------------------------------------------------------------
create table if not exists class_groups (
  id         text primary key,
  owner_id   text,
  name       text not null,
  workload   numeric not null default 0,
  subjects   jsonb not null default '[]'::jsonb,   -- string[]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_class_groups_updated before update on class_groups
  for each row execute function set_updated_at();

create table if not exists class_group_teachers (
  class_group_id text not null references class_groups(id) on delete cascade,
  teacher_id     text not null references teachers(id) on delete cascade,
  primary key (class_group_id, teacher_id)
);

create table if not exists class_group_students (
  class_group_id text not null references class_groups(id) on delete cascade,
  student_id     text not null references students(id) on delete cascade,
  primary key (class_group_id, student_id)
);

create table if not exists class_group_schedules (
  id             text primary key default ('cgs-' || gen_random_uuid()),
  class_group_id text not null references class_groups(id) on delete cascade,
  day_of_week    int  not null check (day_of_week between 0 and 6),
  start_time     text not null,
  end_time       text not null,
  subject        text,
  teacher_id     text references teachers(id) on delete set null
);
create index if not exists idx_cgs_group on class_group_schedules(class_group_id);

-- ---------------------------------------------------------------------
-- BOOKINGS (agendamentos) + N:N alunos (aulas em grupo)
-- ---------------------------------------------------------------------
create table if not exists bookings (
  id             text primary key,
  owner_id       text,
  student_id     text references students(id) on delete set null,   -- aula individual
  class_group_id text references class_groups(id) on delete set null,
  series_id      text,                                              -- recorrência
  teacher_id     text references teachers(id) on delete set null,
  room_id        text references rooms(id) on delete set null,
  date           text not null,   -- "YYYY-MM-DD"
  start_time     text not null,   -- "HH:MM"
  end_time       text not null,
  status         text not null default 'agendada'
                   check (status in ('agendada','realizada_presenca',
                          'realizada_falta','desmarcada','cancelada')),
  subject        text,
  front          text,
  topic          text,
  topic_finished boolean,
  observations   text,
  materials      text,
  google_event_id text,           -- id do evento no Google Agenda (fase Calendar)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_bookings_date    on bookings(date);
create index if not exists idx_bookings_teacher on bookings(teacher_id);
create index if not exists idx_bookings_room    on bookings(room_id);
create index if not exists idx_bookings_student on bookings(student_id);
create trigger trg_bookings_updated before update on bookings
  for each row execute function set_updated_at();

create table if not exists booking_students (
  booking_id text not null references bookings(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  primary key (booking_id, student_id)
);

-- ---------------------------------------------------------------------
-- DRAFTS (rascunhos de cadastro vindos de formulário/IA) — payload JSONB
-- ---------------------------------------------------------------------
create table if not exists student_drafts (
  id           text primary key,
  status       text not null default 'Pendente'
                 check (status in ('Pendente','Aprovado','Rejeitado')),
  submitted_at timestamptz not null default now(),
  data         jsonb not null default '{}'::jsonb,   -- StudentDraft achatado
  updated_at   timestamptz not null default now()
);
create trigger trg_student_drafts_updated before update on student_drafts
  for each row execute function set_updated_at();

create table if not exists guardian_drafts (
  id           text primary key,
  status       text not null default 'Pendente'
                 check (status in ('Pendente','Aprovado','Rejeitado')),
  submitted_at timestamptz not null default now(),
  data         jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
create trigger trg_guardian_drafts_updated before update on guardian_drafts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- CURRÍCULOS / EMENTAS (CurriculumPlanner) — estrutura aninhada em JSONB
-- ---------------------------------------------------------------------
create table if not exists curriculums (
  id              text primary key,
  owner_id        text,
  discipline_name text,
  macro_contents  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_curriculums_updated before update on curriculums
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- BACKUPS de aplicação (export/import manual) — snapshot JSONB
-- (PITR/backups de infra ficam a cargo do Supabase, ver AGENTS.md)
-- ---------------------------------------------------------------------
create table if not exists system_backups (
  id         text primary key default ('bkp-' || gen_random_uuid()),
  label      text,
  snapshot   jsonb not null,
  created_at timestamptz not null default now()
);
