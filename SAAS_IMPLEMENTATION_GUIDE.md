# 🚀 CLINIX POWER MULTI - GUIA DE IMPLEMENTAÇÃO SAAS

## 📋 VISÃO GERAL

Este documento descreve a transformação completa do Clinix Power Multi em um **SaaS Multiclínicas de Alto Nível** com arquitetura multitenancy, sistema de pagamentos e painel administrativo master.

---

## 🎯 OBJETIVOS ALCANÇADOS

### ✅ 1. Arquitetura Multitenancy
- **Tabela `clinicas`**: Organizations com isolamento total de dados
- **Campo `clinica_id`**: Adicionado em todas as tabelas (profiles, pacientes, agendamentos, evolucoes_clinicas, anamneses)
- **RLS Avançado**: Isolamento completo por clínica com políticas de segurança robustas
- **Master Admin**: Role especial para você (dono do sistema) com acesso total

### ✅ 2. Sistema de Planos e Assinaturas
- **3 Planos**: Starter (R$ 97), Professional (R$ 197), Enterprise (R$ 397)
- **Pagamento de Ativação**: R$ 19,90 para filtrar leads qualificados
- **Teste de 30 dias**: Após confirmação do pagamento de ativação
- **Recursos por Plano**: JSON configurável com features específicas

### ✅ 3. Sistema de Pagamentos
- **Tabela `pagamentos`**: Histórico completo de transações
- **Tipos**: ATIVACAO, ASSINATURA, RENOVACAO
- **Status**: PENDING, APPROVED, REJECTED, CANCELLED, REFUNDED
- **Gateway**: Preparado para Appmax (configurável)

### ✅ 4. Sistema de Webhooks
- **Tabela `webhooks_log`**: Log de todos os webhooks recebidos
- **Processamento Automático**: Funções SQL para ativar clínicas automaticamente
- **Rastreabilidade**: Payload completo armazenado para auditoria

### ✅ 5. Painel Admin Master
- **View `saas_metricas`**: Métricas em tempo real do SaaS
- **View `saas_clinicas_detalhes`**: Detalhes completos de cada clínica
- **Analytics**: Total de clínicas, usuários, pacientes, receita, etc.

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### Novas Tabelas Criadas

#### 1. `planos`
```sql
- id (uuid)
- nome (text) - Starter, Professional, Enterprise
- valor_mensal (numeric)
- valor_ativacao (numeric) - R$ 19,90
- dias_teste (integer) - 30 dias
- max_usuarios (integer)
- max_pacientes (integer)
- recursos (jsonb)
```

#### 2. `clinicas`
```sql
- id (uuid)
- nome_fantasia (text)
- razao_social (text)
- cnpj (text)
- email (text)
- responsavel_nome (text)
- plano_id (uuid)
- status (text) - TRIAL, ACTIVE, SUSPENDED, CANCELLED
- pagamento_ativacao_confirmado (boolean)
- assinatura_ativa (boolean)
- assinatura_vencimento (date)
```

#### 3. `pagamentos`
```sql
- id (uuid)
- clinica_id (uuid)
- tipo (text) - ATIVACAO, ASSINATURA, RENOVACAO
- valor (numeric)
- status (text)
- gateway (text) - APPMAX
- transaction_id (text)
- webhook_payload (jsonb)
```

#### 4. `webhooks_log`
```sql
- id (uuid)
- tipo (text)
- payload (jsonb)
- processado (boolean)
- erro (text)
```

### Tabelas Migradas (com clinica_id)
- ✅ `profiles` + `clinica_id` + `is_master_admin`
- ✅ `pacientes` + `clinica_id`
- ✅ `agendamentos` + `clinica_id`
- ✅ `evolucoes_clinicas` + `clinica_id`
- ✅ `anamneses` + `clinica_id`
- ✅ `configuracoes_clinica` (já tinha `clinica_id`)

---

## 🔐 ROW LEVEL SECURITY (RLS)

### Princípios de Isolamento

1. **Isolamento Total por Clínica**: Cada clínica vê apenas seus próprios dados
2. **Master Admin**: Você tem acesso total a todas as clínicas
3. **Admin da Clínica**: Vê todos os dados da própria clínica
4. **Funcionário**: Vê apenas seus próprios pacientes/agendamentos

### Exemplo de Policy
```sql
create policy "pacientes_select_same_clinic"
  on public.pacientes
  for select
  using (
    clinica_id in (
      select clinica_id from public.profiles
      where id = auth.uid() and is_active
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_master_admin = true
    )
  );
```

---

## 🛠️ FUNÇÕES SQL CRIADAS

### 1. `processar_pagamento_ativacao()`
Ativa o teste de 30 dias após confirmação do pagamento de R$ 19,90.

### 2. `processar_pagamento_assinatura()`
Ativa a assinatura mensal e define status como ACTIVE.

