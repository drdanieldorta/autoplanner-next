/**
 * Variáveis disponíveis em templates de contrato (substituídas no PDF).
 * Mantido em paridade com o n8n + Vite legacy. Ver docs/N8N.md ficha 4.
 *
 * Arquivo neutro (sem `import "server-only"`) — pode ser usado tanto em
 * Server Components quanto em Client Components (ex: editor de contrato).
 */
export const CONTRACT_VARIABLES = [
  { key: "{{paciente_nome}}", label: "Nome do Paciente" },
  { key: "{{paciente_cpf}}", label: "CPF do Paciente" },
  { key: "{{paciente_email}}", label: "Email do Paciente" },
  { key: "{{paciente_telefone}}", label: "Telefone do Paciente" },
  { key: "{{paciente_nascimento}}", label: "Data de Nascimento (DD/MM/YYYY)" },
  { key: "{{paciente_endereco}}", label: "Endereço do Paciente (logradouro)" },
  { key: "{{paciente_numero}}", label: "Número do Endereço" },
  { key: "{{paciente_complemento}}", label: "Complemento" },
  { key: "{{paciente_bairro}}", label: "Bairro" },
  { key: "{{paciente_cidade}}", label: "Cidade" },
  { key: "{{paciente_estado}}", label: "Estado (UF)" },
  { key: "{{paciente_cep}}", label: "CEP" },
  { key: "{{profissional_nome}}", label: "Nome do Profissional" },
  { key: "{{profissional_cpf}}", label: "CPF do Profissional" },
  { key: "{{profissional_crm}}", label: "CRM do Profissional" },
  { key: "{{profissional_especialidade}}", label: "Especialidade" },
  { key: "{{procedimentos}}", label: "Tabela de Procedimentos" },
  { key: "{{subtotal}}", label: "Valor Subtotal" },
  { key: "{{desconto}}", label: "Valor do Desconto" },
  { key: "{{total}}", label: "Valor Total" },
  { key: "{{data_contrato}}", label: "Data do Contrato (extenso)" },
  { key: "{{forma_pagamento}}", label: "Forma de Pagamento" },
  { key: "{{parcelas}}", label: "Parcelas (ex: 12x de R$ 250,00)" },
  { key: "{{valor_parcela}}", label: "Valor por Parcela" },
] as const;
