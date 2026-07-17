# Changelog

## [1.0.2] - 2026-07-17 — Backup/Restauração e persistência do banco

### Backup e Restauração (tela Gerenciamento)

**Backup**
- Criado endpoint `GET /api/export/backup` (`ExportController`) que lê diretamente do banco e retorna JSON compatível com o `BudgetState` do frontend (mapeamento correto: `title→name`, `encerrada→encerrado`, accountId em parcelas, etc.).
- Frontend (`gerenciamento.tsx`) atualizado: `handleBackup` agora chama o servidor ao invés de usar estado local (`getSnapshot()`), que poderia estar desatualizado. Botão exibe loading enquanto gera.
- Adicionada função `exportBackupFromServer()` em `import-helper.ts`.

**Restauração**
- `handleConfirmRestore` atualizado: após importar no backend, chama `forceRehydrate()` ao invés de `replaceState(pending)`, garantindo que a UI reflita exatamente o que foi gravado no banco.
- Adicionada função `forceRehydrate()` em `budget-store.ts` (zera flag `hydrated` e recarrega do backend).
- Removido fallback para localStorage — restauração sem backend agora exibe erro, evitando estado inconsistente.

**Campos faltantes corrigidos**
- `Proposal.java` — adicionado campo `discountPercent` (`BigDecimal`) que era ignorado antes.
- `Quotation.java` — adicionado campo `winnerJustification` (`String`) que era ignorado antes.
- `BackupImportDto` atualizado com os campos correspondentes em `ProposalDto` e `QuotationDto`.
- `ImportService` atualizado para gravar ambos os campos na restauração.

### Persistência do banco (H2 file-based)

**Problema**: `jdbc:h2:mem:budgetdb` sem `DB_CLOSE_DELAY=-1` fazia o banco H2 apagar os dados em dois cenários:
1. HikariCP fecha conexões ociosas após ~10 min → última conexão encerra o banco in-memory → dados somem com app aberto por muito tempo.
2. Qualquer restart do Spring Boot zera o banco completamente (in-memory por definição).

**Correção**: migrado para `jdbc:h2:file:./data/budgetdb;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE`.
- Banco gravado em `C:\Codigos\data\budgetdb.mv.db`.
- Dados persistem entre restarts do backend e não têm timeout de conexão.
- `data/` adicionado ao `.gitignore`.

---

## [1.0.1] - 2026-07-17 — Correções no start-dev.bat

### Problemas corrigidos em `start-dev.bat`

**Erro 1 — `... foi inesperado neste momento`**
- Causa: parênteses literais `(PID %%a)` dentro do bloco `do (...)` do `for /f` eram interpretados como fechamento do bloco pelo parser do cmd.exe.
- Correção: escapar com `^(PID %%a^)`.

**Erro 2 — `The JAVA_HOME environment variable is not defined correctly`**
- Causa: `set JAVA_HOME=C:\...\jdk-25.0.2 && mvn.cmd` — o espaço antes do `&&` é incluído no valor da variável pelo cmd.exe, resultando em `JAVA_HOME=...\jdk-25.0.2 ` (com espaço no final). O Maven constrói o caminho `%JAVA_HOME%\bin\java.exe`, que fica inválido devido ao espaço.
- Correção: removidos `set JAVA_HOME=...` e `set PATH=...` da string do `cmd /k`. O processo filho herda `JAVA_HOME` diretamente do processo pai (batch), que já o define corretamente no início do script. Não é necessário redefinir dentro da string do `/k`.

---

## [1.0.0] - 2026-07-16 — Versão 0 estável pós-migração do Lovable

### Stack
- **Backend**: Spring Boot 4.1.0 · Java 25 · Hibernate ORM 7.4.1 · H2 (in-memory) · Maven 3.10.0
- **Frontend**: TanStack Start · React · Vite · TypeScript · Tailwind CSS

### O que estava no Lovable e foi migrado
- Aplicativo de gestão financeira de obras (budget-buddy)
- Módulos: Etapas, Contas, Lançamentos, Parcelas, Itens, Cotações, Propostas, Inventário

### Migrações e correções realizadas nesta versão
- Upgrade Java 21 → 25 (JDK instalado, Lombok `annotationProcessorPaths` configurado)
- Upgrade Spring Boot 3.3.2 → 4.1.0 (via intermediário 3.5.16; `spring-boot-starter-web` → `spring-boot-starter-webmvc`)
- Removido `@GeneratedValue` de todas as entidades JPA; adicionado `@PrePersist` com geração de UUID condicional (`if id == null`)
- Corrigido `ImportService`: substituído `repository.save()` por `entityManager.persist()` direto para suportar importação com IDs pré-definidos no Hibernate 7
- Adicionado `@JsonManagedReference`/`@JsonBackReference` em `Expense` ↔ `Installment` e `Expense` ↔ `ExpenseItem` para eliminar referência circular na serialização JSON
- Corrigido `Quotation.@PrePersist` para não sobrescrever `createdAt`/`status` durante importação
- Erro de tratamento de transação no `ImportController`: `try-catch` movido para fora do método `@Transactional`
- `start-dev.bat` criado para subir backend e frontend com um clique (mata processo na porta 8081 automaticamente)
