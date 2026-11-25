import { hoje, maisDias, segundaDe } from "./datas";
import { MODELOS_PROVISORIOS } from "./modelos";
import { PENDENCIAS } from "./pendencias";
import type { Dados } from "./tipos";

/** Base vazia: o que existe antes de qualquer cadastro */
export function dadosVazios(): Dados {
  return {
    usuarios: [],
    corretores: [],
    leads: [],
    captacoes: [],
    anuncios: [],
    notas: [],
    contratos: [],
    cobrancas: [],
    contasInquilino: [],
    repasses: [],
    funil: [],
    chamados: [],
    multas: [],
    vendas: [],
    dossies: [],
    modelos: structuredClone(MODELOS_PROVISORIOS),
    minutas: [],
    contasPagar: [],
    lancamentos: [],
    posts: [],
    metricas: [],
    eventos: reunioesFixas(),
    rotinas: [],
    estoque: [],
    aniversarios: [],
    registros: [],
    custos: [],
    pendencias: structuredClone(PENDENCIAS),
    logs: [],
  };
}

function reunioesFixas() {
  const seg = segundaDe(hoje());
  const base = { agenda: "reunioes", local: "Escritório", semanal: true, obs: "" };
  return [
    { id: "ev_seg", titulo: "Reunião da equipe geral", data: seg, inicio: "09:00", fim: "10:00", quem: "Todos", ...base },
    { id: "ev_qui_m", titulo: "Treinamento de corretores", data: maisDias(seg, 3), inicio: "09:00", fim: "10:30", quem: "Corretores", ...base },
    { id: "ev_qui_t", titulo: "Diretores e gestores", data: maisDias(seg, 3), inicio: "17:00", fim: "18:00", quem: "Diretores e gestores", ...base },
  ];
}

const DE_EXEMPLO = /^(ani|an|cap|ce|ch|ci|cob|cor|cp|ctr|ds|es|fun|la|lead|me|mu|po|rg|vd)_|^ev_v/;

/** Tira de um navegador antigo o que veio da demonstração e mantém o que a pessoa cadastrou */
export function semExemplos(d: Partial<Dados>): Dados {
  const limpo = dadosVazios();
  for (const k of Object.keys(limpo) as (keyof Dados)[]) {
    const lista = d[k];
    if (!Array.isArray(lista) || k === "logs") continue;
    const fica = (lista as { id?: string; contratoId?: string; cobrancaId?: string }[]).filter((x) => ![x.id, x.contratoId, x.cobrancaId].some((v) => v && DE_EXEMPLO.test(v)));
    // fora as listas que já nascem preenchidas, só entra o que tem id gerado pelo painel
    const nasceCheia = k === "modelos" || k === "pendencias" || k === "eventos";
    (limpo as unknown as Record<string, unknown>)[k] = nasceCheia ? fica : fica.filter((x) => !!x.id && /^[a-z0-9]{6,10}$/.test(x.id));
  }
  return limpo;
}
