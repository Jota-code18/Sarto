import { describe, expect, it } from "vitest";
import { anunciosDaCaptura, CODIGO_FAVORITO, favorito, lerCaptura, notasDaCaptura } from "./captura";
import { juntarNotas, lerNotas, porImovel } from "./notas";
import { REGRAS } from "./regras";
import type { ImovelSite } from "./tipos";
import { type Bruto, custoApify, mesclar, melhorContato, montarGrupos, normalizar, precoM2 } from "./varredura";

const REF = "2026-11-25";
// textos reais dos cartões, copiados das páginas de busca em 25/11/2026
const ZAP =
  "\n+15 fotos\nSuper Destaque\nClube House Imóveis\nCasa de condomínio para comprar com 223 m², 3 quartos, 4 banheiros, 4 vagas em\n\nR$ 1.670.000\n\nCond. R$ 600 • IPTU R$ 1.500\n\nTamanho do imóvel\n223 m²\nQuantidade de quartos\n3\nQuantidade de banheiros\n4\nBoa Vista, Anápolis\n\nRua 12\n\nContatar";
const OLX =
  "Casa de 3 quartos em condomínio fechado\n120m²\n3\n2\n2\nDireto com o proprietário\nR$ 650.000\nCondomínio R$ 290\n\nAnápolis, Chácaras Colorado\n\nHoje, 10:38\n\nEnviar mensagem";
const D62 =
  "ULTRA DESTAQUE\nAVENIDA DOS GIRASSOIS, RESIDENCIAL SUN FLOWER, ANAPOLIS\n\nRESIDENCIAL SUNFLOWER CASA TÉRREA A VENDA\n\nR$ 2.800.000\n\nValor m² R$ 11.336\n\n247 m²\n3 Quartos\n3 Suítes\n2 Vagas\n\nExcelente casa térrea... 25/09/26\n\nCreci:\n\n32889\n\ncontatar";
const cap = (host: string, u: string, t: string, titulo = "") => ({ sarto: 1 as const, host, titulo, itens: [{ u, t }] });

