# Turmas, Disponibilidade e Planejamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir o turno da tarde e migrar dados existentes, exibir permanentemente as ações de turmas e adicionar planejamento compartilhado por disciplina às turmas.

**Architecture:** Regras puras de domínio ficarão em módulos pequenos e testáveis, enquanto `App.tsx` e `ClassGroupsList.tsx` apenas consumirão essas regras. A migração idempotente será aplicada no carregamento do estado do servidor e persistida quando houver mudanças; o planejamento continuará no JSON da própria turma, com campo opcional para retrocompatibilidade.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Express 4, PostgreSQL/Supabase JSONB, `node:test` executado por `tsx`.

## Global Constraints

- Manhã: `08:00–13:00`; tarde: `14:00–18:00`; noite: `18:00–21:00`.
- Converter somente blocos existentes exatamente iguais a `13:00–18:00`.
- Preservar horários personalizados e turmas antigas.
- O planejamento é único por turma e disciplina e não é copiado aos alunos.
- Nenhuma alteração manual de banco; toda conversão deve ser versionada e idempotente.

---

### Task 1: Infraestrutura de testes e turnos centralizados

**Files:**
- Modify: `package.json`
- Create: `src/lib/availability.ts`
- Create: `tests/availability.test.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Produces: `SHIFT_DEFINITIONS`, `createWeekdaySlots(shiftKey)` e `AvailabilityShiftKey`.

- [ ] **Step 1: adicionar o script e escrever o teste falho**

```json
"test": "tsx --test tests/**/*.test.ts"
```

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { SHIFT_DEFINITIONS, createWeekdaySlots } from '../src/lib/availability';

test('define o turno da tarde de 14:00 a 18:00', () => {
  assert.deepEqual(SHIFT_DEFINITIONS.afternoon, { label: 'Tarde', start: '14:00', end: '18:00' });
  assert.deepEqual(createWeekdaySlots('afternoon'), [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: '14:00', endTime: '18:00' })));
});
```

- [ ] **Step 2: executar e confirmar RED**

Run: `npm test -- --test-name-pattern="define o turno"`

Expected: FAIL porque `src/lib/availability.ts` ainda não existe.

- [ ] **Step 3: implementar a definição mínima**

```ts
export const SHIFT_DEFINITIONS = {
  morning: { label: 'Manhã', start: '08:00', end: '13:00' },
  afternoon: { label: 'Tarde', start: '14:00', end: '18:00' },
  night: { label: 'Noite', start: '18:00', end: '21:00' },
} as const;
export type AvailabilityShiftKey = keyof typeof SHIFT_DEFINITIONS;
export function createWeekdaySlots(key: AvailabilityShiftKey) {
  const shift = SHIFT_DEFINITIONS[key];
  return [1, 2, 3, 4, 5].map(dayOfWeek => ({ dayOfWeek, startTime: shift.start, endTime: shift.end }));
}
```

- [ ] **Step 4: substituir em `App.tsx` os arrays duplicados dos atalhos e matrizes de alunos/professores por `SHIFT_DEFINITIONS` e `createWeekdaySlots`, mantendo o período integral em `08:00–18:00`**

- [ ] **Step 5: executar `npm test` e `npm run lint`; esperar ambos com exit code 0**

- [ ] **Step 6: commit**

```bash
git add package.json src/lib/availability.ts src/App.tsx tests/availability.test.ts
git commit -m "fix: inicia turno da tarde as 14h"
```

### Task 2: Migração idempotente das disponibilidades existentes

**Files:**
- Modify: `src/lib/availability.ts`
- Modify: `tests/availability.test.ts`
- Modify: `server.ts`

**Interfaces:**
- Consumes: `AvailabilitySlot` shape `{ dayOfWeek, startTime, endTime }`.
- Produces: `migrateAfternoonAvailability<T extends { availability?: AvailabilitySlot[] }>(records: T[]): { records: T[]; changed: boolean }`.

- [ ] **Step 1: escrever testes falhos para conversão, preservação e idempotência**

```ts
test('migra apenas o bloco legado exato e é idempotente', () => {
  const input = [{ id: '1', availability: [
    { dayOfWeek: 1, startTime: '13:00', endTime: '18:00' },
    { dayOfWeek: 2, startTime: '13:00', endTime: '17:00' },
  ] }];
  const first = migrateAfternoonAvailability(input);
  assert.equal(first.changed, true);
  assert.equal(first.records[0].availability?.[0].startTime, '14:00');
  assert.equal(first.records[0].availability?.[1].startTime, '13:00');
  const second = migrateAfternoonAvailability(first.records);
  assert.equal(second.changed, false);
  assert.deepEqual(second.records, first.records);
});
```

- [ ] **Step 2: executar o teste e confirmar FAIL por export ausente**

- [ ] **Step 3: implementar transformação imutável que só recria registros alterados**

```ts
export function migrateAfternoonAvailability<T extends { availability?: AvailabilitySlot[] }>(records: T[]) {
  let changed = false;
  const migrated = records.map(record => {
    let recordChanged = false;
    const availability = record.availability?.map(slot => {
      if (slot.startTime === '13:00' && slot.endTime === '18:00') {
        changed = recordChanged = true;
        return { ...slot, startTime: '14:00' };
      }
      return slot;
    });
    return recordChanged ? { ...record, availability } : record;
  });
  return { records: changed ? migrated : records, changed };
}
```

- [ ] **Step 4: em `loadDb()`, migrar `data.students` e `data.teachers`; chamar `saveDb()` uma vez somente quando algum conjunto mudar**

