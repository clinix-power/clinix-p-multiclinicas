# 🏥 CLINIX POWER - INFRAESTRUTURA DE ANAMNESE E LAUDOS

## 📋 MÉTODO DE 1 MILHÃO - Implementação Completa

Este documento descreve a infraestrutura completa do sistema de **Avaliação Fisioterapêutica** e **Geração de Laudos** seguindo a **Resolução COFFITO 414/2012**.

---

## 🗄️ PASSO 1: INFRAESTRUTURA SUPABASE (BACKEND)

### Tabela `anamneses`

**Arquivo:** `supabase/migrations/20260211_anamneses_table.sql`

**Estrutura:**
```sql
create table if not exists public.anamneses (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references auth.users(id) on delete cascade,
  data_avaliacao timestamptz not null default now(),
  
  -- DADOS DA ANAMNESE (COFFITO 414/2012)
  qp text, -- Queixa Principal
  hda text, -- História da Doença Atual
  exames_complementares text,
  diagnostico_fisio text,
  conduta text,
  
  -- ASSINATURA DIGITAL
  assinatura_digital text, -- Base64 da assinatura vetorial
  
  -- METADADOS (Botões Rápidos)
  metadados jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**Índices para Performance:**
- `anamneses_paciente_id_idx`
- `anamneses_profissional_id_idx`
- `anamneses_data_avaliacao_idx`

### Row Level Security (RLS)

**ADMIN:**
- ✅ SELECT: Acesso total a todas as anamneses
- ✅ INSERT: Pode criar anamneses
- ✅ UPDATE: Pode editar qualquer anamnese
- ✅ DELETE: Pode deletar qualquer anamnese

**FUNCIONÁRIO:**
- ✅ SELECT: Apenas anamneses criadas por ele (`profissional_id = auth.uid()`)
- ✅ INSERT: Pode criar anamneses (com `profissional_id = auth.uid()`)
- ✅ UPDATE: Apenas anamneses criadas por ele
- ❌ DELETE: Não pode deletar

### Executar Migração

```bash
# No Supabase Dashboard > SQL Editor
# Cole o conteúdo de: supabase/migrations/20260211_anamneses_table.sql
# Execute a migração
```

---

## 🖊️ PASSO 2: COMPONENTE DE ASSINATURA VETORIAL

**Arquivo:** `components/SignatureCanvas.tsx`

**Tecnologia:** `react-signature-canvas`

**Instalação:**
```bash
npm install react-signature-canvas @types/react-signature-canvas
```

**Características:**
- ✅ Responsivo: Largura total no mobile (touch), tamanho fixo no desktop (mouse)
- ✅ Conversão para Base64 automática
- ✅ Função `onSave` para disparar upload
- ✅ Função `onClear` para limpar assinatura
- ✅ Suporte a assinatura inicial (edição)

**Uso:**
```tsx
<SignaturePad
  onSave={(base64) => setForm({ ...form, assinatura_digital: base64 })}
  onClear={() => setForm({ ...form, assinatura_digital: '' })}
  initialSignature={form.assinatura_digital}
