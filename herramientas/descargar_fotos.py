#!/usr/bin/env python3
"""Descarga las fotos externas de lugares.json, las convierte a WebP (800 px de ancho),
las guarda en fotos/ y actualiza lugares.json.

Uso (desde la raíz del repositorio, en tu computadora):
    pip install pillow
    python herramientas/descargar_fotos.py
"""
import io, json, os, urllib.request
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RUTA_JSON = os.path.join(RAIZ, 'lugares.json')
os.makedirs(os.path.join(RAIZ, 'fotos'), exist_ok=True)

datos = json.load(open(RUTA_JSON, encoding='utf-8'))
bien, mal = 0, 0
for l in datos['lugares']:
    url = l.get('foto') or ''
    if not url.startswith('http'):
        continue
    destino = 'fotos/%s.webp' % l['id']
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=20).read())).convert('RGB')
        if im.width > 800:
            im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(os.path.join(RAIZ, destino), 'WEBP', quality=80)
        aviso = '  <- baja resolución, conviene reemplazarla' if im.width < 500 else ''
        print('OK   %-34s %dx%d%s' % (l['id'], im.width, im.height, aviso))
        l['foto'] = destino
        bien += 1
    except Exception as e:
        print('FALLÓ %-33s %s' % (l['id'], e))
        mal += 1

json.dump(datos, open(RUTA_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('\nListo: %d descargadas, %d fallaron (siguen con su enlace original).' % (bien, mal))
print('Sube la carpeta fotos/ y lugares.json a GitHub, y sube VERSION en service-worker.js.')
