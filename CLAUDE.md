# InfinitePlan (Next.js) — pasta nova da migração

Este é o projeto **alvo** da migração do `autoplanner/` (Lovable/Vite). Aqui é onde construímos a versão Next.js 15 + Vercel, absorvendo o que hoje vive no n8n.

> **Para o panorama completo, decisões e estado do legado, leia [`../autoplanner/CLAUDE.md`](../autoplanner/CLAUDE.md) e os 6 docs em `../autoplanner/docs/`.** Esses docs são fonte da verdade para schema (BD.md), backend dual (backend.md), workflows n8n (N8N.md), integrações (INTEGRACOES.md), termos de domínio (GLOSSARIO.md) e padrões de UI (frontend.md).

## Stack desta pasta

| Camada | Versão |
|---|---|
| Framework | **Next.js 16.2.4** (App Router, Turbopack, RSC) |
| React | 19.2 |
| TypeScript | 5.x |
| UI | shadcn/ui + Radix completo + Tailwind **3.4** (não 4 — paridade com o Vite original) |
| Auth/DB | Supabase (`jcandqsvqzchdumyujmv`) — mesmo projeto do Vite |
| Auth client | `@supabase/ssr` (cookies) + `@supabase/supabase-js` |
| Forms | react-hook-form + zod |
| Estado | TanStack Query (apenas onde precisar — listagens são Server Components) |
| Tema | next-themes (substituiu o ThemeContext custom do Vite) |
| Notifs | sonner |
| PDF | jspdf + html2canvas (será portado quando relevante) |

> **`--legacy-peer-deps` obrigatório** ao rodar `npm install`. Várias deps do shadcn ainda declaram `react ^18` como peer mas rodam fine em React 19. Sem essa flag, npm bloqueia.

## Estrutura

```
autoplanner-next/
├── middleware.ts                 ← guard de auth (substitui <ProtectedRoute> do Vite)
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← root: ThemeProvider + QueryProvider + Toaster
│   │   ├── globals.css           ← tokens HSL portados do Vite (light + dark)
│   │   ├── (auth)/               ← route group público
│   │   │   ├── actions.ts        ← Server Actions: sendOtp, verifyOtp, signOut
│   │   │   ├── _components/
│   │   │   │   └── otp-form.tsx  ← Client Component compartilhado
│   │   │   ├── login-super-admin/page.tsx
│   │   │   ├── login-company/page.tsx
│   │   │   └── login-employee/page.tsx
│   │   └── (app)/                ← route group protegido
│   │       ├── layout.tsx        ← requireUser() + SidebarProvider + AppSidebar + AppHeader
│   │       ├── page.tsx          ← dashboard (cards por role)
│   │       ├── protocolos/page.tsx          ← Fase 2 listagem
│   │       ├── orcamentos/page.tsx          ← Fase 2 listagem
│   │       ├── contratos/page.tsx           ← Fase 2 listagem (company_admin)
│   │       ├── empresas/page.tsx            ← Fase 2 listagem (super_admin)
│   │       ├── funcionarios/page.tsx        ← Fase 2 listagem (company_admin)
│   │       ├── configuracao/page.tsx        ← Fase 2 read-only (admin)
│   │       ├── sistema-acompanhamento/page.tsx  ← hub Protocolos/Orçamentos/Contratos
│   │       ├── perfil, ferramentas, minhas-ferramentas, usuarios/  ← <ComingSoon>
│   │       ├── {protocolos,orcamentos,contratos,empresas}/novo/    ← <ComingSoon>
│   │       ├── {protocolos,orcamentos,contratos,empresas}/[id]/   ← <ComingSoon>
│   │       └── _components/
│   │           ├── app-header.tsx        ← server, query nome empresa
│   │           ├── app-sidebar.tsx       ← client, NavLink → next/link, role props
│   │           ├── logout-button.tsx
│   │           ├── theme-toggle.tsx
│   │           ├── pending-approval.tsx
│   │           ├── page-header.tsx       ← título + botão voltar + actions
│   │           ├── empty-state.tsx       ← estado "sem dados"
│   │           ├── search-box.tsx        ← client, debounce + URL ?search=
│   │           └── coming-soon.tsx       ← placeholder Fase 3+
│   ├── components/
│   │   ├── ui/                   ← shadcn primitives (button, card, input, label,
│   │   │                            alert, input-otp, sonner, skeleton, table, badge,
│   │   │                            alert-dialog, dialog, switch, select, checkbox,
│   │   │                            separator, sheet, tooltip, scroll-area, sidebar,
│   │   │                            dropdown-menu, popover, tabs, textarea, form,
│   │   │                            mobile-card-list)
│   │   ├── theme-provider.tsx    ← wrapper next-themes
│   │   └── query-provider.tsx    ← wrapper TanStack Query
│   ├── hooks/
│   │   └── use-mobile.tsx        ← useSyncExternalStore (React 19 compatible)
│   └── lib/
│       ├── auth.ts               ← getCurrentUser, requireUser, requireSuperAdmin,
│       │                            requireCompanyAdmin (server-only)
│       ├── utils.ts              ← cn()
│       ├── currency.ts           ← formatCurrency, parseCurrencyToCents
│       ├── masks.ts              ← formatCPF, formatCurrencyInput
│       ├── validations.ts        ← schemas Zod (protocols, propostas, credentials)
│       ├── services/             ← server-only, encapsula queries Supabase
│       │   ├── protocols.ts      ← listProtocols, getProtocolById
│       │   ├── propostas.ts      ← listPropostas, getPropostaById
│       │   ├── contratos.ts      ← listContracts, getContractById, CONTRACT_VARIABLES
│       │   ├── empresas.ts       ← listCompanies, getCompanyById
│       │   ├── funcionarios.ts   ← listFuncionarios (profiles + roles)
│       │   └── credentials.ts    ← getCredentialsStatus (sanitizado, sem tokens)
│       └── supabase/
│           ├── client.ts         ← createBrowserClient (Client Components)
│           ├── server.ts         ← createServerClient com cookies (Server Components,
│           │                       Server Actions, Route Handlers)
│           ├── admin.ts          ← service_role (server-only, BYPASSA RLS)
│           ├── middleware.ts     ← updateSession() chamado pelo middleware raiz
│           └── types.ts          ← types do Supabase (regerar via npm run types:supabase)
├── supabase/                     ← cópia verbatim de ../autoplanner/supabase
│                                   (migrations + functions Deno)
├── tailwind.config.ts            ← portado do Vite com cores médicas
├── postcss.config.js             ← Tailwind 3 + autoprefixer
└── components.json               ← shadcn config
```