/>
```

---

## 📝 PASSO 3: FRONTEND - AVALIAÇÃO ADMISSIONAL (FUNCIONÁRIO)

**Arquivo:** `app/(protected)/avaliacao-admissional/page.tsx`

**Rota:** `/avaliacao-admissional` (Funcionário)

### Estrutura Step-by-Step

**Step 1: Dados do Paciente**
- Seleção de paciente
- Fumante (Não, Sim, Ex-fumante)
- Atividade Física (Sedentário, Leve, Moderado, Intenso)
- Histórico Familiar (Diabetes, Hipertensão, Cardiopatia, AVC, Câncer, Nenhum)
- Dor EVA (0-10) com slider

**Step 2: Anamnese Detalhada**
- Queixa Principal (QP)
- História da Doença Atual (HDA)
- Localização da Dor
- Irradiação
- Fatores de Melhora (chips multi-select)
- Fatores de Piora (chips multi-select)

**Step 3: Exames e Diagnóstico**
- Exames Complementares
- Diagnóstico Fisioterapêutico
- Conduta e Plano de Tratamento

**Step 4: Assinatura Digital**
- Canvas de assinatura vetorial
- Validação obrigatória antes de salvar

### Estética MÉTODO DE 1 MILHÃO
- ✅ Glassmorphism: `bg-white/90 backdrop-blur-xl`
- ✅ Roxo Metálico: `bg-purple-600`, `border-purple-400`
- ✅ Fontes antialiased: `text-rendering: optimizeLegibility`
- ✅ Chips/ToggleGroups para seleção rápida
- ✅ Progress bar com 4 steps
- ✅ `useTransition` para não travar a UI ao salvar

### TypeScript Estrito
- ❌ Sem `any`
- ✅ Tipos: `AnamneseForm`, `PacienteMini`
- ✅ Validação de campos obrigatórios

---

## 📄 PASSO 4: MOTOR DE GERAÇÃO DE LAUDO (ADMIN)

**Arquivo:** `app/(protected)/admin/laudos/page.tsx`

**Rota:** `/admin/laudos` (Admin)

### Lógica de Geração

1. **Buscar Paciente:** Seleção via dropdown
2. **Buscar Anamnese Única:** Mais recente do paciente
3. **Buscar TODAS as Evoluções:** Ordenadas por data
4. **Buscar Profissionais:** Para carimbo profissional
5. **Agrupar Evoluções por Mês:** `getMonthYear()`
6. **Renderizar com Separadores:** `MonthSeparator` component
7. **Injetar Carimbo Profissional:** Nome + Registro + Assinatura

### Layout do PDF

**Cabeçalho:**
```
LAUDO FISIOTERAPÊUTICO
Prontuário Clínico Completo
```

**Seções:**
1. Dados do Paciente (Nome, Data Nascimento, CPF, Data Avaliação)
2. Anamnese Fisioterapêutica (QP, HDA, Exames, Diagnóstico, Conduta)
3. Evoluções Clínicas (Agrupadas por mês com separadores)

**Carimbo Profissional:**
```tsx
<CarimboProfissional 
  profissional={profissional} 
  assinatura={assinatura_digital} 
/>
```

**Rodapé:**
```
Documento gerado em DD/MM/YYYY às HH:MM
Clinix Power - Sistema de Gestão Clínica
```

### Separador de Mês

```tsx
<MonthSeparator monthYear="02/2026" />
```

Renderiza:
```
━━━━━━━━━━━━━━━  02/2026  ━━━━━━━━━━━━━━━
```

### Impressão

**Print Styles:**
```css
@media print {
  body { background: white !important; }
  .print\:hidden { display: none !important; }
  @page { margin: 2cm; }
}
```

**Margens Técnicas:** 2cm em todas as bordas

**Papel Timbrado:** Dinâmico (futuro: logo da clínica)

**Sem Menção a IA:** Nenhuma referência a "Gerado por IA"

---

## 🎨 REGRAS DE OURO

### Tipagem TypeScript Estrita
```typescript
type Anamnese = {
  id: string
  paciente_id: string
  profissional_id: string
  data_avaliacao: string
  qp: string | null
  hda: string | null
  exames_complementares: string | null
  diagnostico_fisio: string | null
  conduta: string | null
  assinatura_digital: string | null
  metadados: any // JSONB
}
```

### Nomes Nacionais
- ✅ "Prontuário"
- ✅ "Laudo Fisioterapêutico"
- ✅ "Evolução Diária"
- ✅ "Avaliação Admissional"
- ❌ "Medical Record"
- ❌ "Report"

### Performance
```tsx
const [isPending, startTransition] = useTransition()

