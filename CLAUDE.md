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
│       ├── crm/
│       │   └── contacts.ts       ← neutro: tag "Paciente", parse de customFields
│       │                            (CPF, nascimento), telefone do CRM → máscara
│       ├── orcamento/
│       │   └── patient-source.ts ← neutro: origem do paciente no orçamento
│       │                            (preferência de Configurações + chaves)
│       ├── contracts/
│       │   ├── custom-doc.ts     ← neutro: Markdown → HTML do modelo do usuário,
│       │   │                        tabela de procedimentos, shell do PDF, dados da prévia
│       │   ├── build-html.ts     ← server-only: monta o pacote (modelos + TCLE) por proposta
│       │   ├── variables.ts      ← neutro: CONTRACT_VARIABLES
│       │   └── templates/        ← TCLE padrão code-driven
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
- [x] **Fase 5.1: Cronograma de aplicações (enfermagem)** — camada clínica mínima no protocolo (`protocols.cuidados_gerais/sinais_alerta`, `protocol_items.via/cuidados`) + `lib/prescricao/*` (módulos neutros: `projetarPlano` pura, `canonicalJson` para idempotência) + renderizador code-driven `templates/default-execucao.ts` + `POST /api/prescricoes/gerar` e `GET /api/prescricoes/[id]/pdf`. Anexa ao prontuário Feegow via `/patient/upload-base64`, encadeado automaticamente após o envio do contrato. 35 rotas no build. Ver "Cronograma de aplicações" abaixo.
- [x] **Fase 5.2: Camada clínica na criação do orçamento** — a grade clínica (via, dose, começa em, observações) passou a existir também em `/orcamentos/novo`, gravando no MESMO delta `prescricao_ajustes` que o editor de cronograma já usava, e nos avulsos gravando dentro de `procedimentos_adicionais`. `<ClinicalGrid>` + `<DuracaoInput>` compartilhados com o form de protocolo. Corrigidos 3 defeitos verificados: o `map` em `orcamentos/novo/page.tsx` descartava `id`/`via`/`dose`/`inicio_dias`/`cuidados`; `AjusteItemSchema` não aceitava `dose` (tornando dose por paciente inalcançável, e — com `salvarAjustes` fazendo replace — apagável); e a contagem "sem via" era falso positivo estrutural, acusando todo item de todo protocolo.
- [x] **Fase 5.3: Vários documentos por plano, numa assinatura só** — `protocol_contracts` + `proposta_contracts` (join com `ordem`) e `incluir_tcle_padrao` em ambos. `buildContractHtml` virou `buildContractsHtml`, refatorada em fragmento + shell. `<DocumentosSelector>` compartilhado por protocolo e orçamento. Ver "Documentos do plano" abaixo.
- [x] **Fase 5.4: Pacientes do CRM no orçamento (fallback sem Feegow)** — empresa sem `feegow_token` e com `crm_token` ganha um combobox que busca contatos etiquetados "Paciente" na Helena/WTS (`POST /contact/filter`, busca do servidor conforme digita via `GET /api/crm/pacientes?q=`). CPF e nascimento vêm de `customFields` quando a conta tem esses campos; o que não vier é digitado nos mesmos inputs do modo manual. CPF e telefone passaram a ser obrigatórios para paciente manual/CRM (form + `envio-manual`). Ver "Pacientes do CRM" abaixo.
- [x] **Fase 5.5: Modelo de contrato em Markdown + prévia** — `contracts.content` passou a ser Markdown, renderizado por `lib/contracts/custom-doc.ts` (neutro, `marked`) tanto no PDF quanto na prévia ao vivo do editor (`<iframe sandbox srcDoc>`, dados fictícios, marca da empresa). `{{procedimentos}}` sozinha numa linha vira tabela (nome e quantidade, sem valor por item — decisão 2026-10-16); `{{subtotal}}`/`{{desconto}}`/`{{total}}` passaram a refletir o desconto real do orçamento (antes desconto era fixo em R$ 0,00). Ver "Modelo do usuário é Markdown" abaixo.
- [x] **Fase 5.6: Origem dos pacientes em Configurações** — dropdown em `/configuracao` (`api_credentials.patient_source`: `feegow` padrão, `crm`, `manual`). O padrão reproduz o comportamento anterior (Feegow → CRM → manual conforme as chaves). Só o paciente muda de origem: procedimentos e profissionais seguem da Feegow quando há chave. Sem paciente da Feegow, `POST /api/propostas` não cria proposta lá e o webhook da Authentique não anexa ao prontuário. Ver "Origem dos pacientes no orçamento" abaixo.
- [x] **Fase 5.7: Vários protocolos por orçamento** — `/orcamentos/novo` aceita uma lista de protocolos; cada item tem quantidade editável e pode ser retirado (e restaurado), só no orçamento. O servidor monta o retrato `propostas.itens_protocolo` a partir de `protocol_items` (`montarItensProtocolo`), e contrato, cronograma e tela de detalhe leem o retrato; orçamento antigo (`itens_protocolo` null) segue lendo o protocolo ao vivo. Ver "Vários protocolos no orçamento" abaixo.
- [ ] **Fase 6: Cutover** — rotacionar todos os secrets, apontar `infiniteplan.mdia.cloud` para Vercel, decommissionar n8n.