## Padrões já estabelecidos

### Auth
- **Não há AuthContext.** Cada Server Component que precisa do user chama `requireUser()` (ou `requireSuperAdmin()` etc) de `@/lib/auth`.
- **`localStorage.login_mode` virou cookie HttpOnly** (`login_mode`), setado em `verifyOtp()` e lido em `getCurrentUser()`.
- A lógica de precedência de role do Vite foi reproduzida em [src/lib/auth.ts](src/lib/auth.ts):
  - Cookie `super_admin` → força role super_admin
  - Sem cookie + tem role super_admin → super_admin precede
  - Cookie `company` (ou sem cookie sem super_admin) → filtra roles na empresa do profile

### Acesso ao Supabase
- **Client Component** (`"use client"`): import `{ createClient } from "@/lib/supabase/client"`. Anon key + RLS.
- **Server Component / Server Action / Route Handler**: import `{ createClient } from "@/lib/supabase/server"`. Anon key + RLS aplicado com cookie do user.
- **Operações privilegiadas** (criar usuário, deletar, popular `propostas.document_id`, etc): import `{ createAdminClient } from "@/lib/supabase/admin"`. Service role — **NUNCA importar de Client Component**. Tem `import "server-only"` no topo como salvaguarda.

### Cast de Supabase queries
Os types gerados em `lib/supabase/types.ts` (PostgrestVersion 13.0.5) ocasionalmente colapsam para `never` em queries com `.maybeSingle()` no novo `@supabase/supabase-js`. Padrão atual: separar o `await` em variável e fazer cast tipado:

```ts
const result = await supabase.from("profiles").select("*").eq(...).maybeSingle();
const profile = result.data as Profile | null;
```

Quando regerarmos os types contra a versão atual do SDK, isso pode parar de ser necessário. Por enquanto, é o caminho seguro.

### Server Actions vs Route Handlers
Decisão padrão para a Fase 2+:
- **Server Action**: mutações disparadas por componentes do mesmo domínio (forms internos do painel). Ex: criar protocolo, atualizar contrato, mudar status de orçamento.
- **Route Handler** (`app/api/*/route.ts`): quando o endpoint precisa ser **chamável por terceiros** (substituição direta dos webhooks n8n) OU quando é um callback externo (Authentique webhook). Ver mapa em [`../autoplanner/docs/N8N.md`](../autoplanner/docs/N8N.md).

