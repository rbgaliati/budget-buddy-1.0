# 🎨 Guia: UX Melhorado com Toast + Loading States

## ✅ O Que Foi Implementado

### 1. **Loading States no budget-store**
- ✅ Novo hook `useLoading()` para acessar estados de carregamento
- ✅ Estados para: `creating`, `updating`, `deleting`, `stages`, `accounts`, `expenses`, `quotations`
- ✅ Todas as ações agora rastreiam loading automaticamente
- ✅ Erros são re-lançados para tratamento no componente

### 2. **Componentes de Loading**
- ✅ `Spinner` - Spinner animado com texto
- ✅ `LoadingButton` - Botão com spinner integrado
- ✅ `LoadingOverlay` - Overlay com spinner sobre conteúdo
- ✅ `Skeleton` - Placeholder durante carregamento

### 3. **Toast Helper Functions**
- ✅ `toastSuccess()` - Notificação de sucesso
- ✅ `toastError()` - Notificação de erro
- ✅ `toastLoading()` - Notificação de carregamento
- ✅ `withToast()` - Wrapper automático para promises
- ✅ `crudToasts.create/update/delete()` - Helpers CRUD

---

## 📂 Arquivos Criados

```
src/
├── lib/
│   ├── toast-helper.ts              ✨ NEW - Funções Toast
│   └── budget-store.ts              ✏️ UPDATED - Com loading states
│
└── components/
    ├── ui/
    │   └── loading.tsx              ✨ NEW - Componentes de Loading
    │
    └── examples/
        └── loading-toast-examples.tsx ✨ NEW - Exemplos de uso
```

---

## 🚀 Como Usar (Passo a Passo)

### Passo 1: Importar Necessário

```typescript
import { useLoading, budgetActions } from "@/lib/budget-store";
import { LoadingButton, Spinner } from "@/components/ui/loading";
import { crudToasts, toastSuccess, toastError } from "@/lib/toast-helper";
```

### Passo 2: Usar Hook de Loading

```typescript
export function MeuComponente() {
  const loading = useLoading();
  
  return (
    <>
      {loading.creating && <Spinner text="Criando..." />}
      {loading.updating && <Spinner text="Atualizando..." />}
      {loading.deleting && <Spinner text="Deletando..." />}
    </>
  );
}
```

### Passo 3: Adicionar Ao Formulário

**Antes (sem loading):**
```typescript
const handleSubmit = async (e) => {
  e.preventDefault();
  await budgetActions.addStage(name, planned);
};

return (
  <>
    <input value={name} onChange={...} />
    <button onClick={handleSubmit}>Criar</button>
  </>
);
```

**Depois (com loading + toast):**
```typescript
const loading = useLoading();
const [name, setName] = useState("");

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Toast automático: loading → success/error
    await crudToasts.create(
      budgetActions.addStage(name, planned),
      "Etapa"
    );
    setName(""); // Limpar após sucesso
  } catch (error) {
    // Erro já foi mostrado pelo crudToasts
    console.error(error);
  }
};

return (
  <form onSubmit={handleSubmit}>
    <input 
      value={name} 
      onChange={(e) => setName(e.target.value)}
      disabled={loading.creating}
    />
    {/* LoadingButton mostra spinner automaticamente */}
    <LoadingButton 
      type="submit"
      isLoading={loading.creating}
      loadingText="Criando etapa..."
    >
      Criar Etapa
    </LoadingButton>
  </form>
);
```

---

## 📋 Padrões de Uso

### Padrão 1: Toast Automático com CRUD

```typescript
try {
  await crudToasts.create(promise, "Nome do Recurso");
  // Sucesso automático
} catch (error) {
  // Erro automático
}
```

**Mensagens geradas:**
- Loading: "Criando Nome do Recurso..."
- Sucesso: "Nome do Recurso criado com sucesso!"
- Erro: "Erro ao criar Nome do Recurso"

### Padrão 2: LoadingButton

```typescript
const loading = useLoading();

<LoadingButton
  isLoading={loading.creating}
  loadingText="Processando..."
>
  Clique aqui
</LoadingButton>
```

**Comportamento:**
- Quando `loading.creating === true`, mostra spinner
- Botão fica desabilitado automaticamente
- Texto muda para `loadingText`

### Padrão 3: Spinner Simples

```typescript
if (loading.updating) {
  return <Spinner text="Atualizando..." />;
}
```

**Variações de tamanho:**
```typescript
<Spinner size="sm" />    {/* 16x16px */}
<Spinner size="md" />    {/* 24x24px */}
<Spinner size="lg" />    {/* 32x32px */}
```

### Padrão 4: LoadingOverlay

```typescript
<LoadingOverlay 
  isLoading={loading.updating}
  text="Processando..."
  className="border rounded p-4"
>
  {/* Conteúdo que fica com overlay */}
  <div>Dados aqui</div>
</LoadingOverlay>
```

### Padrão 5: Manual Toast

```typescript
// Mostrar loading
const toastId = toastLoading("Operação em andamento...");

try {
  // Fazer algo
  await doSomething();
  
  // Atualizar para sucesso
  toastUpdateLoading(toastId, "success", "Pronto!");
} catch (error) {
  // Atualizar para erro
  toastUpdateLoading(toastId, "error", "Erro!");
}
```