describe("captura dos portais", () => {
  it("ZAP e Viva Real", () => {
    const u = "https://www.zapimoveis.com.br/imovel/venda-casa-de-condominio-3-quartos-mobiliado-condominio-residencial-grand-trianon-anapolis-go-223m2-id-2891363600/";
    const [a] = anunciosDaCaptura(cap("www.zapimoveis.com.br", u, ZAP), REF);
    expect(a).toMatchObject({
      portal: "ZAP Imóveis",
      preco: 1670000,
      area: 223,
      quartos: 3,
      anunciante: "Clube House Imóveis",
      bairro: "Boa Vista",
      cidade: "Anápolis",
      tipo: "Casa em condomínio",
      particular: false,
    });
    expect(a.titulo).toContain("Grand Trianon");
    expect(anunciosDaCaptura(cap("www.vivareal.com.br", "https://www.vivareal.com.br/imovel/x-id-1/", ZAP), REF)[0].portal).toBe("Viva Real");
  });
  it("ZAP sem nome de anunciante e com o nome da Sarto", () => {
    const u = "https://www.zapimoveis.com.br/imovel/venda-casa-3-quartos-jundiai-anapolis-go-200m2-id-2891363611/";
    const t =
      "+7 fotos\nCasa para comprar com 200 m², 3 quartos, 2 banheiros, 2 vagas em\nR$ 1.000.000\nCond. isento • IPTU não informado\nTamanho do imóvel\n200 m²\nJundiaí, Anápolis\nRua Francisco da Luz Bastos\nContatar";
    expect(anunciosDaCaptura(cap("www.zapimoveis.com.br", u, t), REF)[0]).toMatchObject({ anunciante: "", preco: 1000000, area: 200, quartos: 3, bairro: "Jundiaí", tipo: "Casa" });
    const s = mesclar([], anunciosDaCaptura(cap("www.zapimoveis.com.br", u, t.replace("+7 fotos", "+7 fotos\nSarto Imoveis Ltda")), REF), "Anápolis", REF).lista;
    expect(montarGrupos(s, [], REGRAS, REF)[0].sarto).toBe("sarto");
  });
  it("lançamento de construtora fica de fora", () => {
    const t = "EBM\nApartamento para comprar com 68 m² em\nA partir de\nR$ 661.652";
    expect(anunciosDaCaptura(cap("www.zapimoveis.com.br", "https://x/imovel/a-id-9999999/", t), REF)).toEqual([]);
  });
  it("OLX direto com o dono", () => {
    const [a] = anunciosDaCaptura(cap("www.olx.com.br", "https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/casa-1519657119", OLX), REF);
    expect(a).toMatchObject({ portal: "OLX", preco: 650000, area: 120, quartos: 3, particular: true, cidade: "Anápolis", bairro: "Chácaras Colorado", publicadoEm: REF });
  });
  it("OLX com preço riscado", () => {
    const t = "Apartamento\n65m²\n2\nR$ 1.390.000\nR$ 1.290.000\nAnápolis, Jundiaí\n12 de nov, 09:10";
    const [a] = anunciosDaCaptura(cap("www.olx.com.br", "https://go.olx.com.br/x/imoveis/ap-1519657118", t), REF);
    expect(a).toMatchObject({ preco: 1290000, precoAnterior: 1390000, publicadoEm: "2026-11-12" });
  });
  it("62imóveis", () => {
    const u = "https://www.62imoveis.com.br/imovel/casa-3-quartos-venda-residencial-sun-flower-anapolis-go-avenida-dos-girassois-1448836";
    const [a] = anunciosDaCaptura(cap("www.62imoveis.com.br", u, D62), REF);
    expect(a).toMatchObject({
      portal: "62imóveis",
      preco: 2800000,
      area: 247,
      quartos: 3,
      cidade: "Anapolis",
      bairro: "Residencial Sun Flower",
      anunciante: "CRECI 32889",
      particular: false,
      publicadoEm: "2026-09-25",
      tipo: "Casa",
    });
  });
  it("alerta do Jetimob vira atenção, sem nota inventada", () => {
    const n = notasDaCaptura(cap("app.jetimob.com", "/imoveis/LG38235", "Alerta Informações incompletas: Kitnet não pode ter dormitórios.", "Portais > Canalpro"), REF);
    expect(n).toEqual([{ id: "canal pro (jetimob)|lg38235", cod: "LG38235", portal: "Canal Pro (Jetimob)", nota: null, motivo: "Kitnet não pode ter dormitórios.", em: REF }]);
  });
  it("recusa texto que não é captura, e o favorito é JavaScript válido", () => {
    expect(lerCaptura("oi")).toBeNull();
    expect(lerCaptura('{"itens":[]}')).toBeNull();
    expect(() => new Function(CODIGO_FAVORITO)).not.toThrow();
    expect(favorito().startsWith("javascript:(function")).toBe(true);
    expect(() => new Function(decodeURIComponent(favorito().slice(11)))).not.toThrow();
  });
});

describe("nota dos anúncios", () => {
  it("lê o relatório com nomes de coluna diferentes e ignora linha sem nota", () => {
    const n = lerNotas(
      [
        { codigo_do_anuncio: "MV61996", nota_de_qualidade: "7,4", sugestoes: "Adicionar vídeo" },
        { codigo_do_anuncio: "X1", nota_de_qualidade: "" },
        { codigo_do_anuncio: "", nota_de_qualidade: "9" },
      ],
      "Canal Pro",
      REF,
    );
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ cod: "MV61996", nota: 7.4, motivo: "Adicionar vídeo", portal: "Canal Pro" });
  });
  it("guarda a nota anterior e mostra a menor entre os portais", () => {
    const a = lerNotas([{ codigo: "A1", nota: "6" }], "Canal Pro", REF);
    const b = juntarNotas(a, lerNotas([{ codigo: "A1", nota: "8" }], "Canal Pro", REF));
    expect(b[0]).toMatchObject({ nota: 8, anterior: 6 });
    const c = porImovel([...b, ...lerNotas([{ codigo: "a1", nota: "5" }], "62imóveis", REF)]);
    expect(c.get("A1")?.nota).toBe(5);
  });
});

