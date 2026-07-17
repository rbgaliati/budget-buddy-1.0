# 📋 Guia Passo-a-Passo: Testando a Integração Frontend-Backend

## Pré-requisitos

✅ Java 21.0.10 LTS instalado  
✅ Maven 3.10.0 instalado  
✅ Node.js 18+ ou Bun 1.1+ instalado  
✅ VS Code com Copilot instalado  

## Passo 1: Compilar o Backend Java

```powershell
# Abrir PowerShell em c:\Codigos
cd c:\Codigos

# Compilar com Maven (limpar + compilar)
mvn clean compile -q

# Se não funcionar, usar o caminho completo:
C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd clean compile -q
```

**Resultado esperado**: ✅ BUILD SUCCESS (sem erros)

## Passo 2: Iniciar o Backend

```powershell
# No mesmo terminal, rodar aplicação Spring Boot
mvn spring-boot:run

# OU com o caminho completo:
C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd spring-boot:run
```

**Resultado esperado**:
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_|\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.3.2)

2025-01-16 14:30:00.123  INFO 1234 --- [main] c.e.b.BudgetBuddyApplication : Starting BudgetBuddyApplication
...
2025-01-16 14:30:02.456  INFO 1234 --- [main] c.e.b.BudgetBuddyApplication : Started BudgetBuddyApplication in 2.123 seconds
```

**Verifique se rodando**:
```powershell
# Novo terminal PowerShell
curl http://localhost:8081/

# Deve retornar algo como:
{"status":"Budget Buddy API está no ar!","version":"2.0.0",...}
```

✅ Backend rodando em `http://localhost:8081`

## Passo 3: Instalar Dependências do Frontend

```powershell
# Novo terminal PowerShell
cd c:\Codigos\budget-buddy\budget-buddy-main

# Usar npm (recomendado para Windows)
npm install

# OU se tiver Bun instalado:
bun install
```

**Resultado esperado**: ✅ added X packages in Ys

## Passo 4: Iniciar o Frontend

```powershell
# Mesmo diretório (budget-buddy-main)
npm run dev

# OU com Bun:
bun run dev
```

**Resultado esperado**:
```
  VITE v7.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

✅ Frontend rodando em `http://localhost:5173`

## Passo 5: Testar no Navegador

### 5.1 Abrir Aplicação
- Navegador: `http://localhost:5173`
- Deve carregar o Budget Buddy sem erros

### 5.2 Abrir DevTools
```
F12 (ou Cmd+Option+I no Mac)
```
- Ir para aba "Console"
- Procurar por mensagens de sincronização

### 5.3 Criar Uma Etapa (Teste de Create)

1. Menu → Cadastros → **Etapas da Obra**
2. Clique em "+ Nova Etapa"
3. Preencha:
   - Nome: `Fundação`
   - Valor Planejado: `50000`
4. Clique em "Criar"

**Verificar no Console (F12)**:
```
✓ Se vir "Failed to sync..." = erro, verifique backend
✓ Se não vir erro = sucesso!
```

### 5.4 Recarregar Página (Teste de Persistência)
```
F5 ou Ctrl+R
```

**Resultado esperado**:
- A etapa "Fundação" deve estar lá!
- Prova que foi salva no backend ✅

### 5.5 Verificar Dados no Banco

Abra: `http://localhost:8081/h2-console`

Login:
```
Driver Class: org.h2.Driver
JDBC URL: jdbc:h2:mem:budgetdb
User Name: sa
Password: (deixar vazio)
```

Clique "Connect"

**Query de teste**:
```sql
SELECT * FROM STAGES;
```

Deve mostrar a etapa que criou! ✅

### 5.6 Criar Uma Conta (Teste de Outro Recurso)

1. Menu → Cadastros → **Contas e Cartões**
2. "+ Nova Conta"
3. Preencha:
   - Nome: `Itaú Corrente`
   - Tipo: `Conta Corrente`
4. Criar

**Verificar no H2**:
```sql
SELECT * FROM ACCOUNTS;
```

Deve aparecer sua conta! ✅

## Passo 6: Testar CRUD Completo

### Create (Criar)
```
✅ Já testado acima
```

### Read (Ler)
```powershell
# Terminal 3 (novo)
curl http://localhost:8081/api/stages

# Deve retornar JSON com as etapas
[
  {
    "id": "xxx-xxx-xxx",
    "name": "Fundação",
    "planned": 50000
  }
]
```

