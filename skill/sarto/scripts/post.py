"""Monta posts da Sarto no formato do Instagram. Uso: python post.py --help"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

BASE = Path(__file__).resolve().parent.parent
CARVAO, PAPEL, NEVOA = (38, 38, 38), (245, 245, 244), (168, 168, 164)
TAM = {"feed": (1080, 1350), "quadrado": (1080, 1080), "story": (1080, 1920)}


def fonte(peso, px):
    return ImageFont.truetype(str(BASE / "fontes" / f"Poppins-{peso}.ttf"), px)


def abrir(caminho, tam):
    """Corta no formato sem deformar, respeitando a rotação do celular."""
    im = ImageOps.exif_transpose(Image.open(caminho)).convert("RGB")
    if min(im.size) < 900:
        print(f"aviso: foto pequena ({im.width}x{im.height}), pode perder nitidez", file=sys.stderr)
    return ImageOps.fit(im, tam, Image.LANCZOS, centering=(0.5, 0.5))


def sombra(im, topo, base, cor=(20, 20, 20)):
    """Escurece de cima para baixo: topo e base são a força, de 0 a 1."""
    g = Image.new("L", (1, im.height))
    for y in range(im.height):
        t = y / (im.height - 1)
        g.putpixel((0, y), int(255 * (topo + (base - topo) * t)))
    return Image.composite(Image.new("RGB", im.size, cor), im, g.resize(im.size))


def logo(im, nome, altura, x=None, y=0, opacidade=1.0):
    lg = Image.open(BASE / "marca" / f"{nome}.png").convert("RGBA")
    lg = lg.resize((round(lg.width * altura / lg.height), altura), Image.LANCZOS)
    if opacidade < 1:
        lg.putalpha(lg.getchannel("A").point(lambda a: int(a * opacidade)))
    px = (im.width - lg.width) // 2 if x is None else x
    im.paste(lg, (px, y), lg)
    return lg.width


def largura(d, t, f, esp=0):
    return sum(d.textlength(c, font=f) + esp for c in t) - esp if esp else d.textlength(t, font=f)


def escrever(d, xy, t, f, cor, esp=0):
    """Texto com espaço entre letras (o Pillow não tem isso pronto)."""
    x, y = xy
    if not esp:
        d.text((x, y), t, font=f, fill=cor)
        return
    for c in t:
        d.text((x, y), c, font=f, fill=cor)
        x += d.textlength(c, font=f) + esp


def centro(d, w, y, t, f, cor, esp=0):
    escrever(d, ((w - largura(d, t, f, esp)) / 2, y), t, f, cor, esp)


def caber(d, t, peso, px, maxw, esp=0, minimo=26):
    while px > minimo and largura(d, t, fonte(peso, px), esp) > maxw:
        px -= 2
    return fonte(peso, px)


def quebrar(d, t, f, maxw):
    linhas, atual = [], ""
    for p in t.split():
        x = f"{atual} {p}".strip()
        if d.textlength(x, font=f) <= maxw:
            atual = x
        else:
            linhas.append(atual)
            atual = p
    return [x for x in [*linhas, atual] if x]


def tracejado(d, x0, x1, y, cor):
    x = x0
    while x < x1:
        d.line((x, y, min(x + 14, x1), y), fill=cor, width=2)
        x += 23


def imovel(a, tam):
    w, h = tam
    barra = 190 if a.dado else 0
    im = Image.new("RGB", tam, CARVAO)
    foto = sombra(abrir(a.foto, (w, h - barra)), 0.18 * a.escurecer, 0.95 * a.escurecer)
    im.paste(foto, (0, 0))
    d = ImageDraw.Draw(im)
    logo(im, "sarto-claro", 62, y=64)
    base = h - barra - 70
    if a.preco:
        f = caber(d, a.preco, "Light", 58, w - 160)
        base -= f.size + 10
        centro(d, w, base, a.preco, f, PAPEL)
    f = caber(d, a.titulo, "Light", 112, w - 140)
    base -= int(f.size * 1.22)
    centro(d, w, base, a.titulo, f, PAPEL)
    if a.sobre:
        f2 = fonte("Regular", 36)
        centro(d, w, base - 34, a.sobre, f2, PAPEL, 2)
    if a.dado:
        n = len(a.dado)
        col = (w - 120) / n
        for i, t in enumerate(a.dado):
            f = caber(d, t.upper(), "Medium", 30, col - 30, 2, 18)
            cx = 60 + col * i + col / 2
            escrever(d, (cx - largura(d, t.upper(), f, 2) / 2, h - barra + 78 - f.size * 0.2), t.upper(), f, PAPEL, 2)
            if i:
                d.line((60 + col * i, h - barra + 62, 60 + col * i, h - 62), fill=(90, 90, 88), width=2)
    return im


def vendido(a, tam):
    w, h = tam
    im = ImageEnhance.Color(abrir(a.foto, tam)).enhance(0.72)
    im = sombra(im, 0.55 * a.escurecer, 0.72 * a.escurecer)
    d = ImageDraw.Draw(im)
    logo(im, "sarto-claro", 58, y=78)
    cy = int(h * 0.40)
    f1, f2 = fonte("Regular", 28), fonte("SemiBold", 28)
    t1, t2 = f"{a.tipo} no ".upper() if a.local else a.tipo.upper(), (a.local or "").upper()
    if a.conector:
        t1 = f"{a.tipo} {a.conector} ".upper()
    tot = largura(d, t1, f1, 5) + 5 + largura(d, t2, f2, 5)
    if tot > w - 100:
        k = (w - 100) / tot
        f1, f2 = fonte("Regular", int(28 * k)), fonte("SemiBold", int(28 * k))
        tot = largura(d, t1, f1, 5) + 5 + largura(d, t2, f2, 5)
    x = (w - tot) / 2
    escrever(d, (x, cy), t1, f1, PAPEL, 5)
    escrever(d, (x + largura(d, t1, f1, 5) + 5, cy), t2, f2, PAPEL, 5)
    f = caber(d, "VENDIDO", "Light", 138, w - 150, 34)
    centro(d, w, cy + 66, "VENDIDO", f, PAPEL, 34)
    y = cy + 66 + int(f.size * 1.5)
    if a.preco:
        centro(d, w, y, a.preco, fonte("Regular", 34), PAPEL, 8)
        y += 84
    if a.dado:
        t = "  |  ".join(x.upper() for x in a.dado)
        centro(d, w, y, t, caber(d, t, "Regular", 26, w - 110, 3, 17), PAPEL, 3)
    return im


def institucional(a, tam):
    w, h = tam
    if a.foto:
        im = sombra(ImageOps.grayscale(abrir(a.foto, tam)).convert("RGB"), 0.55 * a.escurecer, 0.86 * a.escurecer)
    else:
        im = Image.new("RGB", tam, CARVAO)
    d = ImageDraw.Draw(im)
    m = 100
    logo(im, "simbolo-claro", 150, x=m, y=int(h * 0.17))
    y = int(h * 0.36)
    px = 104
    while px > 54:
        linhas = quebrar(d, a.titulo.upper(), fonte("Bold", px), w - 2 * m)
        if len(linhas) <= 4 and all(largura(d, x, fonte("Bold", px)) <= w - 2 * m for x in linhas):
            break
        px -= 4
    for li in linhas:
        d.text((m, y), li, font=fonte("Bold", px), fill=PAPEL)
        y += int(px * 1.16)
    if a.texto or a.destaque:
        y = max(y + 60, int(h * 0.74))
        tracejado(d, m, w - m, y - 34, NEVOA)
        f, fb = fonte("Regular", 36), fonte("Bold", 36)
        for li in quebrar(d, a.texto or "", f, w - 2 * m):
            d.text((m, y), li, font=f, fill=PAPEL)
            y += 52
        for li in quebrar(d, a.destaque or "", fb, w - 2 * m):
            d.text((m, y), li, font=fb, fill=PAPEL)
            y += 52
    return im


def curiosidade(a, tam):
    w, h = tam
    im = Image.new("RGB", tam, PAPEL)
    d = ImageDraw.Draw(im)
    m = 100
    escrever(d, (m, 96), "#", fonte("Regular", 26), CARVAO)
    escrever(d, (m + 18, 96), "CURIOSIDADE", fonte("SemiBold", 26), CARVAO, 2)
    y = int(h * 0.27)
    px = 92
    while px > 52 and len(quebrar(d, a.titulo, fonte("SemiBold", px), w - 2 * m)) > 4:
        px -= 4
    for li in quebrar(d, a.titulo, fonte("SemiBold", px), w - 2 * m):
        d.text((m, y), li, font=fonte("SemiBold", px), fill=CARVAO)
        y += int(px * 1.18)
    y += 46
    tracejado(d, m, w - m, y, CARVAO)
    y += 52
    f = fonte("Regular", 44)
    for li in quebrar(d, a.texto or "", f, w - 2 * m):
        d.text((m, y), li, font=f, fill=CARVAO)
        y += 66
    if y > h - 190:
        print("aviso: texto longo demais, passe de 40 palavras só no carrossel", file=sys.stderr)
    logo(im, "sarto-escuro", 56, x=m, y=h - 140)
    return im


def main():
    p = argparse.ArgumentParser(description="Posts da Sarto")
    p.add_argument("modelo", choices=["imovel", "vendido", "institucional", "curiosidade"])
    p.add_argument("--foto")
    p.add_argument("--titulo", default="")
    p.add_argument("--sobre", default="", help="linha acima do título, ex.: Condomínio")
    p.add_argument("--tipo", default="Imóvel")
    p.add_argument("--local", default="")
    p.add_argument("--conector", default="", help="no, na, em; padrão: no")
    p.add_argument("--preco", default="")
    p.add_argument("--dado", action="append", default=[], help="repita até 4 vezes")
    p.add_argument("--texto", default="")
    p.add_argument("--destaque", default="")
    p.add_argument("--formato", choices=list(TAM), default="feed")
    p.add_argument("--escurecer", type=float, default=1.0, help="0.5 clareia, 1.2 escurece")
    p.add_argument("--saida", default="post.png")
    a = p.parse_args()
    if a.modelo in ("imovel", "vendido") and not a.foto:
        p.error("este modelo precisa de --foto")
    if a.modelo != "vendido" and not a.titulo:
        p.error("este modelo precisa de --titulo")
    a.escurecer = min(1.35, max(0.3, a.escurecer))
    im = globals()[a.modelo](a, TAM[a.formato])
    im.save(a.saida, quality=95)
    print(f"{a.saida} {im.width}x{im.height}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