const imovel = (p: Partial<ImovelSite> = {}): ImovelSite => ({
  cod: "1",
  titulo: "Casa com 3 suítes no Residencial Anaville",
  tipo: "Casa de Condomínio",
  bairro: "Residencial Anaville",
  cidade: "Anápolis",
  cond: "",
  venda: 2395000,
  aluguel: null,
  quartos: 4,
  suites: 4,
  banheiros: 5,
  vagas: 4,
  area: 330,
  terreno: 450,
  condominio: 900,
  excl: false,
  fotos: 30,
  precoNoTexto: null,
  capa: null,
  url: "",
  ...p,
});
const bruto = (p: Partial<Bruto> = {}): Bruto => ({
  portal: "ZAP Imóveis",
  url: "https://www.zapimoveis.com.br/imovel/x-id-2891363600/",
  titulo: "Casa",
  tipo: "Casa em condomínio",
  bairro: "Residencial Anaville",
  cidade: "Anápolis",
  preco: 2400000,
  precoAnterior: 0,
  area: 330,
  quartos: 4,
  anunciante: "Imob A",
  codAnunciante: "",
  particular: false,
  ...p,
});

describe("varredura", () => {
  it("coleta nova mantém situação, percebe queda de preço e descarta outra cidade", () => {
    const um = mesclar([], [bruto(), bruto({ url: "https://x/y-id-7777777/", cidade: "Goiânia" })], "Anápolis", "2026-11-16");
    expect(um).toMatchObject({ novos: 1, foraDaCidade: 1 });
    const marcado = um.lista.map((a) => ({ ...a, status: "contatado" as const, obs: "ligou" }));
    const dois = mesclar(marcado, [bruto({ preco: 2200000, url: "https://www.zapimoveis.com.br/imovel/outro-titulo-id-2891363600/?x=1" })], "Anápolis", "2026-11-23");
    expect(dois).toMatchObject({ novos: 0, baixaram: 1 });
    expect(dois.lista[0]).toMatchObject({ status: "contatado", obs: "ligou", preco: 2200000, precoAnterior: 2400000, primeiraVez: "2026-11-16", vistoEm: "2026-11-23" });
    // a queda continua marcada na coleta seguinte com o mesmo preço
    expect(mesclar(dois.lista, [bruto({ preco: 2200000 })], "Anápolis", "2026-11-30").lista[0].precoAnterior).toBe(2400000);
  });
  it("junta o mesmo imóvel, reconhece o da Sarto e separa o padrão", () => {
    const l = mesclar(
      [],
      [
        bruto(),
        bruto({ portal: "62imóveis", url: "https://www.62imoveis.com.br/imovel/casa-anaville-1448836", area: 331, preco: 2390000, anunciante: "CRECI 32889" }),
        bruto({ url: "https://z/a-id-1111111/", area: 268, preco: 1850000, bairro: "Jundiaí", anunciante: "Sarto Imóveis" }),
        bruto({ url: "https://z/a-id-2222222/", area: 68, preco: 310000, bairro: "Centro" }),
        bruto({ portal: "OLX", url: "https://go.olx.com.br/a-1519657119", area: 240, preco: 1390000, particular: true, bairro: "Jardim Exemplo" }),
      ],
      "Anápolis",
      REF,
    ).lista;
    const g = montarGrupos(l, [], REGRAS, REF);
    expect(g).toHaveLength(4);
    expect(g[0].particular).toBe(true);
    expect(g.find((x) => x.outros.length)?.motivos).toContain("em 2 anúncios");
    expect(g.find((x) => x.principal.anunciante === "Sarto Imóveis")?.sarto).toBe("sarto");
    expect(g.find((x) => x.principal.preco === 310000)?.noPadrao).toBe(false);
    const comSite = montarGrupos(l, [imovel()], REGRAS, REF);
    expect(comSite.filter((x) => typeof x.sarto === "object" && x.sarto).map((x) => x.principal.area)).toEqual([331]);
  });
  it("acha o condomínio pelo endereço do anúncio", () => {
    const l = mesclar(
      [],
      [bruto({ bairro: "Boa Vista", area: 223, preco: 1670000, quartos: 3, url: "https://z/imovel/venda-casa-condominio-residencial-grand-trianon-anapolis-id-2891363600/" })],
      "Anápolis",
      REF,
    ).lista;
    const g = montarGrupos(l, [imovel({ cod: "77", bairro: "Condomínio Residencial Grand Trianon", area: 223, venda: 1650000, quartos: 3 })], REGRAS, REF);
    expect(g[0].sarto).toMatchObject({ cod: "77" });
  });
  it("reconhece as saídas da Apify e planilha comum", () => {
    expect(
      normalizar({
        identity: { external_id: "CF1" },
        source_context: { url: "https://www.zapimoveis.com.br/imovel/a-id-2818995261/" },
        timestamps: { created_at: "2025-07-05T04:09:53Z" },
        content: { title: "Sala" },
        pricing: { amount: 9, offers: [{ business_type: "sale", amount: 230000 }] },
        location: { neighborhood: "Centro", city: "Anápolis" },
        attributes: { unit_types: ["condominium"], rooms: { bedrooms: 3 }, area: { usable_area: 41 } },
        entities: { seller: { name: "Imob", license_number: "1-J" } },
      }),
    ).toMatchObject({
      portal: "ZAP Imóveis",
      preco: 230000,
      area: 41,
      quartos: 3,
      anunciante: "Imob",
      codAnunciante: "CF1",
      tipo: "Casa em condomínio",
      particular: false,
      publicadoEm: "2025-07-05",
    });
    expect(
      normalizar({
        url: "https://www.vivareal.com.br/imovel/b-id-2/",
        title: "Casa",
        unitTypeLabel: "Casa",
        price: 1500000,
        usableArea: 200,
        bedrooms: 3,
        neighborhood: "Jundiaí",
        city: "Anápolis",
        advertiserName: "Proprietário",
        externalId: "Z9",
        createdAt: "2026-01-02T00:00:00Z",
      }),
    ).toMatchObject({ portal: "Viva Real", preco: 1500000, particular: true, codAnunciante: "Z9" });
    expect(
      normalizar({
        listingId: "1",
        title: "Ap",
        url: "https://go.olx.com.br/x-1419837622",
        price: 420000,
        priceDisplay: "R$ 420.000",
        city: "Anápolis",
        neighborhood: "Centro",
        categoryName: "Apartamentos",
        properties: [
          { name: "Quartos", value: "2" },
          { name: "Área útil", value: "65" },
        ],
        seller: { type: "private" },
        isBusiness: false,
        postedAt: "2026-05-12T14:22:00Z",
      }),
    ).toMatchObject({ portal: "OLX", area: 65, quartos: 2, particular: true, anunciante: "Proprietário" });
    expect(normalizar({ titulo: "Casa", preco: "1.200.000", bairro: "Centro" })).toMatchObject({ preco: 1200000, portal: "Planilha" });
    expect(normalizar({ titulo: "sem preço" })).toBeNull();
  });
  it("custo da Apify: cabe no grátis até US$ 5", () => {
    expect(custoApify(500, 200, 4)).toMatchObject({ pago: 0 });
    const c = custoApify(1521, 500, 4);
    expect(c.uso).toBeCloseTo(14.51, 1);
    expect(c.pago).toBe(19);
  });
  it("agrupa 3 mil anúncios sem travar", () => {
    const muitos = Array.from({ length: 3000 }, (_, i) =>
      bruto({ url: `https://z/a-id-${1000000 + i}/`, area: 80 + (i % 400), preco: 900000 + i * 997, bairro: `Bairro ${i % 40}` }),
    );
    const l = mesclar([], muitos, "Anápolis", REF).lista;
    const t0 = performance.now();
    montarGrupos(l, [], REGRAS, REF);
    expect(performance.now() - t0).toBeLessThan(4000);
  });
});

