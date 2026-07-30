/**
 * Arquivo NEUTRO — importável de Server e Client Components.
 * NÃO adicionar `import "server-only"`.
 *
 * Vocabulário deliberado: este módulo NÃO usa a palavra "prescrição" para
 * nomear o artefato. Sob a COFEN 358/2009, "prescrição de enfermagem" é o
 * ato privativo do enfermeiro; e sem dose/diluente/velocidade o documento
 * não é prescrição de ninguém. O que projetamos é um PLANO DE EXECUÇÃO:
 * o que aplicar, por qual via, com quais cuidados, em que datas.
 *
 * As COLUNAS do banco mantêm o prefixo `prescricao_` por já estarem
 * criadas e por ser o termo que a clínica usa no dia a dia.
 */

import type { Via } from "./enums";

/** Item já normalizado, vindo do protocolo ou dos procedimentos extras. */
export type PlanoItemFonte = {
  /** `protocol_item.id` ou `extra:<índice>` para procedimentos avulsos. */
  ref: string;
  procedure_name: string;
  quantity: number;
  interval_days: number;
  via: Via | null;
  /** true quando `via` não veio do banco e sim do heurístico de nome. */
  via_inferida: boolean;
  cuidados: string | null;
};

/** Uma ocorrência agendada de um item. */
export type PlanoSessao = {
  /** 1-based. */
  n: number;
  total: number;
  offset_dias: number;
  /** yyyy-MM-dd */
  data: string;
  /** "D0" | "D+7" | … */
  rotulo: string;
  /**
   * Aplicações do MESMO item na MESMA sessão. `interval_days === 0` com
   * `quantity > 1` significa "N aplicações numa sessão só", não N sessões
   * empilhadas no D0.
   */
  repeticoes: number;
};

export type PlanoItem = PlanoItemFonte & {
  sessoes: PlanoSessao[];
};

/** Uma data do cronograma, com tudo que se aplica nela. */
export type PlanoDia = {
  /** yyyy-MM-dd */
  data: string;
  rotulo: string;
  offset_dias: number;
  itens: Array<{
    ref: string;
    procedure_name: string;
    via: Via | null;
    via_inferida: boolean;
    cuidados: string | null;
    /** "2/6" */
    sessao: string;
    repeticoes: number;
  }>;
};

export type PlanoExecucao = {
  versao: 1;
  /** ISO. EXCLUÍDO do hash canônico. */
  gerado_em: string;
  /** EXCLUÍDO do hash canônico — ver canonical.ts. */
  revisao: number;
  /** yyyy-MM-dd */
  inicio: string;

  clinica: { nome: string; cnpj: string | null };
  paciente: {
    nome: string;
    cpf: string;
    nascimento: string;
    telefone: string;
    feegow_id: string | null;
    alergias: string | null;
  };
  /**
   * Referência, NÃO signatário. O documento não é assinado como ato
   * médico — ver o rodapé em templates/default-execucao.ts.
   */
  profissional: { nome: string; crm: string; especialidade: string };
  protocolo: {
    id: string | null;
    nome: string;
    cuidados_gerais: string | null;
    sinais_alerta: string | null;
  };
  observacoes: string | null;

  itens: PlanoItem[];
  agenda: PlanoDia[];
  total_sessoes: number;
  /** yyyy-MM-dd da última aplicação. */
  ultima_data: string;
  /** `id_proposta_api` quando existir, senão o uuid da proposta. */
  proposta_ref: string;
};

/** Entrada do histórico append-only em `propostas.prescricao_revisoes`. */
export type RevisaoRegistro = {
  revisao: number;
  hash: string;
  gerado_em: string;
  gerado_por: string | null;
  feegow_em: string | null;
};

export type PlanoAviso = {
  ref: string | null;
  campo: string;
  mensagem: string;
};
