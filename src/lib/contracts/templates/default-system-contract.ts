import "server-only";

import { formatBRL, formatCPF, formatDateExtenso } from "@/lib/contracts/render";
import {
  renderBrandingHeader,
  type DocumentBranding,
} from "@/lib/branding/document";
import { resolveDocPalette } from "@/lib/branding/palette";

/**
 * Template HTML do "Contrato padrão do sistema" — TCLE de prestação
 * de serviços em saúde. Porte fiel do componente
 * `default-contract-preview-dialog.tsx` do Vite legacy, com Tailwind
 * convertido para inline styles (Puppeteer não carrega CSS externo).
 *
 * Quando o orçamento marca "contrato padrão do sistema", `build-html.ts`
 * chama esta função para produzir o FRAGMENTO que entra no PDF.
 *
 * ⚠️ Devolve fragmento (só o corpo), não documento completo — vários
 * documentos dividem um `<html>` só para o paciente assinar uma vez. O CSS
 * sai por `buildDefaultContractCss(scope)`, escopado.
 *
 * Diferente do replaceContractVariables (substituição cega de
 * `{{var}}`), aqui a lógica é code-driven — termos IM/EV/Implante são
 * incluídos condicionalmente baseados nos nomes dos procedimentos.
 */
export type DefaultContractContext = {
  paciente_nome: string;
  paciente_cpf: string;
  profissional_nome: string;
  profissional_cpf: string;
  profissional_crm: string;
  procedimentos: Array<{ procedure_name?: string; quantity?: number }>;
  subtotal_cents: number;
  total_cents: number;
  forma_pagamento: string | null;
  custom_payment_method: string | null;
  installments: number | null;
  installment_value_cents: number | null;
  /** Identidade visual da empresa. Ausente = documento neutro de sempre. */
  branding?: DocumentBranding;
};

/**
 * CSS do documento, ESCOPADO sob `scope`.
 *
 * O escopo não é preciosismo: desde que vários documentos passaram a
 * compartilhar um `<html>` só, o conteúdo do contrato do usuário — HTML
 * arbitrário, escrito no editor — divide a folha de estilo com este
 * template. Um `<table>` ou uma `.header` no texto do usuário herdaria as
 * regras daqui se elas fossem globais.
 *
 * `${scope}` recebe o que antes estava em `body` (fonte, cor, padding),
 * porque agora o documento é uma `<div>` dentro do shell. O offset final é
 * idêntico: o `body` continua com a margem default do navegador e a página
 * continua com as margens de `generatePdfFromHtml`.
 *
 * Sem identidade configurada, cada elemento mantém exatamente a cor que
 * tinha antes desta feature — empresa que não cadastrou marca continua
 * gerando o contrato idêntico ao de antes.
 */