## Origem dos pacientes no orçamento (Configurações)

A empresa escolhe em `/configuracao` de onde o formulário de orçamento puxa o
paciente (decisão 2026-10-22). Fica em `api_credentials.patient_source` (CHECK
`feegow | crm | manual`, default `feegow`) e é resolvida contra as chaves por
`resolvePatientSource` ([patient-source.ts](src/lib/orcamento/patient-source.ts),
neutro — o loader usa no servidor e a tela de Configurações mostra a mesma
resolução ao vivo, "Com as chaves configuradas hoje: ..."):

| Preferência | Tem a chave | Falta a chave |
|---|---|---|
| `feegow` (padrão) | Feegow | CRM; sem CRM, manual |
| `crm` | CRM | manual (nunca Feegow) |
| `manual` | manual | — |

O padrão é exatamente o comportamento de antes da opção existir, por isso a
migration não mudou nada para nenhuma empresa.

**Só o PACIENTE muda de origem.** Procedimentos e profissionais continuam
vindo da Feegow quando há `feegow_token` (`hasFeegow` no formulário segue
significando "catálogo da Feegow"); a origem do paciente é outra prop,
`patientSource`. Com origem ≠ `feegow`, `listPatients()` da Feegow (a chamada
mais pesada) nem é feita.

**Sem paciente da Feegow não existe proposta na Feegow.** `createProposal`
exige `paciente_id` da Feegow. Então `POST /api/propostas` cria lá só com
`feegow_token` **e** `paciente_id` diferente de `"manual"`/vazio — decide pelo
PAYLOAD, não pela preferência salva, porque a preferência pode mudar com um
formulário aberto. Pelo mesmo motivo o webhook da Authentique só anexa o
contrato assinado ao prontuário quando o `paciente_id` é da Feegow (antes
bastava a empresa ter a chave, e numa empresa com Feegow todo paciente era de
lá). O envio do cronograma já recusava paciente manual.

**Limite conhecido:** com a Feegow fora do ar, trocar para CRM não salva o
orçamento — os profissionais continuam vindo da Feegow e a lista sai vazia.
Feegow configurada mas fora do ar segue sem fallback (decisão 2026-09-22).

## Pacientes da Feegow (lista completa + busca no servidor)

`/patient/list` da Feegow só aceita `limit`/`offset` — **não há filtro por nome**
(conferido na documentação e no `mdia-feegow-mcp`). Até 2026-10-22 o formulário
pedia uma página de 1500 e parava: em clínica maior, o resto dos pacientes nunca
aparecia. Agora `feegow(token).listAllPatients()` pagina até o fim, avançando
pelo número de itens que vieram (não pelo `limit` pedido) e parando em página
vazia ou sem id novo (proteção contra API que ignore `offset`).

A busca roda no servidor sobre a lista inteira, mantida **em memória** por 5
minutos por empresa + hash do token (`lib/services/feegow-patients.ts`) — não no
data cache da Vercel, porque a lista de clínica grande passa do limite de item e
não queremos dado de paciente persistido lá. Busca que não acha nada com a lista
com mais de 1 minuto recarrega uma vez (paciente recém-cadastrado). Casa
todas as palavras no nome (sem acento/caixa), e-mail, ou telefone (4+ dígitos).

⚠️ O cache mora em **`globalThis`**, não num `Map` do módulo: a página (bundle SSR) e
as rotas `/api` (outro bundle) recebem CÓPIAS separadas do módulo no Next, e um `Map`
de módulo fazia o pré-carregamento da página encher um cache que a busca nunca lia.
A idade da lista conta de quando ela CHEGA, e a recarga após busca sem resultado
**não apaga a lista boa**: buscas simultâneas seguem usando a atual, e se a recarga
falhar (Feegow instável) a lista em cache continua valendo.

O formulário abre esperando a lista no máximo 3s; clínica grande na primeira vez
abre com o dropdown vazio ("Digite para buscar") e `after()` mantém o
carregamento vivo para a busca achar o cache. O dropdown de Feegow e o do CRM são
o MESMO componente (`patient-search-combobox.tsx`, `shouldFilter={false}`, busca
em `GET /api/feegow/pacientes?q=` e `GET /api/crm/pacientes?q=`).

## Pacientes do CRM

