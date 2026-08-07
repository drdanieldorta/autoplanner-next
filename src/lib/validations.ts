import { z } from 'zod';

import { VIAS } from '@/lib/prescricao/enums';

// Protocol validation schemas
//
// `via` e `cuidados` são a camada clínica mínima (2026-07-30). Ambos são
// OPCIONAIS de propósito: todo protocolo já existente tem esses campos
// nulos, e torná-los obrigatórios quebraria a edição de qualquer protocolo
// legado — além de bloquear o envio automático do contrato, já que a folha
// é gerada no mesmo fluxo.
export const protocolItemSchema = z.object({
  procedure_id: z.string().min(1, 'Selecione um procedimento'),
  procedure_name: z.string().min(1, 'Nome do procedimento é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  interval_days: z.number().int().min(0, 'Intervalo não pode ser negativo'),
  value_cents: z.number().int().min(0, 'Valor não pode ser negativo'),
  discount_percent: z.number().int().min(0).max(100, 'Desconto deve estar entre 0 e 100%'),
  via: z.enum(VIAS).nullable().optional(),
  dose: z.string().max(120, 'Máximo de 120 caracteres').nullable().optional(),
  inicio_dias: z.number().int().min(0, 'Início não pode ser negativo').max(3650).optional(),
  cuidados: z.string().max(500, 'Máximo de 500 caracteres').nullable().optional(),
});

// Documentos que o paciente assina. Vão todos num PDF só, porque o
// `createDocument` da Authentique recebe `$file: Upload!` — singular.
//
// O TCLE padrão é booleano e não id: ele não é linha em `contracts`, é
// código (`renderDefaultSystemContract`).
//
// Nenhum dos dois é obrigatório aqui. Um plano sem documento é erro de
// ENVIO, checado em `buildContractsHtml` — bloquear no schema impediria
// salvar um protocolo pela metade, que é um uso legítimo.
export const documentosPlanoSchema = {
  contract_ids: z.array(z.string().uuid()).default([]),
  incluir_tcle_padrao: z.boolean().default(false),
};

export const createProtocolSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres')
    .trim(),
  cuidados_gerais: z.string().max(2000, 'Máximo de 2000 caracteres').nullable().optional(),
  sinais_alerta: z.string().max(2000, 'Máximo de 2000 caracteres').nullable().optional(),
  items: z.array(protocolItemSchema)
    .min(1, 'Adicione pelo menos um procedimento'),
  ...documentosPlanoSchema,
});

export const updateProtocolSchema = createProtocolSchema.extend({
  id: z.string().uuid()
});