describe("saída real dos coletores", () => {
  const olx = (p: object = {}) => ({
    listingId: "1",
    url: "https://go.olx.com.br/x/casa-1508484603",
    title: "Sobrado",
    categoryName: "Casas",
    city: "Anápolis",
    neighborhood: "Anápolis City",
    price: 1700000,
    priceDisplay: "R$ 1.700.000",
    seller: { type: "private" },
    foto: "https://img.olx.com.br/a.jpg",
    telefone: "62999990000",
    properties: [
      { name: "category", value: "Casas" },
      { name: "real_estate_type", value: "Venda - casa em condominio fechado" },
      { name: "size", value: "370m²" },
      { name: "rooms", value: "5 ou mais" },
    ],
    ...p,
  });
  it("OLX: área, quartos, tipo, foto e telefone", () => {
    const a = normalizar(olx());
    expect(a).toMatchObject({ area: 370, quartos: 5, tipo: "Casa em condomínio", particular: true, foto: "https://img.olx.com.br/a.jpg", telefone: "62999990000" });
    expect(Math.round(precoM2(a as Bruto))).toBe(4595);
  });
  it("OLX: área de 1 m² é ignorada e o tipo cai para a categoria", () => {
    const a = normalizar(
      olx({
        categoryName: "Terrenos, sítios e fazendas",
        properties: [
          { name: "real_estate_type", value: "Fazendas" },
          { name: "size", value: "1m²" },
        ],
      }),
    );
    expect(a).toMatchObject({ area: 0, tipo: "Rural" });
    expect(precoM2(a as Bruto)).toBe(0);
    expect(normalizar(olx({ properties: [{ name: "size", value: "24000m²" }] }))).toMatchObject({ area: 24000, tipo: "Casa" });
  });
  it("coleta sem foto ou telefone não apaga o que já se sabia", () => {
    const b = normalizar(olx()) as Bruto;
    const l = mesclar([], [b], "Anápolis", REF).lista;
    const r = mesclar(l, [{ ...b, foto: undefined, telefone: undefined }], "Anápolis", REF).lista[0];
    expect(r).toMatchObject({ foto: b.foto, telefone: b.telefone });
  });
  it("contato preferido é o do dono", () => {
    const b = normalizar(olx()) as Bruto;
    const [dono, imob] = mesclar(
      [],
      [
        { ...b, telefone: undefined },
        { ...b, url: "https://x/9999999", particular: false, telefone: "6233000000" },
      ],
      "Anápolis",
      REF,
    ).lista;
    expect(melhorContato({ principal: imob, outros: [dono] })).toBe(dono);
    expect(melhorContato({ principal: imob, outros: [] })).toBe(imob);
  });
});

