# Correções de disponibilidade e planejamento de turmas

## Objetivo

Corrigir os atalhos de disponibilidade de alunos e professores para que o turno da tarde comece às 14h, tornar permanentemente visíveis as ações dos cartões de turmas e permitir que cada turma tenha um planejamento compartilhado por disciplina, importado dos dados da página Planejamentos.

## Escopo

### Disponibilidade

- Centralizar a definição dos turnos usados pelos formulários de alunos e professores:
  - manhã: `08:00–13:00`;
  - tarde: `14:00–18:00`;
  - noite: `18:00–21:00`.
- Usar a definição central tanto nos atalhos semanais quanto na matriz por dia e turno.
- Converter em todos os alunos e professores os blocos existentes exatamente iguais a `13:00–18:00` para `14:00–18:00`.
- Preservar qualquer horário personalizado diferente do bloco exato, inclusive `13:00–17:00` e `13:30–18:00`.
- Implementar a conversão como migração idempotente: execuções repetidas não podem alterar novamente os dados nem criar duplicatas.

### Ações de turmas

- Manter os botões de editar e excluir sempre visíveis no canto superior direito de cada cartão.
- Preservar os manipuladores e as confirmações existentes.
- Garantir contraste, foco por teclado, rótulo acessível e estados de hover/focus.

### Planejamento compartilhado da turma

- Adicionar a `ClassGroup` um campo opcional de planejamentos por disciplina, preservando turmas antigas.
- Cada planejamento conterá:
  - disciplina;
  - horas semanais;
  - estratégia;
  - sequência didática ordenada, formada por frente e conteúdo.
- No cadastro e na edição da turma, exibir a seção **Planejamento da Turma**.
- Permitir criar um planejamento para cada disciplina vinculada à turma.
- Permitir importar conteúdos cadastrados na página Planejamentos por meio do seletor curricular existente.
- Permitir adicionar, editar, reordenar e remover conteúdos manualmente antes de salvar.
- Salvar o planejamento junto à turma para que seja único e compartilhado por todos os seus alunos.
- Não copiar automaticamente o planejamento para os perfis individuais dos alunos.
- Mostrar no cartão da turma quais disciplinas possuem planejamento e a quantidade de tópicos de cada uma.

## Arquitetura e fluxo de dados

1. Uma definição reutilizável de turnos fornece os intervalos aos dois formulários de disponibilidade.
2. Uma rotina de migração lê os registros persistidos de alunos e professores, transforma apenas os blocos exatos e persiste somente conjuntos que foram alterados.
3. O tipo `ClassGroup` passa a aceitar planejamentos opcionais por disciplina.
4. `ClassGroupsList` mantém uma cópia editável desses planejamentos no formulário da turma.
5. O importador curricular devolve sequências didáticas selecionadas; a turma associa a sequência à disciplina escolhida.
6. A criação e a atualização existentes persistem o novo campo no mesmo payload da turma.
7. Ao abrir uma turma antiga, a ausência do campo é normalizada para uma coleção vazia apenas na interface.

## Compatibilidade e integridade

- O novo campo de turma é opcional.
- A API continua aceitando os payloads antigos.
- Horários personalizados não são normalizados implicitamente.
- Uma importação adiciona os tópicos selecionados ao planejamento da disciplina e preserva a ordem retornada pelo importador.
- Conteúdos duplicados na mesma disciplina, com a mesma frente e o mesmo conteúdo, não devem ser adicionados novamente durante uma única importação.
- Se uma disciplina for removida da lista da turma, o planejamento associado permanecerá no formulário até o salvamento, quando a interface solicitará confirmação antes de removê-lo. Isso evita perda silenciosa de dados.
- Uma falha ao importar ou salvar mantém o modal e os dados preenchidos abertos e apresenta uma mensagem de erro.

## Interface

- As ações dos cartões serão visíveis sem depender de hover, inclusive em dispositivos de toque.
- A seção de planejamento aparecerá depois da seleção de disciplinas e antes dos vínculos de professores e alunos.
- Cada disciplina terá um painel compacto com horas semanais, estratégia e sequência didática.
- O resumo no cartão exibirá somente disciplinas com pelo menos um tópico planejado.

## Estratégia de testes

Os testes serão escritos antes das alterações de produção e deverão cobrir:

- conversão de `13:00–18:00` para `14:00–18:00` em alunos e professores;
- idempotência da migração;
- preservação de blocos personalizados;
- atalhos e matriz diária usando a definição central de turnos;
- ações de editar e excluir permanentemente visíveis e acionáveis;
- abertura de turma antiga sem planejamento;
- importação, deduplicação, edição, ordenação e remoção de tópicos;
- persistência de múltiplos planejamentos separados por disciplina;
- resumo de planejamento no cartão;
- manutenção do formulário em caso de erro de salvamento;
- verificação completa de testes, TypeScript e build de produção.

## Fora do escopo

- Alterar o término do turno da manhã.
- Converter horários personalizados que apenas começam às 13h.
- Copiar o planejamento da turma para o planejamento individual de cada aluno.
- Criar um novo módulo de currículo ou substituir a página Planejamentos existente.
- Mudar permissões ou papéis de usuário.
