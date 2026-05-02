import { z } from 'zod';

// Protocol validation schemas
export const protocolItemSchema = z.object({
  procedure_id: z.string().min(1, 'Selecione um procedimento'),
  procedure_name: z.string().min(1, 'Nome do procedimento é obrigatório'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  interval_days: z.number().int().min(0, 'Intervalo não pode ser negativo'),
  value_cents: z.number().int().min(0, 'Valor não pode ser negativo'),
  discount_percent: z.number().int().min(0).max(100, 'Desconto deve estar entre 0 e 100%')
});

export const createProtocolSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(120, 'Nome deve ter no máximo 120 caracteres')
    .trim(),
  items: z.array(protocolItemSchema)
    .min(1, 'Adicione pelo menos um procedimento')
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
export const orcamentoProcedureSchema = z.object({
  procedure_id: z.string().min(1),
  procedure_name: z.string().min(1, 'Informe o nome do procedimento'),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  interval_days: z.number().int().min(0).default(0),
  value_cents: z.number().int().min(1, 'Informe o valor do procedimento'),
  discount_percent: z.number().int().min(0).max(100).default(0),
});

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

  // contrato modelo (opcional)
  contract_id: z.string().uuid().nullable().optional(),

  // pagamento
  discount_percent: z.number().int().min(0).max(100).default(0),
  payment_method: z
    .enum(['dinheiro', 'pix', 'transferencia', 'debito', 'credito'])
    .nullable()
    .optional(),
  custom_payment_method: z.string().nullable().optional(),
  installments: z.number().int().min(1).max(12).nullable().optional(),
  installment_value_cents: z.number().int().nullable().optional(),
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
export type UpdateProposalStatus = z.infer<typeof updateProposalStatusSchema>;
export type UpdateCredentials = z.infer<typeof updateCredentialsSchema>;
export type SearchParams = z.infer<typeof searchSchema>;