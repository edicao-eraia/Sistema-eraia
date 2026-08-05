# Diretrizes de Arquitetura e Escalabilidade

Atuando como Arquiteto de Software focado em Escalabilidade, o sistema passará por evoluções contínuas. Para garantir que funcionalidades antigas e registros salvos não quebrem, as seguintes diretrizes devem ser aplicadas rigorosamente:

## 1. Retrocompatibilidade Obrigatória (Backward Compatibility)
- Nenhuma alteração na modelagem de dados pode quebrar o código ou as rotas (endpoints) existentes.
- Sempre que uma nova coluna for adicionada a uma tabela em uso (ex: adicionar `telefone_responsavel` na tabela de alunos), ela deve obrigatoriamente ser configurada como opcional (Nullable / NULL) ou possuir um valor padrão fixo (DEFAULT). Isso garante que registros antigos não gerem conflitos.

## 2. Gerenciamento Estrito via Migrations
- É expressamente proibido alterar o banco de dados manualmente.
- Toda e qualquer mudança na estrutura de dados (criação de tabelas, modificação de colunas, novos relacionamentos) deve ser feita exclusivamente através de arquivos de Migrations versionados pelo ORM (ex: Prisma Migrate, Drizzle). O estado do banco de dados deve ser previsível e acompanhar a versão do código no repositório. *(Nota: O projeto atualmente utiliza um JSON local DB, mas na eventual migração para um banco relacional, esta regra entra em vigor estritamente)*.

## 3. Extensibilidade Relacional vs. Inflação de Tabelas
- Evite inflar (bloat) tabelas principais com dados secundários. 
- Se houver necessidade de salvar múltiplos arquivos/documentos ou múltiplos responsáveis, não adicione colunas genéricas como `arquivo_1`, `arquivo_2`.
- Crie **tabelas satélites** para essas novidades (ex: `StudentFiles` com relacionamento 1:N ou `Guardians` com relacionamento N:N), mantendo a tabela principal limpa e preservando a alta performance.

## 4. Resiliência de API (Proteção de Payload)
- O Backend deve utilizar uma biblioteca de validação (como Zod ou class-validator) configurada para remover e ignorar automaticamente propriedades desconhecidas no corpo da requisição (strip/whitelist).
- Dessa forma, se a interface Frontend enviar informações inéditas no JSON, o Backend ignorará os dados não mapeados e continuará salvando as partes conhecidas sem disparar erros 500.

# Políticas de Retenção e Backup (Engenharia de Dados e Cloud)

Atuando como Engenheiro de Dados Sênior e Arquiteto Cloud, aplique a seguinte política de retenção e backup para garantir consistência e zero perda de dados (Zero Data Loss):

## 1. Estratégia de Backups Frequentes (Snapshots e Dumps)
- Configure rotinas automatizadas para realizar Backups Completos Diários (Full Backups) durante a madrugada (janela de menor tráfego).
- Mantenha uma retenção desses backups diários por pelo menos 30 dias.
- Crie uma rotina de Backups Incrementais a cada 6 horas para capturar o volume de agendamentos e alterações feitas ao longo do dia comercial.

## 2. Point-in-Time Recovery (PITR) com Logs Transacionais
- Habilite o arquivamento contínuo de logs de transação (WAL - Write-Ahead Logging) do PostgreSQL.
- O sistema de banco de dados deve ser configurado para permitir a restauração do banco para qualquer minuto específico dos últimos 7 dias.
- **Cenário de uso:** Se uma atualização às 14h00 corromper saldos, o banco deve poder ser restaurado para o estado exato das 13h59.

## 3. Isolamento e Segurança Geográfica
- Os arquivos de backup (.sql ou snapshots) devem ser armazenados em um ambiente fisicamente e logicamente isolado do servidor principal (ex: Bucket S3 exclusivo para backups).
- Aplique bloqueios de exclusão (Object Lock/WORM) para evitar que backups sejam apagados acidentalmente ou por scripts maliciosos.

## 4. Fluxo Seguro para Modificações no Sistema (Migrations)
- Nunca execute scripts de alteração estrutural (Migrations) diretamente em Produção sem testes.
- O banco de Produção deve ser clonado (e anonimizado) para um Ambiente de Staging (Homologação). 
- Valide as novas funcionalidades nesse ambiente isolado antes de aplicar a atualização na base real.