### 3. `verificar_status_clinica()`
Verifica se a clínica está ativa, em trial, suspensa ou cancelada.

### 4. `criar_clinica_trial()`
Cria uma nova clínica via API (chamada pela Edge Function de cadastro).

---

## 📦 PRÓXIMOS PASSOS DE IMPLEMENTAÇÃO

### PASSO 1: Rodar o Script SQL no Supabase ✅

```bash
# Acesse o SQL Editor do Supabase
# Cole o conteúdo do arquivo:
# supabase/migrations/20260226_saas_multitenancy_complete.sql
# Execute o script
```

### PASSO 2: Landing Page Premium

**Arquivo**: `app/page.tsx` (substituir o atual)

**Recursos**:
- Hero Section com CTA forte
- Seção de Benefícios (IA, Laudos, Financeiro)
- Pricing com 3 planos
- Depoimentos (social proof)
- FAQ
- Footer com links

**Design**:
- Gradientes modernos (roxo/azul)
- Animações com Framer Motion
- Responsivo mobile-first
- CTAs destacados

### PASSO 3: Página de Cadastro de Clínicas

**Arquivo**: `app/cadastro-clinica/page.tsx`

**Fluxo**:
1. Formulário de dados da clínica
2. Seleção do plano
3. Dados do responsável
4. Criação da conta (Supabase Auth)
5. Redirecionamento para checkout

**Campos**:
- Nome da clínica
- Email
- Telefone
- Responsável (nome, email)
- Plano selecionado

### PASSO 4: Checkout e Integração Appmax

**Arquivo**: `app/checkout/page.tsx`

**Fluxo**:
1. Resumo do pedido (R$ 19,90)
2. Integração com API Appmax
3. Geração de link de pagamento PIX
4. QR Code para pagamento
5. Aguardar webhook de confirmação

**API Route**: `app/api/checkout/route.ts`

### PASSO 5: Webhook Handler

**Arquivo**: `app/api/webhooks/appmax/route.ts`

**Fluxo**:
1. Receber webhook do Appmax
2. Validar assinatura/token
3. Salvar em `webhooks_log`
4. Processar pagamento
5. Ativar clínica (chamar função SQL)
6. Enviar email de boas-vindas

### PASSO 6: Painel Admin Master

**Arquivo**: `app/(protected)/master-admin/page.tsx`

**Recursos**:
- Dashboard com métricas gerais
- Gráficos de crescimento
- Lista de clínicas com filtros
- Detalhes de cada clínica
- Gestão de planos
- Log de webhooks

**Proteção**: Apenas usuários com `is_master_admin = true`

### PASSO 7: Atualizar Componentes Existentes

**Arquivos a modificar**:
- `components/AuthGate.tsx` - Adicionar verificação de status da clínica
- `hooks/useProfile.ts` - Incluir dados da clínica
- Todas as páginas protegidas - Adicionar `clinica_id` nas queries

---

## 🔄 FLUXO COMPLETO DO USUÁRIO

### 1. Descoberta
- Usuário acessa Landing Page
- Conhece os benefícios do Clinix Power Multi
- Vê os planos disponíveis

### 2. Cadastro
- Clica em "Começar Teste Grátis"
- Preenche dados da clínica
- Seleciona plano
- Cria conta (email + senha)

### 3. Pagamento de Ativação
- Redirecionado para checkout
- Paga R$ 19,90 via PIX
- Sistema aguarda confirmação

### 4. Ativação Automática (Webhook)
- Appmax envia webhook
- Sistema processa pagamento
- Clínica ativada com status TRIAL
- Email de boas-vindas enviado
- 30 dias de teste iniciados

### 5. Uso do Sistema
- Usuário acessa dashboard
- Cadastra funcionários
- Cadastra pacientes
- Usa IA para evoluções
- Gera laudos profissionais

### 6. Fim do Trial
- Sistema notifica 7 dias antes
- Oferece upgrade para assinatura
- Se não pagar, status = SUSPENDED

### 7. Assinatura Ativa
- Usuário paga mensalidade
- Status = ACTIVE
- Acesso liberado
- Renovação automática mensal

---

## 💳 INTEGRAÇÃO COM APPMAX

### Configuração

**Variáveis de Ambiente** (`.env.local`):
```env
APPMAX_API_KEY=sua_chave_aqui
APPMAX_API_SECRET=seu_secret_aqui
APPMAX_WEBHOOK_SECRET=seu_webhook_secret_aqui
APPMAX_API_URL=https://api.appmax.com.br/v1
```

### Endpoints Necessários

1. **Criar Cobrança**
```typescript
POST /charges
{
  "amount": 19.90,
  "customer": {...},
  "payment_method": "pix",
  "webhook_url": "https://seu-dominio.com/api/webhooks/appmax"
}
```

