---
name: sarto
description: Padrão da Sarto Imóveis (Anápolis-GO) para posts de Instagram, marca nas fotos, conferência de fotos de captação, legendas, descrições de anúncio e mensagens de aniversário. Use sempre que o pedido citar a Sarto, um imóvel da Sarto, post de vendido, post de imóvel, institucional ou curiosidade, marca d'água, fotos de captação, legenda, texto de anúncio ou aniversário de cliente.
---

# Sarto Imóveis

A Sarto trabalha como uma alfaiataria: imóvel de alto padrão, atendimento sob medida, acabamento sem erro. O material tem que parecer isso. Na dúvida, menos elementos.

## O que fazer em cada pedido

| Pedido | Faça |
| --- | --- |
| Post de imóvel | `scripts/post.py imovel` e legenda |
| Post de vendido | `scripts/post.py vendido` e legenda |
| Institucional ou frase | `scripts/post.py institucional` |
| Curiosidade ou dica | `scripts/post.py curiosidade` e legenda |
| Colocar a marca nas fotos | `scripts/marca.py` |
| Conferir fotos de uma captação | `scripts/conferir_fotos.py` e leia `referencias/fotografia.md` |
| Legenda, anúncio, aniversário | leia `referencias/tom-de-voz.md` |
| Dúvida de cor, fonte ou logo | leia `referencias/marca.md` |

Depois de gerar uma imagem, abra e olhe antes de entregar: texto cortado, texto em cima de área clara, logo ilegível ou foto torta se refaz.

## Regras que não mudam

1. Não invente dado. Preço, metragem, suítes, código e bairro vêm de quem pediu. Se faltar, pergunte ou deixe de fora.
2. Preço no post e preço na legenda são o mesmo. Confira dígito por dígito.
3. Vendido só com confirmação de que pode divulgar o valor. Sem confirmação, gere sem preço (omita `--preco`).
4. Nunca mostre nome, telefone, placa de carro, rosto ou documento de cliente ou morador.
5. O logo não muda de cor, proporção ou letra. Só claro sobre escuro ou escuro sobre claro.
6. Retoque pesado (tirar objeto, trocar céu, corrigir lente) é do videomaker. Aqui se corta, enquadra, escurece e aplica texto.
7. Foto baixada do site já vem com o símbolo no centro. Para post e para `marca.py`, peça o arquivo original.
8. Nada que seja jurídico (contrato, cláusula, promessa de prazo) sai por esta skill: é com a Gabi.

## Comandos

Todos rodam com Python e Pillow (`pip install pillow`). Saída padrão: 1080x1350, formato do feed.

```bash
python scripts/post.py imovel --foto foto.jpg --titulo "Belas Artes" --sobre "Condomínio" \
  --preco "R$ 4.100.000" --dado "420 m²" --dado "Cód. 94929" --dado "Deck automatizado" --saida post.png

python scripts/post.py vendido --foto foto.jpg --tipo "Casa" --local "Terras Alphaville" \
  --preco "R$ 1.450.000" --dado "389 m² de terreno" --dado "Térrea" --dado "3 suítes" --saida vendido.png

python scripts/post.py institucional --foto textura.jpg --titulo "Nossas verdades." \
  --texto "Assim como os maiores atletas seguem princípios para chegar ao topo, nós também temos" --destaque "regras inegociáveis." --saida inst.png

python scripts/post.py curiosidade --titulo "Quem paga o ITBI?" \
  --texto "Na compra, o imposto é do comprador, pago antes do registro." --saida dica.png

python scripts/marca.py fotos/ --saida fotos-marca/ --posicao centro
python scripts/conferir_fotos.py fotos/ --tipo condominio
```

`--formato story` gera 1080x1920. `--escurecer 0.7` ajusta a sombra quando o texto não lê bem.

## Entrega

Mande a imagem, a legenda pronta para copiar e, se algo ficou por confirmar, uma linha dizendo o quê.
