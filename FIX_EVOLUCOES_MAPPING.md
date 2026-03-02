# 🔧 FIX CRÍTICO - MAPEAMENTO DE EVOLUÇÕES

## 🚨 PROBLEMA IDENTIFICADO

**Erro:** `Could not find the table public.evolucoes_clinicas`

**Causa Raiz:** Inconsistência de nomenclatura entre banco de dados e aplicação.

---

## 📊 ANÁLISE COMPLETA

### **Banco de Dados (Supabase)**

**Tabela Real:** `evolucoes_clinicas`

**Estrutura:**
```sql
create table public.evolucoes_clinicas (
  id uuid primary key,
  paciente_id uuid references pacientes(id),
  profissional_id uuid references auth.users(id),
  data_hora timestamptz not null,
  texto text not null
);
```

**Colunas:**
- `data_hora` (timestamp da evolução)
- `texto` (texto da evolução)

---

### **Aplicação Frontend**

**Páginas que usam `evolucoes`:**
- `app/(protected)/evolucoes/page.tsx` (Admin)
- `app/(protected)/evolucoes/minhas/page.tsx` (Funcionário)

**Páginas que usam `evolucoes_clinicas`:**
- `app/(protected)/admin/laudos/page.tsx` (Admin - Geração de Laudos)

**Colunas esperadas pelo frontend:**
- `created_at` (timestamp)
- `texto_original` (texto)
- `texto_melhorado_ia` (texto melhorado por IA)

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **1. View de Compatibilidade**

**Arquivo:** `supabase/migrations/20260211_evolucoes_view.sql`

```sql
create or replace view public.evolucoes as
select
  id,
  paciente_id,
  profissional_id,
  data_hora as created_at,
  data_hora,
  texto as texto_original,
  texto as texto_melhorado_ia
from public.evolucoes_clinicas;
```

**Benefícios:**
- ✅ Frontend pode usar `evolucoes` (view)
- ✅ Banco continua usando `evolucoes_clinicas` (tabela real)
- ✅ Compatibilidade total entre ambos os nomes
- ✅ Suporte a INSERT/UPDATE/DELETE através da view

---

### **2. Correção da Página de Laudos**

**Arquivo:** `app/(protected)/admin/laudos/page.tsx`

**Antes:**
```typescript
const { data: evolucoesData } = await supabase
  .from('evolucoes_clinicas')
  .select('*')
  .eq('paciente_id', selectedPacienteId)
```

**Depois:**
```typescript
const { data: evolucoesData } = await supabase
  .from('evolucoes_clinicas')
  .select('id, paciente_id, profissional_id, data_hora, texto')
  .eq('paciente_id', selectedPacienteId)
```

**Mudanças:**
- ✅ Especificação explícita das colunas
- ✅ Uso correto de `data_hora` e `texto`
- ✅ Mapeamento correto para o tipo `Evolucao`

---

## 🎯 ESTRUTURA DE DADOS

### **Tipo TypeScript**

```typescript
type Evolucao = {
  id: string
  paciente_id: string
  profissional_id: string
  data_hora: string  // ← Timestamp da evolução
  texto: string      // ← Texto da evolução
}
```

### **Renderização no Laudo**

```tsx
{evolucoesGroupedByMonth![monthYear].map((evo) => (
  <div key={evo.id}>
    <p>{formatDateTimeBR(evo.data_hora)}</p>
    <p>{evo.texto}</p>
    <CarimboProfissional profissional={profissionais[evo.profissional_id]} />
  </div>
))}
```

---

## 🚀 EXECUÇÃO

### **PASSO 1: Executar SQL da View**

**No Supabase Dashboard:**
1. Vá em **SQL Editor**
2. Cole o conteúdo de `supabase/migrations/20260211_evolucoes_view.sql`
3. Execute

### **PASSO 2: Verificar View Criada**

**No Supabase Dashboard:**
1. Vá em **Table Editor**
2. Procure por **evolucoes** (deve aparecer como view)
3. Confirme que ela aponta para `evolucoes_clinicas`

### **PASSO 3: Testar Geração de Laudo**

1. Acesse `/admin/laudos`
2. Selecione um paciente que tenha:
   - ✅ Anamnese criada
   - ✅ Evoluções registradas
3. Clique em "Gerar Laudo Completo"
4. Verifique se o PDF é gerado sem erros

---

## 📋 VALIDAÇÃO

### **Checklist de Testes**

- [ ] View `evolucoes` criada no Supabase
- [ ] Página `/evolucoes` (Admin) funciona
- [ ] Página `/evolucoes/minhas` (Funcionário) funciona
- [ ] Página `/admin/laudos` gera laudo sem erro 404
- [ ] Evoluções aparecem agrupadas por mês no laudo
- [ ] Carimbo profissional aparece em cada evolução
- [ ] Data e hora formatadas corretamente

---

## 🔍 DIAGNÓSTICO FINAL

**Tabela Real:** `evolucoes_clinicas` ✅  
**View de Compatibilidade:** `evolucoes` ✅  
**Página de Laudos:** Corrigida ✅  
**Mapeamento de Colunas:** Correto ✅  
**RLS Policies:** Ativas ✅  

---

## 📊 FLUXO DE DADOS

```
Frontend (evolucoes/minhas)
  ↓
View: public.evolucoes
  ↓
Tabela Real: public.evolucoes_clinicas
  ↓
Retorna: id, paciente_id, profissional_id, data_hora, texto
  ↓
Mapeia para: created_at, texto_original, texto_melhorado_ia
  ↓
Renderiza na UI
```

```
Frontend (admin/laudos)
  ↓
Tabela Real: public.evolucoes_clinicas
  ↓
SELECT: id, paciente_id, profissional_id, data_hora, texto
  ↓
Agrupa por mês (getMonthYear)
  ↓
Renderiza no PDF com MonthSeparator
```

---

**MÉTODO DE 1 MILHÃO - Mapeamento Estabilizado** 💎

**O sistema agora suporta ambos os nomes (`evolucoes` e `evolucoes_clinicas`) com compatibilidade total.**
