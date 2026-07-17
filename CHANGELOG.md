# Changelog

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