### Update (Atualizar)
1. Frontend: Clique em uma etapa e edite o nome
2. Recarregue (F5)
3. Nome deve estar atualizado ✅

### Delete (Deletar)
1. Frontend: Clique em uma etapa e delete
2. Recarregue (F5)
3. Etapa deve ter desaparecido ✅

## Passo 7: Testar com Backend Desligado (Fallback)

### Parar Backend
```powershell
# No terminal com Backend rodando:
Ctrl+C
```

### Testar Frontend
1. Crie uma nova etapa no frontend
2. Recarregue a página (F5)
3. Deve carregar dos dados em cache (localStorage) ✅

**Console deve mostrar**:
```
Backend not available, falling back to localStorage
```

### Ligar Backend Novamente
```powershell
# No terminal que parou:
mvn spring-boot:run
# OU:
C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd spring-boot:run
```

Aguarde até ver:
```
Started BudgetBuddyApplication in X.XXX seconds
```

## Passo 8: Testar Operações Complexas

### Despesas com Filtros
1. Menu → Lançamentos
2. Crie uma despesa
3. Filtre por etapa/data
4. Dados devem aparecer do backend ✅

### Cotações
1. Menu → Cotações
2. Crie uma cotação
3. Adicione itens
4. Feche a cotação
5. Recarregue (F5)
6. Status deve estar "Encerrado" ✅

### Inventário
1. Menu → Inventário
2. Crie um item
3. Recarregue
4. Item deve aparecer ✅

## 🐛 Troubleshooting

### ❌ "Cannot GET /"
- Frontend não está rodando
- Execute `npm run dev` em novo terminal

### ❌ "API Error: Connection refused"
- Backend não está rodando
- Execute `mvn spring-boot:run`
- Aguarde mensagem "Started BudgetBuddyApplication"

### ❌ Dados não salvam
- Verifique console do navegador (F12)
- Procure por "Failed to sync"
- Verifique se backend está respondendo: `curl http://localhost:8081/`

### ❌ Porta 8081 já em uso
```powershell
# Encontrar processo usando porta 8081
Get-NetTCPConnection -LocalPort 8081 | Select-Object -ExpandProperty OwningProcess

# Matar processo (cuidado!)
Stop-Process -Id <PID> -Force

# Ou mudar porta em application.properties:
# server.port=8082
```

### ❌ Maven comando não encontrado
Usar caminho completo:
```powershell
C:\Users\rbgal\.maven\maven-3.10.0-rc-1\bin\mvn.cmd spring-boot:run
```

## ✅ Checklist de Teste

- [ ] Backend compila sem erros
- [ ] Backend roda e responde em localhost:8081
- [ ] Frontend instala dependências
- [ ] Frontend roda em localhost:5173
- [ ] Consegue criar uma etapa
- [ ] Etapa persiste após F5 (recarregar)
- [ ] H2 Console mostra dados no banco
- [ ] Consegue atualizar uma etapa
- [ ] Consegue deletar uma etapa
- [ ] API responde: curl http://localhost:8081/api/stages
- [ ] Fallback funciona ao desligar backend
- [ ] Consegue criar despesas com filtros
- [ ] Consegue criar/fechar cotações
- [ ] Consegue gerenciar inventário

## 📊 Resultado Final

Se todos os testes passarem ✅:

```
┌─────────────────────────────────────────┐
│  INTEGRAÇÃO FRONTEND-BACKEND FUNCIONA!  │
│                                         │
│  React ↔ Java REST API ↔ H2 Database   │
│                                         │
│  Pronto para produção! 🚀               │
└─────────────────────────────────────────┘
```

## 🎯 Próximos Passos

Após confirmar que tudo funciona:

1. **Melhorar UX**
   - Adicionar loading spinners
   - Notificações de sucesso/erro com Sonner
   - Validação de formulários melhorada

2. **Segurança**
   - Implementar autenticação JWT
   - Validar input no backend
   - HTTPS para produção

3. **Performance**
   - Implementar TanStack Query para cache
   - Sincronização em background
   - Paginação para listas grandes

4. **Deployment**
   - Docker para backend
   - Deploy em servidor/cloud
   - CI/CD pipeline

---

**Dúvidas?** Verifique `BACKEND_INTEGRATION.md` ou `INTEGRATION_SUMMARY.md`
