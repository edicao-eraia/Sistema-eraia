import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SHIFT_DEFINITIONS,
  createWeekdaySlots,
  migrateAfternoonAvailability,
  migrateAndPersistAvailability,
} from '../src/lib/availability';

test('define o turno da tarde de 14:00 a 18:00', () => {
  assert.deepEqual(SHIFT_DEFINITIONS.afternoon, { label: 'Tarde', start: '14:00', end: '18:00' });
  assert.deepEqual(
    createWeekdaySlots('afternoon'),
    [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '14:00', endTime: '18:00' })),
  );
});

test('aplica as definições centralizadas aos atalhos e matrizes do App', () => {
  const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

  assert.match(source, /from "\.\/lib\/availability"/);
  assert.match(source, /createWeekdaySlots\('afternoon'\)/);
  assert.match(source, /Object\.entries\(SHIFT_DEFINITIONS\)/);
  assert.match(source, /key: "tarde", shift: SHIFT_DEFINITIONS\.afternoon/);
});

test('migra apenas o bloco legado exato e é idempotente', () => {
  const input = [{ id: '1', availability: [
    { dayOfWeek: 1, startTime: '13:00', endTime: '18:00' },
    { dayOfWeek: 2, startTime: '13:00', endTime: '17:00' },
  ] }];

  const first = migrateAfternoonAvailability(input);
  assert.equal(first.changed, true);
  assert.notStrictEqual(first.records, input);
  assert.notStrictEqual(first.records[0], input[0]);
  assert.equal(first.records[0].availability?.[0].startTime, '14:00');
  assert.equal(first.records[0].availability?.[1].startTime, '13:00');

  const second = migrateAfternoonAvailability(first.records);
  assert.equal(second.changed, false);
  assert.strictEqual(second.records, first.records);
  assert.deepEqual(second.records, first.records);
});

test('persiste uma vez o payload migrado quando alunos e professores mudam', async () => {
  const state = {
    students: [{ id: 'student-1', availability: [{ dayOfWeek: 1, startTime: '13:00', endTime: '18:00' }] }],
    teachers: [{ id: 'teacher-1', availability: [{ dayOfWeek: 2, startTime: '13:00', endTime: '18:00' }] }],
    rooms: [{ id: 'room-1' }],
  };
  const persisted: typeof state[] = [];

  const result = await migrateAndPersistAvailability(state, async value => {
    persisted.push(value);
  });

  assert.equal(result.changed, true);
  assert.equal(persisted.length, 1);
  assert.deepEqual(persisted[0], {
    ...state,
    students: [{ id: 'student-1', availability: [{ dayOfWeek: 1, startTime: '14:00', endTime: '18:00' }] }],
    teachers: [{ id: 'teacher-1', availability: [{ dayOfWeek: 2, startTime: '14:00', endTime: '18:00' }] }],
  });
  assert.strictEqual(result.state, persisted[0]);
});

test('persiste uma vez quando somente alunos mudam', async () => {
  const state = {
    students: [{ id: 'student-1', availability: [{ dayOfWeek: 1, startTime: '13:00', endTime: '18:00' }] }],
    teachers: [{ id: 'teacher-1', availability: [{ dayOfWeek: 2, startTime: '14:00', endTime: '18:00' }] }],
  };
  const persisted: typeof state[] = [];

  await migrateAndPersistAvailability(state, async value => { persisted.push(value); });

  assert.equal(persisted.length, 1);
  assert.equal(persisted[0].students[0].availability[0].startTime, '14:00');
  assert.strictEqual(persisted[0].teachers, state.teachers);
});

test('persiste uma vez quando somente professores mudam', async () => {
  const state = {
    students: [{ id: 'student-1', availability: [{ dayOfWeek: 1, startTime: '14:00', endTime: '18:00' }] }],
    teachers: [{ id: 'teacher-1', availability: [{ dayOfWeek: 2, startTime: '13:00', endTime: '18:00' }] }],
  };
  const persisted: typeof state[] = [];

  await migrateAndPersistAvailability(state, async value => { persisted.push(value); });

  assert.equal(persisted.length, 1);
  assert.strictEqual(persisted[0].students, state.students);
  assert.equal(persisted[0].teachers[0].availability[0].startTime, '14:00');
});

test('não persiste quando não há disponibilidade legada', async () => {
  const state = {
    students: [{ id: 'student-1', availability: [{ dayOfWeek: 1, startTime: '14:00', endTime: '18:00' }] }],
    teachers: [{ id: 'teacher-1', availability: [{ dayOfWeek: 2, startTime: '13:00', endTime: '17:00' }] }],
  };
  let persistCalls = 0;

  const result = await migrateAndPersistAvailability(state, async () => { persistCalls += 1; });

  assert.equal(result.changed, false);
  assert.equal(persistCalls, 0);
  assert.strictEqual(result.state, state);
});
