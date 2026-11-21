/* =====================================================
   Red Scout Bajío · Service worker
   -----------------------------------------------------
   Para publicar cambios a todos los usuarios, sube el
   número de VERSION (v4 -> v5 -> v6 ...) en cada despliegue.
   ===================================================== */
const VERSION = 'v9';
const CACHE = 'red-scout-' + VERSION;

/* Archivos propios que se guardan al instalar la app */
const PRECACHE = [
    './',
    'index.html',
    'mapa.html',
    'lugares.json',
    'manifest.webmanifest',
    'app.js',
    'styles.css',
    'pwa.js',
    'favicon-64.png',
    'favicon.ico',
    'icon-192.png',
    'icon-512.png',
    'apple-touch-icon.png',
    'placeholder.svg',
    'banner_movil.webp',
    'banner_optimizado.webp'
];

/* Librerías externas que se guardan para abrir sin internet */
const CDN_PRECACHE = [
    'https://cdn.tailwindcss.com/',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];
const CDN_HOSTS = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'unpkg.com'];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(PRECACHE);
        /* Fotos locales de lugares.json: se guardan solas para verlas sin internet */
        try {
            const datos = await (await fetch('lugares.json')).json();
            await Promise.allSettled(datos.lugares
                .filter((l) => l.foto && !/^https?:/.test(l.foto))
                .map((l) => cache.add(l.foto)));
        } catch (e) { /* sin fotos locales todavía */ }
        /* Si una librería externa falla, no se cancela la instalación */
        await Promise.allSettled(CDN_PRECACHE.map(async (url) => {
            const resp = await fetch(new Request(url, { mode: 'cors', credentials: 'omit' }));
            if (resp.ok) { await cache.put(url, resp); }
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const nombres = await caches.keys();
        await Promise.all(
            nombres
                .filter((n) => n.startsWith('red-scout-') && n !== CACHE)
                .map((n) => caches.delete(n))
        );
        await self.clients.claim();
    })());
});

/* Responde con lo guardado y actualiza en segundo plano */
async function conActualizacion(event, request) {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(request);
    const red = fetch(request)
        .then((resp) => {
            if (resp && resp.ok) { cache.put(request, resp.clone()); }
            return resp;
        })
        .catch(() => null);
    if (guardado) {
        event.waitUntil(red);
        return guardado;
    }
    return (await red) || Response.error();
}

/* Primero internet; si no hay, la copia guardada (así los lugares nuevos aparecen de inmediato) */
async function redPrimero(request) {
    const cache = await caches.open(CACHE);
    try {
        const resp = await fetch(request);
        if (resp && resp.ok) { cache.put(request, resp.clone()); }
        return resp;
    } catch (error) {
        return (await cache.match(request)) || Response.error();
    }
}

/* Librerías externas: copia guardada si existe; si no, internet.
   Si el servidor no permite CORS, la deja pasar tal cual. */
async function libreriaExterna(event, request) {
    const cache = await caches.open(CACHE);
    const guardado = await cache.match(request.url);
    const actualizar = fetch(new Request(request.url, { mode: 'cors', credentials: 'omit' }))
        .then((resp) => {
            if (resp && resp.ok) { cache.put(request.url, resp.clone()); }
            return resp;
        })
        .catch(() => null);
    if (guardado) {
        event.waitUntil(actualizar);
        return guardado;
    }
    const resp = await actualizar;
    return resp || fetch(request);
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') { return; }
    const url = new URL(request.url);

    /* Páginas: primero internet y, si no hay, la copia guardada */
    if (request.mode === 'navigate') {
        event.respondWith((async () => {
            try {
                const resp = await fetch(request);
                if (resp.ok && url.origin === location.origin) {
                    const cache = await caches.open(CACHE);
                    cache.put(request, resp.clone());
                }
                return resp;
            } catch (error) {
                const cache = await caches.open(CACHE);
                return (await cache.match(request, { ignoreSearch: true })) ||
                       (await cache.match('index.html')) ||
                       Response.error();
            }
        })());
        return;
    }

    /* Datos: siempre lo más reciente posible */
    if (url.origin === location.origin && url.pathname.endsWith('/lugares.json')) {
        event.respondWith(redPrimero(request));
        return;
    }

    /* Archivos propios (scripts, imágenes) */
    if (url.origin === location.origin) {
        event.respondWith(conActualizacion(event, request));
        return;
    }

    /* Librerías externas permitidas (Tailwind, Font Awesome, Leaflet) */
    if (CDN_HOSTS.includes(url.hostname)) {
        event.respondWith(libreriaExterna(event, request));
        return;
    }

    /* Todo lo demás (mosaicos del mapa, fotos externas) va directo a internet */
});
