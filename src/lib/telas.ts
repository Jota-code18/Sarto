import type { Perfil } from "./tipos";

type Item = { href: string; nome: string; perfis?: Perfil[] };
const TODOS_GESTORES: Perfil[] = ["socios", "comercial", "locacao", "marketing", "juridico"];
export const MENU: { grupo: string; itens: Item[] }[] = [
  {
    grupo: "",
    itens: [
      { href: "/", nome: "Início" },
      { href: "/aprovacoes", nome: "Aprovações", perfis: TODOS_GESTORES },
      { href: "/agenda", nome: "Agenda" },
    ],
  },
  {
    grupo: "Comercial",
    itens: [
      { href: "/leads", nome: "Leads", perfis: ["socios", "comercial", "corretor", "marketing"] },
      { href: "/captacao", nome: "Captação", perfis: ["socios", "comercial", "corretor", "locacao"] },
      { href: "/carteira", nome: "Carteira e nota dos anúncios", perfis: ["socios", "comercial", "corretor", "marketing"] },
      { href: "/varredura", nome: "Varredura dos portais", perfis: ["socios", "comercial"] },
      { href: "/corretores", nome: "Corretores", perfis: ["socios", "comercial", "marketing"] },
    ],
  },
  {
    grupo: "Locação",
    itens: [
      { href: "/locacao", nome: "Contratos", perfis: ["socios", "locacao"] },
      { href: "/locacao/cobrancas", nome: "Cobranças e repasses", perfis: ["socios", "locacao"] },
      { href: "/locacao/funil", nome: "Funil de locação", perfis: ["socios", "locacao", "comercial"] },
      { href: "/locacao/atendimento", nome: "Chamados e multas", perfis: ["socios", "locacao"] },
      { href: "/locacao/obrigacoes", nome: "Informe e DIMOB", perfis: ["socios", "locacao"] },
    ],
  },
  {
    grupo: "Jurídico",
    itens: [
      { href: "/pos-venda", nome: "Pós-venda", perfis: ["socios", "comercial", "juridico", "locacao", "corretor"] },
      { href: "/certidoes", nome: "Certidões", perfis: ["socios", "comercial", "juridico", "locacao"] },
      { href: "/minutas", nome: "Minutas e modelos", perfis: ["socios", "comercial", "juridico", "locacao"] },
      { href: "/consulta", nome: "Consulta de publicações", perfis: ["socios", "juridico", "locacao", "comercial"] },
    ],
  },
  {
    grupo: "Gestão",
    itens: [
      { href: "/financeiro", nome: "Financeiro", perfis: ["socios", "locacao"] },
      { href: "/marketing", nome: "Marketing", perfis: ["socios", "marketing", "comercial"] },
      { href: "/rotina", nome: "Rotina do escritório" },
      { href: "/registro", nome: "Registro de atividades" },
      { href: "/custos", nome: "Custos e integrações", perfis: ["socios"] },
      { href: "/pendencias", nome: "O que falta da Sarto", perfis: TODOS_GESTORES },
      { href: "/usuarios", nome: "Usuários", perfis: ["socios"] },
      { href: "/config", nome: "Configurações", perfis: TODOS_GESTORES },
    ],
  },
];

/** A tela mais específica do endereço decide quem pode ver; sem regra, todos veem */
export function podeVer(perfil: Perfil, caminho: string) {
  const tela = MENU.flatMap((g) => g.itens)
    .filter((i) => i.href === caminho || (i.href !== "/" && caminho.startsWith(`${i.href}/`)))
    .sort((x, y) => y.href.length - x.href.length)[0];
  return !tela?.perfis || tela.perfis.includes(perfil);
}