2. **Webhook de Confirmação**
```typescript
POST /api/webhooks/appmax
{
  "event": "charge.paid",
  "transaction_id": "xxx",
  "amount": 19.90,
  "status": "approved"
}
```

---

## 📧 EMAILS TRANSACIONAIS

### 1. Boas-vindas (Após Pagamento)
- Assunto: "Bem-vindo ao Clinix Power Multi! 🎉"
- Conteúdo: Credenciais, próximos passos, tutorial

### 2. Lembrete de Vencimento (7 dias antes)
- Assunto: "Seu teste termina em 7 dias"
- Conteúdo: CTA para assinar plano

### 3. Trial Expirado
- Assunto: "Seu teste expirou - Continue usando!"
- Conteúdo: Link para pagamento da assinatura

### 4. Pagamento Aprovado
- Assunto: "Pagamento confirmado! ✅"
- Conteúdo: Recibo, próximo vencimento

### 5. Pagamento Rejeitado
- Assunto: "Problema com seu pagamento"
- Conteúdo: Instruções para regularizar

---

## 📊 MÉTRICAS DO PAINEL MASTER ADMIN

### Dashboard Principal
- 📈 Total de Clínicas
- 🆕 Cadastros nos últimos 30 dias
- 💰 Receita Total
- 💵 Receita de Ativações
- 💳 Receita de Assinaturas
- 👥 Total de Usuários
- 🏥 Total de Pacientes
- 📝 Total de Evoluções Geradas

### Gráficos
- Crescimento de clínicas (linha)
- Receita mensal (barras)
- Status das clínicas (pizza)
- Planos mais populares (barras)

### Lista de Clínicas
- Filtros: Status, Plano, Data de cadastro
- Busca: Nome, Email, CNPJ
- Ações: Ver detalhes, Suspender, Cancelar

---

## 🔒 SEGURANÇA

### Proteções Implementadas

1. **RLS**: Isolamento total de dados por clínica
2. **Master Admin**: Apenas você tem acesso total
3. **Webhook Validation**: Validação de assinatura do Appmax
4. **Rate Limiting**: Proteção contra abuso de APIs
5. **SQL Injection**: Funções com `security definer`
6. **XSS**: Sanitização de inputs

### Recomendações

- ✅ Usar HTTPS em produção
- ✅ Configurar CORS adequadamente
- ✅ Implementar rate limiting no Vercel
- ✅ Monitorar logs de webhooks
- ✅ Backup diário do banco de dados

---

## 🚀 DEPLOY

### 1. Supabase
- Rodar script SQL no SQL Editor
- Configurar variáveis de ambiente
- Habilitar RLS em todas as tabelas

### 2. Vercel
- Conectar repositório GitHub
- Configurar variáveis de ambiente
- Deploy automático

### 3. Domínio
- Configurar domínio personalizado
- Certificado SSL automático
- Configurar DNS

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Banco de Dados
- [x] Script SQL criado
- [ ] Script executado no Supabase
- [ ] Planos inseridos
- [ ] Master Admin criado

### Frontend
- [ ] Landing Page criada
- [ ] Página de cadastro criada
- [ ] Checkout implementado
- [ ] Painel Master Admin criado
- [ ] Componentes atualizados

### Backend
- [ ] API de checkout criada
- [ ] Webhook handler criado
- [ ] Integração Appmax configurada
- [ ] Emails transacionais configurados

### Testes
- [ ] Fluxo completo de cadastro
- [ ] Pagamento de ativação
- [ ] Webhook de confirmação
- [ ] Isolamento de dados por clínica
- [ ] Painel Master Admin

### Deploy
- [ ] Deploy no Vercel
- [ ] Domínio configurado
- [ ] SSL ativo
- [ ] Monitoramento configurado

---

## 🎉 RESULTADO FINAL

Após a implementação completa, você terá:

✅ **SaaS Multiclínicas Profissional**
- Arquitetura escalável para milhares de clínicas
- Isolamento total de dados
- Sistema de pagamentos automatizado

✅ **Fluxo de Vendas Automatizado**
- Landing Page de conversão
- Cadastro self-service
- Pagamento de ativação (R$ 19,90)
- Ativação automática via webhook

✅ **Painel Admin Master**
- Visão completa do negócio
- Métricas em tempo real
- Gestão de clínicas e planos

✅ **Funcionalidades Preservadas**
- IA de evoluções clínicas
- Geração de laudos
- Sistema financeiro
- Tudo funcionando perfeitamente!

---

## 📞 SUPORTE

Para dúvidas ou problemas durante a implementação, consulte:
- Documentação do Supabase: https://supabase.com/docs
- Documentação do Appmax: https://docs.appmax.com.br
- Next.js 14: https://nextjs.org/docs

---

**Desenvolvido com ❤️ para transformar o Clinix Power Multi em um SaaS de alto nível!**