---

## 🔄 Estados de Loading Disponíveis

```typescript
const loading = useLoading();

// Estados por recurso
loading.stages      // boolean - carregando etapas
loading.accounts    // boolean - carregando contas
loading.expenses    // boolean - carregando despesas
loading.quotations  // boolean - carregando cotações

// Estados genéricos (para qualquer operação)
loading.creating    // boolean - criando algo
loading.updating    // boolean - atualizando algo
loading.deleting    // boolean - deletando algo
```

---

## 🎯 Integrando em Componentes Existentes

### Exemplo: Página de Cadastros

**Arquivo: `src/routes/cadastros.tsx`**

```typescript
import { useState } from "react";
import { budgetActions, useBudget, useLoading } from "@/lib/budget-store";
import { LoadingButton, Spinner } from "@/components/ui/loading";
import { crudToasts } from "@/lib/toast-helper";

export function CadastrosPage() {
  const { stages, accounts } = useBudget();
  const loading = useLoading();
  const [stageName, setStageName] = useState("");

  const handleAddStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crudToasts.create(
        budgetActions.addStage(stageName, 0),
        "Etapa"
      );
      setStageName("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteStage = async (id: string) => {
    try {
      await crudToasts.delete(
        Promise.resolve(budgetActions.removeStage(id)),
        "Etapa"
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Formulário para criar */}
      <form onSubmit={handleAddStage} className="border rounded p-4">
        <input
          type="text"
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          placeholder="Nova etapa"
          disabled={loading.creating}
        />
        <LoadingButton
          type="submit"
          isLoading={loading.creating}
          loadingText="Criando..."
        >
          Criar Etapa
        </LoadingButton>
      </form>

      {/* Lista de etapas */}
      {loading.stages ? (
        <Spinner text="Carregando etapas..." />
      ) : (
        <ul className="space-y-2">
          {stages.map((stage) => (
            <li key={stage.id} className="border rounded p-3 flex justify-between">
              <span>{stage.name}</span>
              <button
                onClick={() => handleDeleteStage(stage.id)}
                disabled={loading.deleting}
              >
                {loading.deleting ? "Deletando..." : "Deletar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 🎨 Customização

### Trocar cores do Spinner

Editar `src/components/ui/loading.tsx`:

```typescript
// Linha com a cor do spinner
className={cn(
  "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
  sizeClasses[size]
)}
```

Trocar `border-t-blue-600` por:
- `border-t-red-600` (vermelho)
- `border-t-green-600` (verde)
- `border-t-purple-600` (roxo)

### Duração do Toast

Padrões:
- Sucesso: 3 segundos (customizável)
- Erro: 4 segundos (customizável)
- Loading: infinito (até ser fechado/atualizado)

Customizar:
```typescript
toastSuccess("Pronto!", { duration: 5000 }); // 5 segundos
toastError("Erro!", { duration: 6000 });     // 6 segundos
```

### Desabilitar Toast Automático

```typescript
// Sem toast
const id = await budgetActions.addStage(name, planned);

// Com toast manual
toastSuccess("Etapa criada!");
```

---

## ✨ Features Implementados

✅ Loading states para todas as operações CRUD  
✅ Toast automático com mensagens contextuais  
✅ Componentes reutilizáveis (Button, Spinner, Overlay)  
✅ Integração perfeita com budget-store  
✅ Tipos TypeScript completos  
✅ Suporte a temas (light/dark)  
✅ Acessibilidade melhorada  

---

## 📊 Próximas Fases

1. ✅ Loading states + Toast (CONCLUÍDO)
2. ⏳ Integrar em todos os componentes
3. ⏳ Testes automatizados
4. ⏳ Autenticação JWT
5. ⏳ Deployment

---

## 🐛 Troubleshooting

### Toast não aparece
- Verificar se `<Toaster />` está em `__root.tsx`
- Verificar importação: `import { Toaster } from "sonner"`

### Loading não atualiza
- Verificar se está usando `useLoading()` hook
- Verificar se ações estão com `setLoading()` (já implementado)

### TypeScript error
- Rodar `npm install` novamente
- Limpar cache: `rm -rf node_modules/.vite`

---

## 🎓 Referência Rápida

```typescript
// Imports
import { useLoading, budgetActions } from "@/lib/budget-store";
import { LoadingButton, Spinner, LoadingOverlay } from "@/components/ui/loading";
import { crudToasts, toastSuccess, toastError } from "@/lib/toast-helper";

// Usar loading states
const loading = useLoading();
if (loading.creating) { /* ... */ }

// Usar toast automático
await crudToasts.create(promise, "Recurso");
await crudToasts.update(promise, "Recurso");
await crudToasts.delete(promise, "Recurso");

// Usar componentes
<LoadingButton isLoading={loading.creating}>Clique</LoadingButton>
<Spinner size="md" text="Aguarde..." />
<LoadingOverlay isLoading={loading.updating}>Conteúdo</LoadingOverlay>

// Toast manual
toastSuccess("Sucesso!");
toastError("Erro!");
const id = toastLoading("Carregando...");
toastUpdateLoading(id, "success", "Pronto!");
```

---

**Status**: ✅ Implementação Completa  
**Próximo Passo**: Integrar em componentes existentes (cadastros.tsx, lancamentos.tsx, etc)