export function buildDefaultContractCss(
  scope: string,
  branding?: DocumentBranding,
): string {
  const palette = branding?.palette ?? resolveDocPalette(null, null);
  const branded = branding?.hasBranding ?? false;
  const headerBorder = branded ? palette.primary : "#111";
  const sectionBg = branded ? palette.secondary : "#e5e7eb";
  const sectionFg = branded ? palette.onSecondary : "#111";
  const tableHeadBorder = branded ? palette.primary : "#9ca3af";

  return `
  ${scope} { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.55; color: #111; padding: 20mm 15mm; }
  ${scope} h1.header { text-align: center; font-size: 13px; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; margin: 0; }
  ${scope} .header-wrap { text-align: center; border-bottom: 2px solid ${headerBorder}; padding-bottom: 10px; margin-bottom: 16px; }
  ${scope} .header-meta { margin-top: 6px; font-size: 10px; color: #666; }
  ${scope} p.intro { font-size: 11px; line-height: 1.55; margin-bottom: 14px; text-align: justify; }
  ${scope} .section-title { background: ${sectionBg}; color: ${sectionFg}; padding: 6px 12px; text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
  ${scope} table.proc { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
  ${scope} table.proc th { text-align: left; padding: 6px 0; border-bottom: 2px solid ${tableHeadBorder}; font-weight: bold; }
  ${scope} table.proc th.qty { text-align: right; width: 100px; }
  ${scope} table.proc td { padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
  ${scope} table.proc td.qty { text-align: right; }
  ${scope} .values { font-size: 11px; margin-bottom: 16px; }
  ${scope} .values .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  ${scope} .values .row.total { font-weight: bold; padding-top: 8px; border-top: 1px solid #d1d5db; margin-top: 8px; }
  ${scope} .pay-list { font-size: 11px; margin-left: 16px; }
  ${scope} .pay-list .opt { margin-bottom: 4px; }
  ${scope} .pay-list .opt .mark { font-family: monospace; margin-right: 8px; }
  ${scope} .pay-list .credit-detail { margin-left: 32px; margin-top: 4px; }
  ${scope} .pay-custom { font-size: 11px; padding: 12px; background: #fafafa; border: 1px solid #d1d5db; border-radius: 4px; margin-left: 16px; }
  ${scope} .terms { font-size: 10.5px; margin-bottom: 16px; }
  ${scope} .terms p { line-height: 1.55; margin: 0 0 6px 0; text-align: justify; }
  ${scope} .terms .header { font-weight: bold; text-transform: uppercase; margin-bottom: 10px; font-size: 11px; }
  ${scope} hr.dashed { border: 0; border-top: 1px dashed #d1d5db; margin: 14px 0; }
  ${scope} .additional-term { margin-top: 24px; page-break-before: always; }
  ${scope} .additional-term h2 { text-align: center; font-size: 12px; font-weight: bold; letter-spacing: 0.04em; border-top: 2px solid #9ca3af; padding-top: 18px; margin-bottom: 14px; }
  ${scope} .additional-term .sub { font-weight: bold; font-size: 11px; margin: 0 0 6px 0; }
  ${scope} .additional-term p { font-size: 10.5px; line-height: 1.55; text-align: justify; margin: 0 0 4px 0; }
  ${scope} .anexo { margin-top: 24px; page-break-before: always; }
  ${scope} .anexo h2 { text-align: center; font-size: 12px; font-weight: bold; border-top: 2px solid #9ca3af; padding-top: 18px; margin-bottom: 14px; }
  ${scope} .anexo .body { font-size: 10.5px; line-height: 1.55; text-align: justify; white-space: pre-line; }
  ${scope} .signature { margin-top: 24px; font-size: 11px; }
  ${scope} .signature .line { border-bottom: 1px solid #111; width: 80%; margin: 60px auto 8px auto; }
  ${scope} .signature .name { font-weight: bold; text-align: center; font-size: 11px; }
  ${scope} .signature .meta { text-align: center; font-size: 10px; }
  ${scope} .signature .role { text-align: center; font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }
`;
}

