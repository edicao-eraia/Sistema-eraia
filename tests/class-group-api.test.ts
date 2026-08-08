import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import express from 'express';
import type { Server } from 'node:http';
import type { AppState, StatePool } from '../src/lib/store.server';
import {
  registerClassGroupRoutes,
  type ClassGroupRouteState,
} from '../src/lib/class-groups.server';

process.env.DOTENV_CONFIG_QUIET = 'true';
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:5432/test';
const { createSerializedSaver, saveStateWithPool } = await import('../src/lib/store.server');

const passThrough: express.RequestHandler = (_req, _res, next) => next();

function fullState(overrides: Partial<AppState> = {}): AppState {
  return {
    users: [], students: [], teachers: [], rooms: [], classGroups: [], bookings: [],
    studentDrafts: [], guardianDrafts: [], guardians: [], systemBackups: [], curriculums: [],
    ...overrides,
  };
}

async function openApi(options: {
  initial?: ClassGroupRouteState;
  persist: (state: ClassGroupRouteState) => Promise<void>;
}) {
  let state: ClassGroupRouteState = options.initial ?? { classGroups: [], bookings: [] };
  const app = express();
  app.use(express.json());
  registerClassGroupRoutes(app, {
    authenticate: passThrough,
    requireAdmin: passThrough,
    getState: () => state,
    setState: next => { state = next; },
    persist: options.persist,
    acquireMutex: async () => undefined,
    releaseMutex: () => undefined,
    createId: () => 'class-generated',
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    getState: () => state,
    close: async () => {
      server.close();
      await once(server as Server, 'close');
    },
  };
}

function jsonRequest(method: string, body: unknown) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

test('só responde 2xx depois que a persistência da turma termina', async () => {
  let releasePersist!: () => void;
  let markStarted!: () => void;
  const started = new Promise<void>(resolve => { markStarted = resolve; });
  const gate = new Promise<void>(resolve => { releasePersist = resolve; });
  const api = await openApi({
    persist: async () => {
      markStarted();
      await gate;
    },
  });

  try {
    let responseReceived = false;
    const request = fetch(`${api.baseUrl}/api/class-groups`, jsonRequest('POST', {
      name: 'Turma persistida',
      workload: 40,
    })).then(response => {
      responseReceived = true;
      return response;
    });

    await started;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(responseReceived, false);
    assert.equal(api.getState().classGroups.length, 0);

    releasePersist();
    const response = await request;
    assert.equal(response.status, 201);
    assert.equal(api.getState().classGroups.length, 1);
  } finally {
    await api.close();
  }
});

test('rejeição do PostgreSQL retorna 500, não altera memória e não envenena a fila', async () => {
  let databaseAvailable = false;
  const commands: string[] = [];
  const client = {
    async query(sql: string) {
      commands.push(sql.toLowerCase());
      if (!databaseAvailable && sql.toLowerCase().includes('insert into kv_state')) {
        throw new Error('Postgres indisponível');
      }
      return { rows: [] };
    },
    release() { commands.push('release'); },
  };
  const pool: StatePool = { connect: async () => client };
  const save = createSerializedSaver((state: AppState) => saveStateWithPool(pool, state));
  const api = await openApi({
    persist: next => save(fullState(next)),
  });

  try {
    const failed = await fetch(`${api.baseUrl}/api/class-groups`, jsonRequest('POST', {
      name: 'Turma não persistida',
      workload: 40,
    }));
    assert.equal(failed.status, 500);
    assert.match((await failed.json()).error, /persistir/i);
    assert.equal(api.getState().classGroups.length, 0);
    assert.ok(commands.includes('rollback'));

    databaseAvailable = true;
    const succeeded = await fetch(`${api.baseUrl}/api/class-groups`, jsonRequest('POST', {
      name: 'Turma persistida depois',
      workload: 40,
    }));
    assert.equal(succeeded.status, 201);
    assert.equal(api.getState().classGroups.length, 1);
    assert.ok(commands.includes('commit'));
  } finally {
    await api.close();
  }
});

test('POST e PUT removem propriedades desconhecidas, protegem id e normalizam plans', async () => {
  const persisted: ClassGroupRouteState[] = [];
  const api = await openApi({
    initial: {
      classGroups: [{
        id: 'class-original',
        name: 'Turma Original',
        workload: 20,
        teacherIds: [],
        studentIds: [],
        subjects: ['Matemática'],
        schedules: [],
      }],
      bookings: [],
    },
    persist: async next => { persisted.push(structuredClone(next)); },
  });

  try {
    const response = await fetch(`${api.baseUrl}/api/class-groups/class-original`, jsonRequest('PUT', {
      id: 'id-injetado',
      unknownRoot: 'remover',
      name: '  Turma Normalizada  ',
      workload: 40,
      teacherIds: [' teacher-1 ', ''],
      studentIds: [' student-1 ', ''],
      subjects: [' Matemática ', 'Matemática', ''],
      plans: [{
        subject: ' Matemática ',
        unknownPlan: true,
        sequences: [
          { front: '', content: '   ', order: 77, unknownSequence: true },
          { front: ' Álgebra ', content: ' Funções ', order: 99, unknownSequence: true },
        ],
      }],
    }));
    assert.equal(response.status, 200);
    const group = (await response.json()).classGroup;
    assert.deepEqual(group, {
      id: 'class-original',
      name: 'Turma Normalizada',
      workload: 40,
      teacherIds: ['teacher-1'],
      studentIds: ['student-1'],
      subjects: ['Matemática'],
      schedules: [],
      plans: [{
        subject: 'Matemática',
        weeklyHours: 0,
        strategy: '',
        sequences: [{ front: 'Álgebra', content: 'Funções', order: 1 }],
      }],
    });
    assert.deepEqual(persisted.at(-1)?.classGroups, [group]);

    const created = await fetch(`${api.baseUrl}/api/class-groups`, jsonRequest('POST', {
      id: 'id-injetado-no-post',
      name: 'Nova Turma',
      workload: 10,
      subjects: ['Matemática'],
      plans: [{ subject: 'Matemática' }],
    }));
    assert.equal(created.status, 201);
    const createdGroup = (await created.json()).classGroup;
    assert.equal(createdGroup.id, 'class-generated');
    assert.deepEqual(createdGroup.plans, [{
      subject: 'Matemática', weeklyHours: 0, strategy: '', sequences: [],
    }]);
  } finally {
    await api.close();
  }
});

test('rejeita plans estruturalmente inválido sem tentar persistir', async () => {
  let persistCalls = 0;
  const api = await openApi({
    persist: async () => { persistCalls += 1; },
  });

  try {
    const response = await fetch(`${api.baseUrl}/api/class-groups`, jsonRequest('POST', {
      name: 'Turma inválida',
      workload: 40,
      plans: { subject: 'Matemática' },
    }));
    assert.equal(response.status, 400);
    assert.equal(persistCalls, 0);
    assert.equal(api.getState().classGroups.length, 0);
  } finally {
    await api.close();
  }
});

test('estado confirmado pode ser carregado por uma nova instância da API', async () => {
  let durable = { classGroups: [], bookings: [] } as ClassGroupRouteState;
  const first = await openApi({ persist: async next => { durable = structuredClone(next); } });
  try {
    const response = await fetch(`${first.baseUrl}/api/class-groups`, jsonRequest('POST', {
      name: 'Turma durável', workload: 30,
    }));
    assert.equal(response.status, 201);
  } finally {
    await first.close();
  }

  const restarted = await openApi({ initial: structuredClone(durable), persist: async () => undefined });
  try {
    const response = await fetch(`${restarted.baseUrl}/api/class-groups`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).classGroups[0].name, 'Turma durável');
  } finally {
    await restarted.close();
  }
});
