import type { Modelo } from "./tipos";

/**
 * Modelos provisórios, só para o fluxo funcionar até a Gabi enviar os dela.
 * Nascem sem validação: enquanto a Gabi não validar, toda minuta sai marcada
 * como rascunho e não pode ser liberada.
 */
export const MODELOS_PROVISORIOS: Modelo[] = [
  {
    id: "mod_cv_avista",
    nome: "Compra e venda à vista",
    grupo: "Venda",
    corpo: `INSTRUMENTO PARTICULAR DE PROMESSA DE COMPRA E VENDA DE IMÓVEL

PROMITENTE VENDEDOR: {{vendedor_nome}}, {{vendedor_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_doc}}.

PROMITENTE COMPRADOR: {{comprador_nome}}, {{comprador_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{comprador_doc}}.

INTERMEDIADORA: SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221.

CLÁUSULA 1ª. OBJETO
O vendedor promete vender ao comprador o imóvel a seguir: {{imovel_descricao}}, matrícula nº {{imovel_matricula}}, do {{imovel_cartorio}}, livre e desembaraçado de ônus, ressalvado o que constar das certidões anexas.

CLÁUSULA 2ª. PREÇO E PAGAMENTO
O preço certo e ajustado é de {{preco}} ({{preco_extenso}}), a ser pago da seguinte forma:
a) {{sinal}} ({{sinal_extenso}}), como sinal e princípio de pagamento, na assinatura deste instrumento;
b) {{saldo}} ({{saldo_extenso}}), na lavratura da escritura pública.

CLÁUSULA 3ª. POSSE
A posse será transmitida ao comprador após a quitação integral do preço.

CLÁUSULA 4ª. CERTIDÕES
As certidões do vendedor e do imóvel integram este instrumento. Eventual apontamento posterior deve ser sanado pelo vendedor antes da escritura.

CLÁUSULA 5ª. DESPESAS
ITBI, escritura e registro correm por conta do comprador. Tributos e encargos do imóvel anteriores à posse correm por conta do vendedor.

CLÁUSULA 6ª. COMISSÃO
Pela intermediação, é devida à Sarto Imóveis a comissão de {{comissao_pct}}% sobre o preço, no valor de {{comissao}}.

CLÁUSULA 7ª. CONDIÇÕES ESPECIAIS
{{condicoes}}

CLÁUSULA 8ª. FORO
Fica eleito o foro da comarca de Anápolis/GO.

Anápolis/GO, {{data_extenso}}.

_______________________________
{{vendedor_nome}}

_______________________________
{{comprador_nome}}

_______________________________
SARTO IMÓVEIS LTDA`,
  },
  {
    id: "mod_cv_financiado",
    nome: "Compra e venda com financiamento",
    grupo: "Venda",
    corpo: `INSTRUMENTO PARTICULAR DE PROMESSA DE COMPRA E VENDA COM FINANCIAMENTO BANCÁRIO

PROMITENTE VENDEDOR: {{vendedor_nome}}, {{vendedor_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_doc}}.

PROMITENTE COMPRADOR: {{comprador_nome}}, {{comprador_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{comprador_doc}}.

INTERMEDIADORA: SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221.

CLÁUSULA 1ª. OBJETO
O vendedor promete vender ao comprador o imóvel a seguir: {{imovel_descricao}}, matrícula nº {{imovel_matricula}}, do {{imovel_cartorio}}.

CLÁUSULA 2ª. PREÇO E PAGAMENTO
O preço certo e ajustado é de {{preco}} ({{preco_extenso}}), assim pago:
a) {{sinal}} ({{sinal_extenso}}), como sinal, na assinatura;
b) {{financiado}}, por financiamento a ser obtido pelo comprador junto ao {{banco}};
c) {{saldo}} ({{saldo_extenso}}), com recursos próprios, na assinatura do contrato do banco.

CLÁUSULA 3ª. FINANCIAMENTO
O comprador deve apresentar a documentação exigida pelo banco. A não aprovação do crédito, sem culpa das partes, resolve este instrumento com devolução do sinal, salvo ajuste diferente nas condições especiais.

CLÁUSULA 4ª. POSSE
A posse será transmitida após a liberação do valor financiado ao vendedor.

CLÁUSULA 5ª. CERTIDÕES
As certidões do vendedor e do imóvel integram este instrumento.

CLÁUSULA 6ª. COMISSÃO
Pela intermediação, é devida à Sarto Imóveis a comissão de {{comissao_pct}}% sobre o preço, no valor de {{comissao}}.

CLÁUSULA 7ª. CONDIÇÕES ESPECIAIS
{{condicoes}}

CLÁUSULA 8ª. FORO
Fica eleito o foro da comarca de Anápolis/GO.

Anápolis/GO, {{data_extenso}}.

_______________________________
{{vendedor_nome}}

_______________________________
{{comprador_nome}}

_______________________________
SARTO IMÓVEIS LTDA`,
  },
  {
    id: "mod_locacao",
    nome: "Locação residencial",
    grupo: "Locação",
    corpo: `CONTRATO DE LOCAÇÃO DE IMÓVEL

LOCADOR: {{locador_nome}}, {{locador_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{locador_doc}}.

LOCATÁRIO: {{locatario_nome}}, {{locatario_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{locatario_doc}}.

ADMINISTRADORA: SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221.

CLÁUSULA 1ª. OBJETO
Locação do imóvel situado em {{imovel_endereco}}.

CLÁUSULA 2ª. PRAZO
{{prazo_meses}} meses, de {{inicio}} a {{fim}}.

CLÁUSULA 3ª. ALUGUEL E VENCIMENTO
Aluguel mensal de {{aluguel}} ({{aluguel_extenso}}), com vencimento todo dia {{dia_vencimento}}.

CLÁUSULA 4ª. REAJUSTE
Reajuste a cada 12 meses pela variação acumulada do {{indice}}.

CLÁUSULA 5ª. ATRASO
Multa de {{multa_pct}}% e juros de {{juros_mes}}% ao mês sobre o valor em atraso.

CLÁUSULA 6ª. ENCARGOS
IPTU, condomínio, água e energia correm por conta do locatário, que autoriza e se obriga a transferir água (Saneago) e energia (Equatorial) para o seu nome em até 30 dias, sob pena da multa prevista neste contrato.

CLÁUSULA 7ª. GARANTIA
{{garantia}}.

CLÁUSULA 8ª. SEGURO
O seguro contra incêndio é obrigatório durante toda a locação.

CLÁUSULA 9ª. VISTORIA
O laudo de vistoria de entrada integra este contrato.

CLÁUSULA 10ª. CONDIÇÕES ESPECIAIS
{{condicoes}}

CLÁUSULA 11ª. FORO
Fica eleito o foro da comarca de Anápolis/GO.

Anápolis/GO, {{data_extenso}}.

_______________________________
{{locador_nome}}

_______________________________
{{locatario_nome}}

_______________________________
SARTO IMÓVEIS LTDA`,
  },
  {
    id: "mod_adm",
    nome: "Administração de locação (adesão)",
    grupo: "Locação",
    corpo: `CONTRATO DE ADMINISTRAÇÃO DE IMÓVEL PARA LOCAÇÃO

PROPRIETÁRIO: {{locador_nome}}, {{locador_qualificacao}}, inscrito(a) no CPF/CNPJ sob o nº {{locador_doc}}.

ADMINISTRADORA: SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221.

CLÁUSULA 1ª. OBJETO
Administração da locação do imóvel situado em {{imovel_endereco}}.

CLÁUSULA 2ª. REMUNERAÇÃO
O primeiro aluguel é devido à administradora pela intermediação. A partir do segundo, taxa de administração de {{taxa_adm}}% sobre o aluguel recebido.

CLÁUSULA 3ª. REPASSE
O valor líquido será repassado ao proprietário com extrato mensal.

CLÁUSULA 4ª. OBRIGAÇÕES DA ADMINISTRADORA
Divulgar, qualificar interessados, cobrar, repassar, acompanhar encargos, vistorias, seguro e garantias.

CLÁUSULA 5ª. CONDIÇÕES ESPECIAIS
{{condicoes}}

Anápolis/GO, {{data_extenso}}.

_______________________________
{{locador_nome}}

_______________________________
SARTO IMÓVEIS LTDA`,
  },
  {
    id: "mod_autorizacao",
    nome: "Autorização de venda",
    grupo: "Captação",
    corpo: `AUTORIZAÇÃO DE VENDA DE IMÓVEL

PROPRIETÁRIO: {{vendedor_nome}}, inscrito(a) no CPF/CNPJ sob o nº {{vendedor_doc}}.

Autorizo a SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221, a intermediar a venda do imóvel {{imovel_descricao}}, matrícula nº {{imovel_matricula}}, pelo valor de {{preco}} ({{preco_extenso}}).

EXCLUSIVIDADE: {{exclusividade}}.
PRAZO: {{prazo_autorizacao}} dias a contar desta data.
COMISSÃO: {{comissao_pct}}% sobre o valor da venda, devida na assinatura do compromisso.

Autorizo a divulgação em portais e redes sociais, com fotos e vídeos do imóvel, e o tratamento dos meus dados para esta finalidade, nos termos da LGPD.

Anápolis/GO, {{data_extenso}}.

_______________________________
{{vendedor_nome}}`,
  },
  {
    id: "mod_corretor",
    nome: "Contrato do corretor",
    grupo: "Equipe",
    corpo: `CONTRATO DE ASSOCIAÇÃO DE CORRETOR DE IMÓVEIS

CONTRATANTE: SARTO IMÓVEIS LTDA, CRECI/GO CJ 36.221.

CORRETOR: {{corretor_nome}}, CPF {{corretor_doc}}, CRECI {{corretor_creci}}.

CLÁUSULA 1ª. OBJETO
Associação para intermediação imobiliária, sem vínculo de emprego, nos termos da Lei 6.530/78.

CLÁUSULA 2ª. COMISSÕES
Conforme a tabela de divisão vigente na Sarto, informada no relatório de cada negócio.

CLÁUSULA 3ª. CONDUTA
O corretor declara ter recebido e aceito o código de cultura e o manual de conduta.

CLÁUSULA 4ª. SIGILO E DADOS PESSOAIS
Dados de clientes são tratados só para a finalidade do atendimento, inclusive depois do fim deste contrato.

CLÁUSULA 5ª. ENCERRAMENTO
Qualquer parte pode encerrar com aviso de {{aviso_dias}} dias.

Anápolis/GO, {{data_extenso}}.

_______________________________
{{corretor_nome}}

_______________________________
SARTO IMÓVEIS LTDA`,
  },
  {
    id: "mod_distrato",
    nome: "Distrato",
    grupo: "Venda",
    corpo: `INSTRUMENTO PARTICULAR DE DISTRATO

PARTES: {{vendedor_nome}} (CPF/CNPJ {{vendedor_doc}}) e {{comprador_nome}} (CPF/CNPJ {{comprador_doc}}).

As partes resolvem, de comum acordo, desfazer o negócio sobre o imóvel {{imovel_descricao}}, dando-se quitação nos termos abaixo.

CONDIÇÕES
{{condicoes}}

Anápolis/GO, {{data_extenso}}.

_______________________________
{{vendedor_nome}}

_______________________________
{{comprador_nome}}`,
  },
];