- [ ] **Step 5: executar `npm test` e `npm run lint`; esperar exit code 0**

- [ ] **Step 6: commit**

```bash
git add src/lib/availability.ts tests/availability.test.ts server.ts
git commit -m "fix: migra disponibilidades antigas da tarde"
```

### Task 3: Modelo e operações puras do planejamento da turma

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/class-group-planning.ts`
- Create: `tests/class-group-planning.test.ts`

**Interfaces:**
- Produces: `ClassGroupPlan { subject; weeklyHours; strategy; sequences }` e `mergeImportedSequences(existing, imported)`.

- [ ] **Step 1: escrever teste falho de ordenação e deduplicação por frente + conteúdo**

```ts
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
```

- [ ] **Step 2: executar e confirmar FAIL por módulo ausente**

- [ ] **Step 3: adicionar a `ClassGroup` o campo `plans?: ClassGroupPlan[]` e implementar `mergeImportedSequences` com chave normalizada `${front.trim().toLocaleLowerCase('pt-BR')}::${content.trim().toLocaleLowerCase('pt-BR')}`**

- [ ] **Step 4: adicionar testes para arrays vazios, ausência de `front` e duas disciplinas independentes; executar `npm test`**

- [ ] **Step 5: commit**

```bash
git add src/types.ts src/lib/class-group-planning.ts tests/class-group-planning.test.ts
git commit -m "feat: modela planejamento compartilhado de turmas"
```

### Task 4: Editor e importação de planejamento na turma

**Files:**
- Modify: `src/components/ClassGroupsList.tsx`
- Reuse: `src/components/CurriculumImporterModal.tsx`

**Interfaces:**
- Consumes: `ClassGroupPlan`, `mergeImportedSequences`, `CurriculumImporterModal`.
- Produces: payload de criação/edição com `plans` separado por disciplina.

- [ ] **Step 1: estender os testes puros com `normalizePlansForSubjects(plans, subjects)` e confirmar RED; a função deve preservar planos válidos e retornar os planos órfãos separadamente para confirmação**

```ts
assert.deepEqual(normalizePlansForSubjects([{ subject: 'Física', weeklyHours: 2, strategy: '', sequences: [] }], ['Matemática']), {
  active: [], orphaned: [{ subject: 'Física', weeklyHours: 2, strategy: '', sequences: [] }],
});
```

- [ ] **Step 2: implementar o helper mínimo e confirmar GREEN**

- [ ] **Step 3: inicializar `plans: []` em nova turma e `plans: c.plans || []` ao editar; incluir `plans` filtrado no payload**

- [ ] **Step 4: renderizar um painel por disciplina com horas semanais, estratégia, lista editável, ações subir/descer/remover, “Adicionar manualmente” e “Importar do Planejamento”**

- [ ] **Step 5: abrir `CurriculumImporterModal` com a disciplina ativa e, no `onImport`, aplicar `mergeImportedSequences`; manter o modal da turma aberto em falhas de persistência**

- [ ] **Step 6: ao salvar com planos órfãos, pedir confirmação explícita antes de descartá-los; cancelar o submit se a confirmação for negada**

- [ ] **Step 7: executar `npm test`, `npm run lint` e `npm run build`; esperar exit code 0**

- [ ] **Step 8: commit**

```bash
git add src/components/ClassGroupsList.tsx src/lib/class-group-planning.ts tests/class-group-planning.test.ts
git commit -m "feat: adiciona planejamento por disciplina as turmas"
```

### Task 5: Visibilidade das ações e resumo no cartão

**Files:**
- Modify: `src/components/ClassGroupsList.tsx`
- Create: `tests/class-group-card-source.test.ts`

**Interfaces:**
- Consumes: `ClassGroup.plans`.

- [ ] **Step 1: escrever teste de regressão que lê o componente e exige ausência de `opacity-0 group-hover:opacity-100` no contêiner das ações e presença dos rótulos `Editar` e `Excluir`**

```ts
const source = readFileSync(new URL('../src/components/ClassGroupsList.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(source, /flex gap-1 opacity-0 group-hover:opacity-100/);
assert.match(source, /title="Editar"/);
assert.match(source, /title="Excluir"/);
```

- [ ] **Step 2: executar e confirmar FAIL pela classe atual de opacidade**

- [ ] **Step 3: remover a opacidade condicional, adicionar `aria-label` aos botões e estilos de foco visível**

- [ ] **Step 4: renderizar no cartão um resumo `Disciplina: N tópicos` apenas para planos com sequências**

- [ ] **Step 5: executar `npm test`, `npm run lint` e `npm run build`; esperar exit code 0**

- [ ] **Step 6: revisar `git diff --check`, confirmar que somente arquivos do plano mudaram e fazer commit**

```bash
git add src/components/ClassGroupsList.tsx tests/class-group-card-source.test.ts
git commit -m "fix: exibe acoes e resumo nos cartoes de turmas"
```

### Task 6: Verificação integrada

**Files:**
- Verify only.

- [ ] **Step 1: executar `npm test`; esperar todos os testes passando e zero falhas**
- [ ] **Step 2: executar `npm run lint`; esperar TypeScript com exit code 0**
- [ ] **Step 3: executar `npm run build`; esperar Vite e esbuild com exit code 0**
- [ ] **Step 4: iniciar `npm run dev` e validar manualmente: atalhos às 14h, edição/exclusão visíveis, importação por disciplina, persistência após recarregar e resumo no cartão**
- [ ] **Step 5: executar `git status --short` e `git log --oneline -6`; documentar qualquer limitação real encontrada sem mascará-la**