Quando a origem efetiva é `crm` (ver acima) e a empresa tem `crm_token`,
`loadOrcamentoFormData` busca a primeira página de contatos etiquetados
**"Paciente"** na Helena/WTS e liga `hasCrm`; a busca conforme digita vai a `GET /api/crm/pacientes?q=`, que
repassa `q` como `textFilter` da API (o CRM procura em nome, telefone e e-mail).
Contas com **milhares** de pacientes existem — por isso a busca é do servidor e
o dropdown mostra uma página de 20, nunca a lista inteira.

**Chamada:** `helena(token).filterContacts` → `POST /contact/filter` com
`{ tagNames: ["Paciente"], textFilter, status: "ACTIVE", includeDetails: ["CustomFields"], pageNumber, pageSize }`.
Três detalhes que não podem cair:
- **`includeDetails: ["CustomFields"]`** — sem ele o CRM omite `customFields`,
  e CPF e nascimento moram lá.
- **Sem `orderBy`** — o nome do campo de ordenação não está documentado e um
  valor inválido derruba a chamada inteira. A página é ordenada por nome aqui.
- **Timeout de 8s** — a primeira página é buscada dentro do render de
  `/orcamentos/novo`; um CRM lento não pode segurar a página.

**customFields é livre por conta.** A chave é casada normalizada (sem acento,
caixa ou pontuação): `"CPF"` → `cpf` exato; nascimento → chave contendo
`nascimento` (`"Data de Nascimento"`, `data_nascimento`). Nem toda conta tem os
campos — o valor ausente vira `""` e o usuário completa no input. CPF só é
aceito com 11 dígitos; nascimento é normalizado para `dd/mm/aaaa`. Tudo em
`lib/crm/contacts.ts` (neutro, testável sem o Next).

**Nada muda depois da seleção.** O contato do CRM só preenche os mesmos inputs
do modo manual (nome, CPF, telefone; e-mail e nascimento vão junto sem campo
visível). `paciente_id` grava `"manual"` como sempre; **não há coluna nova** nem
rastro do id do contato — rastrear o contato depois foi descartado. Os inputs
continuam editáveis, e "Não está na lista? Preencher manualmente" só limpa a
seleção. Falha do CRM na abertura vira `crmError` (Alert) e o formulário volta a
ser o manual de sempre.

**CPF e telefone obrigatórios para paciente manual/CRM** (origem ≠ `feegow`,
inclusive em empresa com Feegow), nos dois botões
("Salvar" e "Salvar e enviar"), porque **não existe tela de edição de orçamento**:
um rascunho sem CPF viraria beco sem saída na hora de enviar o contrato. O
`envio-manual` recusa com 422 pelo mesmo critério (CPF com 11 dígitos, telefone
com 10+), o que cobre o botão da tela de detalhe e os orçamentos antigos.
**Paciente da Feegow fica de fora** dessa regra: lá o CPF vem do prontuário e o formulário não
tem campo para digitá-lo — exigir criaria o mesmo beco sem saída. O destaque
vermelho nos inputs só acende após escolher um contato do CRM ou após uma
tentativa de salvar; um formulário recém-aberto não nasce vermelho.

**Telefone do CRM** vem como E.164 sem `+` (`5511999999999`). `crmPhoneToDisplay`
devolve celular BR na máscara do campo (`(11) 99999-9999`) e todo o resto já em
E.164 com `+`, porque `phoneToE164` só prefixa 55 em exatamente 11 dígitos — um
fixo mascarado como `(11) 33334-444` viraria `+1133334444`.

## Documentos do plano (contrato + termos)

Um plano manda **vários documentos** — contrato de prestação, TCLE, termo de imagem —
e o paciente **assina uma vez**.

**A restrição que define o desenho:** `createDocument` da Authentique recebe
`$file: Upload!` — **singular**, um arquivo por documento
([authentique.ts](src/lib/integrations/authentique.ts)). Uma assinatura para vários
papéis só existe concatenando os papéis num PDF. Isso é sorte, não limitação: tudo
abaixo do PDF segue **1:1 e intocado** — `propostas.document_id`, o webhook que
resolve a proposta por `document_id`, o acervo em `contracts/archive.ts` e o anexo
único no prontuário Feegow.

**Seleção:** o protocolo define o padrão (`protocol_contracts` + `protocols.incluir_tcle_padrao`),
o orçamento copia e ajusta (`proposta_contracts` + `propostas.incluir_tcle_padrao`).
Mesmo padrão mental da folha de enfermagem: protocolo propõe, orçamento dispõe.
`ordem` na tabela de junção é a sequência das páginas.

**O TCLE padrão não é linha em `contracts`** — é código (`renderDefaultSystemContract`).
Por isso é booleano, não id, e entra **sempre por último**. Não é mais pré-marcado:
selecionar documento virou ato explícito.

