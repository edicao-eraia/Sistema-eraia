import { dom } from './dom-test-env';
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { Toaster, toast } from 'react-hot-toast';
import { ClassGroupsList } from '../src/components/ClassGroupsList';
import { CurriculumImporterModal } from '../src/components/CurriculumImporterModal';
import type { ClassGroup } from '../src/types';

const originalFetch = globalThis.fetch;

type FetchCall = { url: string; options: RequestInit };

function makeGroup(overrides: Partial<ClassGroup> = {}): ClassGroup {
  return {
    id: 'group-1',
    name: 'Turma Alfa',
    workload: 40,
    teacherIds: [],
    studentIds: [],
    subjects: ['Matemática'],
    schedules: [],
    plans: [],
    ...overrides,
  };
}

function setConfirm(handler: () => boolean) {
  Object.defineProperty(globalThis, 'confirm', { configurable: true, value: handler });
  Object.defineProperty(dom.window, 'confirm', { configurable: true, value: handler });
}

function recordFetch(
  responder: (url: string, options: RequestInit) => Response = (_url, options) => (
    new Response(JSON.stringify({ classGroup: JSON.parse(String(options.body || '{}')) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  ),
) {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, options: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, options });
    return responder(url, options);
  }) as typeof fetch;
  return calls;
}

function renderClassGroups(initialGroups: ClassGroup[]) {
  function Harness() {
    const [groups, setGroups] = useState(initialGroups);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Toaster),
      React.createElement(ClassGroupsList, {
        userId: 'user-1',
        classGroups: groups,
        setClassGroups: setGroups,
        teachers: [],
        students: [],
        rooms: [],
        fetchData: () => undefined,
      }),
    );
  }

  return render(React.createElement(Harness));
}

function planningPanel(container: HTMLElement, subject: string) {
  const heading = within(container).getByRole('heading', { name: subject, level: 5 });
  const panel = heading.closest('section');
  assert.ok(panel, `painel de ${subject} deveria existir`);
  return within(panel);
}

afterEach(() => {
  cleanup();
  toast.remove();
  dom.window.localStorage.clear();
  globalThis.fetch = originalFetch;
  delete (globalThis as { confirm?: typeof confirm }).confirm;
});

test('mantém Editar e Excluir visíveis, acessíveis e acionáveis', async () => {
  const legacyGroup = makeGroup();
  delete legacyGroup.plans;
  const calls = recordFetch();
  setConfirm(() => true);
  const view = renderClassGroups([legacyGroup]);

  const edit = view.getByRole('button', { name: 'Editar turma' });
  const remove = view.getByRole('button', { name: 'Excluir turma' });
  assert.equal(edit.closest('div')?.classList.contains('opacity-0'), false);
  assert.equal(remove.closest('div')?.classList.contains('opacity-0'), false);

  fireEvent.click(edit);
  assert.ok(view.getByRole('heading', { name: 'Editar Turma' }));
  assert.ok(view.getByText('0 tópicos no plano'));
  fireEvent.click(view.getByRole('button', { name: 'Cancelar' }));

  fireEvent.click(remove);
  await waitFor(() => assert.equal(calls.some(call => call.url === '/api/class-groups/group-1' && call.options.method === 'DELETE'), true));
});

test('importa na disciplina correta, edita, sobe, desce e remove tópicos', async () => {
  dom.window.localStorage.setItem('eraia_curriculums', JSON.stringify([{
    id: 'math',
    disciplineName: 'Matemática',
    macroContents: [{
      id: 'algebra',
      name: 'Álgebra',
      microContents: [{ id: 'functions', name: 'Funções', description: 'Funções reais' }],
    }],
  }]));
  const view = renderClassGroups([makeGroup({
    subjects: ['Matemática', 'Física'],
    plans: [
      {
        subject: 'Matemática',
        weeklyHours: 4,
        strategy: 'Lista semanal',
        sequences: [
          { front: 'Geometria', content: 'Triângulos', order: 1 },
          { front: 'Aritmética', content: 'Frações', order: 2 },
        ],
      },
      {
        subject: 'Física',
        weeklyHours: 2,
        strategy: 'Experimentos',
        sequences: [{ front: 'Mecânica', content: 'Cinemática', order: 1 }],
      },
    ],
  })]);

  assert.ok(view.getByText('Matemática: 2 tópicos'));
  fireEvent.click(view.getByRole('button', { name: 'Editar turma' }));
  let panel = planningPanel(view.container, 'Matemática');

  fireEvent.click(panel.getByRole('button', { name: 'Importar do Planejamento' }));
  fireEvent.click(view.getByText('Funções'));
  fireEvent.click(view.getByRole('button', { name: 'Adicionar 1 Tópicos' }));
  panel = planningPanel(view.container, 'Matemática');
  assert.equal((panel.getAllByLabelText('Conteúdo')[2] as HTMLInputElement).value, 'Funções');
  assert.equal((planningPanel(view.container, 'Física').getByLabelText('Conteúdo') as HTMLInputElement).value, 'Cinemática');

  fireEvent.change(panel.getAllByLabelText('Conteúdo')[1], { target: { value: 'Frações equivalentes' } });
  assert.equal((panel.getAllByLabelText('Conteúdo')[1] as HTMLInputElement).value, 'Frações equivalentes');

  fireEvent.click(panel.getByRole('button', { name: 'Subir Frações equivalentes' }));
  panel = planningPanel(view.container, 'Matemática');
  assert.equal((panel.getAllByLabelText('Conteúdo')[0] as HTMLInputElement).value, 'Frações equivalentes');

  fireEvent.click(panel.getByRole('button', { name: 'Descer Frações equivalentes' }));
  panel = planningPanel(view.container, 'Matemática');
  assert.equal((panel.getAllByLabelText('Conteúdo')[1] as HTMLInputElement).value, 'Frações equivalentes');

  fireEvent.click(panel.getByRole('button', { name: 'Remover Triângulos' }));
  panel = planningPanel(view.container, 'Matemática');
  assert.equal(panel.queryByDisplayValue('Triângulos'), null);
});

