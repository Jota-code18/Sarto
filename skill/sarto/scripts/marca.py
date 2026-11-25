"""Aplica a marca da Sarto nas fotos. Uso: python marca.py fotos/ --saida pronto/"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageOps, ImageStat

BASE = Path(__file__).resolve().parent.parent
EXT = {".jpg", ".jpeg", ".png", ".webp"}


def aplicar(im, posicao, largura, opacidade):
    w = max(120, round(im.width * largura))
    m = round(im.width * 0.03)
    lg = Image.open(BASE / "marca" / "sarto-claro.png").convert("RGBA")
    h = round(lg.height * w / lg.width)
    x, y = {
        "centro": ((im.width - w) // 2, (im.height - h) // 2),
        "direita": (im.width - w - m, im.height - h - m),
        "esquerda": (m, im.height - h - m),
    }[posicao]
    # sobre área clara, o logo escuro lê melhor
    claro = ImageStat.Stat(im.crop((x, y, x + w, y + h)).convert("L")).mean[0] > 168
    if claro:
        lg = Image.open(BASE / "marca" / "sarto-escuro.png").convert("RGBA")
    lg = lg.resize((w, h), Image.LANCZOS)
    lg.putalpha(lg.getchannel("A").point(lambda a: int(a * opacidade)))
    im = im.convert("RGB")
    im.paste(lg, (x, y), lg)
    return im


def main():
    p = argparse.ArgumentParser(description="Marca da Sarto nas fotos")
    p.add_argument("entrada")
    p.add_argument("--saida", default="com-marca")
    p.add_argument("--posicao", choices=["centro", "direita", "esquerda"], default="centro")
    p.add_argument("--largura", type=float, default=0.18, help="fração da largura da foto")
    p.add_argument("--opacidade", type=float, default=0.75)
    p.add_argument("--max", type=int, default=2400, help="lado maior em pixels")
    a = p.parse_args()
    e = Path(a.entrada)
    fs = [e] if e.is_file() else sorted(f for f in e.iterdir() if f.suffix.lower() in EXT)
    out = Path(a.saida)
    out.mkdir(parents=True, exist_ok=True)
    for f in fs:
        im = ImageOps.exif_transpose(Image.open(f))
        im.thumbnail((a.max, a.max), Image.LANCZOS)
        aplicar(im, a.posicao, a.largura, a.opacidade).save(out / f"{f.stem}.jpg", quality=92)
    print(f"{len(fs)} fotos em {out}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
