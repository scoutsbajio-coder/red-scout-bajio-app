/* Red Scout Bajío v2 · Explorar, Mapa y Recursos en una sola app */
(function () {
'use strict';
var PH = 'placeholder.svg', CENTRO = [21.05, -101.05];
var COLOR = { 'Guanajuato': '#1B4332', 'Querétaro': '#B45309', 'Aguascalientes': '#1D4ED8' };
var $ = function (s) { return document.querySelector(s); };
var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
var grid = $('#grid'), bar = $('#bar'), toastEl = $('#toast');
var datos = [], st = { q: '', est: 'todos', pos: null }, favs = [];
var mapa, capa, yo, tt;
try { favs = JSON.parse(localStorage.getItem('rsb-fav') || '[]'); } catch (e) {}

function guardaFavs() { try { localStorage.setItem('rsb-fav', JSON.stringify(favs)); } catch (e) {} }
function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function norm(t) { return String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
function color(l) { return COLOR[l.estado] || '#1B4332'; }
function aviso(txt) { toastEl.textContent = txt; toastEl.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('on'); }, 2400); }
function km(a, b, c, d) {
    var r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
    var h = Math.sin(x / 2) * Math.sin(x / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) * Math.sin(y / 2);
    return 12742 * Math.asin(Math.sqrt(h));
}

/* ---------- Filtrado ---------- */
function lista() {
    var q = norm(st.q);
    var r = datos.filter(function (l) {
        if (st.est === 'fav' && favs.indexOf(l.id) < 0) { return false; }
        if (st.est !== 'todos' && st.est !== 'fav' && l.estado !== st.est) { return false; }
        if (!q) { return true; }
        var t = [l.nombre, l.municipio, l.estado, l.descripcion].concat((l.etiquetas || []).map(function (e) { return e.texto; })).join(' ');
        return norm(t).indexOf(q) !== -1;
    });
    if (st.pos) {
        r.forEach(function (l) { l._km = km(st.pos[0], st.pos[1], l.lat, l.lng); });
        r.sort(function (a, b) { return a._km - b._km; });
    }
    return r;
}

/* ---------- Tarjetas ---------- */
var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } });
}, { threshold: .08 }) : null;

var FICHA = [['dificultad','fa-person-hiking',function(v){return v;}],['agua','fa-droplet',function(v){return v===true?'Hay agua':v===false?'Sin agua':v;}],['costo','fa-coins',function(v){return v;}],['permiso','fa-key',function(v){return 'Permiso: '+v;}],['temporada','fa-calendar',function(v){return v;}],['capacidad','fa-users',function(v){return 'Hasta '+v+' personas';}],['altitud','fa-mountain',function(v){return v+' msnm';}]];
function ficha(l) {
    var f = l.ficha || {}, h = FICHA.map(function (x) {
        var v = f[x[0]]; return v == null || v === '' ? '' : '<span class="fi"><i class="fas ' + x[1] + '"></i> ' + esc(x[2](v)) + '</span>';
    }).join('');
    if (f.verificado) { h += '<span class="fi ok"><i class="fas fa-circle-check"></i> Verificado ' + esc(f.verificado) + '</span>'; }
    return h ? '<div class="fch">' + h + '</div>' : '';
}

function tarjeta(l, i) {
    var es = favs.indexOf(l.id) >= 0;
    var tags = (l.etiquetas || []).map(function (e) { return '<span><i class="fas ' + esc(e.icono) + '"></i> ' + esc(e.texto) + '</span>'; }).join('');
    return '<article class="card" style="--i:' + Math.min(i % 6, 5) + '" data-id="' + esc(l.id) + '">' +
        '<div class="ph"><img src="' + esc(l.foto || PH) + '" alt="' + esc(l.nombre) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer">' +
        '<button type="button" class="fav' + (es ? ' on' : '') + '" data-a="fav" aria-pressed="' + es + '" aria-label="Guardar ' + esc(l.nombre) + ' en favoritos"><i class="' + (es ? 'fas' : 'far') + ' fa-heart"></i></button>' +
        (l._km != null && st.pos ? '<span class="dist"><i class="fas fa-location-arrow"></i> ' + Math.round(l._km) + ' km</span>' : '') + '</div>' +
        '<div class="cb"><span class="bd" style="background:' + color(l) + '">' + esc(l.municipio) + '</span>' +
        '<h3>' + esc(l.nombre) + '</h3><p>' + esc(l.descripcion) + '</p><div class="tg">' + tags + '</div>' + ficha(l) +
        '<div class="ac"><a class="bt" href="#mapa" data-a="mapa" aria-label="Ver ' + esc(l.nombre) + ' en el mapa">Ver ubicación</a>' +
        '<button type="button" class="bt sq" data-a="share" aria-label="Compartir ' + esc(l.nombre) + '"><i class="fas fa-share-nodes"></i></button></div></div></article>';
}

