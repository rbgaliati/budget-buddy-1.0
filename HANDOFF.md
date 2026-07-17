# Handoff — 2026-07-16

## Estado atual
- **Versão**: 1.0.0 (tag `v1.0.0`)
- **Repositório**: https://github.com/rbgaliati/budget-buddy-1.0
- **Working tree**: limpa (sem alterações não commitadas)

---

## Como subir o ambiente

```bat
rem Uma linha só, mata port 8081 e abre os dois servidores:
c:\Codigos\start-dev.bat
```

| Serviço | URL |
|---|---|
| Backend (Spring Boot) | http://localhost:8081 |
| H2 Console | http://localhost:8081/h2-console  (JDBC: `jdbc:h2:mem:budgetdb`) |
| Frontend (Vite) | http://localhost:5173 (ou porta auto) |

**Variáveis necessárias no terminal backend:**
```
JAVA_HOME = C:\Users\rbgal\AppData\Local\jdks\jdk-25.0.2
Maven    = C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd
```
(o `start-dev.bat` já define essas variáveis automaticamente)

---

## O que está funcionando

- ✅ Import de backup JSON (`/api/import/backup`) — dados aparecem em todas as páginas
- ✅ CRUD de Etapas, Contas, Despesas, Parcelas, Itens, Cotações, Propostas, Inventário
- ✅ Serialização JSON sem referência circular (Expense ↔ Installment/ExpenseItem)
- ✅ Frontend se reconecta ao backend e transforma os dados corretamente

---

## Limitações conhecidas / débito técnico

| # | Item | Impacto |
|---|---|---|
| 1 | **H2 in-memory**: dados somem ao reiniciar o backend | Alto — considerar H2 file-based (`jdbc:h2:file:./data/budgetdb`) ou PostgreSQL |
| 2 | **Sem autenticação**: qualquer um na rede local acessa a API | Médio — considerar Spring Security básico |
| 3 | **`@CrossOrigin("*")`** em todos os controllers | Baixo por enquanto (só local), mas fixar origem em produção |
| 4 | **Sem testes automatizados** | Médio — sem cobertura de regressão |
| 5 | Warnings do Lombok (`@Builder` + `ArrayList` initializer) | Baixíssimo — só ruído no build |

---

## Sugestões de próximas melhorias (backlog)

1. **Persistência real**: trocar H2 in-memory por H2 file (`./data/budgetdb`) para não perder dados ao reiniciar — alteração em uma linha do `application.properties`
2. **Export de backup**: endpoint `GET /api/export/backup` que devolve o JSON no mesmo formato do import
3. **Paginação/filtro**: `GET /api/expenses?stageId=&from=&to=` já existe no controller; verificar se o frontend usa os parâmetros
4. **Dashboard**: gráfico de gastos por etapa vs planejado
5. **Deploy**: empacotar como JAR executável (`mvn package`) + servir o frontend buildado pelo próprio Spring (static resources)

---

## Arquivos-chave

```
c:\Codigos\
├── pom.xml                          # Backend: Spring Boot 4.1.0 / Java 25
├── start-dev.bat                    # Script para subir tudo
├── CHANGELOG.md                     # Histórico de versões
├── src\main\resources\
│   └── application.properties       # Porta 8081, H2 config
├── src\main\java\com\example\budgetbuddy\
│   ├── model\                        # Entidades JPA (sem @GeneratedValue, com @PrePersist)
│   ├── service\ImportService.java    # Import via entityManager.persist()
│   └── controller\ImportController.java
└── budget-buddy\budget-buddy-main\
    ├── package.json                  # Frontend: TanStack Start / React / Vite
    └── src\lib\api\budget-api-sync.ts  # Camada de transformação API→store
```