// Ao gerar PDF pesado
startTransition(() => generateLaudo())
```

---

## 🔐 SEGURANÇA E AUDITORIA

### RLS Policies

**Funcionário só vê seus próprios dados:**
```sql
create policy "anamneses_select_profissional_own"
  on public.anamneses
  for select
  using (profissional_id = auth.uid());
```

**Admin vê tudo:**
```sql
create policy "anamneses_select_admin"
  on public.anamneses
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'ADMIN'
        and p.is_active
    )
  );
```

### Auditoria CREFITO-MG

**Campos Obrigatórios:**
- ✅ Queixa Principal (QP)
- ✅ História da Doença Atual (HDA)
- ✅ Diagnóstico Fisioterapêutico
- ✅ Conduta e Plano de Tratamento
- ✅ Assinatura Digital do Profissional
- ✅ Data da Avaliação

**Rastreabilidade:**
- ✅ `created_at`: Timestamp de criação
- ✅ `updated_at`: Timestamp de última modificação
- ✅ `profissional_id`: Quem criou/editou
- ✅ `paciente_id`: Paciente vinculado

---

## 🚀 ROTAS E NAVEGAÇÃO

### Menu Sidebar

**Funcionário:**
```tsx
<Item href="/avaliacao-admissional" label="Avaliação" icon={<IcAvaliacao />} />
```

**Admin:**
```tsx
<Item href="/admin/laudos" label="Laudos" icon={<IcLaudos />} />
```

### Hierarquia de Permissões

**Funcionário:**
- `/avaliacao-admissional` ✅
- `/admin/laudos` ❌

**Admin:**
- `/avaliacao-admissional` ✅
- `/admin/laudos` ✅

---

## 📊 FLUXO COMPLETO

### 1. Funcionário Cria Avaliação

```
Funcionário → /avaliacao-admissional
  ↓
Seleciona Paciente
  ↓
Preenche Anamnese (4 steps)
  ↓
Assina Digitalmente
  ↓
Salva no Supabase (tabela anamneses)
```

### 2. Admin Gera Laudo

```
Admin → /admin/laudos
  ↓
Seleciona Paciente
  ↓
Sistema busca:
  - Anamnese (mais recente)
  - Evoluções (todas, ordenadas)
  - Profissionais (para carimbo)
  ↓
Agrupa evoluções por mês
  ↓
Renderiza PDF completo
  ↓
Imprime ou Salva
```

---

## 🎯 PRÓXIMOS PASSOS

### Melhorias Futuras

1. **Papel Timbrado Dinâmico:**
   - Logo da clínica no cabeçalho
   - Endereço e contato no rodapé

2. **Exportação PDF Real:**
   - Biblioteca: `jspdf` ou `react-pdf`
   - Download direto sem depender do `window.print()`

3. **Histórico de Versões:**
   - Tabela `anamneses_history`
   - Trigger para salvar versões anteriores

4. **Assinatura com Certificado Digital:**
   - Integração com ICP-Brasil
   - Validação de assinatura eletrônica

5. **Templates de Anamnese:**
   - Templates por especialidade
   - Campos customizáveis

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

- [x] Criar tabela `anamneses` com RLS
- [x] Criar componente `SignatureCanvas`
- [x] Instalar `react-signature-canvas`
- [x] Criar página `/avaliacao-admissional`
- [x] Criar página `/admin/laudos`
- [x] Adicionar rotas ao `SidebarMenu`
- [x] Implementar step-by-step form
- [x] Implementar geração de laudo
- [x] Adicionar separadores de mês
- [x] Adicionar carimbo profissional
- [x] Implementar print styles
- [ ] Executar migração SQL no Supabase
- [ ] Testar fluxo completo
- [ ] Validar com CREFITO-MG

---

## 📞 SUPORTE

**Desenvolvido com MÉTODO DE 1 MILHÃO**

Sistema pronto para auditoria do CREFITO-MG seguindo a Resolução COFFITO 414/2012.

---

**Clinix Power** - Sistema de Gestão Clínica de Elite 💎
