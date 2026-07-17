# API_CONTRACT.md — Contrato de API proposto

> **Situação atual:** o app **não tem backend**. Todos os dados vivem em
> `localStorage` (chave `obra-budget-v2`) gerenciados por
> `src/lib/budget-store.ts`. Este documento descreve o **contrato REST
> sugerido** para quando o backend for implementado (ex.: em Node/Express,
> Fastify, ou como `createServerFn` do próprio TanStack Start).

## Convenções

- **Base URL**: `/api`
- **Formato**: JSON (`Content-Type: application/json`)
- **Auth**: `Authorization: Bearer <token>` (a definir; hoje inexistente)
- **IDs**: strings (UUID v4)
- **Datas**: ISO 8601 (`YYYY-MM-DD` para datas puras, ISO completo para timestamps)
- **Valores monetários**: `number` em reais (ex.: `1234.56`)
- **Erros**: `{ "error": "mensagem", "code": "SLUG" }` com HTTP 4xx/5xx

## Modelos (schemas)

Espelham os tipos exportados por `src/lib/budget-store.ts`.

### Account
```json
{ "id": "uuid", "name": "Itaú CC", "type": "conta" }
```
`type`: `"conta" | "cartao"`

### Supplier
```json
{ "id": "uuid", "name": "Leroy Merlin", "document": "12.345.678/0001-99", "contact": "..." }
```

### Stage (etapa da obra)
```json
{ "id": "uuid", "name": "Fundação", "planned": 15000 }
```

### ExpenseItem
```json
{ "id": "uuid", "kind": "material", "description": "Cimento CP-II",
  "unit": "sc", "quantity": 20, "unitValue": 32.5 }
```
`kind`: `"material" | "servico" | "taxas"`

### Installment
```json
{ "id": "uuid", "dueDate": "2026-08-10", "amount": 500, "paid": false, "accountId": "uuid" }
```

### Expense
```json
{
  "id": "uuid",
  "stageId": "uuid",
  "description": "Compra de cimento",
  "supplier": "Leroy Merlin",
  "amount": 650,
  "date": "2026-07-16",
  "paymentMethod": "parcelado",
  "receiptType": "nota_fiscal",
  "installments": [ /* Installment[] */ ],
  "items": [ /* ExpenseItem[] */ ],
  "hasPendency": false,
  "pendencyNote": null
}
```
`paymentMethod`: `"avista" | "boleto" | "cartao" | "parcelado"`
`receiptType`: `"nota_fiscal" | "recibo" | "sem_comprovante"`

### Quotation / Proposal
```json
{
  "id": "uuid",
  "title": "Cotação de tintas",
  "status": "aberta",
  "createdAt": "2026-07-10T12:00:00Z",
  "closedAt": null,
  "winnerProposalId": null,
  "items": [ { "id": "uuid", "description": "Tinta acrílica", "quantity": 10, "unit": "L" } ],
  "proposals": [
    { "id": "uuid", "supplier": "Tintas ABC", "total": 890.00,
      "prices": [ { "itemId": "uuid", "unitPrice": 89.00 } ],
      "notes": "Entrega em 3 dias" }
  ]
}
```
`status`: `"aberta" | "encerrada"`

### InventoryItem
```json
{ "id": "uuid", "description": "Sacos de cimento", "quantity": 20, "unit": "sc",
  "location": "Depósito", "linkedExpenseId": "uuid|null" }
```

## Endpoints

Padrão CRUD por recurso. Todos retornam JSON.

### Contas / Cartões — `/api/accounts`
| Método | Rota                | Descrição                | Body                     |
| ------ | ------------------- | ------------------------ | ------------------------ |
| GET    | `/api/accounts`     | Lista todas as contas    | —                        |
| POST   | `/api/accounts`     | Cria conta               | `Account` sem `id`       |
| PATCH  | `/api/accounts/:id` | Atualiza conta           | `Partial<Account>`       |
| DELETE | `/api/accounts/:id` | Remove conta             | —                        |

### Fornecedores — `/api/suppliers`
Mesmo padrão CRUD com o modelo `Supplier`.

### Etapas da obra — `/api/stages`
Mesmo padrão CRUD com o modelo `Stage`.

### Despesas — `/api/expenses`
| Método | Rota                        | Descrição                                  |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | `/api/expenses`             | Lista. Query: `?stageId=&from=&to=&paid=`  |
| GET    | `/api/expenses/:id`         | Detalhe                                    |
| POST   | `/api/expenses`             | Cria despesa (com itens e parcelas aninhadas) |
| PATCH  | `/api/expenses/:id`         | Atualiza campos da despesa                 |
| DELETE | `/api/expenses/:id`         | Remove despesa                             |
| PATCH  | `/api/expenses/:id/installments/:iid` | Marca parcela paga / troca conta |

Payload de criação:
```json
{
  "stageId": "uuid",
  "description": "...",
  "supplier": "...",
  "amount": 650,
  "date": "2026-07-16",
  "paymentMethod": "parcelado",
  "receiptType": "nota_fiscal",
  "installments": [
    { "dueDate": "2026-08-10", "amount": 325, "accountId": "uuid" },
    { "dueDate": "2026-09-10", "amount": 325, "accountId": "uuid" }
  ],
  "items": [
    { "kind": "material", "description": "Cimento", "unit": "sc",
      "quantity": 20, "unitValue": 32.5 }
  ]
}
```

### Cotações — `/api/quotations`
| Método | Rota                                     | Descrição                              |
| ------ | ---------------------------------------- | -------------------------------------- |
| GET    | `/api/quotations`                        | Lista (query: `?status=aberta`)        |
| GET    | `/api/quotations/:id`                    | Detalhe com propostas                  |
| POST   | `/api/quotations`                        | Cria cotação (com `items[]`)           |
| PATCH  | `/api/quotations/:id`                    | Atualiza cabeçalho / itens             |
| DELETE | `/api/quotations/:id`                    | Remove cotação                         |
| POST   | `/api/quotations/:id/proposals`          | Adiciona proposta de fornecedor        |
| PATCH  | `/api/quotations/:id/proposals/:pid`     | Atualiza proposta                      |
| DELETE | `/api/quotations/:id/proposals/:pid`     | Remove proposta                        |
| POST   | `/api/quotations/:id/close`              | Encerra cotação: `{ "winnerProposalId": "uuid" }` |
| POST   | `/api/quotations/:id/reopen`             | Reabre cotação                         |

### Inventário — `/api/inventory`
Mesmo padrão CRUD com `InventoryItem`.

### Relatórios / consolidação — `/api/reports`
| Método | Rota                            | Descrição                                          |
| ------ | ------------------------------- | -------------------------------------------------- |
| GET    | `/api/reports/summary`          | Total previsto vs. gasto por etapa                 |
| GET    | `/api/reports/cashflow`         | Fluxo de caixa (parcelas por mês)                  |
| GET    | `/api/reports/by-account`       | Gasto agrupado por conta/cartão                    |

## Recomendação de integração no front

1. Substituir os *setters* de `src/lib/budget-store.ts` por chamadas
   `fetch("/api/...")` **ou** por `createServerFn` do TanStack Start.
2. Substituir os *seletores* por hooks do TanStack Query:
   ```ts
   useQuery({ queryKey: ["expenses", { stageId }], queryFn: fetchExpenses })
   ```
3. Após mutations, invalidar a queryKey correspondente para refetch.
4. Manter o `localStorage` apenas como cache offline opcional
   (`persistQueryClient` do TanStack Query).
