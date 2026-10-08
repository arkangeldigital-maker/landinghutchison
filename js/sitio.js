/* =====================================================================
   Hutchison Ports México — el sitio se arma a partir de contenido.xml
   ---------------------------------------------------------------------
   1. Descarga y valida el XML.
   2. Construye cabecera, portada, cifras, filtros, directorio y pie.
   3. Activa los efectos (aparición al hacer scroll, carrusel, contadores,
      brillo que sigue al cursor, filtros, menú móvil).
   En localhost revisa el XML cada 2 s y se actualiza solo al guardarlo.
   ===================================================================== */
(function () {
  'use strict';

  var FUENTE = document.documentElement.getAttribute('data-xml') || 'contenido.xml';
  var ES_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var SIN_MOVIMIENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================ ÍCONOS ============================ */

  var ICONOS = {
    web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5s-1.3 6.7-3.9 9.5c-2.6-2.8-3.9-6-3.9-9.5s1.3-6.7 3.9-9.5z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.9 5.2a2.1 2.1 0 1 1-4.2 0 2.1 2.1 0 0 1 4.2 0zM3 8.7h3.8V21H3zM9.3 8.7h3.6v1.7h.1c.5-.9 1.7-2 3.6-2 3.8 0 4.5 2.5 4.5 5.8V21h-3.8v-6.1c0-1.5 0-3.3-2-3.3s-2.3 1.6-2.3 3.2V21H9.3z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.7 4.7 12 4.7 12 4.7s-6.7 0-8.5.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 4.8 2.8 2.8 0 0 0 2 2c1.8.5 8.5.5 8.5.5s6.7 0 8.5-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-4.8zM9.8 15.1V8.9l5.6 3.1z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21.5v-8h2.7l.4-3.2h-3.1V8.3c0-.9.3-1.5 1.6-1.5h1.7V4a22 22 0 0 0-2.5-.1c-2.4 0-4.1 1.5-4.1 4.2v2.3H7.5v3.2h2.7v8z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.3l-7.2 8.2 8.5 10.8h-6.6l-5.2-6.8L4.6 22H1.3l7.7-8.8L.9 3h6.8l4.7 6.2zm-1.2 17h1.8L6.6 4.9H4.7z"/></svg>',
    brochure: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>',
    expansion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
    ubicacion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21.5s-7-6.1-7-11.8a7 7 0 0 1 14 0c0 5.7-7 11.8-7 11.8z"/><circle cx="12" cy="9.6" r="2.6"/></svg>',
    telefono: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 3.5h3.5l1.7 4.3-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.3 1.7V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/></svg>',
    correo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6.5 9 6.5 9-6.5"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3.5 20.5l1.3-4.2A8.6 8.6 0 1 1 8 19.4z"/><path d="M9 8.3c.2-.5.6-.5.9-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .5a6 6 0 0 0 2.6 2.4c.2.1.4.1.5-.1l.6-.7c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5v.4c0 .9-1 1.6-2 1.6A7.3 7.3 0 0 1 8.7 10c0-.6.1-1.2.3-1.7z" fill="currentColor" stroke="none"/></svg>',
    fax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 9V3.5h10V9"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5v.01"/></svg>',
    izq: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    der: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    flecha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m0 0-6-6m6 6 6-6"/></svg>',
    arriba: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>'
  };
  var NOMBRES_RED = { web: 'Sitio web', linkedin: 'LinkedIn', youtube: 'YouTube', facebook: 'Facebook', instagram: 'Instagram', x: 'X', brochure: 'Brochure', expansion: 'Expansión' };
  // Tipos que se muestran como botón con texto (no como ícono en recuadro).
  var BOTONES = { brochure: true, expansion: true };

  // Símbolo de la marca (dos triángulos con la diagonal blanca).
  // Proporciones del símbolo oficial: 37.7 × 49.6 (más alto que ancho), con la franja blanca en diagonal.
  var SIMBOLO = '<svg class="simbolo" viewBox="0 0 37.7 49.6" aria-hidden="true"><polygon points="0,0 37.7,0 37.7,6.5 0,28.6" class="simbolo-claro"/><polygon points="0,38.6 37.7,16.6 37.7,49.6 0,49.6" class="simbolo-oscuro"/></svg>';

  /* ============================ XML ============================ */

  function leerXml(texto) {
    var doc = new DOMParser().parseFromString(texto, 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      var detalle = (err.textContent || '').replace(/\s+/g, ' ').trim();
      var linea = detalle.match(/line(?: number)?\s*(\d+)/i) || detalle.match(/línea\s*(\d+)/i);
      throw new Error('El XML tiene un error de escritura' + (linea ? ' cerca de la línea ' + linea[1] : '') +
        '. Revisa que cada etiqueta que abres (<empresa>) tenga su cierre (</empresa>) y que los "&" se escriban como "&amp;".');
    }
    if (doc.documentElement.nodeName !== 'sitio') throw new Error('La etiqueta principal del XML debe ser <sitio>.');
    return doc;
  }

  function hijos(el, nombre) {
    if (!el) return [];
    return Array.prototype.filter.call(el.children, function (n) { return n.nodeName === nombre; });
  }
  function hijo(el, nombre) { return hijos(el, nombre)[0] || null; }
  function txt(el, nombre) {
    var n = nombre ? hijo(el, nombre) : el;
    return n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function visible(el) { return !/^(no|false|0)$/i.test(el.getAttribute('visible') || ''); }

  /* ============================ SEGURIDAD ============================ */

  function urlSegura(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return null;
    if (/^(https?:|mailto:|tel:)/i.test(u) || u.charAt(0) === '#') return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf('//') === 0) return null; // javascript:, data:, etc.
    return u;
  }
  function imagenSegura(u) {
    u = String(u == null ? '' : u).trim();
    if (!u) return null;
    if (/^https:\/\//i.test(u)) return u;
    if (/^[a-z][a-z0-9+.-]*:/i.test(u) || u.indexOf('//') === 0 || u.split('/').indexOf('..') !== -1) return null;
    return u;
  }
  function colorSeguro(c) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : null; }

  /* ============================ DOM ============================ */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v; // solo para íconos internos, nunca con datos del XML
      else if (k === 'class') el.className = v;
      else el.setAttribute(k, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(x); });
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  function prepararLink(a, url) {
    var href = urlSegura(url);
    if (!href || href === '#') {
      a.setAttribute('aria-disabled', 'true');
      a.classList.add('pendiente');
      a.title = (a.title ? a.title + ' · ' : '') + 'Link pendiente';
      return a;
    }
    a.href = href;
    // Otros sitios y documentos PDF se abren en una pestaña nueva.
    if (/^https?:/i.test(href) || /\.pdf([?#]|$)/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }

  // Texto con <b>, <i>, <br/> y <a url>. Cualquier otra etiqueta queda como texto plano.
  function inline(src, dest) {
    Array.prototype.forEach.call(src.childNodes, function (n) {
      if (n.nodeType === 3) return dest.appendChild(document.createTextNode(n.nodeValue.replace(/\s+/g, ' ')));
      if (n.nodeType !== 1) return;
      var tag = n.nodeName.toLowerCase(), e;
      if (tag === 'br') return dest.appendChild(h('br'));
      if (tag === 'b' || tag === 'strong') e = h('strong');
      else if (tag === 'i' || tag === 'em') e = h('em');
      else if (tag === 'a') e = prepararLink(h('a'), n.getAttribute('url'));
      else return inline(n, dest);
      inline(n, e);
      dest.appendChild(e);
    });
    return dest;
  }
  function parrafos(el) {
    if (!el) return [];
    var ps = hijos(el, 'p');
    if (!ps.length) ps = [el];
    return ps.map(function (p) { return inline(p, h('p')); });
  }

  function telHref(t) {
    var partes = t.split(/ext\.?/i);
    var num = partes[0].replace(/[^\d+]/g, '');
    var ext = partes[1] ? partes[1].replace(/\D/g, '') : '';
    return num ? 'tel:' + num + (ext ? ',' + ext : '') : null;
  }

  function normalizar(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  /* ============================ PIEZAS ============================ */

  function logotipoPrincipal(clase) {
    return h('span', { class: 'logotipo ' + (clase || ''), 'aria-label': 'Hutchison Ports' },
      h('span', { html: SIMBOLO }).firstChild,
      h('span', { class: 'logotipo-texto' }, h('b', { text: 'HUTCHISON' }), '\u2009PORTS'));
  }

  function redes(contenedor, clase) {
    var lista = h('ul', { class: 'redes ' + (clase || '') });
    var primerBoton = true;
    hijos(contenedor, 'red').forEach(function (r) {
      var tipo = (r.getAttribute('tipo') || '').toLowerCase();
      if (!ICONOS[tipo]) return;
      // Sin link (vacío o "#") o con visible="no": el ícono no se muestra.
      var url = urlSegura(r.getAttribute('url'));
      if (!url || url === '#' || !visible(r)) return;
      // texto="..." cambia lo que dice el botón (o el nombre que se lee al pasar el cursor).
      var nombre = r.getAttribute('texto') || NOMBRES_RED[tipo];
      var a = h('a', { class: 'red red-' + tipo, title: nombre, 'aria-label': nombre });
      var li = h('li');
      if (BOTONES[tipo]) {
        a.className = 'red-brochure red-boton-' + tipo;
        a.removeAttribute('aria-label');
        a.appendChild(h('span', { class: 'red-brochure-icono', html: ICONOS[tipo] }));
        a.appendChild(h('span', { text: nombre }));
        if (primerBoton) { li.className = 'primer-boton'; primerBoton = false; }
      } else {
        a.innerHTML = ICONOS[tipo];
      }
      li.appendChild(prepararLink(a, r.getAttribute('url')));
      lista.appendChild(li);
    });
    return lista.children.length ? lista : null;
  }

  function cabecera(raiz, categorias) {
    var nav = h('nav', { class: 'nav', id: 'nav', 'aria-label': 'Categorías' });
    categorias.forEach(function (c) {
      nav.appendChild(h('a', { href: '#' + c.id, 'data-cat': c.id, text: c.corto }));
    });
    var burger = h('button', { class: 'burger', type: 'button', 'aria-label': 'Abrir menú', 'aria-expanded': 'false', 'aria-controls': 'mnav' },
      h('span'), h('span'), h('span'));
    menuMovil(raiz, categorias, burger);
    return h('div', { class: 'contenedor cabecera-in' },
      h('a', { href: '#inicio', class: 'cabecera-logo' }, logotipoPrincipal()),
      nav, burger);
  }

  /* Menú móvil (mismo efecto que Boreal): un círculo azul se expande desde la
     hamburguesa, los links suben uno tras otro y entran las diagonales de la marca. */
  function menuMovil(raiz, categorias, burger) {
    var viejo = document.getElementById('mnav');
    if (viejo) viejo.remove();

    var links = h('ol', { class: 'mnav-links' });
    categorias.forEach(function (c, i) {
      links.appendChild(h('li', { style: '--i:' + i },
        h('a', { href: '#' + c.id, 'data-cat': c.id },
          h('span', { class: 'mnav-num', text: ('0' + (i + 1)).slice(-2) }),
          h('span', { class: 'mnav-texto', text: c.corto }))));
    });
    var extras = enlacesPortada(hijo(hijo(raiz, 'portada'), 'redes'));
    if (extras) {
      extras.classList.add('mnav-extras');
      extras.style.setProperty('--i', categorias.length);
    }

    var mnav = h('nav', { class: 'mnav', id: 'mnav', 'aria-label': 'Menú', inert: '' },
      h('div', { class: 'mnav-fondo', 'aria-hidden': 'true' }),
      h('div', { class: 'mnav-in' },
        h('p', { class: 'mnav-titulo', text: 'Directorio' }),
        links,
        extras));
    document.body.appendChild(mnav);

    function abrir(si) {
      if (si) {
        // El círculo nace justo en el centro de la hamburguesa.
        var r = burger.getBoundingClientRect();
        mnav.style.setProperty('--cx', (r.left + r.width / 2) + 'px');
        mnav.style.setProperty('--cy', (r.top + r.height / 2) + 'px');
      }
      document.body.classList.toggle('menu-abierto', si);
      burger.setAttribute('aria-expanded', String(si));
      burger.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
      if (si) mnav.removeAttribute('inert'); else mnav.setAttribute('inert', '');
    }
    burger.addEventListener('click', function () { abrir(!document.body.classList.contains('menu-abierto')); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) abrir(false); });

    function teclas(e) { if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) { abrir(false); burger.focus(); } }
    function tamano() { if (window.innerWidth > 1080 && document.body.classList.contains('menu-abierto')) abrir(false); }
    document.addEventListener('keydown', teclas);
    window.addEventListener('resize', tamano);
    limpiezas.push(function () {
      document.removeEventListener('keydown', teclas);
      window.removeEventListener('resize', tamano);
      document.body.classList.remove('menu-abierto');
    });
  }

  function portada(raiz) {
    var p = hijo(raiz, 'portada');
    if (!p) return null;

    var fotos = h('div', { class: 'portada-fotos' });
    hijos(p, 'foto').forEach(function (f, i) {
      var src = imagenSegura(txt(f));
      if (!src) return;
      fotos.appendChild(h('div', { class: 'portada-foto' + (i === 0 ? ' activa' : '') },
        h('img', { src: src, alt: f.getAttribute('alt') || '', fetchpriority: i === 0 ? 'high' : 'low', decoding: 'async' })));
    });

    // Título palabra por palabra para animarlo.
    var titulo = h('h1', { class: 'portada-titulo' });
    txt(p, 'titulo').split(' ').forEach(function (palabra, i) {
      titulo.appendChild(h('span', { class: 'palabra', style: '--i:' + i }, h('span', { text: palabra })));
      titulo.appendChild(document.createTextNode(' '));
    });

    var puntos = null;
    if (fotos.children.length > 1) {
      puntos = h('div', { class: 'portada-puntos', role: 'tablist', 'aria-label': 'Fotos' });
      Array.prototype.forEach.call(fotos.children, function (_, i) {
        puntos.appendChild(h('button', { type: 'button', class: i === 0 ? 'activo' : '', 'aria-label': 'Foto ' + (i + 1), 'data-i': i }));
      });
    }

    return h('section', { class: 'portada', id: 'inicio' },
      fotos,
      h('div', { class: 'portada-velo' }),
      h('div', { class: 'portada-diagonal', 'aria-hidden': 'true' }),
      h('div', { class: 'contenedor portada-in' },
        txt(p, 'antetitulo') ? h('p', { class: 'antetitulo', text: txt(p, 'antetitulo') }) : null,
        titulo,
        h('div', { class: 'portada-texto' }, parrafos(hijo(p, 'texto'))),
        enlacesPortada(hijo(p, 'redes'))),
      puntos,
      h('a', { class: 'portada-bajar', href: '#directorio', 'aria-label': 'Ir al directorio', html: ICONOS.flecha }));
  }

  /* ============================ PRESENCIA (cifras + mapa) ============================ */

  // Contorno simplificado de México (longitud, latitud): de Tijuana por la frontera norte,
  // el Golfo y Yucatán, la frontera sur, el Pacífico hasta el Golfo de California y la península.
  var MEXICO = [
    [-117.12, 32.53], [-114.72, 32.72], [-114.81, 32.49], [-111.07, 31.33], [-108.21, 31.33], [-108.21, 31.78],
    [-106.53, 31.78], [-106.0, 31.4], [-105.0, 30.7], [-104.7, 30.2], [-104.4, 29.6], [-103.3, 28.98], [-102.7, 29.7],
    [-102.3, 29.88], [-101.4, 29.77], [-100.9, 29.3], [-100.3, 28.3], [-99.5, 27.5], [-99.3, 26.8], [-98.0, 26.06],
    [-97.15, 25.95], [-97.4, 25.0], [-97.7, 24.0], [-97.75, 22.5], [-97.4, 21.5], [-97.2, 20.6], [-96.4, 19.8],
    [-96.13, 19.2], [-95.2, 18.7], [-94.5, 18.15], [-93.6, 18.4], [-92.6, 18.6], [-91.8, 18.6], [-91.4, 18.9],
    [-90.7, 19.4], [-90.5, 20.2], [-90.4, 21.0], [-89.6, 21.3], [-88.2, 21.6], [-87.1, 21.55], [-86.8, 21.1],
    [-87.4, 20.2], [-87.5, 19.5], [-87.8, 18.8], [-88.3, 18.5], [-88.9, 17.9], [-89.15, 17.82], [-90.98, 17.82],
    [-90.98, 17.25], [-91.44, 17.25], [-90.44, 16.08], [-91.73, 16.07], [-92.2, 14.53], [-93.2, 15.4], [-94.4, 16.1],
    [-95.2, 16.15], [-96.5, 15.65], [-97.8, 16.0], [-98.6, 16.5], [-99.9, 16.85], [-101.5, 17.6], [-102.2, 17.9],
    [-103.5, 18.3], [-104.3, 19.05], [-105.3, 20.0], [-105.4, 20.6], [-105.6, 21.5], [-105.8, 22.6], [-106.4, 23.2],
    [-107.5, 24.4], [-108.5, 25.4], [-109.2, 26.0], [-109.6, 26.8], [-110.3, 27.5], [-110.9, 27.9], [-111.9, 28.9],
    [-112.5, 29.9], [-113.1, 30.8], [-113.9, 31.4], [-114.7, 31.75], [-114.8, 31.0], [-114.5, 30.0], [-113.6, 29.2],
    [-112.9, 28.4], [-112.3, 27.4], [-111.6, 26.6], [-111.3, 25.8], [-110.7, 24.6], [-110.3, 24.1], [-109.5, 23.4],
    [-109.9, 22.9], [-110.3, 23.5], [-111.2, 24.2], [-112.1, 24.8], [-112.1, 25.7], [-112.8, 26.5], [-114.0, 27.1],
    [-114.3, 27.8], [-114.1, 28.2], [-114.6, 29.0], [-115.7, 29.8], [-116.3, 30.8], [-116.6, 31.8]
  ];
  var MAPA_ESCALA = 20, MAPA_COS = Math.cos(23.5 * Math.PI / 180);
  function proyectar(lon, lat) { // equirectangular, corregida a la latitud media del país
    return [(lon + 118) * MAPA_COS * MAPA_ESCALA, (33.2 - lat) * MAPA_ESCALA];
  }
  function svg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }

  function mapaMexico(nodoMapa, porCiudad) {
    var puntos = hijos(nodoMapa, 'punto').filter(visible).map(function (p) {
      var lat = parseFloat(p.getAttribute('lat')), lon = parseFloat(p.getAttribute('lon'));
      var ciudad = (p.getAttribute('ciudad') || '').trim();
      if (!ciudad || isNaN(lat) || isNaN(lon)) return null;
      var xy = proyectar(lon, lat);
      return { ciudad: ciudad, x: xy[0], y: xy[1], lado: p.getAttribute('etiqueta') || 'derecha', n: (porCiudad[ciudad] || []).length };
    }).filter(Boolean);
    if (!puntos.length) return null;
    var buscar = {};
    puntos.forEach(function (p) { buscar[p.ciudad] = p; });

    var d = MEXICO.map(function (c, i) { var xy = proyectar(c[0], c[1]); return (i ? 'L' : 'M') + xy[0].toFixed(1) + ' ' + xy[1].toFixed(1); }).join('') + 'Z';
    var raiz = svg('svg', { class: 'mapa-svg', viewBox: '-10 -6 610 400', role: 'img', 'aria-label': 'Mapa de México con las ciudades donde opera Hutchison Ports' },
      svg('defs', null,
        svg('pattern', { id: 'mapa-puntitos', width: 7, height: 7, patternUnits: 'userSpaceOnUse' },
          svg('circle', { cx: 1.5, cy: 1.5, r: 1.1, class: 'mapa-puntito' }))),
      svg('path', { d: d, class: 'mapa-tierra' }),
      svg('path', { d: d, class: 'mapa-trama' }),
      svg('path', { d: d, class: 'mapa-borde', pathLength: 1 }));

    // Corredores (líneas animadas entre ciudades), definidos en el XML.
    var corredores = svg('g', { class: 'mapa-corredores' });
    hijos(nodoMapa, 'corredor').filter(visible).forEach(function (c, i) {
      var a = buscar[(c.getAttribute('de') || '').trim()], b = buscar[(c.getAttribute('a') || '').trim()];
      if (!a || !b) return;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, largo = Math.sqrt(dx * dx + dy * dy) || 1;
      var curva = Math.min(60, largo * 0.28) * (i % 2 ? 1 : -1); // arco suave, alternando lado
      var cx = mx - dy / largo * curva, cy = my + dx / largo * curva;
      corredores.appendChild(svg('path', { class: 'mapa-corredor', d: 'M' + a.x + ' ' + a.y + 'Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y, style: '--i:' + i }));
    });
    raiz.appendChild(corredores);

    var grupo = svg('g', { class: 'mapa-puntos' });
    puntos.forEach(function (p, i) {
      var r = 7 + Math.min(p.n, 6) * 1.1;
      var dx = { derecha: r + 7, izquierda: -(r + 7), arriba: 0, abajo: 0 }[p.lado] || r + 7;
      var dy = { arriba: -(r + 9), abajo: r + 17 }[p.lado] || 4.5;
      var anchor = { izquierda: 'end', arriba: 'middle', abajo: 'middle' }[p.lado] || 'start';
      var etiqueta = svg('text', { class: 'mapa-etiqueta', x: dx, y: dy, 'text-anchor': anchor });
      etiqueta.textContent = p.ciudad;
      var cuenta = svg('text', { class: 'mapa-cuenta', x: 0, y: 3.6, 'text-anchor': 'middle' });
      cuenta.textContent = p.n;
      var g = svg('g', {
        class: 'mapa-punto', transform: 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')', 'data-ciudad': p.ciudad,
        tabindex: 0, role: 'button', 'aria-label': p.ciudad + ': ' + p.n + (p.n === 1 ? ' empresa' : ' empresas') + '. Ver en el directorio',
        style: '--i:' + i
      },
        svg('g', { class: 'mapa-punto-in' }, // se agranda en celular (CSS) sin mover el punto
          svg('circle', { class: 'mapa-pulso', r: r }),
          svg('circle', { class: 'mapa-nucleo', r: r }),
          cuenta, etiqueta));
      grupo.appendChild(g);
    });
    raiz.appendChild(grupo);
    return raiz;
  }

  function cifras(categorias, raiz) {
    var empresas = 0, porCiudad = {};
    categorias.forEach(function (c) {
      empresas += c.empresas.length;
      c.empresas.forEach(function (e) {
        e.ciudades.forEach(function (x) { (porCiudad[x] = porCiudad[x] || []).push(e.nombre); });
      });
    });
    var nombresCiudades = Object.keys(porCiudad);
    var nodoMapa = hijo(raiz, 'mapa');
    var mapa = nodoMapa && visible(nodoMapa) ? mapaMexico(nodoMapa, porCiudad) : null;

    function cifra(n, etiqueta) {
      return h('div', { class: 'cifra' },
        h('span', { class: 'cifra-num', 'data-num': n, text: SIN_MOVIMIENTO ? String(n) : '0' }),
        h('span', { class: 'cifra-etiqueta', text: etiqueta }));
    }
    var lista = h('ul', { class: 'presencia-ciudades' }, nombresCiudades.map(function (c) {
      return h('li', null, h('button', { type: 'button', 'data-ciudad': c },
        h('span', { class: 'presencia-ciudad', text: c }),
        h('span', { class: 'presencia-n', text: String(porCiudad[c].length) }),
        h('span', { class: 'presencia-empresas', text: porCiudad[c].join(' · ') })));
    }));

    return h('section', { class: 'presencia' + (mapa ? ' con-mapa' : ''), id: 'presencia', 'aria-label': 'Presencia en México' },
      h('div', { class: 'contenedor presencia-in' },
        h('div', { class: 'presencia-info revelar' },
          nodoMapa && nodoMapa.getAttribute('titulo') ? h('h2', { class: 'presencia-titulo', text: nodoMapa.getAttribute('titulo') }) : null,
          nodoMapa && nodoMapa.getAttribute('subtitulo') ? h('p', { class: 'presencia-sub', text: nodoMapa.getAttribute('subtitulo') }) : null,
          h('div', { class: 'cifras-in' },
            cifra(empresas, empresas === 1 ? 'Empresa' : 'Empresas'),
            cifra(categorias.length, categorias.length === 1 ? 'Línea de negocio' : 'Líneas de negocio'),
            cifra(nombresCiudades.length, nombresCiudades.length === 1 ? 'Ciudad' : 'Ciudades')),
          lista),
        mapa ? h('div', { class: 'presencia-mapa revelar' }, mapa,
          h('button', { type: 'button', class: 'presencia-limpiar', tabindex: '-1' }, h('span', { 'aria-hidden': 'true', text: '✕' }), ' Ver todas las ciudades')) : null));
  }


  /* ---------- Datos de contacto: cualquier cantidad, en el orden del XML ---------- */

  // Etiquetas que describen a la empresa; todo lo demás dentro de <empresa> es un dato de contacto.
  var ESTRUCTURA = { nombre: 1, logo: 1, ciudad: 1, redes: 1, descripcion: 1, linea: 1, fotos: 1 };

  // Cómo se muestra cada tipo conocido. Cualquier otra etiqueta se muestra con el ícono "info".
  var TIPOS_DATO = {
    direccion: { icono: 'ubicacion' },
    telefono: { icono: 'telefono', link: telHref },
    celular: { icono: 'telefono', link: telHref },
    whatsapp: { icono: 'whatsapp', link: waHref },
    fax: { icono: 'fax' },
    correo: { icono: 'correo', link: function (t) { return 'mailto:' + t.replace(/\s/g, ''); } },
    web: { icono: 'web', link: function (t) { return /^https?:/i.test(t) ? t : 'https://' + t; } },
    horario: { icono: 'reloj' },
    dato: { icono: 'info' }
  };

  function waHref(t) {
    var num = t.replace(/\D/g, '');
    return num ? 'https://wa.me/' + num : null;
  }

  function datoContacto(el) {
    var tipo = el.nodeName.toLowerCase();
    var def = TIPOS_DATO[tipo] || { icono: el.getAttribute('icono') || 'info' };
    var icono = ICONOS[el.getAttribute('icono')] || ICONOS[def.icono] || ICONOS.info;
    var valor;

    if (tipo === 'direccion') {
      var lineas = hijos(el, 'linea');
      var direccion = h('address', null, lineas.length
        ? lineas.map(function (l) { return inline(l, h('span', { class: 'linea' })); })
        : inline(el, h('span', { class: 'linea' })));
      var mapaUrl = urlMapa(el, lineas);
      valor = direccion;
      if (mapaUrl) {
        valor = prepararLink(h('a', { class: 'direccion-link', title: 'Ver en Google Maps' }, direccion), mapaUrl);
        var leer = lineas.length ? lineas.map(function (l) { return txt(l); }).join(', ') : txt(el);
        valor.setAttribute('aria-label', leer + ' (ver en Google Maps)');
        if (!valor.getAttribute('href')) valor = direccion;
      }
    } else {
      var texto = txt(el);
      if (!texto) return null;
      var url = el.hasAttribute('url') ? el.getAttribute('url') : def.link ? def.link(texto) : null;
      valor = url ? prepararLink(inline(el, h('a')), url) : inline(el, h('span'));
    }
    if (!valor.textContent.trim()) return null;

    return h('li', { class: 'dato dato-' + tipo.replace(/[^a-z0-9-]/g, '') },
      h('span', { class: 'dato-icono', html: icono }),
      h('div', { class: 'dato-valor' },
        el.getAttribute('etiqueta') ? h('span', { class: 'dato-etiqueta', text: el.getAttribute('etiqueta') }) : null,
        valor));
  }

  // La dirección es un link a Google Maps (en el celular abre la app).
  // url="..." en <direccion> usa ese link (p. ej. la ficha de Google Maps); como-llegar="no" lo quita.
  function urlMapa(el, lineas) {
    if (/^(no|false|0)$/i.test(el.getAttribute('como-llegar') || '')) return null;
    if (el.getElementsByTagName('a').length) return null; // ya trae sus propios links: no se anidan
    var texto = (lineas.length ? lineas.map(function (l) { return txt(l); }).join(', ') : txt(el))
      .replace(/\.\s*,/g, ',').replace(/\.$/, '').replace(/\s+/g, ' ').trim();
    if (!texto) return null;
    return el.getAttribute('url') || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(texto);
  }

  // Recorre los hijos en orden. Una <direccion> que llega después de otros datos
  // abre un grupo nuevo (dir1, tel1, correo1, dir2, tel2…). <sede nombre="…"> agrupa a mano.
  function listaContacto(contenedor, ul) {
    var anterior = null; // tipo del último dato mostrado
    Array.prototype.forEach.call(contenedor.children, function (el) {
      var tipo = el.nodeName.toLowerCase();
      if (ESTRUCTURA[tipo] || !visible(el)) return;
      if (tipo === 'sede') {
        var sede = h('li', { class: 'sede' + (ul.children.length ? ' nuevo-grupo' : '') },
          h('span', { class: 'sede-nombre', text: el.getAttribute('nombre') || txt(el, 'nombre') }));
        ul.appendChild(sede);
        listaContacto(el, ul);
        anterior = null;
        return;
      }
      var li = datoContacto(el);
      if (!li) return;
      if (tipo === 'direccion' && anterior && anterior !== 'direccion') li.classList.add('nuevo-grupo');
      ul.appendChild(li);
      anterior = tipo;
    });
    return ul;
  }

  // Separa los links en dos grupos: íconos de redes y botones de documentos
  // (Brochure, Expansión…), para acomodarlos sin que se desborden.
  function separarEnlaces(contenedor) {
    var todos = redes(contenedor);
    if (!todos) return null;
    var iconos = h('ul', { class: 'redes enlaces-iconos' });
    var docs = h('ul', { class: 'redes enlaces-docs' });
    Array.prototype.slice.call(todos.children).forEach(function (li) {
      li.classList.remove('primer-boton');
      (li.querySelector('.red-brochure') ? docs : iconos).appendChild(li);
    });
    return {
      iconos: iconos.children.length ? iconos : null,
      docs: docs.children.length ? docs : null
    };
  }

  // Portada: en escritorio todo en una fila; en móvil los botones bajan a su propia fila.
  function enlacesPortada(contenedor) {
    var g = separarEnlaces(contenedor);
    if (!g) return null;
    return h('div', { class: 'redes-portada' + (g.docs ? ' con-docs' : '') }, g.iconos, g.docs);
  }

  // Pie de la tarjeta (estilos filas | banda | compacto).
  function pieEnlaces(contenedor) {
    var g = separarEnlaces(contenedor);
    if (!g) return null;
    if (g.iconos) g.iconos.classList.add('pie-iconos');
    if (g.docs) g.docs.classList.add('pie-docs');
    return h('footer', { class: 'tarjeta-pie' + (g.docs ? ' con-docs' : '') }, g.iconos, g.docs);
  }

  /* Slider de fotos 16:9 (opcional) arriba de la tarjeta.
     Se desliza con el dedo (scroll-snap), con las flechas, con los puntos o con el teclado. */
  function sliderFotos(cont, nombre) {
    if (!cont || !visible(cont)) return null;
    var fotos = hijos(cont, 'foto').filter(visible).map(function (f) {
      return { src: imagenSegura(txt(f)), alt: f.getAttribute('alt') || 'Foto de ' + nombre };
    }).filter(function (f) { return f.src; });
    if (!fotos.length) return null;
    var varias = fotos.length > 1;

    var pista = h('div', { class: 'tslider-pista', tabindex: varias ? '0' : null },
      fotos.map(function (f, i) {
        return h('figure', { class: 'tslider-foto', 'aria-label': (i + 1) + ' de ' + fotos.length },
          h('img', { src: f.src, alt: f.alt, loading: 'lazy', decoding: 'async' }));
      }));
    var caja = h('div', { class: 'tslider' + (varias ? ' varias' : ''), role: 'region', 'aria-roledescription': 'carrusel', 'aria-label': 'Fotos de ' + nombre }, pista);
    if (!varias) return caja;

    var cuenta = h('span', { class: 'tslider-cuenta', 'aria-hidden': 'true', text: '1 / ' + fotos.length });
    var puntos = h('div', { class: 'tslider-puntos' }, fotos.map(function (_, i) {
      return h('button', { type: 'button', class: i === 0 ? 'activo' : null, 'aria-label': 'Ver foto ' + (i + 1) });
    }));
    var ant = h('button', { type: 'button', class: 'tslider-btn tslider-ant', 'aria-label': 'Foto anterior', html: ICONOS.izq });
    var sig = h('button', { type: 'button', class: 'tslider-btn tslider-sig', 'aria-label': 'Foto siguiente', html: ICONOS.der });
    caja.appendChild(ant);
    caja.appendChild(sig);
    caja.appendChild(puntos);
    caja.appendChild(cuenta);

    var actual = 0, pendiente = false, destino = null, soltar = 0;
    function mostrar(i) {
      actual = i;
      cuenta.textContent = (i + 1) + ' / ' + fotos.length;
      Array.prototype.forEach.call(puntos.children, function (b, k) { b.classList.toggle('activo', k === i); });
    }
    function ir(i) {
      i = (i + fotos.length) % fotos.length; // de la última vuelve a la primera
      // Se marca de inmediato; mientras se desliza se ignoran las fotos intermedias.
      destino = i;
      mostrar(i);
      clearTimeout(soltar);
      soltar = setTimeout(function () { destino = null; }, 1200);
      pista.scrollTo({ left: i * pista.clientWidth, behavior: SIN_MOVIMIENTO ? 'auto' : 'smooth' });
    }
    function marcar() {
      var i = Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth));
      if (destino !== null) { if (i === destino) destino = null; return; }
      if (i !== actual) mostrar(i);
    }
    pista.addEventListener('scroll', function () {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { pendiente = false; marcar(); });
    }, { passive: true });
    // Si la persona desliza con el dedo, manda ella.
    pista.addEventListener('pointerdown', function () { destino = null; });
    pista.addEventListener('touchstart', function () { destino = null; }, { passive: true });
    ant.addEventListener('click', function () { ir(actual - 1); });
    sig.addEventListener('click', function () { ir(actual + 1); });
    Array.prototype.forEach.call(puntos.children, function (b, k) {
      b.addEventListener('click', function () { ir(k); });
    });
    return caja;
  }

  // Texto en el que busca el buscador (sin rutas de fotos ni links).
  function textoBusqueda(el) {
    return Array.prototype.filter.call(el.children, function (n) { return n.nodeName !== 'fotos' && n.nodeName !== 'redes'; })
      .map(function (n) { return n.textContent; }).join(' ').replace(/\s+/g, ' ');
  }

  function tarjeta(e, indice) {
    var logo;
    if (e.logo) {
      logo = h('div', { class: 'tarjeta-logo tarjeta-logo-img' }, h('img', { src: e.logo, alt: e.nombre, loading: 'lazy' }));
    } else {
      logo = h('div', { class: 'tarjeta-logo' },
        h('span', { html: SIMBOLO }).firstChild,
        h('span', { class: 'tarjeta-logo-texto' },
          h('span', { class: 'tarjeta-logo-marca' }, h('b', { text: 'HUTCHISON' }), '\u2009PORTS'),
          h('span', { class: 'tarjeta-logo-nombre' + (e.nombre.length > 8 ? ' largo' : ''), text: e.nombre })));
    }

    var contacto = listaContacto(e.el, h('ul', { class: 'tarjeta-datos' }));
    var pieTarjeta = pieEnlaces(e.redes); // null si ninguna red tiene link
    var ciudades = e.ciudades.length ? h('div', { class: 'tarjeta-ciudades' },
      e.ciudades.map(function (c) { return h('span', { class: 'tarjeta-ciudad', text: c }); })) : null;

    var art = h('article', {
      class: 'tarjeta revelar', id: e.id ? 'empresa-' + e.id : null, style: '--i:' + indice,
      'data-busqueda': normalizar(textoBusqueda(e.el)),
      'data-ciudades': '|' + e.ciudades.join('|') + '|'
    },
      h('span', { class: 'tarjeta-brillo', 'aria-hidden': 'true' }),
      h('span', { class: 'tarjeta-esquina', 'aria-hidden': 'true' }),
      sliderFotos(hijo(e.el, 'fotos'), e.nombre),
      h('header', { class: 'tarjeta-cab' }, logo, ciudades),
      hijo(e.el, 'descripcion') ? h('div', { class: 'tarjeta-descripcion' }, parrafos(hijo(e.el, 'descripcion'))) : null,
      contacto.children.length ? contacto : null,
      pieTarjeta);
    return art;
  }

  function directorio(categorias) {
    var chips = h('div', { class: 'filtro-chips', role: 'group', 'aria-label': 'Filtrar por categoría' },
      h('button', { type: 'button', class: 'chip activo', 'data-filtro': '', text: 'Todas' }),
      categorias.map(function (c) { return h('button', { type: 'button', class: 'chip', 'data-filtro': c.id, text: c.corto }); }));
    var buscador = h('label', { class: 'buscador' },
      h('span', { class: 'buscador-icono', html: ICONOS.buscar }),
      h('input', { type: 'search', id: 'buscar', placeholder: 'Buscar empresa, ciudad o correo…', 'aria-label': 'Buscar en el directorio', autocomplete: 'off' }));

    var secciones = categorias.map(function (c, n) {
      return h('section', { class: 'categoria', id: c.id, 'data-cat': c.id },
        h('header', { class: 'categoria-cab revelar' },
          h('span', { class: 'categoria-num', text: ('0' + (n + 1)).slice(-2) }),
          h('h2', { text: c.nombre }),
          h('span', { class: 'categoria-cuenta', text: c.empresas.length + (c.empresas.length === 1 ? ' empresa' : ' empresas') }),
          h('span', { class: 'categoria-linea', 'aria-hidden': 'true' })),
        h('div', { class: 'tarjetas' }, c.empresas.map(tarjeta)));
    });

    return h('section', { class: 'directorio', id: 'directorio' },
      h('div', { class: 'directorio-fondo', 'aria-hidden': 'true' }),
      h('div', { class: 'contenedor' },
        h('div', { class: 'filtros revelar' }, chips,
          h('button', { type: 'button', class: 'filtro-ciudad', id: 'filtro-ciudad', hidden: 'hidden' },
            h('span', { class: 'filtro-ciudad-icono', html: ICONOS.ubicacion }),
            h('span', { class: 'filtro-ciudad-nombre' }),
            h('span', { class: 'filtro-ciudad-x', 'aria-hidden': 'true', text: '✕' })),
          buscador),
        h('p', { class: 'sin-resultados', id: 'sin-resultados', hidden: 'hidden' }, 'No encontramos resultados. ',
          h('button', { type: 'button', class: 'link-limpiar', text: 'Ver todo el directorio' })),
        secciones));
  }

  // {año} en el XML se cambia por el año actual (para el © del pie).
  function conAnio(texto) { return texto.replace(/\{\s*a(ñ|n)o\s*\}/gi, String(new Date().getFullYear())); }

  function pie(raiz) {
    var p = hijo(raiz, 'pie');
    // Links del pie (Hutchison Ports global, aviso de privacidad…); sin url no se muestran.
    var enlaces = h('ul', { class: 'pie-enlaces' });
    hijos(p, 'enlace').filter(visible).forEach(function (e) {
      var url = urlSegura(e.getAttribute('url'));
      if (!url || url === '#' || !txt(e)) return;
      var a = prepararLink(inline(e, h('a')), url);
      if (/^https?:/i.test(url)) a.appendChild(h('span', { class: 'pie-externo', 'aria-hidden': 'true', text: ' ↗' }));
      enlaces.appendChild(h('li', null, a));
    });
    var leyenda = hijo(p, 'leyenda');
    return h('div', { class: 'contenedor' },
      h('div', { class: 'pie-in' },
        h('div', { class: 'pie-marca' }, logotipoPrincipal('logotipo-claro')),
        redes(hijo(p, 'redes'), 'redes-pie')),
      h('div', { class: 'pie-legal' },
        h('div', { class: 'pie-textos' },
          txt(p, 'texto') ? h('p', { text: conAnio(txt(p, 'texto')) }) : null,
          leyenda && txt(leyenda) ? inline(leyenda, h('p', { class: 'pie-leyenda' })) : null),
        enlaces.children.length ? enlaces : null),
      h('button', { class: 'arriba', type: 'button', 'aria-label': 'Volver arriba', html: ICONOS.arriba }));
  }

  /* ============================ MODELO ============================ */

  function modelo(raiz) {
    return hijos(raiz, 'categoria').filter(visible).map(function (c, i) {
      var empresas = hijos(c, 'empresa').filter(visible).map(function (e) {
        return {
          el: e,
          id: (e.getAttribute('id') || '').replace(/[^a-z0-9-]/gi, ''),
          nombre: txt(e, 'nombre'),
          logo: imagenSegura(txt(e, 'logo')),
          ciudades: hijos(e, 'ciudad').map(function (c) { return txt(c); }).filter(Boolean),
          redes: hijo(e, 'redes')
        };
      });
      var nombre = c.getAttribute('nombre') || 'Categoría ' + (i + 1);
      return {
        id: (c.getAttribute('id') || 'categoria-' + (i + 1)).replace(/[^a-z0-9-]/gi, ''),
        nombre: nombre,
        corto: c.getAttribute('corto') || nombre,
        empresas: empresas
      };
    }).filter(function (c) { return c.empresas.length; });
  }

  /* ============================ RENDER ============================ */

  var limpiezas = [];

  function render(doc, rapido) {
    limpiezas.forEach(function (f) { f(); });
    limpiezas = [];

    var raiz = doc.documentElement;
    var g = hijo(raiz, 'general');
    var categorias = modelo(raiz);

    document.title = txt(g, 'titulo') || document.title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', txt(g, 'descripcion'));
    var raizCss = document.documentElement.style;
    var c1 = colorSeguro(txt(g, 'color-principal')), c2 = colorSeguro(txt(g, 'color-acento'));
    if (c1) raizCss.setProperty('--azul', c1); else raizCss.removeProperty('--azul');
    if (c2) raizCss.setProperty('--acento', c2); else raizCss.removeProperty('--acento');
    var estilos = ['filas', 'banda', 'compacto'];
    var pedido = (location.search.match(/[?&]pie=(\w+)/) || [])[1];
    var estilo = estilos.indexOf(pedido) !== -1 ? pedido : txt(g, 'estilo-enlaces').toLowerCase();
    document.documentElement.setAttribute('data-pie', estilos.indexOf(estilo) !== -1 ? estilo : 'filas');
    var fondos = ['rutas', 'patio', 'diagonales', 'ninguno'];
    var fondoPedido = (location.search.match(/[?&]fondo=(\w+)/) || [])[1];
    var fondo = fondos.indexOf(fondoPedido) !== -1 ? fondoPedido : txt(g, 'efecto-fondo').toLowerCase();
    document.documentElement.setAttribute('data-fondo', fondos.indexOf(fondo) !== -1 ? fondo : 'rutas');

    var scroll = window.scrollY;
    reemplazar('cabecera', cabecera(raiz, categorias));
    var main = document.getElementById('contenido');
    main.textContent = '';
    [portada(raiz), cifras(categorias, raiz), directorio(categorias)].forEach(function (n) { if (n) main.appendChild(n); });
    reemplazar('pie', pie(raiz));

    document.body.classList.remove('cargando');
    if (rapido) {
      document.body.classList.add('sin-entrada');
      window.scrollTo(0, scroll);
    }
    efectos(rapido);
  }

  function reemplazar(id, nodo) {
    var el = document.getElementById(id);
    el.textContent = '';
    el.appendChild(nodo);
  }

  /* ============================ EFECTOS ============================ */

  function efectos(rapido) {
    cabeceraAlScroll();
    carrusel();
    revelar(rapido);
    brilloTarjetas();
    filtros();
    menuActivo();
    fondoAnimado();
    ajustarLogos();
    document.querySelector('.arriba').addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: SIN_MOVIMIENTO ? 'auto' : 'smooth' });
    });
  }

  /* Cada logo de tarjeta se reduce lo necesario para caber junto a la etiqueta de ciudad,
     que siempre se queda a la derecha. Se recalcula al cambiar el tamaño de la tarjeta
     (girar el celular, filtros) y cuando termina de cargar la tipografía. */
  function ajustarLogos() {
    var cabs = Array.prototype.slice.call(document.querySelectorAll('.tarjeta-cab'));
    function ajustar(cab) {
      var logo = cab.querySelector('.tarjeta-logo');
      if (!logo || !cab.clientWidth) return;
      var img = logo.querySelector('img');
      var ciudades = cab.querySelector('.tarjeta-ciudades');
      logo.style.fontSize = '';
      if (img) img.style.height = '';
      var disponible = cab.clientWidth - (ciudades ? ciudades.offsetWidth + 14 : 0); // 12 px de separación + 2 de holgura
      var natural = logo.scrollWidth;
      if (natural <= disponible) return;
      var escala = Math.max(0.55, disponible / natural); // nunca más chico que 55 %
      if (img) img.style.height = (40 * escala).toFixed(1) + 'px';
      else logo.style.fontSize = (parseFloat(getComputedStyle(logo).fontSize) * escala).toFixed(1) + 'px';
    }
    cabs.forEach(ajustar);
    // Los logos en imagen se cargan al acercarse: se vuelve a ajustar cuando ya tienen tamaño.
    cabs.forEach(function (cab) {
      var img = cab.querySelector('.tarjeta-logo img');
      if (img && !img.complete) img.addEventListener('load', function () { ajustar(cab); }, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { cabs.forEach(ajustar); });
    // Respaldo: también al cambiar el tamaño de la ventana o girar el celular.
    var espera;
    function alRedimensionar() { clearTimeout(espera); espera = setTimeout(function () { cabs.forEach(ajustar); }, 120); }
    window.addEventListener('resize', alRedimensionar);
    limpiezas.push(function () { window.removeEventListener('resize', alRedimensionar); });
    if (!('ResizeObserver' in window)) return;
    var anchos = new WeakMap();
    var ro = new ResizeObserver(function (entradas) {
      entradas.forEach(function (en) {
        var w = Math.round(en.contentRect.width);
        if (anchos.get(en.target) === w) return; // solo si cambió el ancho
        anchos.set(en.target, w);
        ajustar(en.target);
      });
    });
    cabs.forEach(function (c) { ro.observe(c); });
    limpiezas.push(function () { ro.disconnect(); });
  }

  /* ============================ FONDO ANIMADO ============================
     Detrás del directorio. "rutas" y "patio" se dibujan en un <canvas> del
     tamaño de la pantalla que se queda fijo mientras se recorre el directorio;
     "diagonales" es solo CSS. Se pausa fuera de pantalla y con la pestaña oculta. */

  function fondoAnimado() {
    var tipo = document.documentElement.getAttribute('data-fondo');
    var cont = document.querySelector('.directorio-fondo');
    if (!cont) return;
    if (tipo === 'diagonales') {
      // Las diagonales del fondo se desplazan un poco con el scroll.
      var dir = document.getElementById('directorio');
      if (!SIN_MOVIMIENTO) alScroll(function () {
        var r = dir.getBoundingClientRect();
        cont.style.setProperty('--desplazar', (-r.top * 0.08).toFixed(1) + 'px');
      });
      return;
    }
    if (tipo !== 'rutas' && tipo !== 'patio') return;

    var lienzo = h('canvas', { class: 'fondo-canvas' });
    cont.appendChild(h('div', { class: 'fondo-pegado' }, lienzo));
    var ctx = lienzo.getContext('2d');
    var css = getComputedStyle(document.documentElement);
    var AZUL = rgb(css.getPropertyValue('--azul')), ACENTO = rgb(css.getPropertyValue('--acento'));
    var w = 0, ht = 0, dpr = 1, escena = null, raf = 0, visible = false, ultimo = 0;

    function rgb(hex) {
      hex = hex.trim().replace('#', '');
      if (hex.length === 3) hex = hex.replace(/./g, '$&$&');
      var n = parseInt(hex, 16) || 0;
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function color(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; ht = window.innerHeight;
      lienzo.width = Math.round(w * dpr); lienzo.height = Math.round(ht * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      escena = tipo === 'rutas' ? crearRutas() : crearPatio();
      dibujar(performance.now());
    }

    /* --- RUTAS: curvas punteadas con puntos de luz viajando por ellas --- */
    function crearRutas() {
      var n = w < 700 ? 3 : 5, rutas = [];
      for (var i = 0; i < n; i++) {
        // Cada ruta cruza en diagonal (como las de la marca) con una curva suave.
        var y0 = ht * (0.15 + 1.1 * i / n) + (Math.random() - 0.5) * 80;
        var p0 = { x: -60, y: y0 }, p3 = { x: w + 60, y: y0 - w * 0.45 };
        var p1 = { x: w * (0.25 + Math.random() * 0.15), y: y0 - ht * (Math.random() * 0.3) };
        var p2 = { x: w * (0.6 + Math.random() * 0.15), y: p3.y + ht * (Math.random() * 0.3) };
        rutas.push({ p: [p0, p1, p2, p3], pulsos: [Math.random(), Math.random() * 0.5 + 0.5].slice(0, 1 + (i % 2)),
          vel: 0.012 + Math.random() * 0.014, fase: Math.random() * Math.PI * 2 });
      }
      return rutas;
    }
    function bezier(p, t) {
      var u = 1 - t;
      return {
        x: u * u * u * p[0].x + 3 * u * u * t * p[1].x + 3 * u * t * t * p[2].x + t * t * t * p[3].x,
        y: u * u * u * p[0].y + 3 * u * u * t * p[1].y + 3 * u * t * t * p[2].y + t * t * t * p[3].y
      };
    }
    function dibujarRutas(t) {
      var seg = t / 1000;
      ctx.lineWidth = 1;
      escena.forEach(function (r) {
        var p = r.p;
        // ruta punteada que "avanza" despacio
        ctx.setLineDash([2, 7]);
        ctx.lineDashOffset = -seg * 6;
        ctx.strokeStyle = color(AZUL, 0.10);
        ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y);
        ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y); ctx.stroke();
        ctx.setLineDash([]);
        // puertos que laten en los puntos de control
        [p[1], p[2]].forEach(function (q, k) {
          var lat = (Math.sin(seg * 1.4 + r.fase + k * 2) + 1) / 2;
          ctx.fillStyle = color(ACENTO, 0.06 + lat * 0.07);
          ctx.beginPath(); ctx.arc(q.x, q.y, 2.5 + lat * 2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = color(ACENTO, 0.07 * (1 - lat));
          ctx.beginPath(); ctx.arc(q.x, q.y, 5 + lat * 11, 0, Math.PI * 2); ctx.stroke();
        });
        // puntos de luz con estela
        r.pulsos.forEach(function (inicio) {
          var pos = (inicio + seg * r.vel) % 1;
          for (var k = 0; k < 14; k++) {
            var tt = pos - k * 0.006;
            if (tt < 0) break;
            var q = bezier(p, tt);
            ctx.fillStyle = color(ACENTO, 0.32 * (1 - k / 14));
            ctx.beginPath(); ctx.arc(q.x, q.y, 2.1 * (1 - k / 18), 0, Math.PI * 2); ctx.fill();
          }
        });
      });
    }

    /* --- PATIO: cuadrícula de "contenedores" que una ola ilumina en diagonal --- */
    function crearPatio() {
      var cw = 30, ch = 12, gx = 8, gy = 10, celdas = [];
      for (var y = -ch; y < ht + ch; y += ch + gy) {
        var desfase = ((y / (ch + gy)) % 2) * ((cw + gx) / 2); // filas alternadas, como un patio real
        for (var x = -cw + desfase; x < w + cw; x += cw + gx) {
          if (Math.random() < 0.18) continue; // huecos para que se vea orgánico
          celdas.push({ x: x, y: y, w: cw, h: ch, r: Math.random(), acento: Math.random() < 0.22 });
        }
      }
      return celdas;
    }
    function dibujarPatio(t) {
      var seg = t / 1000, largo = w + ht;
      escena.forEach(function (c) {
        // la ola recorre la pantalla en diagonal cada ~9 s
        var d = (c.x + (ht - c.y)) / largo;
        var ola = Math.max(0, Math.cos((d - seg * 0.11) * Math.PI * 2.2 + c.r * 0.6));
        ola = Math.pow(ola, 6);
        var a = 0.018 + ola * (c.acento ? 0.16 : 0.07) + c.r * 0.012;
        ctx.fillStyle = color(c.acento ? ACENTO : AZUL, a);
        ctx.fillRect(c.x, c.y, c.w, c.h);
      });
    }

    function dibujar(t) {
      ctx.clearRect(0, 0, w, ht);
      if (tipo === 'rutas') dibujarRutas(t); else dibujarPatio(t);
    }
    function cuadro(t) {
      raf = 0;
      if (!visible || document.hidden) return;
      if (t - ultimo >= 33) { ultimo = t; dibujar(t); } // ~30 cuadros por segundo es suficiente
      raf = requestAnimationFrame(cuadro);
    }
    function arrancar() { if (!raf && visible && !document.hidden && !SIN_MOVIMIENTO) raf = requestAnimationFrame(cuadro); }

    var io = new IntersectionObserver(function (en) { visible = en[0].isIntersecting; arrancar(); });
    io.observe(document.getElementById('directorio'));
    var esperaTamano;
    function alCambiarTamano() { clearTimeout(esperaTamano); esperaTamano = setTimeout(medir, 150); }
    window.addEventListener('resize', alCambiarTamano);
    document.addEventListener('visibilitychange', arrancar);
    medir();
    limpiezas.push(function () {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', alCambiarTamano);
      document.removeEventListener('visibilitychange', arrancar);
    });
  }

  function alScroll(fn) {
    var pendiente = false;
    function manejador() {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(function () { pendiente = false; fn(); });
    }
    window.addEventListener('scroll', manejador, { passive: true });
    limpiezas.push(function () { window.removeEventListener('scroll', manejador); });
    fn();
  }

  function cabeceraAlScroll() {
    var cab = document.getElementById('cabecera');
    var portadaEl = document.querySelector('.portada');
    var fotos = document.querySelector('.portada-fotos');
    alScroll(function () {
      var y = window.scrollY;
      cab.classList.toggle('solida', y > 40);
      document.body.classList.toggle('lejos', y > window.innerHeight);
      // Parallax suave de la foto de portada.
      if (fotos && !SIN_MOVIMIENTO && portadaEl && y < portadaEl.offsetHeight) {
        fotos.style.transform = 'translate3d(0,' + (y * 0.35) + 'px,0)';
      }
    });
  }

  function carrusel() {
    var fotos = document.querySelectorAll('.portada-foto');
    var puntos = document.querySelectorAll('.portada-puntos button');
    if (fotos.length < 2) return;
    var actual = 0, timer;
    function ir(i) {
      fotos[actual].classList.remove('activa');
      puntos[actual].classList.remove('activo');
      actual = (i + fotos.length) % fotos.length;
      fotos[actual].classList.add('activa');
      puntos[actual].classList.add('activo');
    }
    function programar() {
      clearInterval(timer);
      if (!SIN_MOVIMIENTO) timer = setInterval(function () { ir(actual + 1); }, 6500);
    }
    Array.prototype.forEach.call(puntos, function (b) {
      b.addEventListener('click', function () { ir(+b.getAttribute('data-i')); programar(); });
    });
    programar();
    limpiezas.push(function () { clearInterval(timer); });
  }

  function revelar(rapido) {
    var elementos = document.querySelectorAll('.revelar');
    if (rapido || SIN_MOVIMIENTO || !('IntersectionObserver' in window)) {
      elementos.forEach(function (el) { el.classList.add('visible'); });
      document.querySelectorAll('.cifra-num').forEach(function (n) { n.textContent = n.getAttribute('data-num'); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('visible');
        en.target.querySelectorAll('.cifra-num').forEach(contar);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    elementos.forEach(function (el) { io.observe(el); });
    limpiezas.push(function () { io.disconnect(); });
  }

  function contar(el) {
    var fin = +el.getAttribute('data-num'), inicio = performance.now(), dur = 1200;
    (function paso(t) {
      var p = Math.min(1, (t - inicio) / dur);
      el.textContent = String(Math.round(fin * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(paso);
    })(inicio);
    // Respaldo: si el navegador pausa la animación (pestaña en segundo plano), el número final igual queda.
    setTimeout(function () { el.textContent = String(fin); }, dur + 150);
  }

  // El brillo de la tarjeta sigue al cursor.
  function brilloTarjetas() {
    if (SIN_MOVIMIENTO || !window.matchMedia('(hover: hover)').matches) return;
    var cont = document.getElementById('directorio');
    function mover(e) {
      var t = e.target.closest && e.target.closest('.tarjeta');
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    cont.addEventListener('pointermove', mover);
  }

  function filtros() {
    var chips = document.querySelectorAll('.chip');
    var input = document.getElementById('buscar');
    var categorias = document.querySelectorAll('.categoria');
    var sinRes = document.getElementById('sin-resultados');
    var cat = '', ciudad = '';

    function aplicar() {
      var q = normalizar(input.value.trim());
      var total = 0;
      categorias.forEach(function (sec) {
        var enCat = !cat || sec.getAttribute('data-cat') === cat;
        var visibles = 0;
        sec.querySelectorAll('.tarjeta').forEach(function (t) {
          var ok = enCat && (!q || t.getAttribute('data-busqueda').indexOf(q) !== -1) &&
            (!ciudad || t.getAttribute('data-ciudades').indexOf('|' + ciudad + '|') !== -1);
          t.classList.toggle('oculta', !ok);
          if (ok) { visibles++; t.classList.add('visible'); }
        });
        sec.hidden = visibles === 0;
        total += visibles;
        // "1 de 4 empresas" mientras hay un filtro; el texto original sin filtro.
        var cuenta = sec.querySelector('.categoria-cuenta');
        var todas = sec.querySelectorAll('.tarjeta').length;
        if (!cuenta.dataset.original) cuenta.dataset.original = cuenta.textContent;
        cuenta.textContent = visibles < todas ? visibles + ' de ' + cuenta.dataset.original : cuenta.dataset.original;
      });
      sinRes.hidden = total > 0;
      document.querySelectorAll('.presencia [data-ciudad]').forEach(function (b) {
        b.classList.toggle('activo', b.getAttribute('data-ciudad') === ciudad);
        if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute('data-ciudad') === ciudad));
      });
      // Señales de que hay una ciudad elegida y cómo quitarla.
      var etiqueta = document.getElementById('filtro-ciudad');
      etiqueta.hidden = !ciudad;
      etiqueta.querySelector('.filtro-ciudad-nombre').textContent = ciudad;
      etiqueta.setAttribute('aria-label', 'Quitar filtro: ' + ciudad);
      var presencia = document.querySelector('.presencia');
      if (presencia) presencia.classList.toggle('filtrando', !!ciudad);
      var limpiar = document.querySelector('.presencia-limpiar');
      if (limpiar) limpiar.tabIndex = ciudad ? 0 : -1;
    }
    function elegirCategoria(id) {
      cat = id;
      chips.forEach(function (c) { c.classList.toggle('activo', c.getAttribute('data-filtro') === id); });
      aplicar();
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () { elegirCategoria(c.getAttribute('data-filtro')); });
    });
    input.addEventListener('input', aplicar);
    // Ciudades: desde la lista o desde el mapa. Elegir la misma otra vez quita el filtro.
    function elegirCiudad(nombre) {
      ciudad = ciudad === nombre ? '' : nombre;
      aplicar();
      if (ciudad) document.getElementById('directorio').scrollIntoView({ behavior: SIN_MOVIMIENTO ? 'auto' : 'smooth' });
    }
    function quitarCiudad() { if (ciudad) { ciudad = ''; aplicar(); } }
    document.getElementById('filtro-ciudad').addEventListener('click', quitarCiudad);
    var limpiarMapa = document.querySelector('.presencia-limpiar');
    if (limpiarMapa) limpiarMapa.addEventListener('click', quitarCiudad);
    // Tocar el mapa fuera de los puntos también quita el filtro.
    var mapaSvg = document.querySelector('.mapa-svg');
    if (mapaSvg) mapaSvg.addEventListener('click', function (e) { if (!e.target.closest('.mapa-punto')) quitarCiudad(); });
    document.querySelectorAll('.presencia [data-ciudad]').forEach(function (b) {
      var nombre = b.getAttribute('data-ciudad');
      b.addEventListener('click', function () { elegirCiudad(nombre); });
      b.addEventListener('keydown', function (e) {
        if (b.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); elegirCiudad(nombre); }
      });
      // Al pasar sobre una ciudad (lista o mapa) se resaltan las dos.
      function resaltar(si) {
        document.querySelectorAll('.presencia [data-ciudad]').forEach(function (x) {
          x.classList.toggle('resaltado', si && x.getAttribute('data-ciudad') === nombre);
        });
      }
      b.addEventListener('mouseenter', function () { resaltar(true); });
      b.addEventListener('mouseleave', function () { resaltar(false); });
      b.addEventListener('focus', function () { resaltar(true); });
      b.addEventListener('blur', function () { resaltar(false); });
    });
    sinRes.querySelector('button').addEventListener('click', function () {
      input.value = '';
      ciudad = '';
      elegirCategoria('');
    });
    // Un link del menú a una categoría oculta por el filtro la vuelve a mostrar.
    ['nav', 'mnav'].forEach(function (id) {
      var menu = document.getElementById(id);
      if (menu) menu.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-cat]');
        if (!a) return;
        var sec = document.getElementById(a.getAttribute('data-cat'));
        if (sec && sec.hidden) { input.value = ''; ciudad = ''; elegirCategoria(''); }
      });
    });
  }

  function menuActivo() {
    var links = document.querySelectorAll('.nav a, .mnav-links a');
    var secciones = Array.prototype.map.call(links, function (a) { return document.getElementById(a.getAttribute('data-cat')); });
    alScroll(function () {
      var linea = window.innerHeight * 0.35, activa = -1;
      secciones.forEach(function (s, i) {
        if (s && !s.hidden && s.getBoundingClientRect().top < linea) activa = i;
      });
      links.forEach(function (a, i) { a.classList.toggle('activo', i === activa); });
    });
  }

  /* ============================ MEDICIÓN DE VISITAS ============================
     Si en index.html está instalado Google Analytics (gtag), se registran también:
     documentos abiertos (Brochure, Expansión…) con su empresa, y ciudades elegidas en el mapa.
     Sin Analytics no hace nada. */
  function medir(evento, datos) {
    if (typeof window.gtag === 'function') window.gtag('event', evento, datos);
  }
  document.addEventListener('click', function (e) {
    var doc = e.target.closest && e.target.closest('a.red-brochure[href]');
    if (doc) {
      var tarjeta = doc.closest('.tarjeta');
      medir('abrir_documento', {
        documento: doc.textContent.trim(),
        empresa: tarjeta ? (tarjeta.querySelector('.tarjeta-logo-nombre, .tarjeta-logo img') || {}).textContent || tarjeta.id.replace('empresa-', '') : 'Portada',
        archivo: doc.getAttribute('href')
      });
      return;
    }
    var llegar = e.target.closest && e.target.closest('a.direccion-link');
    if (llegar) {
      var t = llegar.closest('.tarjeta');
      medir('como_llegar', { empresa: t ? t.id.replace('empresa-', '') : '' });
      return;
    }
    var ciudad = e.target.closest && e.target.closest('.presencia [data-ciudad]');
    if (ciudad) medir('elegir_ciudad', { ciudad: ciudad.getAttribute('data-ciudad') });
  }, true);

  /* ============================ CARGA ============================ */

  var ultimoTexto = null;
  var archivoArrastrado = false; // si se arrastró un XML, deja de vigilar el del servidor

  function descargar() {
    return fetch(FUENTE + (FUENTE.indexOf('?') === -1 ? '?' : '&') + 'v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('No se encontró el archivo ' + FUENTE + ' (error ' + r.status + ').');
        return r.text();
      });
  }

  function aviso(mensaje, tipo) {
    var el = document.getElementById('aviso');
    el.textContent = mensaje;
    el.className = 'aviso aviso-' + (tipo || 'info');
    el.hidden = false;
    clearTimeout(aviso.t);
    if (tipo !== 'error') aviso.t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  function errorCarga(err) {
    document.body.classList.remove('cargando');
    var main = document.getElementById('contenido');
    main.textContent = '';
    var local = location.protocol === 'file:';
    var caja = h('div', { class: 'error-carga' },
      h('span', { html: SIMBOLO }).firstChild,
      h('h1', { text: local ? 'Abre el sitio con un servidor local' : 'No se pudo cargar el contenido' }),
      h('p', { text: local
        ? 'Por seguridad, el navegador no deja leer contenido.xml abriendo index.html con doble clic. Usa un servidor local (ver LEEME.md) o arrastra aquí tu contenido.xml para verlo.'
        : err.message }));
    if (local) caja.appendChild(h('p', { class: 'error-soltar', text: '⬇ Suelta contenido.xml en cualquier parte de esta ventana' }));
    main.appendChild(caja);
  }

  // Permite probar abriendo el archivo directo (file://): se arrastra el XML a la ventana.
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) {
    e.preventDefault();
    var f = e.dataTransfer.files[0];
    if (!f || !/\.xml$/i.test(f.name)) return;
    f.text().then(function (t) {
      try {
        render(leerXml(t), !!ultimoTexto);
        ultimoTexto = t;
        archivoArrastrado = true;
        aviso('Mostrando ' + f.name + ' (recarga la página para volver a ' + FUENTE + ')');
      }
      catch (err) { aviso(err.message, 'error'); }
    });
  });

  function vigilar() {
    setInterval(function () {
      if (document.hidden || archivoArrastrado) return;
      descargar().then(function (t) {
        if (t === ultimoTexto) return;
        try {
          render(leerXml(t), true);
          ultimoTexto = t;
          aviso('Contenido actualizado desde ' + FUENTE);
        } catch (err) {
          ultimoTexto = t; // no repetir el mismo error cada 2 s
          aviso(err.message, 'error');
        }
      }).catch(function () {});
    }, 2000);
  }

  descargar()
    .then(function (t) {
      ultimoTexto = t;
      render(leerXml(t), false);
      if (ES_LOCAL) vigilar();
    })
    .catch(function (err) {
      errorCarga(err);
      if (ES_LOCAL) vigilar();
    });
})();