function pinta() {
    var r = lista();
    $('#cnt').textContent = r.length + (r.length === 1 ? ' lugar' : ' lugares') + (st.pos ? ' · ordenados por cercanía' : '');
    grid.innerHTML = r.length ? r.map(tarjeta).join('') :
        '<p class="vacio">' + (st.est === 'fav' ? 'Aún no tienes favoritos. Toca el ♥ en un lugar para guardarlo.' : 'No encontramos lugares con esa búsqueda.') + '</p>';
    $$('.card').forEach(function (c) { io ? io.observe(c) : c.classList.add('vis'); });
    if (mapa) { marcas(r); }
}

function chips() {
    var est = ['todos'].concat(Object.keys(COLOR), ['fav']);
    $('#chips').innerHTML = est.map(function (e) {
        var t = e === 'todos' ? 'Todos' : e === 'fav' ? '♥ Favoritos' : e;
        return '<button type="button" class="chip' + (st.est === e ? ' on' : '') + '" data-e="' + e + '" aria-pressed="' + (st.est === e) + '">' + t + '</button>';
    }).join('');
}

/* ---------- Mapa ---------- */
function initMapa() {
    if (!window.L) { aviso('No se pudo cargar el mapa'); return; }
    if (mapa) { setTimeout(function () { mapa.invalidateSize(); }, 50); return; }
    mapa = L.map('map', { zoomControl: true }).setView(CENTRO, 8);
    var base = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
    var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 17, attribution: 'Esri, Maxar' });
    var topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; OpenTopoMap' });
    L.control.layers({ '🗺️ Mapa': base, '🛰️ Satélite': sat, '🏔️ Topográfico': topo }, null, { position: 'topright' }).addTo(mapa);
    capa = L.layerGroup().addTo(mapa);
    marcas(lista(), true);
    pedido();
}

function marcas(r, ajusta) {
    capa.clearLayers();
    r.forEach(function (l) {
        var ic = L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36],
            html: '<div class="pin" style="background:' + color(l) + '"><i class="fas fa-campground"></i></div>' });
        var d = l.lat + ',' + l.lng;
        var m = L.marker([l.lat, l.lng], { icon: ic, title: l.nombre, alt: l.nombre }).addTo(capa);
        m.bindPopup('<div class="pp"><img src="' + esc(l.foto || PH) + '" alt="" referrerpolicy="no-referrer" onerror="this.src=\'' + PH + '\'">' +
            '<small>' + esc(l.municipio) + '</small><b>' + esc(l.nombre) + '</b>' +
            '<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + d + '"><i class="fas fa-map-marker-alt"></i> Ver en Google Maps</a>' +
            '<a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + d + '"><i class="fas fa-location-arrow"></i> Cómo llegar</a></div>', { minWidth: 200 });
        m._id = l.id;
    });
    if (ajusta !== true && r.length > 1 && r.length < datos.length) { mapa.fitBounds(L.latLngBounds(r.map(function (l) { return [l.lat, l.lng]; })), { padding: [50, 50], maxZoom: 11 }); }
    if (r.length === 1) { mapa.setView([r[0].lat, r[0].lng], 12); }
}

function abre(id) {
    var l = datos.filter(function (x) { return x.id === id; })[0];
    if (!l) { return; }
    initMapa();
    if (!mapa) { return; }
    mapa.setView([l.lat, l.lng], 14, { animate: true });
    setTimeout(function () { capa.eachLayer(function (m) { if (m._id === id) { m.openPopup(); } }); }, 500);
}

