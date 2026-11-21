/* =====================================================
   Red Scout Bajío · Instalación como app (PWA)
   - Registra el service worker
   - Botón "Instalar app" en Android / Chrome / Edge
   - Aviso con instrucciones en iPhone / iPad
   ===================================================== */
(function () {
    'use strict';

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('service-worker.js').catch(function (err) {
                console.warn('No se pudo registrar el service worker:', err);
            });
        });
    }

    var eventoInstalar = null;
    var botones = function () { return document.querySelectorAll('.btn-instalar'); };

    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        eventoInstalar = e;
        botones().forEach(function (b) { b.style.display = ''; });
    });

    document.addEventListener('click', function (e) {
        var b = e.target.closest('.btn-instalar');
        if (!b || !eventoInstalar) { return; }
        eventoInstalar.prompt();
        eventoInstalar.userChoice.finally(function () {
            eventoInstalar = null;
            botones().forEach(function (x) { x.style.display = 'none'; });
        });
    });

    window.addEventListener('appinstalled', function () {
        botones().forEach(function (b) { b.style.display = 'none'; });
    });

    /* iOS no permite instalar con un botón: mostramos las instrucciones una vez */
    var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var yaInstalada = window.navigator.standalone === true ||
                      window.matchMedia('(display-mode: standalone)').matches;
    var avisoVisto = false;
    try { avisoVisto = localStorage.getItem('rsb-aviso-ios') === '1'; } catch (e) {}

    if (esIOS && !yaInstalada && !avisoVisto) {
        var aviso = document.createElement('div');
        aviso.setAttribute('role', 'dialog');
        aviso.setAttribute('aria-label', 'Cómo instalar la app');
        aviso.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));' +
            'z-index:2000;background:#1B4332;color:#fff;border-radius:14px;padding:14px 16px;' +
            'font:14px/1.4 Arial,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center';
        aviso.innerHTML = '<span style="flex:1">Instala la app: toca <strong>Compartir</strong> ' +
            '(el cuadro con la flecha) y elige <strong>Agregar a inicio</strong>.</span>' +
            '<button type="button" aria-label="Cerrar aviso" style="background:#EAB308;color:#14532d;border:0;' +
            'border-radius:999px;padding:8px 14px;font-weight:bold">Listo</button>';
        aviso.querySelector('button').addEventListener('click', function () {
            try { localStorage.setItem('rsb-aviso-ios', '1'); } catch (e) {}
            aviso.remove();
        });
        window.addEventListener('load', function () { document.body.appendChild(aviso); });
    }
})();