**`propostas.contract_id` é LEGADO.** A migration fez o backfill dela para
`proposta_contracts` e — a linha que mais importava — marcou `incluir_tcle_padrao`
nas 189 propostas sem `contract_id`, porque ali "sem contrato" *significava* "manda o
TCLE". Sem essa linha, todo orçamento antigo ficaria sem documento nenhum. A coluna
segue na tabela com `COMMENT`; não é mais lida. Não derrubar em produção.

**Modelo do usuário é Markdown (2026-10-07).** `contracts.content` entra em
`renderCustomContract` ([custom-doc.ts](src/lib/contracts/custom-doc.ts)) e vira HTML
com `marked` (`gfm`, `breaks: true`). Antes, o conteúdo era injetado como HTML cru sem
tratar quebra de linha: todo modelo colado em texto puro saía num bloco só, e um modelo
em Markdown saía com `#` e `**` impressos. Nenhum contrato em produção tinha HTML, por
isso a troca foi feita sem coluna de formato. Regras:

- **Ordem de substituição.** `{{procedimentos}}` é resolvida ANTES do parse, porque gera
  Markdown: sozinha numa linha vira **tabela** de duas colunas (Procedimento e Qtd); no
  meio de uma frase vira a lista em texto de sempre ("Nome (Qtd: 2), ..."). **Sem valor
  por item** (decisão 2026-10-16): dinheiro só entra por `{{subtotal}}`, `{{desconto}}` e
  `{{total}}`. As demais variáveis entram DEPOIS do parse, **escapadas como HTML** — um
  `*` ou `|` num nome não pode mexer no layout.
- **Linha só de `_` é assinatura, não régua.** Em Markdown, `___` sozinho é `<hr>`; os
  TCLEs legados usam "___________" acima de "Paciente:". `protegerLinhasDeAssinatura`
  escapa esses traços antes do parse.
- **CSS escopado em `.doc-custom`** ([custom-doc.ts](src/lib/contracts/custom-doc.ts)),
  primeira regra intocada (fonte, tamanho, padding de 20mm). O TCLE padrão divide a folha
  de estilo no mesmo PDF e não pode herdar nada daqui.
- **Prévia = PDF.** O editor renderiza o mesmo `montarShell` + `renderCustomContract` num
  `<iframe sandbox="">` com `previewSample()` (dados fictícios coerentes: 3.600 − 10% =
  3.240). Só a marca vem pronta do servidor (`renderBrandingHeader`/`renderBrandingCss`
  são server-only), via prop `preview` das páginas `/contratos/novo` e `/contratos/[id]`.
- **Subtotal e desconto são reais.** `valor_total_cents` é o valor FINAL; o subtotal é a
  soma dos itens (`protocol_items` + `procedimentos_adicionais`, desconto por item
  incluído, a mesma conta do formulário de orçamento) e `desconto = subtotal − total`,
  com o percentual ao lado quando houver. Orçamento legado sem valor por item imprime
  subtotal = total e desconto zero, como sempre imprimiu. O TCLE padrão recebe o mesmo
  `subtotal_cents`.

**Montagem — fragmento + shell** ([custom-doc.ts](src/lib/contracts/custom-doc.ts), usado por [build-html.ts](src/lib/contracts/build-html.ts)):
cada documento produz só o corpo, e um `montarShell` junta tudo num `<html>` com
`.doc + .doc { page-break-before: always }`. Três coisas não podem ser quebradas:

- **O CSS do TCLE é ESCOPADO** (`buildDefaultContractCss(".doc-tcle")`). O contrato do
  usuário é HTML arbitrário e divide a folha de estilo: um `<table class="proc">` ou
  uma `.header-wrap` no texto dele herdaria o estilo do template se as regras fossem
  globais. Verificado renderizando um contrato com classes deliberadamente colidentes.
- **NÃO resetar a margem do `body`.** São os 8px default do navegador, que sempre
  valeram — zerá-los desloca ~2mm todo contrato já emitido. O padding de página vive
  no wrapper de cada documento (`.doc-custom` 20mm, `.doc-tcle` 20mm 15mm), que é
  exatamente o que estava no `body` antes.
- **Guarda de pacote vazio:** zero modelos + TCLE desmarcado ⇒ 422 com mensagem clara,
  nunca um PDF em branco para o paciente assinar. Consequência direta de o TCLE ter
  deixado de ser pré-marcado. O formulário também barra antes de criar o orçamento —
  não existe tela para corrigir a seleção depois.

Regressão verificada empiricamente no refactor fragmento + shell: pacote de UM documento
saiu **pixel a pixel idêntico** ao de antes (6 páginas rasterizadas, PNGs iguais byte a
byte). A troca para Markdown (2026-10-07) muda o modelo do usuário de propósito — ganha
parágrafos, quebras de linha e formatação — e deixa o TCLE padrão intocado.

