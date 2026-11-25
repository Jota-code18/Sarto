"""Confere o que é medível nas fotos de uma captação. Uso: python conferir_fotos.py fotos/ --tipo condominio"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps, ImageStat

EXT = {".jpg", ".jpeg", ".png", ".webp"}
MIN = {"casa_rua": 20, "condominio": 25, "apartamento": 18, "lote": 6, "comercial": 12}


def digital(im):
    """Impressão da imagem para achar repetidas"""
    g = im.convert("L").resize((9, 8), Image.LANCZOS)
    px = list(g.tobytes())
    return [px[y * 9 + x] > px[y * 9 + x + 1] for y in range(8) for x in range(8)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("pasta")
    p.add_argument("--tipo", choices=list(MIN), required=True)
    p.add_argument("--minimo", type=int)
    a = p.parse_args()
    fs = sorted(f for f in Path(a.pasta).iterdir() if f.suffix.lower() in EXT)
    minimo = a.minimo or MIN[a.tipo]
    vistas, boas = [], 0
    for f in fs:
        try:
            im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
        except Exception:
            print(f"REPROVA {f.name}: arquivo não abre")
            continue
        mot, obs = [], []
        if im.height > im.width:
            mot.append("vertical")
        if min(im.size) < 720:
            mot.append(f"pequena ({im.width}x{im.height})")
        if "whatsapp" in f.name.lower():
            mot.append("veio do WhatsApp, pedir o original")
        g = im.convert("L")
        g.thumbnail((900, 900))
        st = ImageStat.Stat(g)
        if st.mean[0] < 62:
            mot.append("escura")
        if st.mean[0] > 215:
            mot.append("estourada")
        nit = ImageStat.Stat(g.filter(ImageFilter.Kernel((3, 3), [0, 1, 0, 1, -4, 1, 0, 1, 0], 1, 128))).var[0]
        if nit < 18:
            obs.append("olhar nitidez")
        dg = digital(im)
        for n, o in vistas:
            if sum(x != y for x, y in zip(dg, o)) <= 6:
                mot.append(f"repetida de {n}")
                break
        vistas.append((f.name, dg))
        boas += not mot
        print(f"{'REPROVA' if mot else 'ok     '} {f.name}: {', '.join(mot + obs) or f'{im.width}x{im.height}'}")
    print(f"\n{boas} de {len(fs)} passaram. Mínimo para {a.tipo}: {minimo}.", "Atende." if boas >= minimo else f"Faltam {minimo - boas}.")
    print("Agora olhe as fotos: o script não vê bagunça, pessoa, placa, espelho nem marca de outra imobiliária.")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    main()