describe("padrão por empreendimento", () => {
  const base = {
    portal: "OLX",
    url: "https://x/1000001",
    titulo: "Casa no Anavile",
    tipo: "Casa",
    bairro: "",
    cidade: "Anápolis",
    preco: 1_500_000,
    precoAnterior: 0,
    area: 300,
    quartos: 4,
    anunciante: "",
    codAnunciante: "",
    particular: false,
  };
  it("sem preço mínimo e com erro de escrita", () => {
    const l = mesclar(
      [],
      [base, { ...base, url: "https://x/1000002", titulo: "Lote no Alfaville", preco: 35_000, area: 0 }, { ...base, url: "https://x/1000003", titulo: "Casa no Jundiaí" }],
      "Anápolis",
      REF,
    ).lista;
    const g = montarGrupos(l, [], REGRAS, REF);
    const por = (t: string) => g.find((x) => x.principal.titulo.includes(t));
    expect(por("Anavile")).toMatchObject({ noPadrao: true, empreendimento: "Anaville", precoEstranho: false });
    expect(por("Alfaville")).toMatchObject({ noPadrao: true, empreendimento: "Alphaville", precoEstranho: true });
    expect(por("Alfaville")?.motivos).toContain("preço a conferir");
    expect(por("Jundiaí")).toMatchObject({ noPadrao: false, empreendimento: "" });
    expect(montarGrupos(l, [], { ...REGRAS, padraoBairros: "Jundiaí" }, REF).find((x) => x.principal.titulo.includes("Jundiaí"))?.noPadrao).toBe(true);
  });
  it("empreendimento achado no texto da coleta continua depois", () => {
    const [a] = mesclar([], [{ ...base, titulo: "Casa 4 suítes", empreendimento: "Belas Artes" }], "Anápolis", REF).lista;
    const [b] = mesclar([a], [{ ...base, titulo: "Casa 4 suítes", empreendimento: undefined }], "Anápolis", REF).lista;
    expect(b.empreendimento).toBe("Belas Artes");
  });
});