// Orçamento (Proposta) validation schemas
//
// Espelha o BodySchema do POST /api/propostas mas é validado também no
// cliente para feedback imediato. Os campos de paciente/profissional são
// preenchidos automaticamente pela seleção (modo automático) ou
// digitados (modo manual).
// Procedimento avulso. Diferente do item de protocolo, ele NÃO tem modelo
// para desviar — não existe linha em `protocol_items` correspondente — então
// a camada clínica dele é dado próprio e viaja dentro do JSONB
// `propostas.procedimentos_adicionais`, não no delta `prescricao_ajustes`.
export const orcamentoProcedureSchema = z.object({
  procedure_id: z.string().min(1),
  procedure_name: z.string().min(1, 'Informe o nome do procedimento'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  interval_days: z.number().int().min(0).default(0),
  value_cents: z.number().int().min(1, 'Informe o valor do procedimento'),
  discount_percent: z.number().int().min(0).max(100).default(0),
  via: z.enum(VIAS).nullable().optional(),
  dose: z.string().max(120, 'Máximo de 120 caracteres').nullable().optional(),
  inicio_dias: z.number().int().min(0).max(3650).optional(),
  cuidados: z.string().max(500, 'Máximo de 500 caracteres').nullable().optional(),
});

/**
 * Ajuste clínico de UM item, em `propostas.prescricao_ajustes`.
 *
 * Fica aqui, e não junto de cada tela, porque tem DOIS escritores — a
 * criação do orçamento e o editor de cronograma — e `salvarAjustes` faz
 * REPLACE do objeto inteiro. Um campo aceito só por um dos dois seria
 * apagado em silêncio pelo outro: foi exatamente o que aconteceu com `dose`,
 * que existia no tipo e na projeção mas nunca no schema de escrita.
 * Schema único = impossível divergirem.
 */
export const ajusteItemSchema = z.object({
  via: z.enum(VIAS).nullable().optional(),
  dose: z.string().max(120).nullable().optional(),
  cuidados: z.string().max(500).nullable().optional(),
  /** Desloca o item inteiro. Offset em dias a partir do D0. */
  inicio_dias: z.number().int().min(0).max(3650).nullable().optional(),
  /** índice ORIGINAL da sessão (1-based) → offset em dias a partir do D0. */
  sessoes: z.record(z.string(), z.number().int().min(0).max(3650)).optional(),
});

export const prescricaoAjustesSchema = z.record(z.string(), ajusteItemSchema);

export const createOrcamentoSchema = z.object({
  // identidade
  patient_id: z.string().min(1, 'Selecione um paciente'),
  patient_name: z.string().min(1, 'Nome do paciente é obrigatório'),
  patient_cpf: z.string().optional(),
  patient_email: z.string().optional(),
  patient_phone: z.string().optional(),
  patient_birth: z.string().optional(),
  patient_neighborhood: z.string().optional(),

  professional_id: z.string().min(1, 'Selecione um profissional'),
  professional_name: z.string().min(1, 'Nome do profissional é obrigatório'),
  professional_cpf: z.string().optional(),
  professional_email: z.string().optional(),
  professional_specialization: z.string().optional(),
  professional_crm: z.string().optional(),
  professional_sys_user: z.string().optional(),

  // protocolo + procedimentos extras
  protocol_id: z.string().uuid().nullable().optional(),
  protocol_name: z.string().nullable().optional(),
  additional_procedures: z.array(orcamentoProcedureSchema).default([]),

  // documentos que o paciente assina (um PDF, uma assinatura)
  ...documentosPlanoSchema,

  // pagamento
  discount_percent: z.number().int().min(0).max(100).default(0),
  payment_method: z
    .enum(['dinheiro', 'pix', 'transferencia', 'debito', 'credito'])
    .nullable()
    .optional(),
  custom_payment_method: z.string().nullable().optional(),
  installments: z.number().int().min(1).max(12).nullable().optional(),
  installment_value_cents: z.number().int().nullable().optional(),

  // Cronograma de aplicações (enfermagem)
  paciente_alergias: z.string().max(500).nullable().optional(),
  observacoes: z.string().max(1000).nullable().optional(),
  prescricao_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
    .nullable()
    .optional(),
  /** Camada clínica ajustada para ESTE paciente. Chave = `protocol_items.id`. */
  prescricao_ajustes: prescricaoAjustesSchema.optional(),
}).refine(
  (data) => Boolean(data.payment_method) || Boolean((data.custom_payment_method ?? '').trim()),
  {
    message: 'Selecione uma forma de pagamento padrão OU descreva uma personalizada',
    path: ['payment_method'],
  },
);

export const updateProposalStatusSchema = z.object({
  status_id: z.number().int().positive(),
  status: z.string().optional(),
});

// Credentials validation schema
export const updateCredentialsSchema = z.object({
  feegow_key: z.string().optional(),
  authentique_key: z.string().optional()
}).refine(
  (data) => data.feegow_key || data.authentique_key,
  'Pelo menos uma chave deve ser fornecida'
);

// Search and pagination schemas
export const searchSchema = z.object({
  search: z.string().optional().default(''),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(10)
});

// Types derived from schemas
export type ProtocolItem = z.infer<typeof protocolItemSchema>;
export type CreateProtocol = z.infer<typeof createProtocolSchema>;
export type UpdateProtocol = z.infer<typeof updateProtocolSchema>;
export type CreateOrcamento = z.infer<typeof createOrcamentoSchema>;
export type OrcamentoProcedure = z.infer<typeof orcamentoProcedureSchema>;
export type AjusteItemInput = z.infer<typeof ajusteItemSchema>;
export type UpdateProposalStatus = z.infer<typeof updateProposalStatusSchema>;
export type UpdateCredentials = z.infer<typeof updateCredentialsSchema>;
export type SearchParams = z.infer<typeof searchSchema>;