### Padrão das listagens (Fase 2)
Toda página de listagem segue o mesmo esqueleto, validado em 6 telas:

1. **Server Component async**, com `export const dynamic = "force-dynamic"` quando consome `searchParams`.
2. **Auth/role guard no topo**: `requireUser()`, `requireCompanyAdmin()` ou `requireSuperAdmin()` de `@/lib/auth`.
3. **Service** em `lib/services/<entidade>.ts` (server-only) encapsula a query Supabase e devolve um shape estável para a UI. O componente nunca chama `supabase.from(...)` direto.
4. **PageHeader** + opcional **SearchBox** (debounced via URL `?search=`) + **EmptyState** quando vazio.
5. **Tabela desktop** (md:block) + **MobileCardList** (md:hidden) renderizam o mesmo dataset.
6. Botões de mutação (criar/editar/deletar) já existem mas estão **`disabled` com `title="Disponível na Fase 3"`** ou apontam pra rota com `<ComingSoon>`. Isso fecha todo o ciclo de UX antes da Fase 3 ligar as mutations.
7. RLS no Supabase já protege; ainda assim, services aplicam `.eq("company_id", ...)` explicitamente como cinto de segurança.

### Componentes auxiliares reusáveis
Em `src/app/(app)/_components/`:
- `<PageHeader>` — título, ícone, botão voltar, slot `actions` à direita.
- `<EmptyState>` — ícone + título + descrição + ação opcional.
- `<SearchBox>` — client component, debounce 350ms, sincroniza com query string.
- `<ComingSoon>` — placeholder genérico para rotas Fase 3+.

Não recriar variantes ad-hoc dessas — usar o existente e estender se necessário.

## Comandos

```bash
# Dev (porta padrão 3000)
npm run dev

# Build de produção (usado no smoke test)
npm run build

# Lint
npx eslint .

# Regerar types do Supabase
npm run types:supabase

# Instalação inicial (precisa --legacy-peer-deps)
npm install --legacy-peer-deps
```

## Status atual da migração

