# 🔒 RLS PATTERN GUIDE - CLINICA_ID FILTERING

## 🎯 OBJETIVO

Garantir que todas as queries incluam filtro `clinica_id` para evitar vazamento de dados entre clínicas e bugs de cache.

---

## 📋 PADRÃO OBRIGATÓRIO

### **Regra de Ouro:**
> **TODA query que busca dados de tabelas multi-tenant DEVE incluir `.eq('clinica_id', profile.clinica_id)`**

---

## 🛠️ PADRÃO DE IMPLEMENTAÇÃO

### **1. Hook useProfile**

```typescript
import { useProfile } from '@/hooks/useProfile'

export default function MyPage() {
  const { profile, loading } = useProfile()

  if (loading) return <div>Carregando...</div>
  if (!profile) return null

  // Use profile.clinica_id em todas as queries
}
```

---

### **2. Query Pattern - SELECT**

```typescript
// ✅ CORRETO - Com filtro clinica_id
const { data: pacientes } = await supabase
  .from('pacientes')
  .select('*')
  .eq('clinica_id', profile.clinica_id)  // ✅ OBRIGATÓRIO
  .order('nome', { ascending: true })

// ❌ INCORRETO - Sem filtro
const { data: pacientes } = await supabase
  .from('pacientes')
  .select('*')
  .order('nome', { ascending: true })
```

---

### **3. Query Pattern - INSERT**

```typescript
// ✅ CORRETO - Com clinica_id
const { error } = await supabase
  .from('pacientes')
  .insert({
    nome: 'João Silva',
    clinica_id: profile.clinica_id,  // ✅ OBRIGATÓRIO
    // ... outros campos
  })

// ❌ INCORRETO - Sem clinica_id
const { error } = await supabase
  .from('pacientes')
  .insert({
    nome: 'João Silva',
    // ... outros campos
  })
```

---

### **4. Query Pattern - UPDATE**

```typescript
// ✅ CORRETO - Com filtro clinica_id
const { error } = await supabase
  .from('pacientes')
  .update({ nome: 'João Silva Atualizado' })
  .eq('id', pacienteId)
  .eq('clinica_id', profile.clinica_id)  // ✅ OBRIGATÓRIO

// ❌ INCORRETO - Sem filtro
const { error } = await supabase
  .from('pacientes')
  .update({ nome: 'João Silva Atualizado' })
  .eq('id', pacienteId)
```

---

### **5. Query Pattern - DELETE**

```typescript
// ✅ CORRETO - Com filtro clinica_id
const { error } = await supabase
  .from('pacientes')
  .delete()
  .eq('id', pacienteId)
  .eq('clinica_id', profile.clinica_id)  // ✅ OBRIGATÓRIO

// ❌ INCORRETO - Sem filtro
const { error } = await supabase
  .from('pacientes')
  .delete()
  .eq('id', pacienteId)
```

---

## 📊 TABELAS MULTI-TENANT

### **Tabelas que DEVEM ter filtro clinica_id:**

1. ✅ `pacientes`
2. ✅ `anamneses`
3. ✅ `evolucoes` / `evolucoes_clinicas`
4. ✅ `configuracoes_clinica`
5. ✅ `documentos`
6. ✅ `agendamentos` (se existir)
7. ✅ `financeiro` (se existir)

### **Tabelas que NÃO precisam de filtro:**

1. ❌ `profiles` - Filtrado por `auth.uid()`
2. ❌ `clinicas` - Tabela de configuração global

---

## 🔍 EXEMPLOS COMPLETOS

### **Exemplo 1: Página de Pacientes**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useProfile } from '@/hooks/useProfile'