test('envia no submit os planos separados de múltiplas disciplinas', async () => {
  const calls = recordFetch();
  const view = renderClassGroups([makeGroup({
    subjects: ['Matemática', 'Física'],
    plans: [
      { subject: 'Matemática', weeklyHours: 4, strategy: 'Exercícios', sequences: [{ content: 'Funções', order: 1 }] },
      { subject: 'Física', weeklyHours: 2, strategy: 'Laboratório', sequences: [{ content: 'Cinemática', order: 1 }] },
    ],
  })]);

  fireEvent.click(view.getByRole('button', { name: 'Editar turma' }));
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }));

  await waitFor(() => assert.equal(calls.some(call => call.options.method === 'PUT'), true));
  const update = calls.find(call => call.options.method === 'PUT');
  assert.ok(update);
  const payload = JSON.parse(String(update.options.body));
  assert.deepEqual(payload.plans, [
    { subject: 'Matemática', weeklyHours: 4, strategy: 'Exercícios', sequences: [{ content: 'Funções', order: 1 }] },
    { subject: 'Física', weeklyHours: 2, strategy: 'Laboratório', sequences: [{ content: 'Cinemática', order: 1 }] },
  ]);
});

test('confirma planos órfãos, bloqueia a negativa e permite o descarte', async () => {
  const calls = recordFetch();
  let decision = false;
  let confirmationCount = 0;
  setConfirm(() => {
    confirmationCount += 1;
    return decision;
  });
  const view = renderClassGroups([makeGroup({
    subjects: ['Matemática', 'Física'],
    plans: [
      { subject: 'Matemática', weeklyHours: 4, strategy: '', sequences: [] },
      { subject: 'Física', weeklyHours: 2, strategy: 'Revisão', sequences: [{ content: 'Cinemática', order: 1 }] },
    ],
  })]);

  fireEvent.click(view.getByRole('button', { name: 'Editar turma' }));
  fireEvent.click(view.getByRole('button', { name: 'Física' }));
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }));
  assert.equal(confirmationCount, 1);
  assert.equal(calls.some(call => call.options.method === 'PUT'), false);
  assert.ok(view.getByRole('heading', { name: 'Editar Turma' }));

  decision = true;
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }));
  await waitFor(() => assert.equal(calls.some(call => call.options.method === 'PUT'), true));
  const update = calls.find(call => call.options.method === 'PUT');
  assert.ok(update);
  assert.deepEqual(JSON.parse(String(update.options.body)).plans, [
    { subject: 'Matemática', weeklyHours: 4, strategy: '', sequences: [] },
  ]);
});

test('mantém o modal e os dados preenchidos quando o save rejeita', async t => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  t.after(() => { console.error = originalConsoleError; });
  recordFetch(() => new Response(JSON.stringify({ error: 'Falha simulada' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }));
  const view = renderClassGroups([makeGroup({
    plans: [{ subject: 'Matemática', weeklyHours: 4, strategy: 'Original', sequences: [] }],
  })]);

  fireEvent.click(view.getByRole('button', { name: 'Editar turma' }));
  const strategy = view.getByLabelText('Estratégia');
  fireEvent.change(strategy, { target: { value: 'Dados preservados' } });
  fireEvent.click(view.getByRole('button', { name: 'Salvar' }));

  await view.findByText('Erro ao salvar turma: Falha simulada');
  assert.ok(view.getByRole('heading', { name: 'Editar Turma' }));
  assert.equal((view.getByLabelText('Estratégia') as HTMLTextAreaElement).value, 'Dados preservados');
});

test('informa o usuário quando os currículos salvos não podem ser carregados', async () => {
  dom.window.localStorage.setItem('eraia_curriculums', '{curriculo-invalido');
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const view = render(React.createElement(
      React.Fragment,
      null,
      React.createElement(Toaster),
      React.createElement(CurriculumImporterModal, {
        subject: 'Matemática',
        onClose: () => undefined,
        onImport: () => undefined,
      }),
    ));

    await view.findByText('Não foi possível carregar os currículos salvos.');
    assert.ok(view.getByRole('heading', { name: 'Importar do Planejamento' }));
  } finally {
    console.error = originalConsoleError;
  }
});