describe("número do mesmo anunciante", () => {
  const b = {
    portal: "OLX",
    url: "https://x/2000001",
    titulo: "Casa",
    tipo: "Casa",
    bairro: "",
    cidade: "Anápolis",
    preco: 900_000,
    precoAnterior: 0,
    area: 200,
    quartos: 3,
    anunciante: "Dono",
    codAnunciante: "",
    particular: true,
    idAnunciante: "77",
  };
  it("número de um anúncio vale para os outros dele, e só dele", () => {
    const l = mesclar(
      [],
      [
        { ...b, telefone: "6233000000" },
        { ...b, url: "https://x/2000002", telefone: "62999990000" },
        { ...b, url: "https://x/2000003" },
        { ...b, url: "https://x/2000004", idAnunciante: "88" },
        { ...b, url: "https://x/2000005", portal: "ZAP Imóveis" },
      ],
      "Anápolis",
      REF,
    ).lista;
    const t = (u: string) => l.find((a) => a.url.endsWith(u));
    expect(t("2000003")).toMatchObject({ telefone: "62999990000", telefoneDeOutro: true });
    expect(t("2000001")).toMatchObject({ telefone: "6233000000" });
    expect(t("2000001")?.telefoneDeOutro).toBeUndefined();
    expect(t("2000004")?.telefone).toBeUndefined();
    expect(t("2000005")?.telefone).toBeUndefined();
  });
  it("número próprio que aparece depois substitui o emprestado", () => {
    const l1 = mesclar(
      [],
      [
        { ...b, telefone: "62999990000" },
        { ...b, url: "https://x/2000003" },
      ],
      "Anápolis",
      REF,
    ).lista;
    const l2 = mesclar(l1, [{ ...b, url: "https://x/2000003", telefone: "62988880000" }], "Anápolis", REF).lista;
    expect(l2.find((a) => a.url.endsWith("2000003"))).toMatchObject({ telefone: "62988880000" });
    expect(l2.find((a) => a.url.endsWith("2000003"))?.telefoneDeOutro).toBeUndefined();
  });
});

describe("aluguel", () => {
  const base = {
    portal: "OLX",
    url: "https://x/3000001",
    titulo: "Casa para alugar",
    tipo: "Casa",
    bairro: "",
    cidade: "Anápolis",
    preco: 4_000,
    precoAnterior: 0,
    area: 150,
    quartos: 3,
    anunciante: "",
    codAnunciante: "",
    particular: true,
    negocio: "aluguel" as const,
  };
  it("entra no padrão pelo mínimo da locação e preço baixo não é erro", () => {
    const l = mesclar([], [base, { ...base, url: "https://x/3000002", preco: 1_200 }, { ...base, url: "https://x/3000003", preco: 850_000 }], "Anápolis", REF).lista;
    const g = montarGrupos(l, [], REGRAS, REF);
    const por = (p: number) => g.find((x) => x.principal.preco === p);
    expect(por(4_000)).toMatchObject({ noPadrao: true, precoEstranho: false });
    expect(por(1_200)).toMatchObject({ noPadrao: false, precoEstranho: false });
    expect(por(850_000)?.precoEstranho).toBe(true);
  });
  it("a OLX marca aluguel no tipo do imóvel", () => {
    const o = {
      listingId: "9",
      url: "https://go.olx.com.br/x-9",
      title: "Casa",
      city: "Anápolis",
      price: 3000,
      priceDisplay: "R$ 3.000",
      seller: { type: "private", id: "5" },
      properties: [{ name: "real_estate_type", value: "Aluguel - casa em rua pública" }],
    };
    expect(normalizar(o)).toMatchObject({ negocio: "aluguel", idAnunciante: "5" });
    expect(normalizar({ ...o, properties: [] })).toMatchObject({ negocio: "venda" });
    expect(normalizar({ ...o, properties: [], negocio: "aluguel" })).toMatchObject({ negocio: "aluguel" });
  });
});
