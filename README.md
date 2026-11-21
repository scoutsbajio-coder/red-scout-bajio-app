# Red Scout Bajío (app)

Zonas de camping y hiking, mapa interactivo y biblioteca de recursos para la comunidad scout del Bajío.
Sitio: https://scoutsbajio-coder.github.io/red-scout-bajio-app/

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.html`, `styles.css`, `app.js` | La app (Explorar, Mapa, Recursos) |
| `lugares.json` | **Todos los lugares.** Aquí se agregan y editan |
| `pwa.js`, `service-worker.js`, `manifest.webmanifest` | Instalación y uso sin internet |
| `mapa.html` | Redirige a `index.html#mapa` (enlaces antiguos) |
| `herramientas/descargar_fotos.py` | Pasa las fotos externas a WebP locales (carpeta `fotos/`) |

## Ficha práctica de cada lugar
Dentro de cada lugar, el bloque `"ficha"` es opcional; solo se muestra lo que tenga valor:
`dificultad` ("Fácil", "Media", "Difícil"), `agua` (true/false), `costo` ("Gratis", "$50 por persona"),
`permiso` ("Pedir a la presidencia municipal"), `temporada` ("Oct–Mar"), `capacidad` (número),
`altitud` (metros) y `verificado` ("2026-11"). **Llena solo datos que hayas confirmado.**

## Publicar cambios
Sube el número `VERSION` en `service-worker.js` cada vez que cambies archivos.

## Probar en tu computadora
`python3 -m http.server` y abre http://localhost:8000