export default function PacientesPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [pacientes, setPacientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function loadPacientes() {
      try {
        const { data, error } = await supabase
          .from('pacientes')
          .select('*')
          .eq('clinica_id', profile.clinica_id)  // ✅ FILTRO OBRIGATÓRIO
          .order('nome', { ascending: true })

        if (error) throw error
        setPacientes(data || [])
      } catch (e) {
        console.error('Erro ao carregar pacientes:', e)
      } finally {
        setLoading(false)
      }
    }

    loadPacientes()
  }, [profile])

  if (profileLoading || loading) return <div>Carregando...</div>

  return (
    <div>
      {/* UI */}
    </div>
  )
}
```

---

### **Exemplo 2: Salvar Anamnese**

```typescript
async function salvarAnamnese(formData: AnamneseForm) {
  const { profile } = useProfile()

  const { error } = await supabase
    .from('anamneses')
    .insert({
      paciente_id: formData.paciente_id,
      profissional_id: profile.id,
      clinica_id: profile.clinica_id,  // ✅ OBRIGATÓRIO
      qp: formData.qp,
      hda: formData.hda,
      // ... outros campos
    })

  if (error) throw error
}
```

---

### **Exemplo 3: Buscar Evoluções de um Paciente**

```typescript
async function loadEvolucoes(pacienteId: string) {
  const { profile } = useProfile()

  const { data, error } = await supabase
    .from('evolucoes')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('clinica_id', profile.clinica_id)  // ✅ FILTRO OBRIGATÓRIO
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

---

## 🚨 ERROS COMUNS

### **Erro 1: Esquecer filtro em UPDATE**

```typescript
// ❌ PERIGOSO - Pode atualizar paciente de outra clínica
await supabase
  .from('pacientes')
  .update({ status: 'Inativo' })
  .eq('id', pacienteId)

// ✅ SEGURO
await supabase
  .from('pacientes')
  .update({ status: 'Inativo' })
  .eq('id', pacienteId)
  .eq('clinica_id', profile.clinica_id)
```

---

### **Erro 2: Esquecer clinica_id em INSERT**

```typescript
// ❌ ERRO - Registro sem clinica_id
await supabase
  .from('anamneses')
  .insert({
    paciente_id: '123',
    qp: 'Dor lombar',
  })

// ✅ CORRETO
await supabase
  .from('anamneses')
  .insert({
    paciente_id: '123',
    clinica_id: profile.clinica_id,
    qp: 'Dor lombar',
  })
```

---

### **Erro 3: Cache do Next.js**

```typescript
// ❌ Dados antigos podem aparecer após trocar de clínica
const { data } = await supabase
  .from('pacientes')
  .select('*')
  .eq('clinica_id', profile.clinica_id)

// ✅ Limpar cache ao detectar mudança de role/clinica
if (roleChanged) {
  router.refresh()  // Limpa cache do Next.js
  router.push('/dashboard')
}
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### **Por Query:**
- [ ] Usa `useProfile()` para obter `profile.clinica_id`
- [ ] SELECT inclui `.eq('clinica_id', profile.clinica_id)`
- [ ] INSERT inclui `clinica_id: profile.clinica_id`
- [ ] UPDATE inclui `.eq('clinica_id', profile.clinica_id)`
- [ ] DELETE inclui `.eq('clinica_id', profile.clinica_id)`

### **Por Página:**
- [ ] Todas as queries de tabelas multi-tenant têm filtro
- [ ] Loading state enquanto profile carrega
- [ ] Null check antes de usar `profile.clinica_id`
- [ ] Error handling para queries

---

## 🔒 RLS POLICIES (SUPABASE)

### **Exemplo de Policy Segura:**

```sql
-- SELECT Policy
CREATE POLICY "Users can only view their clinic's data"
ON pacientes FOR SELECT
USING (clinica_id = (
  SELECT clinica_id FROM profiles WHERE id = auth.uid()
));

-- INSERT Policy
CREATE POLICY "Users can only insert to their clinic"
ON pacientes FOR INSERT
WITH CHECK (clinica_id = (
  SELECT clinica_id FROM profiles WHERE id = auth.uid()
));

-- UPDATE Policy
CREATE POLICY "Users can only update their clinic's data"
ON pacientes FOR UPDATE
USING (clinica_id = (
  SELECT clinica_id FROM profiles WHERE id = auth.uid()
));

-- DELETE Policy
CREATE POLICY "Users can only delete their clinic's data"
ON pacientes FOR DELETE
USING (clinica_id = (
  SELECT clinica_id FROM profiles WHERE id = auth.uid()
));
```

---

## 🎯 BENEFÍCIOS

1. **Segurança:** Zero vazamento de dados entre clínicas
2. **Consistência:** Padrão único em todo o app
3. **Cache:** Evita bugs de cache do Next.js
4. **Auditoria:** Fácil rastrear queries sem filtro
5. **Compliance:** LGPD/GDPR compliant

---

**Filtro clinica_id = Zero Bugs de Estado** 🔒✨
