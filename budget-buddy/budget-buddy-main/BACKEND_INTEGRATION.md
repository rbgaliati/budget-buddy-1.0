# Integração Frontend React com Backend Java Spring Boot

## ✅ O que foi integrado

O frontend React (`budget-buddy-main`) agora está configurado para se comunicar com o backend Java Spring Boot através de uma API REST.

### Estrutura da Integração

1. **api-client.ts** - Cliente HTTP para comunicação com o backend
   - Implementa todos os endpoints descritos em `API_CONTRACT.md`
   - Tratamento de erros
   - Suporte a filtros e queries

2. **budget-api-sync.ts** - Sincronização de dados
   - Converte formatos entre frontend e backend
   - Carrega dados iniciais do backend
   - Transforma respostas da API

3. **budget-store.ts** - Store principal (modificado)
   - Agora usa a API ao invés de localStorage
   - Fallback para localStorage se backend não estiver disponível
   - Sincronização automática de operações

## 🚀 Como Usar

### 1. Backend Java já está rodando (localhost:8081)

O backend deve estar rodando em:
```
http://localhost:8081/api
```

### 2. Frontend - Desenvolvimento

```bash
cd c:\Codigos\budget-buddy\budget-buddy-main

# Instalar dependências (se não fez ainda)
npm install
# ou
bun install

# Rodar em desenvolvimento
npm run dev
# ou
bun run dev
```

Vai abrir em `http://localhost:5173` (ou a porta indicada)

### 3. Variáveis de Ambiente

O arquivo `.env.development` já está configurado com:
```
VITE_API_BASE_URL=http://localhost:8081/api
```

Se o backend estiver em outra URL, modifique conforme necessário.

## 📋 Funcionalidades Integradas

### ✅ Totalmente Integradas com Backend

- **Contas/Cartões** (`/api/accounts`)
  - Criar, listar, atualizar, deletar
  
- **Fornecedores** (`/api/suppliers`)
  - Criar, listar, atualizar, deletar

- **Etapas da Obra** (`/api/stages`)
  - Criar, listar, atualizar, deletar

- **Despesas** (`/api/expenses`)
  - Criar, listar, atualizar, deletar
  - Filtros por etapa, data
  - Suporte a itens e parcelas

- **Cotações** (`/api/quotations`)
  - Criar, listar, atualizar, deletar
  - Abrir/fechar cotações
  - Selecionar proposta vencedora

- **Inventário** (`/api/inventory`)
  - Criar, listar, atualizar, deletar

## 🔄 Sincronização

### Como Funciona

1. **Ao iniciar a aplicação**
   - Frontend tenta carregar dados do backend
   - Se conseguir, usa dados do backend
   - Se falhar, usa localStorage como fallback
   - Dados são sincronizados para localStorage como cache

2. **Ao criar/atualizar/deletar**
   - Frontend faz chamada assíncrona à API
   - Se sucesso: atualiza estado e localStorage
   - Se erro: tenta usar localStorage como fallback e mostra erro ao usuário

3. **Dados em cache**
   - localStorage continua sendo usado como cache local
   - Permite offline (com dados antigos) se backend falhar

## 🧪 Testando a Integração

### 1. Backend Rodando

Verifique se o backend está ok:
```bash
curl http://localhost:8081/
```

Deve retornar JSON com informações da API.

### 2. Frontend Carregando Dados

Abra o console do navegador (F12) e veja os logs:
```
Backend not available, falling back to localStorage (se backend não estiver disponível)
ou
Dados carregados com sucesso (se backend estiver disponível)
```

### 3. Criar um Recurso no Frontend

1. Acesse a aplicação em localhost:5173
2. Vá para "Cadastros" → "Etapas da Obra"
3. Crie uma nova etapa
4. Verifique no console se viu: `Failed to sync... ` ou sem erro = sucesso
5. Recarregue a página (F5) - a etapa deve aparecer (prova que salvou no backend)

### 4. Verificar no Console H2

Opcional - visualizar dados no banco de dados em memória:
```
http://localhost:8081/h2-console
```

Login:
- URL: `jdbc:h2:mem:budgetdb`
- User: `sa`
- Password: (deixar em branco)

## 🐛 Debugging

### Ver requisições HTTP

No console do navegador (DevTools):
1. Abra a aba "Network"
2. Faça uma operação no frontend
3. Veja a requisição HTTP e a resposta

### Ver logs

No código, há console.error() para falhas de sincronização. Verifique o console do navegador.

## 📱 Mudanças nos Tipos

Os tipos foram mantidos iguais, mas a persistência agora vai para o backend:

- `Expense.stageId` - continua igual (agora referencia o ID do backend)
- `Installment.accountId` - referencia Account do backend
- Todas as datas em ISO 8601 format

## ⚡ Performance

- Primeira carga: faz requisição ao backend
- Operações subsequentes: atualizações via API
- Cache em localStorage permite rápido acesso mesmo se backend lento

## 🔮 Próximos Passos

1. **Autenticação** - Adicionar JWT para segurança
2. **Migrations** - Ferramenta para migrar dados de localStorage → backend
3. **Sync em Background** - Sincronizar dados periodicamente
4. **Offline Mode** - Suporte melhorado para offline-first
5. **Real-time** - WebSocket para atualizações em tempo real

## 💡 Notas Importantes

1. **CORS já está habilitado** no backend (CrossOrigin)
2. **Fallback automático** - Se backend falhar, frontend continua funcionando com localStorage
3. **TypeScript tipado** - Todos os tipos são iguais, conversão automática
4. **Sem breaking changes** - Interface pública do budgetStore mantida igual

## ❓ Troubleshooting

### "API Error: 404"
- Backend não está rodando
- URL da API incorreta em .env.development
- Endpoint não existe no backend

### "localhost refused to connect"
- Backend não está rodando
- Verificar: `http://localhost:8081/`

### Dados não aparecem após refresh
- localStorage vazio (primeira vez) + backend indisponível
- Verifique se backend está rodando

### Mudanças não salvam
- Verifique console do navegador por erros
- Verifique se backend recebeu a requisição (veja logs do Maven)

---

**Status**: ✅ Integração Completa
**Teste**: Rode frontend + backend juntos e teste CRUD em cada módulo