const TERMOS = [
  "1. As datas de realização dos tratamentos serão definidas e informadas ao paciente por meio de comunicação enviada ao telefone informado pelo contratado previamente no momento do agendamento da consulta.",
  "2. Serão aceitas as remarcações de, no máximo, 02 (duas) sessões de injetáveis, sendo que, entre uma sessão e a seguinte, deverá haver intervalo mínimo de 07 (sete) dias e máximo de 45 (quarenta e cinco dias), para que não haja prejuízo ao tratamento, sendo que o tratamento deverá ser completamente realizado até a data de indicada na tabela indicada anteriormente, sob pena de necessidade de formalização de aditivo para nova composição de honorários.",
  "3. Em caso de qualquer atraso no pagamento do valor convencionado nesta cláusula, incidirá (i) multa moratória de 2% (dois por cento) sobre o valor devido; (ii) juros de 1% (um por cento) ao mês, e (iii) atualização monetária calculada com base na variação do IPCA-e até a data do efetivo pagamento da parcela devida.",
  "4. Este contrato poderá ser rescindido a qualquer tempo, por qualquer das partes. Neste caso, serão cobrados os valores relativos aos trabalhos efetivamente realizados, mesmo que não totalmente concluído o plano terapêutico, bem como multa de 15% sobre os serviços faltantes, e a restituição do valor correspondente será feita nos termos dos itens seguintes.",
  "5. A substituição de procedimentos e consultas integrantes do procedimento contratado somente poderá ser feita por orientação médica, em caso de necessidade devidamente identificada. Caso o PACIENTE opte por não realizar algum procedimento ou consulta, a restituição do valor correspondente será feita nos termos do item 4.2 e seguintes, desde que o setor responsável seja comunicado com a antecedência de ao menos 15 (quinze) dias.",
  "6. O montante a ser restituído ao paciente será calculado com base no valor de cada serviço avulso que integra o Plano contratado, conforme consta na tabela inicial, e não com base no valor com eventual desconto pago pela contratação do plano de acompanhamento.",
  "7. Será descontado do valor a ser restituído os procedimentos efetivamente realizados e, ainda, multa de 15% sobre o valor dos procedimentos faltantes (item 4, caput) ou em relação aos quais foi pedida a exclusão (item 4.1) e, havendo saldo remanescente, este será reembolsado em até 15 (quinze) dias, contados da assinatura do Termo de Rescisão (Distrato), podendo ser dividido em até 03 (três) parcelas, sem encargos, caso o valor total ultrapasse R$ 10.000,00 (dez mil reais).",
  "8. Caso os valores já pagos pelo paciente não sejam suficientes para arcar com a multa penal e/ou com os serviços realizados, será solicitada a complementação do saldo devedor ao paciente, que deverá ser quitado em até 15 (quinze) dias da solicitação de pagamento, podendo ser dividido em até 03 (três) parcelas, sem encargos, caso o valor total ultrapasse R$ 10.000,00 (dez mil reais), sob pena de inclusão do saldo devedor nos órgãos de proteção ao crédito.",
  "9. Será caracterizado o abandono do tratamento quando o paciente faltar a três agendamentos consecutivos e será considerada rescisão por iniciativa do paciente e ensejará a cobrança da íntegra dos honorários contratados, considerando a aquisição, na data de aprovação da ordem de serviço, dos medicamentos destinados ao paciente.",
  "10. O abandono do tratamento poderá acarretar prejuízos à saúde, inclusive com agravamento do estado inicial, não sendo necessário nova chamada do paciente para que o abandono fique caracterizado.",
  "11. Todo procedimento realizado no corpo humano depende da resposta orgânica, única, individual e própria do corpo humano submetido ao procedimento. As reações e consequentemente o resultado de qualquer procedimento realizado no corpo humano dependem exclusivamente das peculiaridades do organismo do paciente e, portanto, não podem ser previstos ou prometidos resultados. O resultado obtido por um paciente anteriormente não necessariamente será replicado em outro paciente ou até mesmo no próprio paciente em uma segunda oportunidade.",
  "12. A assinatura desse contrato de prestação de serviço pelo paciente indica o aceite com as condições informadas.",
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function termoIM(profissionalNome: string): string {
  const nome = escapeHtml(profissionalNome || "[Nome do Profissional]");
  return `
  <div class="additional-term">
    <h2>TERMO DE CONSENTIMENTO PARA PROCEDIMENTO MINIMAMENTE INVASIVO DE INJEÇÃO INTRAMUSCULAR</h2>
    <p class="sub">1. Entendendo a Injeção Intramuscular e seus possíveis benefícios</p>
    <p>1.1. Confirmo que compreendi que a injeção intramuscular é uma técnica de administração de medicamentos segura e eficaz, que permite que as substâncias sejam absorvidas mais rapidamente na corrente sanguínea. Todas as substâncias utilizadas me foram informadas e estarão devidamente registradas no meu prontuário médico, o qual posso solicitar cópia integral.</p>
    <p>1.2. Reconheço que cada pessoa é única e que o procedimento será adaptado às minhas necessidades, com base nas informações que forneci ao ${nome}, nos meus exames clínicos e no meu estado de saúde atual.</p>
    <p class="sub">2. Procedimento Seguro e Contínuo Acompanhamento</p>
    <p>2.1. Entendo que, durante todo o procedimento, estarei sob cuidado médico constante, em um ambiente confortável e seguro. Como em qualquer procedimento médico, podem ocorrer pequenos desconfortos, como hematoma, inflamação no local da punção, infecção local ou alergias. Tais casos são raros e a equipe do ${nome} estará sempre à disposição para lidar com qualquer intercorrência.</p>
    <p class="sub">3. Equipe comprometida com a transparência</p>
    <p>3.1. Fui informado(a) que, em razão da aceleração do metabolismo promovida pelo soro, fundamental para a efetividade da terapêutica proposta, podem ocorrer efeitos colaterais temporários, como sensação de calor, aumento do suor corporal (sudorese) ou alteração no sono. Tenho ciência de que todas as substâncias utilizadas no soro me foram informadas e estarão devidamente registradas no meu prontuário médico, o qual posso solicitar cópia integral.</p>
    <p class="sub">4. Minha segurança em primeiro lugar</p>
    <p>4.1. Fui devidamente informada de que minha segurança é fundamentalmente priorizada pelo ${nome} e sua equipe, que estão autorizados a participar do procedimento. Caso seja necessária qualquer intervenção médica além da prevista, será solicitada autorização adicional.</p>
    <p class="sub">5. Diálogo aberto e consentimento</p>
    <p>5.1. O ${nome} me assegurou que estarei sob seus cuidados durante todo o procedimento e que ele se certificará de que eu me sinta confortável e seguro(a).</p>
    <p>5.2. Tive a oportunidade de esclarecer todas as minhas dúvidas, conhecer as alternativas de tratamento, questionar termos que não compreendi e expressar minhas preocupações. Sinto-me seguro(a) com as explicações recebidas e concordo em prosseguir, estando ciente de que qualquer tratamento envolve riscos e benefícios e não pode ser garantido resultados específicos.</p>
    <p>5.3. Declaro que li e compreendi todas as informações presentes neste Termo de Consentimento, inclusive as informações adicionais sobre a importância do consentimento informado na relação médico-paciente.</p>
    <p class="sub">6. (exclusivo para mulheres)</p>
    <p>Declaro, consciente do direito de adentrar na sala de procedimento com acompanhante, que opto, de forma livre e consciente, por fazê-lo sem acompanhamento, sem prejuízo de, a qualquer tempo, solicitar sua presença.</p>
    <p>Confirmo marcando um X em "sim" ou "não":</p>
    <p>(x) sim</p>
    <p>( ) não</p>
  </div>`;
}

function termoEV(profissionalNome: string): string {
  const nome = escapeHtml(profissionalNome || "[Nome do Profissional]");
  return `
  <div class="additional-term">
    <h2>TERMO DE CONSENTIMENTO ESCLARECIDO PARA PROCEDIMENTO MINIMAMENTE INVASIVO DE INFUSÃO VENOSA</h2>
    <p class="sub">Entendendo a Infusão Venosa e seus possíveis benefícios</p>
    <p>Sobre o procedimento realizado, bem como sobre os eventuais riscos e benefícios desta e de outras terapêuticas alternativas para o meu caso concreto: Entendendo a Infusão Venosa e seus possíveis benefícios, confirmo que compreendi que a infusão venosa será aplicada com base nas informações que forneci ao ${nome}, nos meus exames clínicos e no meu estado de saúde atual. Reconheço que cada pessoa é única e que o procedimento será adaptado às minhas necessidades.</p>
    <p>A infusão venosa, popularmente conhecida como soro, é uma técnica segura e eficaz que pode trazer diversos benefícios para a saúde e bem-estar, como:</p>
    <p>• Auxiliar no processo de emagrecimento, ajudando a alcançar o corpo desejado;</p>
    <p>• Combater a perda de massa magra, contribuindo para um corpo mais forte e definido;</p>
    <p>• Auxiliar no combate ao estresse oxidativo, promovendo o rejuvenescimento de dentro para fora;</p>
    <p>• Reposição de vitaminas e nutrientes, proporcionando mais energia e disposição para o dia a dia.</p>
    <p class="sub">Procedimento Seguro e Contínuo Acompanhamento</p>
    <p>Entendo que, durante todo o procedimento, estarei sob cuidado médico constante, em um ambiente confortável e seguro. Como em qualquer procedimento médico, podem ocorrer pequenos desconfortos, como hematoma, inflamação no local da punção, infecção local ou alergias. Tais casos são raros e a equipe do ${nome} estará sempre à disposição para lidar com qualquer intercorrência.</p>
    <p class="sub">Equipe comprometida com a transparência</p>
    <p>Fui informado(a) que, em razão da aceleração do metabolismo promovida pelo soro, fundamental para a efetividade da terapêutica proposta, podem ocorrer efeitos colaterais temporários, como sensação de calor, aumento do suor corporal (sudorese) ou alteração no sono. Tenho ciência de que todas as substâncias utilizadas no soro me foram informadas e estarão devidamente registradas no meu prontuário médico, o qual posso solicitar cópia integral.</p>
    <p class="sub">Minha segurança em primeiro lugar</p>
    <p>Fui devidamente informada de que minha segurança é fundamentalmente priorizada pelo(a) ${nome} e sua equipe, que estão autorizados a participar do procedimento. Caso seja necessária qualquer intervenção médica além da prevista, será solicitada autorização adicional.</p>
    <p class="sub">Diálogo aberto e consentimento</p>
    <p>O ${nome} me assegurou que estarei sob seus cuidados durante todo o procedimento e que ele se certificará de que eu me sinta confortável e seguro(a). Tive a oportunidade de esclarecer todas as minhas dúvidas, conhecer as alternativas de tratamento, questionar termos que não compreendi e expressar minhas preocupações. Sinto-me seguro(a) com as explicações recebidas e concordo em prosseguir, estando ciente de que qualquer tratamento envolve riscos e benefícios e não pode ser garantido resultados específicos. Declaro que li e compreendi todas as informações presentes neste Termo de Consentimento, inclusive as informações adicionais sobre a importância do consentimento informado na relação médico-paciente.</p>
    <p>(exclusivo para mulheres) Declaro, consciente do direito de adentrar na sala de procedimento com acompanhante, que opto, de forma livre e consciente, por fazê-lo sem acompanhamento, sem prejuízo de, a qualquer tempo, solicitar sua presença.</p>
    <p>Confirmo marcando um X em "sim" ou "não":</p>
    <p>(x) sim</p>
    <p>( ) não</p>
  </div>`;
}

function termoImplante(profissionalNome: string): string {
  const nome = escapeHtml(profissionalNome || "[Nome do Profissional]");
  return `
  <div class="additional-term">
    <h2>TERMO DE CONSENTIMENTO ESCLARECIDO PARA PROCEDIMENTO MINIMAMENTE INVASIVO DE IMPLANTE HORMONAL</h2>
    <p class="sub">Sobre o procedimento</p>
    <p>Fui informado pelo(a) médico(a) acima identificado de que os procedimentos que serão realizados são de responsabilidade das informações declaradas por mim, exames clínicos, e de meu estado de saúde, e que fui submetido(a) a uma extensa bateria de exames.</p>
    <p>Declaro que compreendi todos os efeitos fisiológicos do tratamento empreendido, que pode estimular a produção de dopamina e norepinefrina em algumas regiões do cérebro, com efeitos positivos na força muscular, movimento, coordenação, funções cognitivas, humor, atenção, vida sexual, aumento da secreção hormonal e auxiliar no tratamento da obesidade, e que todas as substâncias utilizadas encontram-se prescritas em meu prontuário médico, o qual tenho direito de obter cópia integral no momento em que quiser.</p>
    <p>Declaro que fui informado de que o tratamento possui validade média de 04 a 06 meses e que, após esse período de uso, deverei substituí-lo por outro implante se desejar continuá-lo, bem como de que o tratamento não produz efeitos imediatos e leva-se algum tempo até que o organismo atinja o equilíbrio fisiológico desejado.</p>
    <p>Declaro ter ciência de que, por ser necessária uma pequena incisão (corte), o procedimento requer anestesia local (lidocaína) e poderão ocorrer situações imprevisíveis ou fortuitas, embora raras, como hematoma, sangramentos, edemas, inflamação e/ou dor no local da inserção, infecção local ou alergias e que a infecção do ferimento operatório e extrusão dos implantes pode ocorrer se não forem seguidos os cuidados pós-inserção, que me foram detalhadamente explicados.</p>
    <p>Autorizo o ${nome} bem como seus assistentes e/ou outros profissionais por ele(a) selecionados, a intervir no procedimento contido neste Termo de Consentimento, bem como compreendo que, caso haja necessidade de outras intervenções médicas decorrentes de situações imprevistas que possam ocorrer e necessitem de cuidados diferentes daqueles inicialmente propostos, uma autorização adicional deve ser solicitada a mim.</p>
    <p>Confirmo que recebi explicações sobre o procedimento e sobre as alternativas de tratamento, e entendo que em medicina todos os tratamentos envolvem riscos e benefícios, bem como não há garantia de resultados específicos, e declaro que li este Termo por completo, compreendendo e concordando com tudo que me foi esclarecido, me foi concedida a oportunidade de modificar qualquer trecho, de anular qualquer parágrafo, e questionar termos ou palavras que não tenha compreendido ou com as quais não concordasse e tive a oportunidade de fazer perguntas que me foram respondidas satisfatoriamente. Assim, tendo conhecimento, autorizo a realização do procedimento proposto.</p>
    <p>(exclusivo para mulheres) Declaro, consciente do direito de adentrar na sala de procedimento com acompanhante, que opto, de forma livre e consciente, por fazê-lo sem acompanhamento, sem prejuízo de, a qualquer tempo, solicitar sua presença.</p>
    <p>Confirmo marcando um X em "sim" ou "não":</p>
    <p>(x) sim</p>
    <p>( ) não</p>
    <p>1. Declaro, ainda, que li o anexo abaixo deste Termo de Consentimento Livre e Esclarecido com as informações sobre a importância do consentimento informado na relação paciente-médico.</p>
  </div>`;
}

const ANEXO_HTML = `
<div class="anexo">
  <h2>ANEXO - INFORMAÇÕES COMPLEMENTARES SOBRE O CONSENTIMENTO INFORMADO</h2>
  <div class="body">Prezado(a) paciente,

O consentimento informado livre e esclarecido consiste no ato de decisão, concordância e aprovação do paciente ou de seu representante, após a necessária informação e explicações, sob a responsabilidade do médico assistente, a respeito das condutas e procedimentos terapêuticos ou diagnóstico que lhes são especificamente indicados.

As informações e os esclarecimentos dados por mim têm de ser substancialmente adequados, ou seja, em quantidade e qualidade suficientes para você, o(a) paciente, protagonista do seu tratamento, possa tomar sua decisão, ciente do que ocorre e das consequências que dela possam decorrer.

Você pode retirar seu consentimento a qualquer tempo, sem que daí lhe resulte qualquer desvantagem ou prejuízo, exceto se a retirada do consentimento, quando já iniciado o procedimento médico, implicar possibilidade de dano, risco ou qualquer tipo de prejuízo a você.

O consentimento informado é processual, não um ato isolado resumido ao "Termo de Consentimento". E, como processo, incorpora sua participação ativa nas tomadas de decisões, o que é essencial na relação paciente-médico.

O consentimento é mais do que um acordo, é um processo contínuo que envolve trocas mútuas de informações e um diálogo que permite, igualmente, explorar emoções, crenças e sentimentos, além de dados técnicos.

Portanto, caso algo não tenha ficado claro sobre o tratamento, pergunte a mim ou à minha equipe!

Este termo de consentimento livre e esclarecido deve ser lido com calma e, se quiser, discuta com seu cônjuge, companheiro(a), parceiro(a), familiares e amigos, fazendo anotações sobre suas dúvidas, receios ou incertezas, voltando a conversar comigo a fim de ser suficientemente informado(a) e esclarecido(a).</div>
</div>`;

export function renderDefaultSystemContract(ctx: DefaultContractContext): string {
  const dataExtenso = formatDateExtenso();
  const pacienteNome = escapeHtml(ctx.paciente_nome || "[Nome do Paciente]");
  const pacienteCpf = ctx.paciente_cpf
    ? formatCPF(ctx.paciente_cpf)
    : "[CPF não informado]";
  const profissionalNome = escapeHtml(
    ctx.profissional_nome || "[Nome do Profissional]",
  );
  const profissionalCpf = ctx.profissional_cpf
    ? formatCPF(ctx.profissional_cpf)
    : null;
  const profissionalCrm = ctx.profissional_crm || null;
  const profissionalIdentifier = profissionalCrm
    ? `inscrito no CRM ${escapeHtml(profissionalCrm)}`
    : profissionalCpf
      ? `CPF ${profissionalCpf}`
      : null;

  // Tabela de procedimentos
  const procRows = ctx.procedimentos.length
    ? ctx.procedimentos
        .map(
          (p) =>
            `<tr><td>${escapeHtml(p.procedure_name ?? "Procedimento")}</td><td class="qty">${p.quantity ?? 1}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="2" style="text-align:center;color:#9ca3af;font-style:italic;padding:8px 0;">Nenhum procedimento adicionado</td></tr>`;

  // Detecção de termos adicionais
  const procDescUpper = ctx.procedimentos
    .map((p) => (p.procedure_name ?? "").toUpperCase())
    .join(" ");
  const temIM = /\bIM\b/.test(procDescUpper);
  const temEV = /\bEV\b/.test(procDescUpper);
  const temImplante = /IMPLANTE/i.test(procDescUpper);

  // Valores
  const subtotal = ctx.subtotal_cents;
  const total = ctx.total_cents;
  const desconto = Math.max(0, subtotal - total);

  // Forma de pagamento
  let payHtml: string;
  if (ctx.custom_payment_method && ctx.custom_payment_method.trim()) {
    payHtml = `
    <div class="pay-custom">
      <p style="font-weight:bold;margin:0 0 4px 0;">Personalizada:</p>
      <p style="white-space:pre-wrap;margin:0;">${escapeHtml(ctx.custom_payment_method)}</p>
      <p style="margin-top:8px;font-weight:bold;">Valor Total: ${formatBRL(total)}</p>
    </div>`;
  } else {
    const fp = ctx.forma_pagamento ?? "";
    const mark = (key: string) => (fp === key ? "(X)" : "( )");
    payHtml = `
    <div class="pay-list">
      <div class="opt"><span class="mark">${mark("dinheiro")}</span>Dinheiro: ${formatBRL(total)}</div>
      <div class="opt"><span class="mark">${mark("pix")}</span>Pix: ${formatBRL(total)}</div>
      <div class="opt"><span class="mark">${mark("transferencia")}</span>Transferência Bancária: ${formatBRL(total)}</div>
      <div class="opt"><span class="mark">${mark("debito")}</span>Cartão de Débito: ${formatBRL(total)}</div>
      <div class="opt"><span class="mark">${mark("credito")}</span>Cartão de Crédito:</div>
      ${
        fp === "credito"
          ? `<div class="credit-detail">- Quantidade de parcelas: ${ctx.installments ?? "_____"}</div>
             <div class="credit-detail">- Valor das parcelas: ${ctx.installment_value_cents ? formatBRL(ctx.installment_value_cents) : "_____"}</div>`
          : ""
      }
    </div>`;
  }

  const termsHtml = TERMOS.map((t) => `<p>${escapeHtml(t)}</p>`).join("");

  const additionalTerms = `${temIM ? termoIM(ctx.profissional_nome) : ""}${temEV ? termoEV(ctx.profissional_nome) : ""}${temImplante ? termoImplante(ctx.profissional_nome) : ""}`;
  const showAnexo = temIM || temEV || temImplante;

  return `
  ${ctx.branding ? renderBrandingHeader(ctx.branding) : ""}
  <div class="header-wrap">
    <h1 class="header">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EM SAÚDE</h1>
    <div class="header-meta">Emitido em ${dataExtenso}<br/>São Paulo/SP</div>
  </div>

  <p class="intro">
    Por este instrumento particular, eu, <strong>${pacienteNome}</strong>,
    CPF <strong>${pacienteCpf}</strong>,
    declaro, para todos os fins legais, que fui devidamente informado(a), de forma livre e esclarecida, pelo
    <strong>${profissionalNome}</strong>${profissionalIdentifier ? `, ${profissionalIdentifier}` : ""},
    do plano de tratamento personalizado, descrito abaixo:
  </p>

  <div class="section-title">ENTREGAS E QUANTIDADES</div>
  <table class="proc">
    <thead>
      <tr><th>Procedimento</th><th class="qty">Quantidade</th></tr>
    </thead>
    <tbody>${procRows}</tbody>
  </table>

  <div class="section-title">VALORES</div>
  <div class="values">
    <div class="row"><span>Subtotal:</span><span>${formatBRL(subtotal)}</span></div>
    <div class="row"><span>Desconto:</span><span>${formatBRL(desconto)}</span></div>
    <div class="row total"><span>Total da Fatura:</span><span>${formatBRL(total)}</span></div>
  </div>

  <p style="font-size:11px;font-weight:600;margin:0 0 8px 0;">Forma de pagamento:</p>
  ${payHtml}

  <hr class="dashed"/>

  <div class="terms">
    <p class="header">O PACIENTE DECLARA ESTAR CIENTE DOS TERMOS ABAIXO:</p>
    ${termsHtml}
  </div>

  ${additionalTerms}
  ${showAnexo ? ANEXO_HTML : ""}

  <div class="signature">
    <p>São Paulo, ${dataExtenso}.</p>
    <div class="line"></div>
    <p class="name">${pacienteNome}</p>
    <p class="meta">CPF: ${pacienteCpf}</p>
    <p class="role">Contratante</p>
  </div>`;
}
