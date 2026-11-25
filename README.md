# Painel Sarto

Gestão interna da Sarto Imóveis: comercial, locação, jurídico, financeiro, marketing e ADM. Next.js 16, sem servidor próprio e sem custo.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # regras de dinheiro, prazo, certidão, agenda e extrato
npm run build
```

## Onde ficam os dados

No navegador de quem usa (localStorage para cadastros, IndexedDB para PDFs e fotos). Ninguém mais vê. Serve para validar o processo; o banco compartilhado com login entra trocando `src/lib/store.ts` por Supabase, sem mexer nas telas.

Primeira abertura: dados de demonstração, todos inventados. Em Configurações dá para começar com os dados da Sarto, baixar e restaurar backup.

**Nunca coloque neste repositório** dado de cliente, contrato, proposta ou material interno. O `.gitignore` já barra PDF, Word, planilha e backup.

## Senha

Defina `PAINEL_SENHA` nas variáveis de ambiente da Vercel e publique de novo. Sem ela, o painel abre direto.

## O que já funciona, de graça

| Área       | O que faz                                                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leads      | cadastro no celular, lead repetido, lista para lançar no JetImob                                                                                              |
| Captação   | manual de captação, CEP, fotos pelo mínimo do tipo, PDF padrão Sarto                                                                                          |
| Carteira   | lê o site toda segunda (GitHub Actions), recebe a nota do Canal Pro e o alerta do Jetimob, aponta preço divergente                                            |
| Varredura  | ZAP, Viva Real e OLX pela Apify, toda segunda ou no botão, com `APIFY_TOKEN` e `PAINEL_SENHA`; junta repetidos, tira o que é da Sarto, percebe queda de preço |
| Corretores | checklist de entrada com responsável                                                                                                                          |
| Locação    | semáforo por contrato, cobrança com multa e juros, WhatsApp pronto, repasse com aprovação, reajuste pelo Banco Central, saída, informe e base da DIMOB        |
| Pós-venda  | 7 etapas com trava, resumo para o jurídico, comissão, avisos                                                                                                  |
| Certidões  | dossiê, portais com dados prontos, leitura do PDF no navegador, validade, parecer                                                                             |
| Minutas    | modelos com campos, Word da Gabi, marca de rascunho até ela liberar                                                                                           |
| Consulta   | publicações no DJEN por nome e empresa por CNPJ                                                                                                               |
| Financeiro | extrato OFX ou CSV, contas a pagar                                                                                                                            |
| Agenda     | videomaker com horários livres, Google Agenda por link e .ics                                                                                                 |
| Marketing  | cronograma da semana e pedido pronto para a skill                                                                                                             |
| Rotina     | abertura, fechamento, estoque, aniversários, registro de 30 minutos                                                                                           |

## Regras que o painel não deixa furar

- Minuta só sai sem a marca de rascunho depois que a Gabi valida o modelo e libera o texto.
- Dossiê só é liberado com tudo em dia, conferido por alguém e sem positiva.
- Venda não muda de etapa com item aberto.
- Repasse, multa, comissão e post precisam do sim de quem responde por eles.

Trocar de perfil no menu não é segurança: identifica quem fez. Segurança de verdade vem com o login do Supabase, já preparado em `supabase/migrations` com políticas por perfil testadas.

## Skill do Claude

Em `skill/sarto`. Para subir: compacte a pasta `sarto` e envie em Configurações, Capacidades, Skills.

## Pastas

- `src/lib` regras de negócio, sem tela, com teste
- `src/app/(painel)` uma pasta por tela
- `src/app/imprimir` PDF padrão, dossiê, extrato, informe, comissão, minuta
- `scripts/atualizar-carteira.mjs` leitura da carteira pública

## Como contribuir

Issue, branch, PR que menciona a issue, prévia da Vercel e mesclagem. Tudo em [AGENTS.md](AGENTS.md).
