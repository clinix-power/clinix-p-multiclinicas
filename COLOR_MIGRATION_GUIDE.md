# 🎨 COLOR MIGRATION GUIDE - BRAND STANDARDIZATION

## 🎯 OBJETIVO

Substituir todas as cores hardcoded por tokens de marca (`brand-primary` e `brand-success`) para garantir 100% de uniformidade tonal.

---

## 📋 PADRÃO DE SUBSTITUIÇÃO

### **Purple → Brand Primary**

| Antes | Depois |
|-------|--------|
| `bg-purple-50` | `bg-brand-primary-50` |
| `bg-purple-100` | `bg-brand-primary-100` |
| `bg-purple-200` | `bg-brand-primary-200` |
| `bg-purple-300` | `bg-brand-primary-300` |
| `bg-purple-400` | `bg-brand-primary-400` |
| `bg-purple-500` | `bg-brand-primary-500` |
| `bg-purple-600` | `bg-brand-primary-600` |
| `bg-purple-700` | `bg-brand-primary-700` |
| `text-purple-600` | `text-brand-primary-600` |
| `text-purple-700` | `text-brand-primary-700` |
| `border-purple-200` | `border-brand-primary-200` |
| `border-purple-300` | `border-brand-primary-300` |
| `from-purple-500` | `from-brand-primary-500` |
| `to-purple-600` | `to-brand-primary-600` |
| `hover:bg-purple-700` | `hover:bg-brand-primary-700` |
| `focus:ring-purple-300` | `focus:ring-brand-primary-300` |
| `shadow-purple-400/30` | `shadow-brand-primary-400/30` |

### **Green → Brand Success**

| Antes | Depois |
|-------|--------|
| `bg-green-50` | `bg-brand-success-50` |
| `bg-green-500` | `bg-brand-success-500` |
| `bg-green-600` | `bg-brand-success-600` |
| `text-green-600` | `text-brand-success-600` |
| `text-green-700` | `text-brand-success-700` |
| `border-green-200` | `border-brand-success-200` |

---

## 🔍 ARQUIVOS A VERIFICAR

### **Páginas Principais**
1. ✅ `app/(protected)/pacientes/page.tsx` - **Source of Truth**
2. ⏳ `app/(protected)/admin/laudos/page.tsx`
3. ⏳ `app/(protected)/avaliacao-admissional/page.tsx`
4. ⏳ `app/(protected)/dashboard-admin/page.tsx`
5. ⏳ `app/(protected)/dashboard-funcionario/page.tsx`
6. ⏳ `app/(protected)/evolucoes/minhas/page.tsx`
7. ⏳ `app/(protected)/documentos/page.tsx`

### **Componentes**
1. ⏳ `components/LaudoDocumento.tsx`
2. ⏳ `components/ConfiguracaoClinicaModal.tsx`
3. ⏳ `components/SignatureCanvas.tsx`
4. ✅ `components/ui/page-header.tsx` - **Já usa brand tokens**

### **Layouts**
1. ⏳ `app/(protected)/layout.tsx`
2. ⏳ `app/layout.tsx`

---

## 🛠️ FIND & REPLACE PATTERNS

### **Regex para buscar cores purple:**
```regex
(bg|text|border|from|to|ring|shadow)-purple-(\d+)
```

### **Substituir por:**
```
$1-brand-primary-$2
```

### **Regex para buscar cores green (success):**
```regex
(bg|text|border)-green-(\d+)
```

### **Substituir por:**
```
$1-brand-success-$2
```

---

## 📝 EXEMPLOS DE MIGRAÇÃO

### **Exemplo 1: Botão Primary**

**Antes:**
```tsx
<button className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-400/30">
  Salvar
</button>
```

**Depois:**
```tsx
<button className="bg-gradient-to-br from-brand-primary-500 to-brand-primary-600 hover:from-brand-primary-600 hover:to-brand-primary-700 text-white shadow-lg shadow-brand-primary-400/30">
  Salvar
</button>
```

---

### **Exemplo 2: Input Focus**

**Antes:**
```tsx
<input className="focus:ring-2 focus:ring-purple-300/60 focus:border-purple-300" />
```

**Depois:**
```tsx
<input className="focus:ring-2 focus:ring-brand-primary-300/60 focus:border-brand-primary-300" />
```

---

### **Exemplo 3: Badge Success**

**Antes:**
```tsx
<div className="bg-green-50 border border-green-200">
  <span className="text-green-700">Ativo</span>
</div>
```

**Depois:**
```tsx
<div className="bg-brand-success-50 border border-brand-success-200">
  <span className="text-brand-success-700">Ativo</span>
</div>
```

---

### **Exemplo 4: Icon Badge**

**Antes:**
```tsx
<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
  <Icon className="text-white" />
</div>
```

**Depois:**
```tsx
<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-primary-500 to-brand-primary-600">
  <Icon className="text-white" />
</div>
```

---

## ✅ CHECKLIST DE VERIFICAÇÃO

### **Por Arquivo:**
- [ ] Buscar `purple-` e substituir por `brand-primary-`
- [ ] Buscar `green-` (contexto success) e substituir por `brand-success-`
- [ ] Verificar gradients (`from-*` e `to-*`)
- [ ] Verificar shadows (`shadow-*`)
- [ ] Verificar focus states (`focus:ring-*`, `focus:border-*`)
- [ ] Verificar hover states (`hover:bg-*`, `hover:text-*`)
- [ ] Testar visualmente após mudança

### **Casos Especiais:**
- ⚠️ **NÃO substituir** `green-` em contextos de erro/warning (manter red/yellow)
- ⚠️ **NÃO substituir** cores em gradients de fundo do body
- ⚠️ **Verificar** se `purple-` não é parte de um comentário ou string

---

## 🚀 SCRIPT DE MIGRAÇÃO AUTOMÁTICA

```bash
# Buscar todas as ocorrências de purple
grep -r "purple-" app/ components/ --include="*.tsx" --include="*.ts"

# Buscar todas as ocorrências de green (filtrar manualmente)
grep -r "green-" app/ components/ --include="*.tsx" --include="*.ts"
```

---

## 📊 PROGRESSO

### **Arquivos Migrados:**
- ✅ `tailwind.config.ts` - Tokens criados
- ✅ `app/globals.css` - CSS vars atualizados
- ✅ `components/ui/page-header.tsx` - Usa brand tokens

### **Arquivos Pendentes:**
- ⏳ `app/(protected)/admin/laudos/page.tsx`
- ⏳ `app/(protected)/avaliacao-admissional/page.tsx`
- ⏳ `app/(protected)/dashboard-admin/page.tsx`
- ⏳ `app/(protected)/dashboard-funcionario/page.tsx`
- ⏳ `components/LaudoDocumento.tsx`
- ⏳ `components/ConfiguracaoClinicaModal.tsx`

---

## 🎯 BENEFÍCIOS DA MIGRAÇÃO

1. **Uniformidade Tonal:** 100% consistência visual
2. **Manutenibilidade:** Mudança global em um único lugar
3. **Type Safety:** Autocomplete no IDE
4. **Semantic Naming:** `brand-primary` > `purple-500`
5. **Escalabilidade:** Fácil adicionar novos tokens

---

**Migração Completa = Zero Pixels Fora do Padrão** 🎨✨