## Webhook da Autentique (assinatura)

`POST /api/webhooks/authentique` é o que carimba `propostas.contract_signed_at` e
anexa o contrato assinado ao prontuário Feegow. Até 2026-10-22 nunca carimbou nada:
193 contratos enviados e zero assinaturas registradas, porque a rota lia um formato de
payload que a Autentique não manda, as contas das clínicas ainda apontavam para o n8n
e o middleware respondia **307 para `/login-employee`** a todo POST sem cookie, inclusive
o da Autentique. `/api/webhooks/*` agora é rota pública em
[supabase/middleware.ts](src/lib/supabase/middleware.ts); cada rota ali se autentica
sozinha. Verificado contra o build de produção (`next start`).

**Formato real do payload** (parser puro em
[authentique-webhook.ts](src/lib/integrations/authentique-webhook.ts), neutro):
`{ event: { id, type, data } }`, com o recurso em `event.data.object` quando é objeto,
senão no próprio `event.data` (a Autentique manda os dois; no segundo, `object` é a
string `"document"`/`"signature"`). Em `signature.*` o recurso é a assinatura e o id do
documento está em `document`; em `document.*` o recurso é o documento e o id está em
`id`. O formato antigo `event.data.document` segue aceito. Header de HMAC:
`X-Autentique-Signature`.

**Respostas.** A Autentique manda vários tipos de evento para a mesma URL: tipo fora de
`signature.accepted`/`document.finished`/`signed`, evento sem id de documento e
documento que não é nosso (a conta é dividida com outros sistemas) respondem **200
`ignored`**, antes de tocar no banco. 4xx só para JSON inválido e HMAC errado; 503 quando
não dá para confirmar, para ela reenviar.

**O evento é gatilho, não prova.** Nenhuma empresa tem `webhook_secret`, então o HMAC
(opcional) hoje não roda. Antes de carimbar, a rota confirma na API
(`getDocumentInfo`): só carimba com `status === "signed"`, isto é, TODOS os signatários
assinaram. Sem isso, quem soubesse um id de documento marcaria o contrato como assinado
e dispararia um anexo irreversível na Feegow. Empresa sem `authentique_token` → 200
`ignored`; consulta falhou (`status: null`) → 503.

**Carimbo idempotente.** O `update` só grava se `contract_signed_at` for nulo (com o
`signedAt` da Autentique). **Reenviar o contrato zera** `contract_signed_at` e o estado do
anexo (`envio-manual`): assinatura e anexo são do DOCUMENTO, não do orçamento — sem zerar,
o documento novo nunca carimbava nem anexava, e o card mostrava "Assinado" para um
contrato recém-reenviado.

**Anexo no prontuário com estado próprio (2026-10-22)** —
[feegow-anexo.ts](src/lib/contracts/feegow-anexo.ts), usado pelo webhook (automático,
assim que o paciente assina) e pelo botão "Enviar ao prontuário" do card do contrato:
`contract_feegow_em` (anexado), `contract_feegow_iniciado_em` (envio em curso) e
`contract_feegow_erro` (última falha). Antes o anexo era amarrado ao carimbo — só a
requisição que carimbava anexava —, então uma Feegow fora do ar naquele instante perdia o
anexo para sempre, sem registro. Agora:
- o evento seguinte (`document.finished` depois de `signature.accepted`) tenta de novo;
- **trava otimista** em `contract_feegow_iniciado_em` (só quem troca o valor que leu envia):
  dois eventos juntos, ou um clique durante o automático, não anexam duas vezes;
- envio que começou há mais de 10 min e nunca confirmou nem falhou fica **"em dúvida"**: o
  automático não reenvia, e o botão só reenvia com confirmação ("confira o prontuário"),
  porque a Feegow não tem delete de anexo;
- o webhook responde **200 mesmo quando o anexo falha** (a falha fica no orçamento e na
  tela). 5xx faria a Autentique reenviar, mas uma falha permanente viraria fila de
  reenvios e poderia desativar o webhook da clínica;
- o botão manual confirma a assinatura na Autentique antes de enviar e, se o contrato foi
  assinado antes de o webhook existir, registra `contract_signed_at` de passagem.
Paciente digitado ou do CRM não tem prontuário: `nao_aplicavel`, e o card diz isso.

**A URL fica em `/configuracao`** (card "Webhook da Autentique", com passo a passo e a
data da última assinatura recebida, que serve de sinal de vida). Domínio:
`VERCEL_PROJECT_PRODUCTION_URL` ou, fora da Vercel, os headers da requisição
([app-url.ts](src/lib/app-url.ts)). **Cada clínica precisa cadastrar a URL na própria
conta da Autentique** (formato JSON, os dois eventos) e remover ou trocar o webhook antigo
do n8n. Com os dois ativos, o n8n também anexa o PDF e o prontuário fica com o contrato
duplicado.

