# Segurança

Achou uma falha? Não abra issue pública. Use "Report a vulnerability" na aba Security do repositório.

## O que protege o painel hoje

- Senha única (`PAINEL_SENHA`), passe assinado com validade de 14 dias, trava depois de 8 erros e botão "Sair deste aparelho". Trocar a senha derruba todos os acessos.
- Política de conteúdo com código único por página, sem script solto, e lista fechada de destinos.
- Chaves só no servidor. A varredura não liga sem senha, tem teto de gasto e só aceita pedido do próprio painel.
- Arquivo enviado é conferido pelo conteúdo (PDF, foto, Word) e nunca abre como página.
- Links de fora só abrem em https. Planilha exportada não executa fórmula.
- CodeQL, Dependabot, gitleaks, auditoria de dependências e varredura de segredos no pacote do navegador, no CI.

## Os ataques comuns de apps feitos com IA

| Ataque                                                              | Situação no painel                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| E-mail qualquer no login para descobrir quem usa                    | Não se aplica: a entrada pede só a senha. Com login individual, mensagem única para tudo (AGENTS.md) |
| `/api/usuarios` ou `/admin` abertos                                 | Toda rota passa pela senha; não há lista de usuários no servidor. No Supabase, políticas testadas    |
| Mudar o ID na URL                                                   | A API só devolve coletas do próprio painel; no banco, política por perfil testada                    |
| Chave de API no navegador                                           | Chaves só no servidor; o CI procura chave e nome de variável secreta no pacote do navegador          |
| Senha vazada de outro site                                          | Senha única longa e trava de tentativas; com login individual, MFA para sócios                       |
| Continuar logado depois de trocar a senha                           | O passe é assinado com a senha: trocar derruba todos                                                 |
| Ver o código pelo navegador                                         | Sem mapa de código em produção. O repositório é público: tornar privado é decisão pendente           |
| Quebrar formulário para ver erro do banco                           | Erro interno não vai para a tela; rotas devolvem mensagem curta                                      |
| Pasta de arquivos aberta                                            | Bucket privado com política por coleção, testado (`supabase/migrations/0002_arquivos.sql`)           |
| Script no nome de usuário                                           | React escapa o texto, política de conteúdo bloqueia script solto; teste de ponta a ponta             |
| Arquivo que não é foto                                              | Conferido pelo conteúdo antes de guardar; PDF falso é recusado                                       |
| `.env` no git                                                       | `.gitignore`, bloqueio de envio do GitHub e gitleaks no histórico                                    |
| Consulta direta ao banco                                            | Sem chave anônima com acesso: RLS em todas as tabelas, papel anônimo sem permissão                   |
| Mudar perfil para admin pelo navegador                              | Perfil nunca vem do navegador no banco; teste garante que ninguém sobe o próprio perfil              |
| Pedir à IA dado de outro cliente ou ignorar regras                  | IA ainda não existe; regras em AGENTS.md para quando entrar                                          |
| Preço, pedido, pagamento falso, cupom, reembolso, teste grátis, APK | Não se aplica hoje. Para o Asaas: valor calculado no servidor e webhook reconferido (AGENTS.md)      |
| Ler mensagem apagada                                                | Apagar remove do banco; regra em AGENTS.md                                                           |
| E-mail falso em nome da Sarto                                       | Depende do DNS do domínio: ver abaixo                                                                |

## Pendente com a Sarto

- **E-mail:** o domínio sartoimoveis.com.br não tem DMARC, e o SPF não inclui o Google, que recebe o e-mail. Sem isso, qualquer um manda e-mail "da Sarto". No DNS: SPF `v=spf1 include:_spf.google.com include:_spf.locaweb.com.br ~all`, DKIM ligado no Google Workspace e DMARC `_dmarc` com `v=DMARC1; p=quarantine; rua=mailto:dmarc@sartoimoveis.com.br`.
- **Repositório público:** qualquer pessoa lê o código. Não há segredo nele, mas a lógica e a estrutura ficam expostas.
- **Senha única:** enquanto não houver login individual, quem tem a senha pode trocar de perfil e ver tudo.

## Limites conhecidos do MVP

- Os cadastros ficam no navegador, sem cifra: use em computador com senha e conta própria. Sai com o Supabase.
- A trava de tentativas vale por instância do servidor.
- `style-src` aceita estilo embutido, exigido pelas barras e gráficos.
