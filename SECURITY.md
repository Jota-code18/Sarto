# Segurança

Achou uma falha? Não abra issue pública. Use "Report a vulnerability" na aba Security do repositório.

## O que protege o painel hoje

- Senha única (`PAINEL_SENHA`), passe assinado com validade de 14 dias e trava depois de 8 erros. Trocar a senha derruba todos os acessos.
- Política de conteúdo com código único por página, sem script solto, e lista fechada de destinos.
- Chaves só no servidor. A varredura não liga sem senha, tem teto de gasto e só aceita pedido do próprio painel.
- Links de fora só abrem em https. Planilha exportada não executa fórmula.
- CodeQL, Dependabot e auditoria de dependências no CI.

## Limites conhecidos do MVP

- Os cadastros ficam no navegador, sem cifra: use em computador com senha e conta própria. Sai com o Supabase.
- Trocar de perfil não é controle de acesso enquanto não houver login.
- A trava de tentativas vale por instância do servidor.
- `style-src` aceita estilo embutido, exigido pelas barras e gráficos.