- [x] **Fase 1: Bootstrap** — Next.js scaffold, Tailwind 3, shadcn primitives, Supabase clients, middleware auth, 3 páginas OTP, layout do app, dashboard placeholder com cards por role, logout, theme toggle.
- [x] **Fase 2: Listagens read-only** — 6 páginas Server Components (protocolos, orçamentos, contratos, empresas, funcionários, configuração) + AppSidebar com filtro por role via prop + componentes auxiliares (PageHeader, EmptyState, SearchBox, ComingSoon) + 5 placeholders Fase 3 + sub-rotas (novo/editar). lib/services/* server-only encapsula queries Supabase. 23 rotas no build, todas validadas. Lint clean.
- [x] **Fase 3: Mutations internas** — 4 conjuntos de Server Actions (configuracao, perfil, protocolos, contratos). Padrão consolidado: Zod no servidor, `revalidatePath`, `useActionState`+`useFormStatus` para forms simples e RHF+`useFieldArray` para forms com array dinâmico. `<DeleteButton>` genérico com AlertDialog. `lib/contracts/variables.ts` neutro compartilha entre Server e Client Components. Build verde, lint clean, smoke test runtime OK.
- [x] **Fase 4: Absorção dos webhooks n8n** — 5 libs `lib/integrations/*` (Feegow REST, Authentique GraphQL multipart + HMAC, Helena, PDF via Puppeteer + `@sparticuz/chromium` com fallback para Chrome local em dev, credentials helper com admin client) + 8 Route Handlers em `app/api/*` substituindo todos os webhooks n8n. Funcionários: criar via Edge Function `create-employee`, delete via Edge Function `delete-user`. Os 8 bugs do n8n original NÃO foram reproduzidos (HMAC validado, sem heurístico frágil de centavos, modo manual suporta `contract_id` custom, sem `)` extra no upload Feegow). 30 rotas no build. Lint clean. Smoke test (401/400/200) OK.
- [x] **Fase 5: completa**
  - [x] Form de Orçamento — Server Component carrega Feegow (modo automático) ou profiles (modo manual) via `loadOrcamentoFormData`, protocolos com itens inline e contratos. Client `<OrcamentoForm>` (RHF + Zod + useFieldArray) submete pra `POST /api/propostas`. Página `/orcamentos/[id]` com `<StatusSelector>` (PATCH `/api/propostas/:id/status`) e `<DeleteButton>` (Server Action `deleteOrcamentoFromForm`). Listagem ganhou delete. Adicionei `command.tsx` (cmdk) pra combobox de paciente/profissional.
  - [x] Empresas CRUD super_admin com 4 tabs (Dados / Funcionários / Ferramentas / CRM). `loadEmpresaDetail` puxa tudo em paralelo (company + profiles + tools + company_tools + company_crm_links). Server Actions: create/update/delete empresa, addFuncionarioToEmpresa (Edge Function `create-employee`), removeFuncionarioFromEmpresa (Edge Function `delete-user`), addToolToEmpresa/removeToolFromEmpresa, linkEmpresaToCrm (`upsert ... onConflict:company_id`). Tab CRM consome `GET /api/crm/empresas` (Helena, já da Fase 4). Listagem ganhou delete. `formatCNPJ` adicionado em `lib/masks.ts`.
  - [~] Webhook outbound — **decisão 2026-05-02: descartado.** Sistema é tudo interno por ora. Removidos `lib/integrations/webhook-outbound.ts`, `/api/cron/webhook-dlq`, `vercel.json` e os 2 `dispatchWebhook` calls em `POST /api/propostas` e callback Authentique. Tabelas `webhook_endpoints` + `webhook_dlq` permanecem no Supabase (sem uso). Re-implementar é trivial — git log tem o histórico se a decisão mudar.
  - [x] Permissões finas em `user_tool_permissions` — `lib/services/user-tools.ts` (listToolsForUser + getFuncionarioToolPermissions). Endpoint `GET /api/funcionarios/[id]/permissions` para lazy-load no dialog. Server Action `setFuncionarioToolPermissions` (delete-then-insert idempotente). Botão `<PermissoesDialog>` na listagem de funcionários (admins recebem botão disabled — acesso implícito). `/minhas-ferramentas` saiu do `<ComingSoon>`: Server Component que para admin lista todas as `company_tools.enabled`, para não-admin filtra por `user_tool_permissions`. Mapa nome→rota replica heurístico do Vite legacy. 33 rotas no build, lint clean.
- [ ] **Fase 6: Cutover** — rotacionar todos os secrets, apontar `infiniteplan.mdia.cloud` para Vercel, decommissionar n8n.

## Pegadinhas conhecidas

- **`useSearchParams()`** em páginas estáticas exige `<Suspense>` boundary. As 3 páginas auth usam `export const dynamic = "force-dynamic"` pra não bater nesse caso.
- **`@supabase/ssr` cookies API** mudou em 2024. O padrão usado aqui (`getAll`/`setAll`) é o atual. Se for atualizar, ler o changelog antes.
- **Edge Functions Deno** em `supabase/functions/` têm imports via URL (`https://deno.land/...`) que o TS do Next reclama. Por isso `tsconfig.json` exclui `supabase/` e `eslint.config.mjs` ignora `supabase/**`.
- **Mutations Supabase quebram com type "never"** no SDK atual + types gerados PostgrestVersion 13.0.5. Padrão: `.insert(payload as never)`, `.update(payload as never)`, `.upsert(payload as never)`. Quando regerarmos os types via `npm run types:supabase`, isso pode parar.
- **Turbopack panic com CSS** em paths com espaços no Windows pode acontecer (ex: `Projetos Claude\`). Solução: `rm -rf .next` e relaunch, ou rodar com webpack via env. Build de produção não é afetado.
- **RHF `form.watch()` viola `react-hooks/incompatible-library`.** Usar `// eslint-disable-next-line react-hooks/incompatible-library` na linha. É padrão idiomático do RHF.
- **Client Components não podem importar de arquivos com `import "server-only"`.** Quando precisar compartilhar uma constante (ex: `CONTRACT_VARIABLES`), extrair para arquivo neutro em `lib/<dominio>/variables.ts`.

## Onde NÃO criar coisa

- **Não recriar `<AuthContext>`.** Use `requireUser()` server-side. Se um Client Component absolutamente precisa do user, passe via prop do Server Component pai.
- **Não usar `localStorage` para auth.** Cookie HttpOnly via Server Action — middleware lida com a renovação.
- **Não importar `@/lib/supabase/admin`** de Client Component. O `import "server-only"` quebra o build se acontecer, mas vale ter em mente.
