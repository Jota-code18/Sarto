# Padrão do projeto Painel Sarto

Vale para qualquer pessoa, agente ou modelo que mexa neste repositório. Se uma instrução daqui conflitar com um costume seu, siga a daqui. O que o dono do projeto pedir na conversa vale mais que este arquivo.

## Fluxo obrigatório

1. **Issue primeiro.** Toda correção, melhoria ou nova função tem uma issue no GitHub antes do código, com objetivo e critérios de "pronto quando". Use uma etiqueta: `correção`, `melhoria` ou `nova função`. Some `depende da Sarto` se faltar acesso, conta ou decisão.
2. **Branch a partir da `main`**: `tipo/numero-resumo`, por exemplo `fix/9-tempo-do-zap`. Nunca envie direto para a `main`.
3. **Commits** no padrão Conventional Commits, em português: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `ci:`, `build:`, `chore:`, `perf:`, `style:`. O Commitlint confere.
4. **PR com a issue na descrição.** Escreva `Closes #N`, ou `Refs #N` se não encerra. PR sem número de issue não passa no CI.
5. **Deploy só pelo PR.** A Vercel publica uma prévia por PR; a produção sai da mesclagem na `main`. Quem mescla é o dono do projeto, ou um agente quando ele autorizar. PR empilhado aponta para a branch anterior e é mesclado na ordem, com commit de merge.
6. Um assunto por PR. O que aparecer fora do escopo vira issue nova.

## Antes de abrir o PR

```bash
npm run verificar   # lint, tipos, arquitetura, código morto, testes, build e segredos
npm run e2e         # Playwright em computador e celular
npm run mutacao     # Stryker, quando mexer em regra de dinheiro, prazo ou permissão
```

Corrigiu um erro? Deixe um teste que falharia sem a correção. Não desligue regra, teste ou limite para passar: conserte, ou registre a exceção com o motivo no código.

## Nunca

- Dado de cliente, contrato, valor real, proposta, PDF, planilha ou print no repositório, em issue, PR, log ou teste. **O repositório é público.**
- Chave, senha ou token no código, no chat ou em variável `NEXT_PUBLIC_*`. Segredo só nas variáveis da Vercel.
- Contornar captcha, bloqueio ou login de portal.
- Dado inventado na tela. Sem dado, mostre um estado vazio que diga o próximo passo. Dados de exemplo só em teste.
- Critério próprio de nota de anúncio: a nota é a do Canal Pro.
- Passo manual fora do painel (subir arquivo, colar link) quando der para fazer por dentro.
- Gasto acima do crédito gratuito sem autorização: o teto mensal é `APIFY_TETO_MES` (padrão 4,95), lido em `src/lib/apify.ts`.
- Preço mínimo na varredura: lote e anúncio só com ágio precisam entrar. O que conta é o empreendimento, em `src/lib/empreendimentos.ts`.

## Segurança do que vem

Vale para login individual, IA no WhatsApp, Asaas e qualquer rota nova. Ver também SECURITY.md.

- **Login:** a mesma mensagem para e-mail inexistente e senha errada. Limite de tentativas. MFA para sócios. Trocar a senha derruba as outras sessões.
- **Permissão no servidor:** tela escondida não é proteção. Toda leitura e gravação passa pela política do banco (RLS) ou pela rota, nunca só pelo menu. Nada de `/admin` aberto.
- **ID na URL:** buscar sempre com o filtro de quem pede; nunca confiar que o ID é do usuário.
- **Perfil e papel** nunca vêm do navegador. Rota que recebe JSON aceita só os campos esperados.
- **Dinheiro:** valor, multa, juros e repasse calculados no servidor. Webhook do Asaas conferido pelo token e reconsultado na API do Asaas antes de dar baixa; cada pagamento processado uma vez só (pelo id).
- **IA:** responde só com os dados do cliente da conversa, por ferramentas com a permissão dele. Instrução vinda do cliente ("ignore as regras") não muda nada. Dinheiro, contrato e dado de terceiro passam por uma pessoa. Nunca colocar chave ou dado de outro cliente no texto enviado à IA.
- **Arquivo enviado:** conferido pelo conteúdo (`src/lib/tipoArquivo.ts`), com limite de tamanho, guardado em bucket privado; nunca aberto como página.
- **Apagar é apagar:** mensagem e documento removidos saem do banco ou ficam invisíveis pela política; nada de "apagado: true" lido pela tela.
- **Segredo:** `npm run segredos` roda no CI depois do build e o gitleaks olha o histórico.

## Produto

Painel interno da Sarto Imóveis (Anápolis, GO): comercial, locação, jurídico, financeiro, marketing e ADM. É um MVP que cresce seção por seção. Textos em português do Brasil, curtos e diretos. Identidade: Poppins, carvão `#262626`, papel `#f5f5f4`; os tokens de cor, raio e sombra ficam em `src/app/globals.css`.

Toda tela precisa funcionar em 360 px de largura, sem rolagem lateral, com alvo de toque de pelo menos 44 px, e ser usável por teclado.

## Arquitetura

| Pasta              | O que é                                 | Pode importar                |
| ------------------ | --------------------------------------- | ---------------------------- |
| `src/lib`          | regras de negócio, sem React e sem tela | só `src/lib`                 |
| `src/componentes`  | peças de tela                           | `src/lib`, `src/componentes` |
| `src/app/(painel)` | uma pasta por tela                      | tudo, menos outra tela       |
| `src/app/api`      | rotas de servidor                       | `src/lib`                    |

- `src/lib/apify.ts` e tudo que lê segredo rodam só no servidor: tela nunca importa.
- Exceção ao envio direto: a ação `carteira.yml` grava só `public/data/carteira.json` na `main`.
- `src/lib/store.ts` é o único ponto de gravação. A troca para o Supabase acontece ali.
- Rota de API valida a entrada, devolve só os campos que a tela usa e não repassa erro interno.
- Link vindo de fora só vira `href` depois de conferido como `https`.

O CI confere essas fronteiras (`npm run arquitetura`).

## Qualidade e observação

Biome, Commitlint, Knip, dependency-cruiser, Stryker, Vitest com Codecov, Playwright, CodeQL e Sentry com OpenTelemetry. Sentry nunca recebe dado pessoal.
