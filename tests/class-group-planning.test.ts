import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeImportedSequences,
  normalizePlansForSubjects,
} from '../src/lib/class-group-planning';

test('mescla conteúdos importados sem duplicar e renumera a ordem', () => {
  const existing = [{ front: 'Álgebra', content: 'Funções', order: 7 }];
  const imported = [
    { front: 'Álgebra', content: 'Funções', order: 1 },
    { front: 'Geometria', content: 'Triângulos', order: 2 },
  ];

  assert.deepEqual(mergeImportedSequences(existing, imported), [
    { front: 'Álgebra', content: 'Funções', order: 1 },
    { front: 'Geometria', content: 'Triângulos', order: 2 },
  ]);
});

test('mantém listas vazias vazias', () => {
  assert.deepEqual(mergeImportedSequences([], []), []);
});

test('deduplica conteúdos sem frente definida', () => {
  const existing = [{ content: 'Cinemática', order: 4 }];
  const imported = [{ content: 'Cinemática', order: 1 }];

  assert.deepEqual(mergeImportedSequences(existing, imported), [
    { content: 'Cinemática', order: 1 },
  ]);
});

test('trata frente e conteúdo equivalentes com espaços e maiúsculas como duplicados', () => {
  const existing = [{ front: ' Álgebra ', content: ' Funções ', order: 3 }];
  const imported = [{ front: 'álgebra', content: 'funções', order: 1 }];

  assert.deepEqual(mergeImportedSequences(existing, imported), [
    { front: ' Álgebra ', content: ' Funções ', order: 1 },
  ]);
});

test('preserva duplicatas preexistentes e deduplica apenas novos itens importados', () => {
  const existing = [
    { front: '', content: '', order: 9 },
    { front: '', content: '', order: 10 },
    { front: 'Álgebra', content: 'Funções', order: 11 },
    { front: 'Álgebra', content: 'Funções', order: 12 },
  ];
  const imported = [
    { front: 'Álgebra', content: 'Funções', order: 1 },
    { front: 'Geometria', content: 'Triângulos', order: 2 },
    { front: ' geometria ', content: ' triângulos ', order: 3 },
  ];

  assert.deepEqual(mergeImportedSequences(existing, imported), [
    { front: '', content: '', order: 1 },
    { front: '', content: '', order: 2 },
    { front: 'Álgebra', content: 'Funções', order: 3 },
    { front: 'Álgebra', content: 'Funções', order: 4 },
    { front: 'Geometria', content: 'Triângulos', order: 5 },
  ]);
});

test('normaliza planos mantendo disciplinas ativas separadas e retornando órfãs', () => {
  const mathematics = { subject: 'Matemática', weeklyHours: 2, strategy: '', sequences: [] };
  const physics = { subject: 'Física', weeklyHours: 3, strategy: 'Revisão', sequences: [] };
  const result = normalizePlansForSubjects([mathematics, physics], ['Matemática', 'Química']);

  assert.deepEqual(result, {
    active: [mathematics],
    orphaned: [physics],
  });
});

test('separa plano de disciplina removida como órfão', () => {
  const physics = { subject: 'Física', weeklyHours: 2, strategy: '', sequences: [] };

  assert.deepEqual(normalizePlansForSubjects([physics], ['Matemática']), {
    active: [],
    orphaned: [physics],
  });
});