## Vários protocolos no orçamento (retrato dos itens)

Um orçamento pode juntar **vários protocolos**, com a **quantidade de cada item
ajustada** e **itens retirados** — tudo só naquele orçamento (decisão 2026-10-22).
O protocolo segue sendo o modelo: nada disso toca `protocol_items`.

**Retrato, não leitura ao vivo.** `propostas.itens_protocolo` (JSONB) guarda um
elemento por item INCLUÍDO: protocolo de origem, quantidade do orçamento,
quantidade do protocolo (só para exibir), valor, desconto, intervalo e a camada
clínica copiada do protocolo na criação. Motivo: `updateProtocol` faz
delete-then-insert, então os ids dos itens mudam a cada edição do protocolo — uma
quantidade guardada por id ficaria órfã, e o contrato passaria a mostrar o
protocolo de hoje em vez do que foi vendido. Formato e leitura tolerante em
[itens-protocolo.ts](src/lib/orcamento/itens-protocolo.ts) (neutro).

**O servidor monta o retrato.** O formulário manda só a ESCOLHA
(`protocolos: [{ protocolo_id, itens: [{ ref, quantity }] }]`);
`montarItensProtocolo` ([orcamento-protocolos.ts](src/lib/services/orcamento-protocolos.ts))
lê `protocols` (da empresa) e `protocol_items`, e devolve 422 (protocolo
repetido), 404 (protocolo de outra empresa / apagado) ou **409 quando um item
escolhido não existe mais** (protocolo editado com o formulário aberto). Roda
ANTES da proposta da Feegow, para um 409 não deixar proposta órfã lá. O delta
clínico do payload é filtrado para as refs que entraram no retrato.

**Quem lê o retrato** (null = caminho antigo, intocado): `buildContractsHtml`
(procedimentos e subtotal do contrato), `loadPrescricaoFonte` (itens e cabeçalho
do cronograma) e a tela `/orcamentos/[id]` (itens agrupados por protocolo).
`protocolo_id` grava o PRIMEIRO protocolo e `protocolo_nome` os nomes unidos por
" + ", só para listagens.

**Cronograma com um protocolo sai idêntico ao antigo** (verificado: mesmo hash
canônico). Com vários: nome "A + B"; cuidados gerais e sinais de alerta de cada
protocolo com o nome dele na frente (`combinarTextosDeProtocolos`), lidos ao vivo
de `protocols` como sempre. A quantidade do orçamento é o número de sessões.

**Documentos:** adicionar um protocolo SOMA os documentos dele à seleção (e marca o
TCLE se ele propõe); remover tira só os que nenhum protocolo restante propõe.

**Quantidade e itens retirados.** Quantidade sem teto (o protocolo também não tem);
o campo guarda o texto enquanto a pessoa digita e só repassa inteiro ≥ 1. Retirar um
item NÃO apaga o ajuste clínico dele — restaurar traz de volta; só os itens incluídos
vão no payload, e o servidor filtra de novo.

⚠️ O select de `protocol_items` em `montarItensProtocolo` é explícito: é o **sexto
lugar** da lista abaixo. Coluna nova que precise chegar ao contrato ou ao
cronograma de orçamento novo tem que entrar lá também.

## Cronograma de aplicações (folha de enfermagem)

Segundo documento do sistema, ao lado do contrato. **Derivado, não escrito**:
`projetarPlano(protocolo, proposta, início)` é uma função pura em módulo neutro
(`lib/prescricao/project.ts`) que roda idêntica no Client Component (preview) e no
servidor (PDF) — impossível a tela divergir do papel.

**Não é uma prescrição.** Sob a COFEN 358/2009 "prescrição de enfermagem" é ato privativo
do enfermeiro; e a camada clínica é mínima de propósito (via + cuidados, **sem dose,
diluente ou velocidade**). O documento se intitula "Cronograma de aplicações" e o rodapé
declara o que ele não é. Não incluir dose sem revisitar essa decisão.

**Gerar ≠ enviar (2026-07-31).** O PDF nasce automaticamente junto com o
contrato, mas anexar ao prontuário é **ato explícito**, feito depois de revisar
em `/orcamentos/[id]/cronograma`. Motivo: a Feegow não expõe delete nem replace
de anexo — arquivar é irreversível. `POST /api/prescricoes/gerar` NUNCA envia;
`POST /api/prescricoes/enviar` renderiza **do snapshot** (nunca reprojeta) e é
o único que fala com a Feegow.

**Revisão é fato do prontuário.** Só incrementa quando um conteúdo diferente do
último anexado é efetivamente arquivado — por isso `prescricao_hash_enviado` é
separado de `prescricao_hash`. Gerar e editar não incrementam nada.

