/* =====================================================================
   Hutchison Ports México — editor de contenido.xml
   1. Lee contenido.xml (o el archivo que se abra/arrastre).
   2. Lo convierte en un formulario: general, portada, mapa, categorías,
      empresas y pie.
   3. "Descargar contenido.xml" arma el XML nuevo para subirlo al sitio.
   Texto con formato: **negrita**, *cursiva*, [texto](https://link).
   Lo que el formulario no sabe editar (p. ej. <sede>) se conserva tal cual.
   ===================================================================== */
(function () {
  'use strict';

  var FUENTE = 'contenido.xml';
  var CLAVE_BORRADOR = 'hp-editor-borrador';

  var REDES = [['web', 'Sitio web'], ['linkedin', 'LinkedIn'], ['youtube', 'YouTube'], ['facebook', 'Facebook'],
    ['instagram', 'Instagram'], ['x', 'X'], ['brochure', 'Brochure'], ['expansion', 'Expansión']];
  var DATOS = [['direccion', 'Dirección'], ['telefono', 'Teléfono'], ['correo', 'Correo'], ['whatsapp', 'WhatsApp'],
    ['celular', 'Celular'], ['fax', 'Fax'], ['horario', 'Horario'], ['web', 'Sitio web'], ['dato', 'Otro dato']];
  // Cada empresa visible necesita al menos uno de cada uno.
  var OBLIGATORIOS = [['direccion', 'una dirección'], ['telefono', 'un teléfono'], ['correo', 'un correo']];
  var ESTRUCTURA = { nombre: 1, logo: 1, ciudad: 1, redes: 1, descripcion: 1, fotos: 1, linea: 1 };
  var LADOS = [['derecha', 'Derecha'], ['izquierda', 'Izquierda'], ['arriba', 'Arriba'], ['abajo', 'Abajo']];
  var ESTILOS_ENLACES = [['filas', 'Filas'], ['banda', 'Banda'], ['compacto', 'Compacto']];
  var FONDOS = [['rutas', 'Rutas'], ['patio', 'Patio'], ['diagonales', 'Diagonales'], ['ninguno', 'Ninguno']];

  var m = null;            // el contenido en edición
  var textoOriginal = '';  // XML tal como se cargó (para saber si hay cambios)
  var abiertos = {};       // tarjetas de empresa abiertas
  var contador = 0;

  function clave(o) { if (!o._k) o._k = 'k' + (++contador); return o._k; }
  function nombreDe(lista, v) { var x = lista.filter(function (p) { return p[0] === v; })[0]; return x ? x[1] : v; }
  function oculto(el) { return /^(no|false|0)$/i.test(el.getAttribute('visible') || ''); }

  /* ============================ DOM ============================ */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) c.forEach(function (x) { if (x) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
      else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return el;
  }

  /* ============================ XML → MODELO ============================ */

  function hijos(el, nombre) {
    if (!el) return [];
    return Array.prototype.filter.call(el.children, function (n) { return n.nodeName === nombre; });
  }
  function hijo(el, nombre) { return hijos(el, nombre)[0] || null; }
  function txt(el, nombre) {
    var n = nombre ? hijo(el, nombre) : el;
    return n ? n.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function crudo(el) { return new XMLSerializer().serializeToString(el); }
  function otrosAtributos(el, conocidos) {
    return Array.prototype.filter.call(el.attributes, function (a) { return conocidos.indexOf(a.name) === -1; })
      .map(function (a) { return [a.name, a.value]; });
  }

  // <b>, <i>, <a url> y <br/> → **negrita**, *cursiva*, [texto](url) y salto de línea.
  function aMarcado(n) {
    var s = '';
    Array.prototype.forEach.call(n.childNodes, function (c) {
      if (c.nodeType === 3) { s += c.nodeValue.replace(/\s+/g, ' '); return; }
      if (c.nodeType !== 1) return;
      var t = c.nodeName.toLowerCase();
      if (t === 'b' || t === 'strong') s += '**' + aMarcado(c) + '**';
      else if (t === 'i' || t === 'em') s += '*' + aMarcado(c) + '*';
      else if (t === 'a') s += '[' + aMarcado(c) + '](' + (c.getAttribute('url') || '') + ')';
      else if (t === 'br') s += '\n';
      else s += aMarcado(c);
    });
    return s.replace(/ *\n */g, '\n').trim();
  }
  var FORMATO = { b: 1, strong: 1, i: 1, em: 1, a: 1, br: 1 };
  function soloFormato(el) {
    return Array.prototype.every.call(el.children, function (c) { return FORMATO[c.nodeName.toLowerCase()] && soloFormato(c); });
  }

  function leerParrafos(el) {
    if (!el) return '';
    var ps = hijos(el, 'p');
    return (ps.length ? ps : [el]).map(aMarcado).join('\n\n');
  }

  function leerRedes(el) {
    return hijos(el, 'red').map(function (r) {
      return { tipo: r.getAttribute('tipo') || 'web', url: r.getAttribute('url') || '', texto: r.getAttribute('texto') || '',
        extra: otrosAtributos(r, ['tipo', 'url', 'texto']) };
    });
  }

  function leerDato(el) {
    var tipo = el.nodeName;
    if (tipo === 'sede' || (tipo !== 'direccion' && !soloFormato(el))) {
      return { crudo: crudo(el), titulo: tipo === 'sede' ? 'Sede «' + (el.getAttribute('nombre') || '') + '»' : '<' + tipo + '>' };
    }
    var d = { tipo: tipo, etiqueta: el.getAttribute('etiqueta') || '', url: el.getAttribute('url') || '',
      extra: otrosAtributos(el, ['etiqueta', 'url']) };
    if (tipo === 'direccion') {
      var ls = hijos(el, 'linea');
      d.valor = (ls.length ? ls : [el]).map(aMarcado).join('\n');
    } else d.valor = aMarcado(el);
    return d;
  }

  function leerEmpresa(e, comentarios) {
    var fotos = hijo(e, 'fotos');
    var emp = {
      id: e.getAttribute('id') || '', oculta: oculto(e), comentarios: comentarios,
      nombre: txt(e, 'nombre'), logo: txt(e, 'logo'),
      ciudades: hijos(e, 'ciudad').map(function (c) { return txt(c); }),
      descripcion: leerParrafos(hijo(e, 'descripcion')),
      fotosOcultas: !!(fotos && oculto(fotos)),
      contacto: [], redes: leerRedes(hijo(e, 'redes'))
    };
    Array.prototype.forEach.call(e.children, function (c) { if (!ESTRUCTURA[c.nodeName]) emp.contacto.push(leerDato(c)); });
    return emp;
  }

  function esBanner(texto) { return /═/.test(texto) && texto.indexOf('\n') === -1; }

  function aModelo(doc) {
    var r = { prologo: [], general: { extra: [] }, portada: null, mapa: null, categorias: [], pie: null, extra: [] };
    Array.prototype.forEach.call(doc.childNodes, function (n) {
      if (n.nodeType === 8 && doc.documentElement.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_PRECEDING) {
        r.prologo.push('<!--' + n.data + '-->');
      }
    });
    var raiz = doc.documentElement, pendientes = [];
    Array.prototype.forEach.call(raiz.childNodes, function (n) {
      if (n.nodeType === 8) { pendientes.push(n.data); return; }
      if (n.nodeType !== 1) return;
      var com = pendientes.filter(function (c) { return !esBanner(c); }).map(function (c) { return '<!--' + c + '-->'; });
      pendientes = [];
      switch (n.nodeName) {
        case 'general':
          Array.prototype.forEach.call(n.children, function (c) {
            if (['titulo', 'descripcion', 'color-principal', 'color-acento', 'estilo-enlaces', 'efecto-fondo'].indexOf(c.nodeName) !== -1) r.general[c.nodeName] = txt(c);
            else r.general.extra.push(crudo(c));
          });
          r.general.comentarios = com;
          break;
        case 'portada':
          r.portada = { comentarios: com, antetitulo: txt(n, 'antetitulo'), titulo: txt(n, 'titulo'),
            texto: leerParrafos(hijo(n, 'texto')), redes: leerRedes(hijo(n, 'redes')),
            extra: Array.prototype.filter.call(n.children, function (c) { return ['antetitulo', 'titulo', 'texto', 'redes', 'foto'].indexOf(c.nodeName) === -1; }).map(crudo) };
          break;
        case 'mapa':
          r.mapa = { comentarios: com, titulo: n.getAttribute('titulo') || '', subtitulo: n.getAttribute('subtitulo') || '', oculto: oculto(n),
            puntos: hijos(n, 'punto').map(function (p) {
              return { ciudad: p.getAttribute('ciudad') || '', lat: p.getAttribute('lat') || '', lon: p.getAttribute('lon') || '', etiqueta: p.getAttribute('etiqueta') || 'derecha' };
            }),
            corredores: hijos(n, 'corredor').map(function (c) { return { de: c.getAttribute('de') || '', a: c.getAttribute('a') || '' }; }) };
          break;
        case 'categoria':
          var cat = { comentarios: com, id: n.getAttribute('id') || '', nombre: n.getAttribute('nombre') || '', corto: n.getAttribute('corto') || '', oculta: oculto(n), empresas: [] };
          var comEmp = [];
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 8) comEmp.push('<!--' + c.data + '-->');
            else if (c.nodeType === 1 && c.nodeName === 'empresa') { cat.empresas.push(leerEmpresa(c, comEmp)); comEmp = []; }
          });
          r.categorias.push(cat);
          break;
        case 'pie':
          var pie = { comentarios: com, texto: txt(n, 'texto'), leyenda: hijo(n, 'leyenda') ? aMarcado(hijo(n, 'leyenda')) : '', enlaces: [], redes: leerRedes(hijo(n, 'redes')), extra: [] };
          var comEnl = [];
          Array.prototype.forEach.call(n.childNodes, function (c) {
            if (c.nodeType === 8) { comEnl.push('<!--' + c.data + '-->'); return; }
            if (c.nodeType !== 1) return;
            if (c.nodeName === 'enlace') pie.enlaces.push({ texto: aMarcado(c), url: c.getAttribute('url') || '', comentarios: comEnl });
            else if (['texto', 'leyenda', 'redes'].indexOf(c.nodeName) === -1) pie.extra.push(crudo(c));
            comEnl = [];
          });
          r.pie = pie;
          break;
        default:
          r.extra.push({ comentarios: com, xml: crudo(n) });
      }
    });
    return r;
  }

  /* ============================ MODELO → XML ============================ */

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

  // **negrita**, *cursiva*, [texto](url) → <b>, <i>, <a url>.
  function deMarcado(s) {
    var re = /\[([^\]]+)\]\(([^)\s]*)\)|\*\*(.+?)\*\*|\*(.+?)\*|\n/g, out = '', ultimo = 0, x;
    while ((x = re.exec(s))) {
      out += esc(s.slice(ultimo, x.index));
      if (x[1] != null) out += '<a url="' + escAttr(x[2]) + '">' + deMarcado(x[1]) + '</a>';
      else if (x[3] != null) out += '<b>' + deMarcado(x[3]) + '</b>';
      else if (x[4] != null) out += '<i>' + deMarcado(x[4]) + '</i>';
      else out += '<br/>';
      ultimo = re.lastIndex;
    }
    return out + esc(s.slice(ultimo));
  }

  function generar(d) {
    var o = [];
    function w(n, s) { o.push(s === '' ? '' : new Array(n + 1).join('  ') + s); }
    function at(lista) {
      return lista.filter(function (a) { return a[1] != null; }).map(function (a) { return ' ' + a[0] + '="' + escAttr(a[1]) + '"'; }).join('');
    }
    function elem(n, nombre, attrs, xml) { w(n, '<' + nombre + at(attrs) + '>' + xml + '</' + nombre + '>'); }
    function vacio(n, nombre, attrs) { w(n, '<' + nombre + at(attrs) + ' />'); }
    function comentarios(n, lista) { (lista || []).forEach(function (c) { w(n, c); }); }
    function opcional(v) { return v && String(v).trim() ? String(v).trim() : null; }
    function redes(n, lista) {
      if (!lista.length) return;
      w(n, '<redes>');
      lista.forEach(function (r) {
        vacio(n + 1, 'red', [['tipo', r.tipo], ['url', r.url.trim()], ['texto', opcional(r.texto)]].concat(r.extra || []));
      });
      w(n, '</redes>');
    }
    function parrafos(n, nombre, texto, conP) {
      var ps = texto.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
      if (!ps.length) return;
      if (ps.length === 1 && !conP) return elem(n, nombre, [], deMarcado(ps[0]));
      w(n, '<' + nombre + '>');
      ps.forEach(function (p) { elem(n + 1, 'p', [], deMarcado(p)); });
      w(n, '</' + nombre + '>');
    }
    function dato(n, c) {
      if (c.crudo != null) { w(n, c.crudo); return; }
      var attrs = [['etiqueta', opcional(c.etiqueta)], ['url', opcional(c.url)]].concat(c.extra || []);
      var lineas = String(c.valor || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (c.tipo === 'direccion' && lineas.length > 1) {
        w(n, '<direccion' + at(attrs) + '>');
        lineas.forEach(function (l) { elem(n + 1, 'linea', [], deMarcado(l)); });
        w(n, '</direccion>');
      } else elem(n, c.tipo, attrs, deMarcado(lineas.join(' ')));
    }

    o.push('<?xml version="1.0" encoding="UTF-8"?>');
    d.prologo.forEach(function (c) { o.push(c); });
    o.push('<sitio>', '');

    var g = d.general;
    comentarios(1, g.comentarios);
    w(1, '<general>');
    elem(2, 'titulo', [], esc(g.titulo || ''));
    elem(2, 'descripcion', [], esc(g.descripcion || ''));
    elem(2, 'color-principal', [], esc(g['color-principal'] || '#0b2a5c'));
    elem(2, 'color-acento', [], esc(g['color-acento'] || '#1592d3'));
    w(2, '<!-- Cómo se acomodan los links al pie de cada tarjeta: filas | banda | compacto -->');
    elem(2, 'estilo-enlaces', [], esc(g['estilo-enlaces'] || 'filas'));
    w(2, '<!-- Efecto animado sutil detrás del directorio: rutas | patio | diagonales | ninguno -->');
    elem(2, 'efecto-fondo', [], esc(g['efecto-fondo'] || 'rutas'));
    g.extra.forEach(function (x) { w(2, x); });
    w(1, '</general>', ''); o.push('');

    if (d.portada) {
      var p = d.portada;
      comentarios(1, p.comentarios);
      w(1, '<portada>');
      if (opcional(p.antetitulo)) elem(2, 'antetitulo', [], esc(p.antetitulo.trim()));
      elem(2, 'titulo', [], esc(p.titulo.trim()));
      parrafos(2, 'texto', p.texto, true);
      redes(2, p.redes);
      p.extra.forEach(function (x) { w(2, x); });
      w(1, '</portada>'); o.push('');
    }

    if (d.mapa) {
      var mp = d.mapa;
      comentarios(1, mp.comentarios);
      w(1, '<mapa' + at([['titulo', mp.titulo.trim()], ['subtitulo', mp.subtitulo.trim()], ['visible', mp.oculto ? 'no' : null]]) + '>');
      mp.puntos.forEach(function (pt) { vacio(2, 'punto', [['ciudad', pt.ciudad.trim()], ['lat', pt.lat.trim()], ['lon', pt.lon.trim()], ['etiqueta', pt.etiqueta]]); });
      mp.corredores.forEach(function (c) { vacio(2, 'corredor', [['de', c.de], ['a', c.a]]); });
      w(1, '</mapa>'); o.push('');
    }

    d.categorias.forEach(function (c) {
      w(1, '<!-- ═══════════════ ' + esc(c.nombre.trim().toUpperCase()).replace(/--/g, '—') + ' ═══════════════ -->');
      comentarios(1, c.comentarios);
      w(1, '<categoria' + at([['id', c.id], ['nombre', c.nombre.trim()], ['corto', opcional(c.corto)], ['visible', c.oculta ? 'no' : null]]) + '>');
      o.push('');
      c.empresas.forEach(function (e) {
        comentarios(2, e.comentarios);
        w(2, '<empresa' + at([['id', e.id], ['visible', e.oculta ? 'no' : null]]) + '>');
        elem(3, 'nombre', [], esc(e.nombre.trim()));
        if (opcional(e.logo)) elem(3, 'logo', [], esc(e.logo.trim()));
        if (e.fotosOcultas) vacio(3, 'fotos', [['visible', 'no']]);
        e.ciudades.forEach(function (ci) { if (ci.trim()) elem(3, 'ciudad', [], esc(ci.trim())); });
        parrafos(3, 'descripcion', e.descripcion || '', false);
        e.contacto.forEach(function (x) { dato(3, x); });
        redes(3, e.redes);
        w(2, '</empresa>'); o.push('');
      });
      w(1, '</categoria>'); o.push('');
    });

    d.extra.forEach(function (x) { comentarios(1, x.comentarios); w(1, x.xml); o.push(''); });

    if (d.pie) {
      var pie = d.pie;
      comentarios(1, pie.comentarios);
      w(1, '<pie>');
      elem(2, 'texto', [], esc(pie.texto.trim()));
      if (opcional(pie.leyenda)) elem(2, 'leyenda', [], deMarcado(pie.leyenda.trim()));
      pie.enlaces.forEach(function (e) { comentarios(2, e.comentarios); elem(2, 'enlace', [['url', e.url.trim()]], deMarcado(e.texto.trim())); });
      redes(2, pie.redes);
      pie.extra.forEach(function (x) { w(2, x); });
      w(1, '</pie>'); o.push('');
    }

    o.push('</sitio>', '');
    return o.join('\n');
  }

  /* ============================ DOCUMENTOS QUE NO EXISTEN ============================ */

  // Los links a archivos del sitio (docs/…pdf) se revisan: si no existen, el sitio no
  // muestra el botón, y aquí se avisa. Los https://… no se pueden revisar.
  var archivos = {}; // url → true (existe) | false (no existe) | 'revisando'

  function esArchivoLocal(url) {
    return !!url && url !== '#' && !/^[a-z][a-z0-9+.-]*:/i.test(url) && url.indexOf('//') !== 0 && url.charAt(0) !== '#';
  }
  // undefined = todavía no se sabe; se revisa y luego se vuelve a validar.
  function existeArchivo(url) {
    url = String(url || '').trim().split('#')[0];
    if (!esArchivoLocal(url) || location.protocol === 'file:') return true;
    var e = archivos[url];
    if (e === true || e === false) return e;
    if (e !== 'revisando') {
      archivos[url] = 'revisando';
      fetch(url, { method: 'HEAD', cache: 'no-cache' })
        .then(function (r) { return r.ok && (/\.html?$/i.test(url) || !/text\/html/i.test(r.headers.get('content-type') || '')); })
        .catch(function () { return false; })
        .then(function (si) { archivos[url] = si; if (!si) cambio(false, false, true); });
    }
    return true;
  }
  function avisosDocumentos(redes, quien, ancla, res) {
    redes.forEach(function (r) {
      var url = (r.url || '').trim();
      if (url && !existeArchivo(url)) {
        res.push({ nivel: 'aviso', texto: quien + ': ' + nombreDe(REDES, r.tipo) + ' apunta a «' + url + '» y ese archivo no existe en el sitio (el botón no se mostrará).', ancla: ancla });
      }
    });
  }

  /* ============================ VALIDACIÓN ============================ */

  var RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var RE_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  function datosDe(e) {
    // Incluye los datos dentro de bloques <sede> conservados.
    var tipos = {};
    e.contacto.forEach(function (c) {
      if (c.crudo != null) { (c.crudo.match(/<(direccion|telefono|celular|correo)[\s>]/g) || []).forEach(function (t) { tipos[t.slice(1, -1).trim()] = true; }); return; }
      if (String(c.valor || '').trim()) tipos[c.tipo] = true;
    });
    if (tipos.celular) tipos.telefono = true;
    return tipos;
  }

  // Devuelve [{nivel: 'error'|'aviso', texto, ancla}]
  function validar() {
    var res = [];
    if (!m) return res;
    if (!String(m.general.titulo || '').trim()) res.push({ nivel: 'error', texto: 'General: falta el título de la pestaña.', ancla: 'sec-general' });
    if (m.portada) avisosDocumentos(m.portada.redes, 'Portada', 'sec-portada', res);
    if (m.pie) {
      avisosDocumentos(m.pie.redes, 'Pie', 'sec-pie', res);
      m.pie.enlaces.forEach(function (e) {
        var url = (e.url || '').trim();
        if (url && !existeArchivo(url)) res.push({ nivel: 'aviso', texto: 'Pie: el link «' + (e.texto || url) + '» apunta a «' + url + '» y ese archivo no existe (no se mostrará).', ancla: 'sec-pie' });
      });
    }
    var ids = {};
    var ciudadesMapa = m.mapa ? m.mapa.puntos.map(function (p) { return p.ciudad.trim(); }) : [];
    m.categorias.forEach(function (c, ci) {
      var anclaCat = 'cat-' + clave(c);
      if (!c.nombre.trim()) res.push({ nivel: 'error', texto: 'Categoría ' + (ci + 1) + ': falta el nombre.', ancla: anclaCat });
      c.empresas.forEach(function (e) {
        var nombre = e.nombre.trim() || '(empresa sin nombre)', ancla = 'emp-' + clave(e);
        if (!e.nombre.trim()) res.push({ nivel: 'error', texto: c.nombre + ': hay una empresa sin nombre.', ancla: ancla });
        avisosDocumentos(e.redes, nombre, ancla, res);
        if (!RE_ID.test(e.id)) res.push({ nivel: 'error', texto: nombre + ': el identificador solo puede tener minúsculas, números y guiones.', ancla: ancla });
        else if (ids[e.id]) res.push({ nivel: 'error', texto: nombre + ': el identificador «' + e.id + '» ya lo usa ' + ids[e.id] + '.', ancla: ancla });
        else ids[e.id] = nombre;
        if (e.oculta) return; // las ocultas pueden estar incompletas
        var tipos = datosDe(e);
        OBLIGATORIOS.forEach(function (o) {
          if (!tipos[o[0]]) res.push({ nivel: 'error', texto: nombre + ': falta ' + o[1] + '.', ancla: ancla });
        });
        e.contacto.forEach(function (d) {
          if (d.tipo === 'correo' && d.valor.trim() && !RE_CORREO.test(d.valor.trim())) res.push({ nivel: 'aviso', texto: nombre + ': el correo «' + d.valor.trim() + '» parece mal escrito.', ancla: ancla });
        });
        e.ciudades.forEach(function (ci) {
          if (ci.trim() && m.mapa && ciudadesMapa.indexOf(ci.trim()) === -1) res.push({ nivel: 'aviso', texto: nombre + ': «' + ci.trim() + '» no está en el mapa (escríbela igual que en el mapa o agrégala).', ancla: ancla });
        });
        if (!e.ciudades.some(function (x) { return x.trim(); })) res.push({ nivel: 'aviso', texto: nombre + ': no tiene ciudad.', ancla: ancla });
      });
    });
    return res;
  }

  function empresaConError(e, lista) {
    var ancla = 'emp-' + clave(e);
    return lista.filter(function (r) { return r.ancla === ancla; });
  }

  /* ============================ FORMULARIO ============================ */

  // Campo de texto ligado a obj[prop].
  function campo(etiqueta, obj, prop, op) {
    op = op || {};
    var id = 'f' + (++contador);
    var input;
    if (op.opciones) {
      input = h('select', { id: id }, op.opciones.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
      input.value = obj[prop] || op.opciones[0][0];
    } else if (op.multilinea) {
      input = h('textarea', { id: id, rows: op.filas || 3, placeholder: op.placeholder || null, value: obj[prop] || '' });
    } else {
      input = h('input', { id: id, type: op.tipo || 'text', placeholder: op.placeholder || null, value: obj[prop] || '',
        autocomplete: 'off', inputmode: op.inputmode || null, list: op.lista || null });
    }
    input.addEventListener(op.opciones || op.tipo === 'color' ? 'change' : 'input', function () {
      obj[prop] = input.value;
      if (op.alCambiar) op.alCambiar(input.value);
      cambio(op.repintar);
    });
    if (op.opciones || op.tipo === 'color') input.addEventListener('input', function () { obj[prop] = input.value; cambio(false); });
    return h('div', { class: 'campo' + (op.clase ? ' ' + op.clase : '') },
      etiqueta ? h('label', { for: id }, etiqueta, op.requerido ? h('span', { class: 'req', text: ' *' }) : null) : null,
      input,
      op.ayuda ? h('p', { class: 'ayuda', text: op.ayuda }) : null);
  }

  function boton(texto, fn, clase, extra) {
    return h('button', Object.assign({ type: 'button', class: 'btn ' + (clase || ''), onclick: fn }, extra || {}), texto);
  }
  function botonIcono(simbolo, titulo, fn, deshabilitado) {
    return h('button', { type: 'button', class: 'btn-icono', title: titulo, 'aria-label': titulo, disabled: deshabilitado || null, onclick: fn }, simbolo);
  }
  function mover(lista, i, paso) {
    var j = i + paso;
    if (j < 0 || j >= lista.length) return;
    var x = lista[i]; lista[i] = lista[j]; lista[j] = x;
    cambio(true);
  }
  function quitar(lista, i, pregunta) {
    if (pregunta && !confirm(pregunta)) return;
    lista.splice(i, 1);
    cambio(true);
  }
  function controlesFila(lista, i, opciones) {
    opciones = opciones || {};
    return h('div', { class: 'fila-controles' },
      botonIcono('↑', 'Subir', function () { mover(lista, i, -1); }, i === 0),
      botonIcono('↓', 'Bajar', function () { mover(lista, i, 1); }, i === lista.length - 1),
      botonIcono('✕', opciones.tituloQuitar || 'Quitar', function () { quitar(lista, i, opciones.pregunta); }, opciones.noQuitar));
  }

  function seccion(id, titulo, descripcion) {
    var cuerpo = h('div', { class: 'seccion-cuerpo' });
    var s = h('section', { class: 'seccion', id: id },
      h('header', { class: 'seccion-cab' }, h('h2', { text: titulo }), descripcion ? h('p', { text: descripcion }) : null),
      cuerpo);
    s.cuerpo = cuerpo;
    return s;
  }

  /* ---------- Redes, brochure y expansión (todas opcionales) ---------- */

  function editorRedes(lista) {
    var filas = h('div', { class: 'lista' });
    if (!lista.length) filas.appendChild(h('p', { class: 'vacio', text: 'Sin redes ni documentos. Agrega los que necesites.' }));
    lista.forEach(function (r, i) {
      var esDoc = r.tipo === 'brochure' || r.tipo === 'expansion';
      filas.appendChild(h('div', { class: 'fila fila-red' },
        campo(null, r, 'tipo', { opciones: REDES, clase: 'c-tipo', repintar: true }),
        campo(null, r, 'url', { placeholder: esDoc ? 'Elige un documento de docs/ o pega un link https://…' : 'https://…', clase: 'c-url', tipo: 'text', inputmode: 'url', lista: esDoc ? 'docs-sitio' : null }),
        esDoc ? campo(null, r, 'texto', { placeholder: 'Texto del botón (opcional)', clase: 'c-texto' }) : null,
        controlesFila(lista, i)));
    });
    var usados = lista.map(function (r) { return r.tipo; });
    var agregar = h('div', { class: 'agregar' }, h('span', { class: 'agregar-txt', text: 'Agregar:' }),
      REDES.map(function (t) {
        return boton('+ ' + t[1], function () { lista.push({ tipo: t[0], url: '', texto: '', extra: [] }); cambio(true, true); },
          'chip' + (usados.indexOf(t[0]) !== -1 ? ' usado' : ''));
      }));
    return h('div', { class: 'bloque' },
      h('h4', { text: 'Redes y documentos' }, h('span', { class: 'opcional', text: ' · opcionales' })),
      filas, agregar,
      h('p', { class: 'ayuda', text: 'En Brochure y Expansión, al escribir o al pulsar la flecha del campo aparece la lista de documentos de docs/ (se suben en subir.html); también puedes pegar un link externo. Si un renglón queda sin link, no se muestra en el sitio.' }));
  }

  /* ---------- Datos de contacto ---------- */

  function editorContacto(e) {
    var lista = e.contacto;
    var filas = h('div', { class: 'lista' });
    function cuantos(tipo) {
      return lista.filter(function (d) { return d.tipo === tipo || (tipo === 'telefono' && d.tipo === 'celular'); }).length;
    }
    lista.forEach(function (d, i) {
      if (d.crudo != null) {
        filas.appendChild(h('div', { class: 'fila fila-cruda' },
          h('div', { class: 'cruda-info' },
            h('strong', { text: d.titulo }),
            h('span', { text: ' — bloque avanzado: se conserva tal cual. Para cambiarlo edita el XML a mano.' }),
            h('pre', { text: d.crudo })),
          controlesFila(lista, i, { pregunta: '¿Quitar este bloque?' })));
        return;
      }
      var tipos = DATOS.slice();
      if (!tipos.some(function (t) { return t[0] === d.tipo; })) tipos.push([d.tipo, d.tipo]);
      // No deja quitar el último obligatorio (dirección, teléfono, correo).
      var obligatorio = OBLIGATORIOS.some(function (o) { return o[0] === d.tipo || (o[0] === 'telefono' && d.tipo === 'celular'); });
      var ultimo = obligatorio && cuantos(d.tipo === 'celular' ? 'telefono' : d.tipo) <= 1 && !e.oculta;
      var esDir = d.tipo === 'direccion';
      filas.appendChild(h('div', { class: 'fila fila-dato' + (esDir ? ' es-direccion' : '') },
        campo(null, d, 'tipo', { opciones: tipos, clase: 'c-tipo', repintar: true }),
        campo(null, d, 'valor', esDir
          ? { multilinea: true, filas: 3, placeholder: 'Una línea por renglón:\n**Calle y número**\nColonia, C.P.', clase: 'c-valor' }
          : { placeholder: { telefono: '+52 (229) 000.0000', celular: '+52 229 000 0000', whatsapp: '+52 229 000 0000', correo: 'nombre@empresa.com', web: 'https://…', horario: 'Lunes a viernes, 9:00 a 18:00' }[d.tipo] || '',
            tipo: d.tipo === 'correo' ? 'email' : 'text', clase: 'c-valor' }),
        campo(null, d, 'etiqueta', { placeholder: 'Título opcional (ej. Ventas)', clase: 'c-etiqueta' }),
        esDir ? campo(null, d, 'url', { placeholder: 'Link de Google Maps (opcional)', clase: 'c-url' }) : null,
        controlesFila(lista, i, { noQuitar: ultimo, tituloQuitar: ultimo ? 'Debe haber al menos uno' : 'Quitar' })));
    });
    var agregar = h('div', { class: 'agregar' }, h('span', { class: 'agregar-txt', text: 'Agregar:' }),
      DATOS.map(function (t) {
        return boton('+ ' + t[1], function () { lista.push({ tipo: t[0], valor: '', etiqueta: '', url: '', extra: [] }); cambio(true, true); }, 'chip');
      }));
    return h('div', { class: 'bloque' },
      h('h4', { text: 'Datos de contacto' }, h('span', { class: 'opcional', text: ' · mínimo una dirección, un teléfono y un correo' })),
      filas, agregar,
      h('p', { class: 'ayuda', text: 'Salen en este orden. Una dirección después de otros datos abre un bloque nuevo en la tarjeta. En la dirección: **texto** = negrita.' }));
  }

  /* ---------- Empresa ---------- */

  function slug(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function tarjetaEmpresa(c, e, i, errores) {
    var k = clave(e);
    var suyos = empresaConError(e, errores);
    var nErr = suyos.filter(function (r) { return r.nivel === 'error'; }).length;
    var det = h('details', { class: 'empresa' + (e.oculta ? ' oculta' : ''), id: 'emp-' + k, open: abiertos[k] || null });
    det.addEventListener('toggle', function () { abiertos[k] = det.open; });

    var ciudades = h('div', { class: 'lista lista-ciudades' });
    e.ciudades.forEach(function (_, j) {
      ciudades.appendChild(h('div', { class: 'fila fila-ciudad' },
        campo(null, e.ciudades, j, { placeholder: 'Ciudad', lista: 'ciudades-mapa', clase: 'c-valor' }),
        controlesFila(e.ciudades, j)));
    });

    det.appendChild(h('summary', null,
      h('span', { class: 'empresa-nombre', text: e.nombre || 'Empresa nueva' }),
      h('span', { class: 'empresa-ciudad', text: e.ciudades.filter(Boolean).join(' · ') }),
      e.oculta ? h('span', { class: 'insignia gris', text: 'Oculta' }) : null,
      nErr ? h('span', { class: 'insignia roja', text: nErr === 1 ? '1 pendiente' : nErr + ' pendientes' }) : null));

    det.appendChild(h('div', { class: 'empresa-cuerpo' },
      suyos.length ? h('ul', { class: 'avisos-empresa' }, suyos.map(function (r) { return h('li', { class: r.nivel, text: r.texto }); })) : null,
      h('div', { class: 'rejilla' },
        campo('Nombre', e, 'nombre', { requerido: true, placeholder: 'ICAVE', alCambiar: function (v) {
          if (e.idAuto) e.id = slug(v);
          det.querySelector('.empresa-nombre').textContent = v || 'Empresa nueva';
          var idIn = det.querySelector('.c-id input'); if (idIn && e.idAuto) idIn.value = e.id;
          var ayudaId = det.querySelector('.c-id .ayuda'); if (ayudaId) ayudaId.textContent = 'Carpeta de fotos: img/' + (e.id || '…') + '/';
        } }),
        campo('Identificador', e, 'id', { requerido: true, clase: 'c-id', placeholder: 'icave',
          ayuda: 'Carpeta de fotos: img/' + (e.id || '…') + '/',
          alCambiar: function (v) { e.idAuto = false; var a = det.querySelector('.c-id .ayuda'); if (a) a.textContent = 'Carpeta de fotos: img/' + (v || '…') + '/'; } }),
        campo('Logo (opcional)', e, 'logo', { placeholder: 'img/logo.png', ayuda: 'Vacío = se genera el logotipo «HUTCHISON PORTS + nombre».' })),
      h('div', { class: 'bloque' },
        h('h4', { text: 'Ciudades' }),
        ciudades,
        h('div', { class: 'agregar' }, boton('+ Ciudad', function () { e.ciudades.push(''); cambio(true, true); }, 'chip'))),
      campo('Descripción (opcional)', e, 'descripcion', { multilinea: true, filas: 2, placeholder: 'Texto corto debajo del logo.' }),
      editorContacto(e),
      editorRedes(e.redes),
      h('div', { class: 'empresa-pie' },
        h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: e.oculta || null, onchange: function (ev) { e.oculta = ev.target.checked; cambio(true); } }),
          ' Ocultar en el sitio (sin borrarla)'),
        h('label', { class: 'casilla' },
          h('input', { type: 'checkbox', checked: e.fotosOcultas || null, onchange: function (ev) { e.fotosOcultas = ev.target.checked; cambio(false); } }),
          ' Ocultar sus fotos'),
        h('span', { class: 'espacio' }),
        h('label', { class: 'mover-a' }, 'Mover a ',
          h('select', { onchange: function (ev) {
            var destino = m.categorias[+ev.target.value];
            if (!destino || destino === c) return;
            c.empresas.splice(i, 1); destino.empresas.push(e); abiertos[k] = true; cambio(true);
            setTimeout(function () { irA('emp-' + k); }, 30);
          } }, m.categorias.map(function (x, n) { return h('option', { value: n, selected: x === c || null, text: x.corto || x.nombre }); }))),
        boton('↑', function () { mover(c.empresas, i, -1); }, 'chico', { title: 'Subir empresa', disabled: i === 0 || null }),
        boton('↓', function () { mover(c.empresas, i, 1); }, 'chico', { title: 'Bajar empresa', disabled: i === c.empresas.length - 1 || null }),
        boton('Eliminar empresa', function () { quitar(c.empresas, i, '¿Eliminar ' + (e.nombre || 'esta empresa') + '? (Para solo esconderla usa «Ocultar en el sitio».)'); }, 'peligro'))));
    return det;
  }

  function empresaNueva() {
    return { id: '', idAuto: true, oculta: false, comentarios: [], nombre: '', logo: '', ciudades: [''], descripcion: '', fotosOcultas: false,
      contacto: [
        { tipo: 'direccion', valor: '', etiqueta: '', url: '', extra: [] },
        { tipo: 'telefono', valor: '', etiqueta: '', url: '', extra: [] },
        { tipo: 'correo', valor: '', etiqueta: '', url: '', extra: [] }],
      redes: [] };
  }

  /* ---------- Secciones ---------- */

  function seccionGeneral() {
    var s = seccion('sec-general', 'General', 'Pestaña del navegador, Google y colores de la marca.');
    var g = m.general;
    s.cuerpo.appendChild(h('div', { class: 'rejilla' },
      campo('Título de la pestaña', g, 'titulo', { requerido: true }),
      campo('Color principal', g, 'color-principal', { tipo: 'color', clase: 'c-color' }),
      campo('Color de acento', g, 'color-acento', { tipo: 'color', clase: 'c-color' })));
    s.cuerpo.appendChild(campo('Descripción para Google', g, 'descripcion', { multilinea: true, filas: 2 }));
    s.cuerpo.appendChild(h('div', { class: 'rejilla' },
      campo('Links al pie de cada tarjeta', g, 'estilo-enlaces', { opciones: ESTILOS_ENLACES }),
      campo('Efecto detrás del directorio', g, 'efecto-fondo', { opciones: FONDOS })));
    return s;
  }

  function seccionPortada() {
    if (!m.portada) m.portada = { comentarios: [], antetitulo: '', titulo: '', texto: '', redes: [], extra: [] };
    var p = m.portada;
    var s = seccion('sec-portada', 'Portada', 'Las fotos se toman solas de img/portada/ (1.jpg, 2.jpg…).');
    s.cuerpo.appendChild(h('div', { class: 'rejilla' },
      campo('Antetítulo', p, 'antetitulo', { placeholder: 'Directorio' }),
      campo('Título', p, 'titulo', { requerido: true })));
    s.cuerpo.appendChild(campo('Texto', p, 'texto', { multilinea: true, filas: 3,
      ayuda: 'Deja una línea en blanco entre párrafos. **negrita**, *cursiva*, [texto del link](https://…)' }));
    s.cuerpo.appendChild(editorRedes(p.redes));
    return s;
  }

  function seccionMapa() {
    var s = seccion('sec-mapa', 'Mapa', 'Ciudades del mapa «Presencia en México». Escribe cada ciudad igual que en las empresas.');
    if (!m.mapa) {
      s.cuerpo.appendChild(h('p', { class: 'vacio', text: 'El sitio no tiene mapa.' }));
      s.cuerpo.appendChild(boton('+ Agregar mapa', function () { m.mapa = { comentarios: [], titulo: 'Presencia en México', subtitulo: '', oculto: false, puntos: [], corredores: [] }; cambio(true); }, 'chip'));
      return s;
    }
    var mp = m.mapa;
    s.cuerpo.appendChild(h('div', { class: 'rejilla' },
      campo('Título', mp, 'titulo'),
      campo('Subtítulo', mp, 'subtitulo', { clase: 'ancho' })));
    var puntos = h('div', { class: 'lista' });
    mp.puntos.forEach(function (pt, i) {
      puntos.appendChild(h('div', { class: 'fila fila-punto' },
        campo(null, pt, 'ciudad', { placeholder: 'Ciudad', clase: 'c-valor', repintarLista: true }),
        campo(null, pt, 'lat', { placeholder: 'Latitud (19.2)', clase: 'c-num', inputmode: 'decimal' }),
        campo(null, pt, 'lon', { placeholder: 'Longitud (-96.13)', clase: 'c-num', inputmode: 'decimal' }),
        campo(null, pt, 'etiqueta', { opciones: LADOS, clase: 'c-tipo' }),
        controlesFila(mp.puntos, i)));
    });
    var nombres = mp.puntos.map(function (p) { return [p.ciudad, p.ciudad]; }).filter(function (x) { return x[0]; });
    var corredores = h('div', { class: 'lista' });
    mp.corredores.forEach(function (c, i) {
      corredores.appendChild(h('div', { class: 'fila fila-corredor' },
        campo(null, c, 'de', { opciones: nombres.length ? nombres : [['', '—']], clase: 'c-tipo' }),
        h('span', { class: 'flecha', text: '→' }),
        campo(null, c, 'a', { opciones: nombres.length ? nombres : [['', '—']], clase: 'c-tipo' }),
        controlesFila(mp.corredores, i)));
    });
    s.cuerpo.appendChild(h('div', { class: 'bloque' }, h('h4', { text: 'Ciudades' }), puntos,
      h('div', { class: 'agregar' }, boton('+ Ciudad', function () { mp.puntos.push({ ciudad: '', lat: '', lon: '', etiqueta: 'derecha' }); cambio(true, true); }, 'chip')),
      h('p', { class: 'ayuda', text: 'Coordenadas: en Google Maps, clic derecho sobre el lugar y copia los números. «Lado» es dónde va el nombre para que no se encimen.' })));
    s.cuerpo.appendChild(h('div', { class: 'bloque' }, h('h4', { text: 'Corredores' }, h('span', { class: 'opcional', text: ' · líneas animadas entre ciudades' })), corredores,
      h('div', { class: 'agregar' }, boton('+ Corredor', function () { mp.corredores.push({ de: nombres[0] ? nombres[0][0] : '', a: nombres[1] ? nombres[1][0] : '' }); cambio(true, true); }, 'chip'))));
    s.cuerpo.appendChild(h('label', { class: 'casilla' },
      h('input', { type: 'checkbox', checked: mp.oculto || null, onchange: function (ev) { mp.oculto = ev.target.checked; cambio(false); } }),
      ' Ocultar el mapa en el sitio'));
    return s;
  }

  function seccionCategoria(c, n, errores) {
    var k = clave(c);
    var s = seccion('cat-' + k, (n + 1) + '. ' + (c.nombre || 'Categoría nueva'), null);
    s.classList.add('seccion-categoria');
    s.cuerpo.appendChild(h('div', { class: 'rejilla' },
      campo('Nombre de la categoría', c, 'nombre', { requerido: true, alCambiar: function (v) {
        s.querySelector('h2').textContent = (n + 1) + '. ' + (v || 'Categoría nueva');
        if (c.idAuto) c.id = slug(v);
      } }),
      campo('Texto corto (menú y filtros)', c, 'corto')));
    var lista = h('div', { class: 'empresas' });
    c.empresas.forEach(function (e, i) { lista.appendChild(tarjetaEmpresa(c, e, i, errores)); });
    if (!c.empresas.length) lista.appendChild(h('p', { class: 'vacio', text: 'Sin empresas: la categoría no se muestra en el sitio.' }));
    s.cuerpo.appendChild(lista);
    s.cuerpo.appendChild(h('div', { class: 'categoria-pie' },
      boton('+ Agregar empresa', function () {
        var e = empresaNueva(); c.empresas.push(e); abiertos[clave(e)] = true; cambio(true);
        setTimeout(function () { irA('emp-' + clave(e)); var i = document.querySelector('#emp-' + clave(e) + ' input'); if (i) i.focus(); }, 30);
      }, 'primario'),
      h('span', { class: 'espacio' }),
      h('label', { class: 'casilla' },
        h('input', { type: 'checkbox', checked: c.oculta || null, onchange: function (ev) { c.oculta = ev.target.checked; cambio(false); } }),
        ' Ocultar categoría'),
      boton('↑', function () { mover(m.categorias, n, -1); }, 'chico', { title: 'Subir categoría', disabled: n === 0 || null }),
      boton('↓', function () { mover(m.categorias, n, 1); }, 'chico', { title: 'Bajar categoría', disabled: n === m.categorias.length - 1 || null }),
      boton('Eliminar categoría', function () {
        quitar(m.categorias, n, '¿Eliminar la categoría «' + c.nombre + '»' + (c.empresas.length ? ' y sus ' + c.empresas.length + ' empresas' : '') + '?');
      }, 'peligro')));
    return s;
  }

  function seccionPie() {
    if (!m.pie) m.pie = { comentarios: [], texto: '', leyenda: '', enlaces: [], redes: [], extra: [] };
    var p = m.pie;
    var s = seccion('sec-pie', 'Pie de página', null);
    s.cuerpo.appendChild(campo('Texto', p, 'texto', { ayuda: '{año} se cambia solo por el año actual.' }));
    s.cuerpo.appendChild(campo('Leyenda', p, 'leyenda', { ayuda: '**negrita**, [texto](https://link)' }));
    var enlaces = h('div', { class: 'lista' });
    p.enlaces.forEach(function (e, i) {
      enlaces.appendChild(h('div', { class: 'fila fila-red' },
        campo(null, e, 'texto', { placeholder: 'Texto del link', clase: 'c-texto' }),
        campo(null, e, 'url', { placeholder: 'https://… o un documento de docs/', clase: 'c-url', lista: 'docs-sitio' }),
        controlesFila(p.enlaces, i)));
    });
    s.cuerpo.appendChild(h('div', { class: 'bloque' },
      h('h4', { text: 'Links' }, h('span', { class: 'opcional', text: ' · sin link no se muestran' })), enlaces,
      h('div', { class: 'agregar' }, boton('+ Link', function () { p.enlaces.push({ texto: '', url: '', comentarios: [] }); cambio(true, true); }, 'chip'))));
    s.cuerpo.appendChild(editorRedes(p.redes));
    return s;
  }

  /* ============================ PINTAR ============================ */

  function pintar() {
    var errores = validar();
    var form = document.getElementById('formulario');
    var y = window.scrollY;
    form.textContent = '';

    // Ciudades del mapa como sugerencias para las empresas.
    var dl = h('datalist', { id: 'ciudades-mapa' }, (m.mapa ? m.mapa.puntos : []).map(function (p) { return h('option', { value: p.ciudad }); }));
    form.appendChild(dl);

    form.appendChild(seccionGeneral());
    form.appendChild(seccionPortada());
    form.appendChild(seccionMapa());
    m.categorias.forEach(function (c, n) { form.appendChild(seccionCategoria(c, n, errores)); });
    form.appendChild(h('div', { class: 'agregar-categoria' }, boton('+ Agregar categoría', function () {
      var c = { comentarios: [], id: '', idAuto: true, nombre: '', corto: '', oculta: false, empresas: [] };
      m.categorias.push(c); cambio(true);
      setTimeout(function () { irA('cat-' + clave(c)); }, 30);
    }, 'primario')));
    form.appendChild(seccionPie());

    pintarIndice(errores);
    pintarEstado(errores);
    window.scrollTo(0, y);
  }

  function pintarIndice(errores) {
    var nav = document.getElementById('indice');
    nav.textContent = '';
    function enlace(texto, ancla, n, nivel) {
      return h('a', { href: '#' + ancla, class: nivel || null, onclick: function (ev) { ev.preventDefault(); menu(false); irA(ancla); } },
        h('span', { text: texto }), n ? h('span', { class: 'insignia roja', text: String(n) }) : null);
    }
    nav.appendChild(enlace('General', 'sec-general'));
    nav.appendChild(enlace('Portada', 'sec-portada'));
    nav.appendChild(enlace('Mapa', 'sec-mapa'));
    m.categorias.forEach(function (c) {
      var n = errores.filter(function (r) {
        return r.nivel === 'error' && (r.ancla === 'cat-' + clave(c) || c.empresas.some(function (e) { return r.ancla === 'emp-' + clave(e); }));
      }).length;
      nav.appendChild(enlace(c.corto || c.nombre || 'Categoría nueva', 'cat-' + clave(c), n));
      c.empresas.forEach(function (e) {
        var ne = empresaConError(e, errores).filter(function (r) { return r.nivel === 'error'; }).length;
        nav.appendChild(enlace(e.nombre || 'Empresa nueva', 'emp-' + clave(e), ne, 'sub'));
      });
    });
    nav.appendChild(enlace('Pie de página', 'sec-pie'));
  }

  function pintarEstado(errores) {
    var nErr = errores.filter(function (r) { return r.nivel === 'error'; }).length;
    var nAv = errores.length - nErr;
    var estado = document.getElementById('estado');
    estado.textContent = '';
    estado.className = 'estado ' + (nErr ? 'con-error' : nAv ? 'con-aviso' : 'ok');
    var resumen = nErr ? nErr + (nErr === 1 ? ' dato pendiente' : ' datos pendientes') + ' antes de descargar'
      : nAv ? 'Listo para descargar · ' + nAv + (nAv === 1 ? ' aviso' : ' avisos') : 'Todo listo para descargar';
    var det = h('details', { class: 'estado-det' }, h('summary', { text: resumen }));
    if (errores.length) {
      det.appendChild(h('ul', null, errores.map(function (r) {
        return h('li', { class: r.nivel }, h('a', { href: '#' + r.ancla, onclick: function (ev) {
          ev.preventDefault();
          var k = r.ancla.replace(/^emp-/, '');
          if (r.ancla.indexOf('emp-') === 0) abiertos[k] = true;
          var d = document.getElementById(r.ancla); if (d && d.tagName === 'DETAILS') d.open = true;
          irA(r.ancla);
        } }, r.texto));
      })));
    }
    estado.appendChild(det);
    var hay = hayCambios();
    document.getElementById('cambios').hidden = !hay;
    var btn = document.getElementById('descargar');
    btn.classList.toggle('bloqueado', nErr > 0);
  }

  function irA(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'DETAILS') el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============================ CAMBIOS ============================ */

  var esperaGuardar, esperaEstado;
  function cambio(repintar, enfocarUltimo, soloRevisar) {
    if (repintar) {
      pintar();
      if (enfocarUltimo) enfocarNuevo();
    } else {
      clearTimeout(esperaEstado);
      esperaEstado = setTimeout(function () {
        var errores = validar();
        pintarEstado(errores); pintarIndice(errores);
        actualizarInsignias(errores);
      }, 250);
    }
    if (soloRevisar) return;
    clearTimeout(esperaGuardar);
    esperaGuardar = setTimeout(guardarBorrador, 600);
  }

  // Tras "+ Agregar", pone el cursor en el renglón nuevo.
  var ultimoClic = null;
  document.addEventListener('click', function (e) { var b = e.target.closest('.agregar'); ultimoClic = b ? b.parentNode : null; }, true);
  function enfocarNuevo() {
    // El bloque se volvió a pintar: se busca por posición dentro de la sección.
    if (!ultimoClic) return;
    var ruta = ultimoClic.closest('[id]');
    if (!ruta) return;
    var nuevo = document.getElementById(ruta.id);
    if (!nuevo) return;
    var bloques = Array.prototype.slice.call(ruta.querySelectorAll('.bloque'));
    var idx = bloques.indexOf(ultimoClic);
    var bloque = idx !== -1 ? nuevo.querySelectorAll('.bloque')[idx] : null;
    if (!bloque) return;
    var filas = bloque.querySelectorAll('.lista > .fila');
    var ultima = filas[filas.length - 1];
    var input = ultima && ultima.querySelector('.c-valor input, .c-valor textarea, .c-url input, input:not([type=checkbox])');
    if (input) input.focus();
  }

  function actualizarInsignias(errores) {
    m.categorias.forEach(function (c) {
      c.empresas.forEach(function (e) {
        var det = document.getElementById('emp-' + clave(e));
        if (!det) return;
        var suyos = empresaConError(e, errores);
        var n = suyos.filter(function (r) { return r.nivel === 'error'; }).length;
        var ins = det.querySelector('summary .insignia.roja');
        if (n && !ins) { ins = h('span', { class: 'insignia roja' }); det.querySelector('summary').appendChild(ins); }
        if (ins) { if (n) ins.textContent = n === 1 ? '1 pendiente' : n + ' pendientes'; else ins.remove(); }
        var ciudad = det.querySelector('.empresa-ciudad');
        if (ciudad) ciudad.textContent = e.ciudades.filter(Boolean).join(' · ');
        var ul = det.querySelector('.avisos-empresa');
        if (ul) ul.remove();
        if (suyos.length) det.querySelector('.empresa-cuerpo').insertBefore(
          h('ul', { class: 'avisos-empresa' }, suyos.map(function (r) { return h('li', { class: r.nivel, text: r.texto }); })),
          det.querySelector('.empresa-cuerpo').firstChild);
      });
    });
  }

  function hayCambios() { return m && generar(m) !== generar(aModelo(leerXml(textoOriginal))); }

  /* ============================ BORRADOR ============================ */

  function guardarBorrador() {
    try {
      if (hayCambios()) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ xml: generar(m), original: textoOriginal, fecha: Date.now() }));
      else localStorage.removeItem(CLAVE_BORRADOR);
    } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  function leerBorrador() {
    try { return JSON.parse(localStorage.getItem(CLAVE_BORRADOR) || 'null'); } catch (e) { return null; }
  }
  function borrarBorrador() { try { localStorage.removeItem(CLAVE_BORRADOR); } catch (e) { /* nada */ } }

  function ofrecerBorrador() {
    var b = leerBorrador();
    if (!b || !b.xml || b.xml === generar(m)) return;
    var fecha = new Date(b.fecha);
    var aviso = document.getElementById('borrador');
    aviso.textContent = '';
    aviso.appendChild(h('span', { text: 'Tienes cambios sin descargar del ' + fecha.toLocaleDateString('es-MX') + ' a las ' + fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) + '.' }));
    aviso.appendChild(boton('Recuperarlos', function () {
      try { m = aModelo(leerXml(b.xml)); if (b.original) textoOriginal = b.original; aviso.hidden = true; pintar(); mensaje('Cambios recuperados.'); }
      catch (e) { mensaje('No se pudo recuperar el borrador.', true); }
    }, 'primario chico'));
    aviso.appendChild(boton('Descartar', function () { borrarBorrador(); aviso.hidden = true; }, 'chico'));
    aviso.hidden = false;
  }

  /* ============================ CARGA Y DESCARGA ============================ */

  function leerXml(texto) {
    var doc = new DOMParser().parseFromString(texto, 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) {
      var linea = (err.textContent.match(/line(?: number)?\s*(\d+)/i) || [])[1];
      throw new Error('El archivo tiene un error de escritura' + (linea ? ' cerca de la línea ' + linea : '') + '.');
    }
    if (doc.documentElement.nodeName !== 'sitio') throw new Error('Este no parece ser el contenido.xml del sitio (falta <sitio>).');
    return doc;
  }

  function cargarTexto(texto, origen) {
    var doc = leerXml(texto);
    textoOriginal = texto;
    m = aModelo(doc);
    abiertos = {};
    document.body.classList.remove('sin-archivo');
    document.getElementById('origen').textContent = origen;
    pintar();
    ofrecerBorrador();
  }

  function mensaje(texto, error) {
    var el = document.getElementById('mensaje');
    el.textContent = texto;
    el.className = 'mensaje' + (error ? ' error' : '');
    el.hidden = false;
    clearTimeout(mensaje.t);
    mensaje.t = setTimeout(function () { el.hidden = true; }, error ? 6000 : 3000);
  }

  function abrirArchivo(f) {
    if (!f) return;
    if (!/\.xml$/i.test(f.name)) { mensaje('Elige un archivo .xml', true); return; }
    if (m && hayCambios() && !confirm('Tienes cambios sin descargar. ¿Abrir otro archivo de todos modos?')) return;
    f.text().then(function (t) {
      try { cargarTexto(t, f.name); mensaje('Abierto: ' + f.name); }
      catch (e) { mensaje(e.message, true); }
    });
  }

  function descargar() {
    var errores = validar().filter(function (r) { return r.nivel === 'error'; });
    if (errores.length) {
      var det = document.querySelector('.estado-det'); if (det) det.open = true;
      mensaje('Completa los datos pendientes antes de descargar (están en la lista de abajo).', true);
      return;
    }
    var xml = generar(m);
    try { leerXml(xml); } catch (e) { mensaje('No se pudo generar el XML: ' + e.message, true); return; }
    var url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
    var a = h('a', { href: url, download: 'contenido.xml' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    // Lo descargado pasa a ser la nueva base.
    textoOriginal = xml;
    borrarBorrador();
    pintarEstado(validar());
    mensaje('Listo: se descargó contenido.xml. Súbelo al sitio reemplazando el anterior.');
  }

  // Menú de secciones en celular: el botón ☰ abre el índice como panel lateral.
  function menu(abrir) {
    document.body.classList.toggle('menu-abierto', abrir);
    document.getElementById('btn-menu').setAttribute('aria-expanded', String(abrir));
  }
  document.getElementById('btn-menu').addEventListener('click', function () { menu(!document.body.classList.contains('menu-abierto')); });
  document.getElementById('indice-velo').addEventListener('click', function () { menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 960) menu(false); });

  document.getElementById('descargar').addEventListener('click', descargar);
  document.getElementById('abrir').addEventListener('change', function (e) { abrirArchivo(e.target.files[0]); e.target.value = ''; });
  window.addEventListener('dragover', function (e) { e.preventDefault(); document.body.classList.add('arrastrando'); });
  window.addEventListener('dragleave', function (e) { if (!e.relatedTarget) document.body.classList.remove('arrastrando'); });
  window.addEventListener('drop', function (e) {
    e.preventDefault(); document.body.classList.remove('arrastrando');
    abrirArchivo(e.dataTransfer.files[0]);
  });
  window.addEventListener('beforeunload', function (e) { if (m && hayCambios()) { e.preventDefault(); e.returnValue = ''; } });

  // Documentos de docs/ como sugerencias para los links (Brochure, Expansión, links del pie).
  // Con PHP la lista sale del servidor; si no, de docs/lista.json (lo mantiene subir.html).
  function cargarDocs() {
    var dl = h('datalist', { id: 'docs-sitio' });
    document.body.appendChild(dl);
    function pedir(url, campoLista) {
      return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { return j && Array.isArray(j[campoLista]) ? j[campoLista] : null; }).catch(function () { return null; });
    }
    pedir('admin/api.php?accion=docs', 'documentos')
      .then(function (l) { return l || pedir('docs/lista.json?v=' + Date.now(), 'documentos'); })
      .then(function (lista) {
        (lista || []).forEach(function (d) {
          var url = d.url || 'docs/' + d.nombre;
          archivos[url] = true; // ya se sabe que existe
          dl.appendChild(h('option', { value: url, label: d.nombre + (d.tamano ? ' · ' + Math.max(1, Math.round(d.tamano / 1024)) + ' KB' : '') }));
        });
      });
  }
  cargarDocs();

  fetch(FUENTE + '?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(); return r.text(); })
    .then(function (t) { cargarTexto(t, FUENTE + ' del sitio'); })
    .catch(function () {
      document.body.classList.add('sin-archivo');
      var b = leerBorrador();
      if (b && b.xml) { try { cargarTexto(b.original || b.xml, 'borrador guardado'); } catch (e) { /* nada */ } }
    });
})();
