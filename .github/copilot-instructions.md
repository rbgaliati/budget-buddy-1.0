## Projeto: Budget Buddy

Stack:
- **Backend**: Spring Boot 4.1.0 · Java 25 · JDK em `C:\Users\rbgal\AppData\Local\jdks\jdk-25.0.2` · Maven 3.10.0-rc-1 em `C:\Users\rbgal\.maven\maven-3.10.0-rc-1`
- **Frontend**: TanStack Start · React · Vite · TypeScript · Tailwind CSS — pasta `budget-buddy/budget-buddy-main`
- **Banco**: H2 file-based em `./data/budgetdb.mv.db` (persiste entre restarts)

## Como subir o ambiente

Execute `start-dev.bat` na raiz. Ele:
1. Mata processos na porta 8081 (com parênteses escapados `^(PID %%a^)` no `for /f`)
2. Abre janela **Backend** — Spring Boot em http://localhost:8081
3. Abre janela **Frontend** — Vite (`npm run dev`)

## Arquitetura de dados

- **Fonte primária**: banco H2 file-based no backend (Spring Boot + JPA/Hibernate)
- **Cache local**: localStorage (`obra-budget-v2`) — usado como fallback offline
- **Hidratação**: `hydrateFromBackend()` no `budget-store.ts` carrega dados do backend na inicialização
- **Sincronização**: todas operações CRUD chamam a API primeiro, depois atualizam o estado local

## Backup e Restauração

- **Backup**: `GET /api/export/backup` — lê do banco e retorna JSON completo (`ExportController.java`)
- **Restauração**: `POST /api/import/backup` — apaga tudo e reimporta (`ImportService.java` com `entityManager.persist`)
- **Pós-restore**: `forceRehydrate()` no `budget-store.ts` garante que UI recarrega do banco

## Lições aprendidas — start-dev.bat

- **Parênteses em bloco `do (...)`**: dentro de um bloco `do (...)` no cmd.exe, parênteses literais no `echo` devem ser escapados com `^(` e `^)`.
- **`set VAR=valor && cmd`**: o espaço antes do `&&` é capturado no valor da variável. Nunca definir `JAVA_HOME` via `&&` dentro da string do `cmd /k "..."` — usar herança de processo pai.
- **Herança de variáveis**: variáveis definidas com `set` no batch pai são herdadas pelos filhos via `start cmd /k "..."`. Não é necessário redefini-las na string do `/k`.

## Lições aprendidas — banco de dados

- **H2 in-memory sem `DB_CLOSE_DELAY=-1`**: HikariCP fecha conexões ociosas (~10 min), apagando o banco. Usar sempre H2 file-based para dev com persistência.
- **H2 file-based**: `jdbc:h2:file:./data/budgetdb;DB_CLOSE_ON_EXIT=FALSE;AUTO_RECONNECT=TRUE` — dados em `./data/budgetdb.mv.db`, ignorado no `.gitignore`.

## Tarefas do projeto

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
- [x] Scaffold the Project
- [x] Customize the Project
- [x] Install Required Extensions
- [x] Compile the Project
- [x] Create and Run Task
- [x] Launch the Project (start-dev.bat funcionando)
- [x] Backup e Restauração funcionais (ExportController + forceRehydrate)
- [x] Persistência do banco (H2 file-based)
- [ ] Ensure Documentation is Complete