**Ajustes por paciente** vivem em `propostas.prescricao_ajustes` como delta
esparso: `{"<item_ref>": {via, dose, cuidados, inicio_dias, sessoes: {"<n>": offset_dias}}}`.
A chave da sessão é o índice ORIGINAL (estável), enquanto o número impresso é a
posição cronológica após o remanejo — se a chave mudasse ao reordenar, editar
duas vezes perderia o primeiro ajuste. A cascata ("empurrar as seguintes") é
resolvida na UI e gravada como offsets explícitos, para o delta ser auditável.

`inicio_dias` no delta desloca o ITEM inteiro; `sessoes` continua sendo
remanejamento pontual e vence por sessão. Não gravar deslocamento de item como
N offsets de sessão: as N apareceriam marcadas como ajustadas e o selo
"ajustada" deixaria de significar "esta data foi mexida".

**`AjusteItem` tem DOIS escritores** (2026-08-07): o formulário de criação do
orçamento e o editor de cronograma. `salvarAjustes` faz **replace**, não merge
— então um campo aceito só por um dos dois é apagado em silêncio pelo outro.
Foi exatamente o que houve com `dose`, que existia no tipo e na projeção mas
nunca no schema de escrita. Por isso o schema Zod é **um só**
(`prescricaoAjustesSchema` em `lib/validations.ts`), importado pelos dois, e a
limpeza do delta também (`limparAjustes` em `lib/prescricao/ajustes.ts`).
⚠️ Em `limparAjustes`, `inicio_dias: 0` é **significativo** (num item que o
protocolo manda começar em D+14, zero quer dizer "neste paciente começa na 1ª
sessão"); só via/dose/cuidados vazios são descartados.

**Camada clínica do avulso.** Procedimento extra não tem linha em
`protocol_items`, logo não tem modelo do qual desviar: a camada clínica dele
mora DENTRO de `propostas.procedimentos_adicionais` (JSONB), não no delta.
Tem sua própria lista de lugares a tocar, paralela à dos "SEIS lugares":
1. `orcamentoProcedureSchema` (`lib/validations.ts`)
2. os dois `append(...)` em `orcamento-form.tsx`
3. `ProcedimentoAdicionalSchema` em `api/propostas/route.ts` — **não**
   `ProcedimentoSchema`, que alimenta a proposta da Feegow e não tem esses campos
4. `loadPrescricaoFonte` (`lib/services/prescricoes.ts`) — o JSONB não tem
   CHECK, então `via` é validada contra o enum na leitura

**Regras que não podem ser quebradas:**
- **A folha não carrega dinheiro.** Nenhum `formatBRL`, nenhuma forma de pagamento — ela
  circula na sala de preparo.
- **Zero `{{var}}`.** É code-driven. `replaceContractVariables` troca variável ausente por
  string vazia; um campo clínico que some sem rastro é falha de segurança, não de layout.
- **Snapshot congelado** em `propostas.prescricao_snapshot`. `updateProtocol` faz
  delete-then-insert dos itens, então sem snapshot editar um protocolo reescreveria
  retroativamente toda folha já emitida.
- **Nada bloqueia a geração.** O envio é encadeado ao contrato; se campo clínico ausente
  virasse erro, todo protocolo legado (todos têm `via` nula) quebraria "Salvar e enviar
  contrato". A folha degrada — imprime "— CONFERIR" — em vez de falhar.
- **Falha da folha nunca derruba o contrato** — `toast.warning`, nunca rollback.

**Ao adicionar coluna em `protocol_items`, ela precisa entrar em SEIS lugares** ou é
apagada silenciosamente no primeiro save (delete-then-insert), ou simplesmente nunca
chega na folha:
1. `protocolItemSchema` (`lib/validations.ts`)
2. `protocolos/[id]/editar` — `initialValues` (map destrutivo)
3. os `map` de items em `createProtocol` **e** `updateProtocol`
4. `getProtocolById` — `protocol_items` usa `.select("*")`, então passa sozinho; o select
   explícito ali é o de `protocols`
5. **`lib/services/prescricoes.ts`** — este select de `protocol_items` É explícito, e é o
   que alimenta a folha. Coluna esquecida aqui salva no banco e some do documento.
6. **`lib/services/orcamento-protocolos.ts`** (`montarItensProtocolo`) — monta o retrato
   `itens_protocolo` dos orçamentos novos; o select também é explícito, e o tipo
   `ItemProtocoloOrcamento` + `parseItensProtocolo` precisam do campo.

**Dose (2026-08-07).** É opcional e o documento reage a ela: sem nenhum item com dose, a
folha sai byte a byte idêntica à de antes da feature — inclusive o rodapé afirmando que
"não informa dose" e a orientação sem menção a dose. Com dose, a coluna DOSE aparece e as
duas frases trocam. Diluente e velocidade seguem fora de escopo nos dois casos. Se dose
virar rotina, revisitar a assinatura do prescritor (hoje ele é referência, não signatário).

**Onde a camada clínica é definida (2026-08-07).** Dois pontos, um armazenamento:
o **protocolo** define o modelo (`protocol_items.*`), e o **orçamento** define o
desvio deste paciente (delta / JSONB do avulso). A grade é a mesma nas duas telas
(`app/(app)/_components/clinical-grid.tsx`, componente controlado sem
acoplamento a RHF) para que ensinem a mesma coisa. "Começa em" usa
`<DuracaoInput>`: o usuário digita em dias/semanas/meses, **grava sempre em
dias**, e a tela mostra a resolução ("2 meses · 60 dias · 09/10/2026") porque
mês vale 30 dias fixos num modelo de offset — aceitar "2 meses" e agendar 60
dias em silêncio seria armadilha. O hint usa `addDiasISO` de `project.ts`, a
MESMA aritmética da agenda impressa; não criar uma paralela.

**`inicio_dias`** é offset a partir do D0, não data — o protocolo é modelo reutilizável.
O offset padrão de uma sessão é `inicio_dias + idx * interval_days`. Ajustes por paciente
(`prescricao_ajustes.sessoes`) guardam offsets ABSOLUTOS, então mudar `inicio_dias` num
protocolo não move sessões já remanejadas em folhas existentes.

**Feegow:** não existe escrita estruturada de prescrição. `/medical-record/*` é todo
GET-only e `/medical-reports/create` exige `agendamento_id`. O único caminho é anexar PDF
via `POST /patient/upload-base64`. Idempotência por `sha256(canonicalJson(plano))`, que
exclui `gerado_em` e `revisao` — incluir `revisao` torna a comparação circular.
`prescricao_inicio` é persistido na primeira emissão e reusado: se defaultasse para "hoje"
a cada geração, o mesmo orçamento criaria revisão espúria todo dia, e a Feegow **não expõe
delete nem replace de anexo**.

⚠️ `uploadBase64ToPatient` valida `success !== true` no envelope — a Feegow devolve erro
como HTTP 200 com `{"success": false}`. O `fetcher` genérico só lança em `!res.ok`.

⚠️ Toda rota nova que gere PDF precisa de entrada em `outputFileTracingIncludes`
(`next.config.ts`). Esquecer não quebra `build` nem dev — quebra só em produção.

## Pegadinhas conhecidas

- **`useSearchParams()`** em páginas estáticas exige `<Suspense>` boundary. As 3 páginas auth usam `export const dynamic = "force-dynamic"` pra não bater nesse caso.
- **`@supabase/ssr` cookies API** mudou em 2024. O padrão usado aqui (`getAll`/`setAll`) é o atual. Se for atualizar, ler o changelog antes.
- **Edge Functions Deno** em `supabase/functions/` têm imports via URL (`https://deno.land/...`) que o TS do Next reclama. Por isso `tsconfig.json` exclui `supabase/` e `eslint.config.mjs` ignora `supabase/**`.
- **Mutations Supabase quebram com type "never"** no SDK atual + types gerados PostgrestVersion 13.0.5. Padrão: `.insert(payload as never)`, `.update(payload as never)`, `.upsert(payload as never)`. Quando regerarmos os types via `npm run types:supabase`, isso pode parar.
- **Turbopack panic com CSS** em paths com espaços no Windows pode acontecer (ex: `Projetos Claude\`). Solução: `rm -rf .next` e relaunch, ou rodar com webpack via env. Build de produção não é afetado.
- **RHF `form.watch()` viola `react-hooks/incompatible-library`.** Usar `// eslint-disable-next-line react-hooks/incompatible-library` na linha. É padrão idiomático do RHF.
- **Toda cor de `globals.css` usada como classe precisa estar em `tailwind.config.ts`.** `--popover` existia no CSS mas não no config: `bg-popover` não gerava nada e todo Popover/Command/DropdownMenu/Tooltip ficava transparente, com o texto da página aparecendo por trás (corrigido 2026-10-22).
- **Client Components não podem importar de arquivos com `import "server-only"`.** Quando precisar compartilhar uma constante (ex: `CONTRACT_VARIABLES`), extrair para arquivo neutro em `lib/<dominio>/variables.ts`.

## Onde NÃO criar coisa

- **Não recriar `<AuthContext>`.** Use `requireUser()` server-side. Se um Client Component absolutamente precisa do user, passe via prop do Server Component pai.
- **Não usar `localStorage` para auth.** Cookie HttpOnly via Server Action — middleware lida com a renovação.
- **Não importar `@/lib/supabase/admin`** de Client Component. O `import "server-only"` quebra o build se acontecer, mas vale ter em mente.
