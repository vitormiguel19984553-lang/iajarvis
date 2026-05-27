# Plano — J.A.R.V.I.S. Platform Completa

Este é um pedido grande (auth + 28 modelos + planos + Stripe + dashboard admin + keys de ativação). Vou entregá-lo em **4 fases** para garantir qualidade. Cada fase é testável de forma independente. Confirma antes de avançar.

---

## Pré-requisito: Ativar Lovable Cloud

Necessário para Auth, base de dados (profiles, conversations, messages, activation_keys), RLS e Edge Functions de Stripe. Vou ativar logo no início da Fase 1.

---

## Fase 1 — Auth + Perfil + Base de dados (núcleo)

**Objetivo:** utilizador consegue registar-se, escolher apelido, fazer login, e o chat já o trata pelo apelido.

- Ativar Lovable Cloud
- Schema Supabase:
  - `profiles` (id, email, full_name, preferred_name, plan_type='free', plan_expires_at, role='user', is_suspended, messages_today, messages_reset_at, last_active_at)
  - `user_roles` (separado, com enum `app_role` + `has_role()` SECURITY DEFINER — padrão obrigatório anti-recursão)
  - `conversations` (id, user_id, title, model, timestamps)
  - `messages` (id, conversation_id, role, content, created_at)
  - `activation_keys` (campos da spec)
  - RLS + GRANTs em todas
  - Trigger `handle_new_user` que cria profile no signup
- Rotas: `/login` (login + registo + reset password + onboarding de nome), `/_authenticated/chat` (move chat atual), `/_authenticated/perfil`
- `_authenticated.tsx` layout guard
- Migrar threads de localStorage → Supabase (`conversations` + `messages`)
- Saudação "Olá, [apelido]" no chat e system prompt da IA
- Logout no sidebar

---

## Fase 2 — Catálogo de 28 IAs + Limites Free

**Objetivo:** seletor com todos os modelos agrupados por categoria, badges de plano, lock para planos superiores, contador de mensagens diárias do Free.

- Atualizar `src/lib/models.ts` para os 28 modelos com `category`, `minPlan`, `provider`, `isNew`
- Dropdown agrupado no header do chat (Plataforma / OpenAI / Anthropic / Google / Meta / xAI / Mistral / DeepSeek / Perplexity / Alibaba / Cohere / Criativo)
- Badges FREE (cinza) / PRO (ciano) / ULTRA (dourado animado) + cadeado + modal de upgrade
- Mapeamento para IDs reais do Lovable AI Gateway (nem todos os 28 existem no gateway — modelos sem equivalente real serão roteados para o equivalente mais próximo disponível, com aviso transparente no tooltip)
- Edge limit Free: 50 msgs/dia, contador no sidebar, modal upgrade ao atingir, reset diário via campo `messages_reset_at`
- Guardar `model` em `conversations`

---

## Fase 3 — Planos, Stripe e Chaves de Ativação

**Objetivo:** pagar com Stripe OU ativar com chave de admin.

- Página `/_authenticated/planos` com 4 cards (Free / Pro €9,99 / Ultra €24,99 / Enterprise contacto)
- Integração Stripe via `enable_stripe_payments` (built-in Lovable Payments — sem necessidade de conta Stripe do utilizador)
- Edge function/server route para webhook Stripe → atualiza `plan_type` e `plan_expires_at`
- UI "Ativar Chave" no perfil:
  - Server fn valida key, marca `used_by` + `used_at`, atualiza plano com `duration_days`
  - Confetti em sucesso, erros claros
- Histórico de chaves no perfil

---

## Fase 4 — Dashboard Admin + Atalhos + Polish

**Objetivo:** admin gere tudo; utilizador tem atalhos e UX final.

- Rota `/_authenticated/admin` protegida por `has_role('admin')` (redirect se não-admin, sem links visíveis para users normais)
- Seeding inicial: server route público (com secret) ou SQL para promover primeiro admin pelo email definido em secret `ADMIN_EMAIL`
- 5 secções da dashboard:
  1. Visão Geral (cards + gráfico recharts: novos users 30d, mensagens por IA)
  2. Utilizadores (tabela + filtros + suspender/banir/mudar plano)
  3. Chaves (gerar batch 1–100, copiar, revogar, exportar CSV)
  4. Conversas (lista + ver conteúdo)
  5. Configurações (toggle IAs, limites free, modo manutenção)
- Atalhos globais: Ctrl+Enter, Ctrl+K (pesquisa conversas), Ctrl+N, Ctrl+/ (painel), Ctrl+L, Ctrl+S (export .txt), Ctrl+Shift+D, Esc
- Drag & drop ficheiros, paste de imagem com preview
- Toasts, skeleton loaders, responsivo mobile

---

## Detalhes técnicos importantes

- **Modelos:** o Lovable AI Gateway suporta um subconjunto dos 28 nomeados (Gemini, GPT, Claude). Para Llama/Grok/DeepSeek/Mistral/Perplexity/Qwen/Cohere/Gamma, exibo no UI mas em runtime faço fallback para o modelo equivalente disponível (anotando no header da resposta). Sem chaves próprias de cada provider isso é a única opção honesta.
- **Admin login fixo no env:** uso `ADMIN_EMAIL` como secret. Esse email, ao registar-se normalmente, ganha `role='admin'` via trigger. Não vou hardcodar password — Supabase Auth gere isso.
- **Stripe:** uso `enable_stripe_payments` (Lovable-managed, sem BYOK), produtos Pro €9,99/mês e Ultra €24,99/mês.
- **Sons sci-fi:** vou colocar como toggle off por default (sem assets — uso Web Audio API com beep sintético leve).
- **Geração de imagens (Ultra):** uso `imagegen` quando o user pedir imagem num chat (Fase 4).

---

## Confirma antes de eu começar

1. **Avanço fase a fase?** (recomendado — entrego F1, testas, sigo). Ou queres tudo de uma vez (vai demorar bastante e é mais difícil debugar)?
2. **Stripe:** ok usar Lovable Payments (Stripe gerido, sem precisares de conta Stripe)? Requer plano **Pro do Lovable**.
3. **ADMIN_EMAIL:** qual email queres como admin? (vou pedir como secret)
4. **Modelos sem equivalente real no gateway** (Llama, Grok, DeepSeek, Mistral, Perplexity, Qwen, Cohere, Gamma): exibo no seletor com fallback transparente, OU escondo até teres chaves próprias?

Assim que responderes, começo pela Fase 1.