function pedido() {
    var id = new URLSearchParams(location.search).get('lugar');
    if (id && datos.length && location.hash === '#mapa') { abre(id); }
}

/* ---------- Cerca de mí ---------- */
$('#cerca').addEventListener('click', function () {
    var b = this;
    if (st.pos) { st.pos = null; b.classList.remove('on'); pinta(); return; }
    if (!navigator.geolocation) { aviso('Tu dispositivo no permite ubicación'); return; }
    aviso('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(function (p) {
        st.pos = [p.coords.latitude, p.coords.longitude];
        b.classList.add('on'); pinta();
        if (mapa) {
            if (yo) { mapa.removeLayer(yo); }
            yo = L.marker(st.pos, { icon: L.divIcon({ className: '', html: '<div class="yo"></div>', iconSize: [16, 16] }), interactive: false }).addTo(mapa);
        }
        var c = lista()[0];
        if (c) { aviso('Más cercano: ' + c.nombre + ' (' + Math.round(c._km) + ' km)'); }
    }, function () { aviso('No pudimos obtener tu ubicación'); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
});

/* ---------- Eventos ---------- */
$('#q').addEventListener('input', function () { st.q = this.value; pinta(); });
$('#chips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) { return; }
    st.est = b.dataset.e; chips(); pinta();
});
grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) { return; }
    var id = b.closest('.card').dataset.id, a = b.dataset.a;
    if (a === 'fav') {
        var i = favs.indexOf(id);
        if (i < 0) { favs.push(id); aviso('Guardado en favoritos'); } else { favs.splice(i, 1); }
        guardaFavs();
        if (st.est === 'fav') { pinta(); return; }
        b.classList.toggle('on', i < 0); b.setAttribute('aria-pressed', String(i < 0));
        b.firstChild.className = (i < 0 ? 'fas' : 'far') + ' fa-heart';
    } else if (a === 'mapa') {
        e.preventDefault();
        history.pushState(null, '', '#mapa'); vista(); abre(id);
    } else if (a === 'share') {
        var url = location.origin + location.pathname + '?lugar=' + encodeURIComponent(id) + '#mapa';
        var l = datos.filter(function (x) { return x.id === id; })[0];
        if (navigator.share) { navigator.share({ title: l.nombre, text: l.nombre + ' · Red Scout Bajío', url: url }).catch(function () {}); }
        else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(function () { aviso('Enlace copiado'); }); }
    }
});
grid.addEventListener('error', function (e) {
    if (e.target.tagName === 'IMG' && e.target.getAttribute('src') !== PH) { e.target.src = PH; }
}, true);

/* ---------- Vistas ---------- */
function vista() {
    var h = (location.hash || '#explorar').slice(1);
    if (['explorar', 'mapa', 'recursos'].indexOf(h) < 0) { h = 'explorar'; }
    $$('.vista').forEach(function (v) { v.classList.toggle('on', v.id === h); });
    $$('[data-tab]').forEach(function (a) { a.classList.toggle('act', a.dataset.tab === h); a.toggleAttribute('aria-current', a.dataset.tab === h); });
    bar.hidden = h === 'recursos';
    document.documentElement.style.setProperty('--bar', bar.hidden ? '0px' : bar.offsetHeight + 'px');
    if (h === 'mapa') { initMapa(); } else { window.scrollTo(0, 0); }
}
window.addEventListener('hashchange', vista);
window.addEventListener('resize', function () { if (!bar.hidden) { document.documentElement.style.setProperty('--bar', bar.offsetHeight + 'px'); } });

function conexion() { $('#off').style.display = navigator.onLine ? 'none' : 'block'; }
window.addEventListener('online', conexion); window.addEventListener('offline', conexion); conexion();

/* ---------- Carga ---------- */
chips(); vista();
fetch('lugares.json').then(function (r) { if (!r.ok) { throw 0; } return r.json(); })
    .then(function (d) { datos = d.lugares || []; pinta(); pedido(); if (location.hash === '#mapa') { initMapa(); } })
    .catch(function () { grid.innerHTML = '<p class="vacio">No se pudieron cargar los lugares. Revisa tu conexión.</p>'; });
})();
