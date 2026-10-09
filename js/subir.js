/* =====================================================================
   Hutchison Ports México — subir.html
   Sube contenido.xml y las fotos (img/portada/, img/<id>/) con usuario y contraseña.

   Dos modos, se elige solo al abrir la página:
   · PHP (Azure con nginx + PHP): si responde admin/api.php, todo se guarda directo en el servidor.
   · GitHub Pages (sin PHP): los cambios se guardan como commit en el repositorio con la API de GitHub.

   Acceso en modo GitHub:
   · admin/acceso.json guarda, por usuario, un token de GitHub cifrado (AES-GCM) con una clave
     que sale de la contraseña (PBKDF2). Sin la contraseña el token no se puede leer.
   · Al entrar se descifra el token y queda solo en esta pestaña (sessionStorage).
   · Todos los cambios se publican juntos en un solo commit (API de Git de GitHub).
   ===================================================================== */
(function () {
  'use strict';

  var DUENO = 'arkangeldigital-maker';
  var REPO = 'landinghutchison';
  var RAMA = 'main';
  var ACCESO = 'admin/acceso.json';
  var ITERACIONES = 600000;
  var EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp'];
  var PORTADA = 'img/portada';
  var ANCHO_MAX = { portada: 1920, empresa: 1280 };
  var CALIDAD_JPG = 0.85;
  var SESION = 'subir-sesion';

  var $ = function (id) { return document.getElementById(id); };
  var API_PHP = 'admin/api.php';
  var MAX_BYTES_FOTO = 900 * 1024; // nginx acepta 1 MB por petición si no se configura otra cosa
  var modo = 'github';    // 'php' o 'github'
  var csrf = '';          // token de la sesión PHP
  var sesion = null;      // { usuario, token }
  var base = null;        // { commit, rutas: { ruta: sha } }
  var xmlActual = null;   // texto de contenido.xml en el repositorio
  var xmlNuevo = null;    // { texto, nombre, empresas } listo para subir
  var carpetas = {};      // carpeta → { originales: [...], items: [...] }
  var miniaturas = {};    // sha → URL de la imagen
  var reemplazarEn = -1;

  /* ---------- Utilidades ---------- */

  function h(tag, attrs, hijos) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (hijos || []).forEach(function (c) { if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }

  var temporizador;
  function avisar(texto, error, ms) {
    var m = $('mensaje');
    m.textContent = texto;
    m.className = 'mensaje' + (error ? ' error' : '');
    m.hidden = false;
    clearTimeout(temporizador);
    if (ms !== 0) temporizador = setTimeout(function () { m.hidden = true; }, ms || 4000);
  }

  function mostrarError(id, texto) { $(id).textContent = texto; $(id).hidden = !texto; }

  function peso(bytes) { return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.round(bytes / 1024) + ' KB'; }

  function aBase64(bytes) {
    var s = '';
    var b = new Uint8Array(bytes);
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deBase64(texto) {
    var s = atob(texto);
    var b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function textoDeBase64(texto) { return new TextDecoder().decode(deBase64(texto.replace(/\s/g, ''))); }

  function normalizarUsuario(u) { return String(u || '').trim().toLowerCase(); }

  /* ---------- Cifrado del token ---------- */

  function derivarClave(clave, sal, iteraciones) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveKey'])
      .then(function (k) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iteraciones, hash: 'SHA-256' },
          k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  function cifrar(usuario, clave, token) {
    var sal = crypto.getRandomValues(new Uint8Array(16));
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return derivarClave(clave, sal, ITERACIONES).then(function (k) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(usuario) },
        k, new TextEncoder().encode(token));
    }).then(function (datos) {
      return { usuario: usuario, iteraciones: ITERACIONES, sal: aBase64(sal), iv: aBase64(iv), datos: aBase64(datos) };
    });
  }

  function descifrar(entrada, clave) {
    return derivarClave(clave, deBase64(entrada.sal), entrada.iteraciones).then(function (k) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(entrada.iv), additionalData: new TextEncoder().encode(entrada.usuario) },
        k, deBase64(entrada.datos));
    }).then(function (b) { return new TextDecoder().decode(b); });
  }

  // Lee admin/acceso.json del sitio; si no está (por ejemplo en localhost sin actualizar), del repositorio.
  function leerAcceso() {
    function pedir(url) {
      return fetch(url, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) return null;
        return r.json().catch(function () { return null; });
      }).catch(function () { return null; });
    }
    return pedir(ACCESO).then(function (a) {
      return a || pedir('https://raw.githubusercontent.com/' + DUENO + '/' + REPO + '/' + RAMA + '/' + ACCESO + '?t=' + Date.now());
    }).then(function (a) { return a && Array.isArray(a.usuarios) ? a : null; });
  }

  /* ---------- API de GitHub ---------- */

  function gh(ruta, opciones, token) {
    opciones = opciones || {};
    var headers = {
      Accept: opciones.crudo ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + (token || sesion.token)
    };
    if (opciones.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/' + DUENO + '/' + REPO + ruta, {
      method: opciones.method || 'GET',
      headers: headers,
      body: opciones.body ? JSON.stringify(opciones.body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error(j.message || ('GitHub respondió ' + r.status));
          e.status = r.status;
          throw e;
        });
      }
      if (opciones.crudo === 'blob') return r.blob();
      if (opciones.crudo) return r.text();
      return r.status === 204 ? null : r.json();
    });
  }

  // Llamada a admin/api.php (modo PHP).
  function api(accion, datos, formulario) {
    var opciones = { method: datos || formulario ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store', headers: { 'X-CSRF': csrf } };
    if (formulario) opciones.body = formulario;
    else if (datos) { opciones.body = JSON.stringify(datos); opciones.headers['Content-Type'] = 'application/json'; }
    return fetch(API_PHP + '?accion=' + accion, opciones).then(function (r) {
      return r.json().catch(function () {
        var e = new Error(r.status === 413 ? 'El servidor rechazó el archivo por pesado (client_max_body_size de nginx).' : 'El servidor respondió ' + r.status + '.');
        e.status = r.status;
        throw e;
      }).then(function (j) {
        if (!r.ok || j.error) { var e = new Error(j.error || 'Error ' + r.status); e.status = r.status; e.php = true; throw e; }
        return j;
      });
    });
  }

  function explicarError(e) {
    if (e.php || modo === 'php') return e.message || 'Error desconocido';
    if (e.status === 401) return 'El token de GitHub ya no es válido (venció o se revocó). Un administrador debe renovarlo en «Configurar acceso».';
    if (e.status === 403 || e.status === 404) return 'El token no tiene permiso de escritura en el repositorio (Contents: Read and write).';
    if (e.status === 409 || e.status === 422) return 'Alguien más publicó cambios al mismo tiempo. Intenta de nuevo.';
    return e.message || 'Error desconocido';
  }

  /* ---------- Vistas ---------- */

  function vista(nombre) {
    ['entrar', 'configurar', 'panel'].forEach(function (v) { $('vista-' + v).hidden = v !== nombre; });
    $('pie-panel').hidden = nombre !== 'panel';
    $('salir').hidden = nombre !== 'panel';
    $('usuarios').hidden = !(modo === 'php' && nombre === 'panel');
    $('quien').textContent = sesion && sesion.usuario ? 'Sesión: ' + sesion.usuario : 'Hutchison Ports México';
    if (nombre === 'configurar') prepararConfigurar();
    var foco = { entrar: 'e-usuario', configurar: 'c-usuario' }[nombre];
    if (foco) setTimeout(function () { $(foco).focus(); }, 0);
  }

  function iniciar() {
    // ¿Hay PHP? Si admin/api.php responde JSON se usa el servidor; si no (GitHub Pages), GitHub.
    fetch(API_PHP + '?accion=estado', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (estado) {
        if (estado && estado.modo === 'php') return iniciarPhp(estado);
        iniciarGithub();
      });
  }

  function iniciarPhp(estado) {
    modo = 'php';
    csrf = estado.csrf;
    document.body.classList.add('modo-php');
    if (estado.sinPermiso && estado.sinPermiso.length) {
      avisar('El servidor no puede escribir en: ' + estado.sinPermiso.join(', ') + '. Revisa los permisos (ver LEEME.md).', true, 0);
    }
    if (estado.usuario) { sesion = { usuario: estado.usuario }; return abrirPanel(); }
    if (estado.hayUsuarios) return vista('entrar');
    vista('configurar');
    mostrarError('c-error', 'Todavía no hay usuarios. Crea el primero.');
  }

  function iniciarGithub() {
    try { sesion = JSON.parse(sessionStorage.getItem(SESION)); } catch (e) { sesion = null; }
    if (sesion && sesion.token) return abrirPanel();
    if (location.hash === '#configurar') return vista('configurar');
    leerAcceso().then(function (a) {
      if (a && a.usuarios.length) return vista('entrar');
      vista('configurar');
      mostrarError('c-error', 'Todavía no hay usuarios. Crea el primero.');
    });
  }

  /* ---------- Entrar ---------- */

  $('form-entrar').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var usuario = normalizarUsuario($('e-usuario').value);
    var clave = $('e-clave').value;
    var boton = $('e-boton');
    mostrarError('e-error', '');
    boton.disabled = true;
    boton.textContent = 'Revisando…';
    if (modo === 'php') {
      api('entrar', { usuario: usuario, clave: clave }).then(function (r) {
        sesion = { usuario: r.usuario };
        $('e-clave').value = '';
        return api('estado').then(function (e) { csrf = e.csrf; abrirPanel(); });
      }).catch(function (e) { mostrarError('e-error', e.message); }).then(function () {
        boton.disabled = false;
        boton.textContent = 'Entrar';
      });
      return;
    }
    leerAcceso().then(function (a) {
      var entrada = a && a.usuarios.filter(function (u) { return u.usuario === usuario; })[0];
      if (!entrada) throw new Error('mal');
      return descifrar(entrada, clave).catch(function () { throw new Error('mal'); });
    }).then(function (token) {
      return gh('', {}, token).then(function () { return token; });
    }).then(function (token) {
      sesion = { usuario: usuario, token: token };
      try { sessionStorage.setItem(SESION, JSON.stringify(sesion)); } catch (e) { /* sin almacenamiento: dura hasta recargar */ }
      $('e-clave').value = '';
      abrirPanel();
    }).catch(function (e) {
      mostrarError('e-error', e.message === 'mal' ? 'Usuario o contraseña incorrectos.' : explicarError(e));
    }).then(function () {
      boton.disabled = false;
      boton.textContent = 'Entrar';
    });
  });

  $('salir').addEventListener('click', function () {
    if (hayCambios() && !confirm('Tienes cambios sin publicar. ¿Salir de todos modos?')) return;
    try { sessionStorage.removeItem(SESION); } catch (e) { /* nada */ }
    sesion = null;
    (modo === 'php' ? api('salir', {}).catch(function () {}) : Promise.resolve()).then(function () {
      location.hash = '';
      location.reload();
    });
  });

  $('usuarios').addEventListener('click', function () { vista('configurar'); });

  $('ir-configurar').addEventListener('click', function (ev) { ev.preventDefault(); location.hash = 'configurar'; vista('configurar'); });
  $('volver-entrar').addEventListener('click', function (ev) {
    ev.preventDefault();
    location.hash = '';
    if (modo === 'php' && sesion) vista('panel');
    else vista('entrar');
  });

  // En modo PHP no hace falta token de GitHub: solo usuario y contraseña.
  function prepararConfigurar() {
    var php = modo === 'php';
    $('c-titulo').textContent = php ? (sesion ? 'Agregar o cambiar usuario' : 'Crear el primer usuario') : 'Configurar acceso';
    $('c-solo-github').hidden = php;
    $('c-campo-token').hidden = php;
    $('c-token').required = !php;
    $('volver-entrar').textContent = php && sesion ? 'Volver al panel' : 'Volver a entrar';
  }

  /* ---------- Configurar acceso ---------- */

  $('c-repo-nombre').textContent = DUENO + '/' + REPO;

  $('form-configurar').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var usuario = normalizarUsuario($('c-usuario').value);
    var clave = $('c-clave').value;
    var token = $('c-token').value.trim();
    var boton = $('c-boton');
    mostrarError('c-error', '');
    mostrarError('c-ok', '');
    if (!/^[a-z0-9._-]{2,40}$/.test(usuario)) return mostrarError('c-error', 'El usuario solo puede llevar letras, números, punto, guion y guion bajo.');
    if (clave.length < 10) return mostrarError('c-error', 'La contraseña debe tener al menos 10 caracteres.');
    if (clave !== $('c-clave2').value) return mostrarError('c-error', 'Las contraseñas no coinciden.');

    boton.disabled = true;
    boton.textContent = 'Guardando…';
    if (modo === 'php') {
      api('usuario', { usuario: usuario, clave: clave }).then(function () {
        $('form-configurar').reset();
        mostrarError('c-ok', 'Listo: el usuario «' + usuario + '» ya puede entrar.');
        $('e-usuario').value = usuario;
        if (!sesion) setTimeout(function () { vista('entrar'); }, 1200);
      }).catch(function (e) { mostrarError('c-error', e.message); }).then(function () {
        boton.disabled = false;
        boton.textContent = 'Guardar acceso';
      });
      return;
    }
    var existente = null;
    gh('', {}, token).catch(function (e) {
      if (e.status === 401) throw new Error('GitHub no reconoce ese token.');
      if (e.status === 404) throw new Error('El token no tiene acceso al repositorio ' + DUENO + '/' + REPO + '.');
      throw e;
    }).then(function () {
      return gh('/contents/' + ACCESO + '?ref=' + RAMA, {}, token).catch(function (e) { if (e.status === 404) return null; throw e; });
    }).then(function (archivo) {
      existente = archivo;
      return cifrar(usuario, clave, token);
    }).then(function (entrada) {
      var acceso = existente ? JSON.parse(textoDeBase64(existente.content)) : {};
      var usuarios = (acceso.usuarios || []).filter(function (u) { return u.usuario !== usuario; });
      var yaExistia = usuarios.length < (acceso.usuarios || []).length;
      usuarios.push(entrada);
      var contenido = {
        nota: 'Acceso a subir.html. Cada token está cifrado con la contraseña de su usuario (PBKDF2 + AES-GCM). No edites a mano.',
        usuarios: usuarios
      };
      return gh('/contents/' + ACCESO, {
        method: 'PUT',
        body: {
          message: (yaExistia ? 'Actualizar' : 'Agregar') + ' acceso al panel para ' + usuario,
          content: aBase64(new TextEncoder().encode(JSON.stringify(contenido, null, 2) + '\n')),
          branch: RAMA,
          sha: existente ? existente.sha : undefined
        }
      }, token);
    }).then(function () {
      $('form-configurar').reset();
      mostrarError('c-ok', 'Listo: el usuario «' + usuario + '» ya puede entrar. (En el sitio publicado tarda 1 o 2 minutos en aparecer.)');
      $('e-usuario').value = usuario;
    }).catch(function (e) {
      mostrarError('c-error', e.status ? explicarError(e) : e.message);
    }).then(function () {
      boton.disabled = false;
      boton.textContent = 'Guardar acceso';
    });
  });

  /* ---------- Panel: estado del repositorio ---------- */

  function cargarRepositorio() {
    if (modo === 'php') {
      return api('archivos').then(function (r) {
        base = { rutas: r.rutas };
        xmlActual = r.xml;
      });
    }
    return gh('/git/ref/heads/' + RAMA).then(function (ref) {
      var commit = ref.object.sha;
      return Promise.all([
        gh('/git/trees/' + commit + '?recursive=1'),
        gh('/contents/contenido.xml?ref=' + commit, { crudo: true })
      ]).then(function (r) {
        var rutas = {};
        r[0].tree.forEach(function (n) { if (n.type === 'blob') rutas[n.path] = n.sha; });
        base = { commit: commit, rutas: rutas };
        xmlActual = r[1];
      });
    });
  }

  function abrirPanel() {
    vista('panel');
    document.body.classList.add('ocupado');
    avisar('Leyendo el sitio…', false, 0);
    cargarRepositorio().then(function () {
      carpetas = {};
      xmlNuevo = null;
      pintarXml();
      pintarCarpetas();
      $('mensaje').hidden = true;
    }).catch(function (e) {
      if (e.status === 401) {
        try { sessionStorage.removeItem(SESION); } catch (x) { /* nada */ }
        vista('entrar');
        mostrarError('e-error', explicarError(e));
        $('mensaje').hidden = true;
        return;
      }
      avisar('No se pudo leer el repositorio: ' + explicarError(e), true, 0);
    }).then(function () { document.body.classList.remove('ocupado'); });
  }

  function leerXml(texto) {
    var doc = new DOMParser().parseFromString(texto, 'application/xml');
    var err = doc.getElementsByTagName('parsererror')[0];
    if (err) throw new Error('El XML está mal escrito: ' + err.textContent.split('\n')[0]);
    return doc;
  }

  function empresasDe(texto) {
    var doc;
    try { doc = leerXml(texto); } catch (e) { return []; }
    return Array.prototype.map.call(doc.getElementsByTagName('empresa'), function (e) {
      var nombre = e.getElementsByTagName('nombre')[0];
      return { id: e.getAttribute('id'), nombre: nombre ? nombre.textContent.trim() : e.getAttribute('id'), oculta: e.getAttribute('visible') === 'no' };
    }).filter(function (e) { return e.id; });
  }

  /* ---------- contenido.xml ---------- */

  $('xml-archivo').addEventListener('change', function () {
    var archivo = this.files[0];
    this.value = '';
    if (!archivo) return;
    archivo.text().then(function (texto) {
      var doc = leerXml(texto);
      var raizActual = xmlActual ? leerXml(xmlActual).documentElement.nodeName : null;
      if (raizActual && doc.documentElement.nodeName !== raizActual) {
        throw new Error('Ese no parece ser el contenido.xml del sitio (empieza con <' + doc.documentElement.nodeName + '> en lugar de <' + raizActual + '>).');
      }
      var empresas = empresasDe(texto);
      if (!empresas.length) throw new Error('El XML no tiene ninguna <empresa>.');
      if (texto === xmlActual) { avisar('Ese archivo es igual al que ya está publicado.'); return; }
      xmlNuevo = { texto: texto, nombre: archivo.name, empresas: empresas };
      pintarXml();
      pintarCarpetas();
    }).catch(function (e) { avisar(e.message, true, 8000); });
  });

  $('xml-quitar').addEventListener('click', function () { xmlNuevo = null; pintarXml(); pintarCarpetas(); });

  function pintarXml() {
    var antes = empresasDe(xmlActual || '').length;
    $('xml-quitar').hidden = !xmlNuevo;
    $('xml-estado').innerHTML = '';
    $('xml-estado').appendChild(xmlNuevo
      ? h('span', {}, [h('b', { text: xmlNuevo.nombre }), ' listo para publicar: ' + xmlNuevo.empresas.length + ' empresas (ahora hay ' + antes + ').'])
      : document.createTextNode('Sin cambios. El publicado tiene ' + antes + ' empresas.'));
    resumir();
  }

  /* ---------- Fotos ---------- */

  function originalesDe(carpeta) {
    var re = new RegExp('^' + carpeta.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/(\\d+)\\.(' + EXTENSIONES.join('|') + ')$');
    return Object.keys(base.rutas).map(function (ruta) {
      var m = ruta.match(re);
      return m && { tipo: 'existente', ruta: ruta, sha: base.rutas[ruta], n: +m[1], ext: m[2] };
    }).filter(Boolean).sort(function (a, b) { return a.n - b.n || EXTENSIONES.indexOf(a.ext) - EXTENSIONES.indexOf(b.ext); });
  }

  function estadoDe(carpeta) {
    if (!carpetas[carpeta]) {
      var originales = originalesDe(carpeta);
      carpetas[carpeta] = { originales: originales, items: originales.slice() };
    }
    return carpetas[carpeta];
  }

  // Rutas finales: 1.jpg, 2.jpg… en el orden de la lista (las existentes conservan su extensión).
  function rutasFinales(carpeta, items) {
    return items.map(function (it, i) { return carpeta + '/' + (i + 1) + '.' + (it.tipo === 'nueva' ? 'jpg' : it.ext); });
  }

  function carpetaCambio(carpeta) {
    var e = carpetas[carpeta];
    if (!e) return false;
    var finales = rutasFinales(carpeta, e.items);
    if (finales.length !== e.originales.length) return true;
    return e.items.some(function (it, i) { return it.tipo === 'nueva' || it.ruta !== finales[i]; }) ||
      e.originales.some(function (o, i) { return o.ruta !== finales[i]; });
  }

  function carpetaActual() { return $('carpeta').value || PORTADA; }

  function pintarCarpetas() {
    var sel = $('carpeta');
    var elegida = sel.value || PORTADA;
    var empresas = xmlNuevo ? xmlNuevo.empresas : empresasDe(xmlActual || '');
    sel.innerHTML = '';
    sel.appendChild(h('option', { value: PORTADA, text: 'Portada · ' + PORTADA }));
    var grupo = h('optgroup', { label: 'Empresas' });
    empresas.forEach(function (e) {
      grupo.appendChild(h('option', { value: 'img/' + e.id, text: e.nombre + ' · img/' + e.id + (e.oculta ? ' (oculta)' : '') }));
    });
    sel.appendChild(grupo);
    // Carpetas con cambios de una empresa que ya no está en el XML nuevo: se siguen mostrando.
    Object.keys(carpetas).forEach(function (c) {
      if (!sel.querySelector('option[value="' + c + '"]') && carpetaCambio(c)) sel.appendChild(h('option', { value: c, text: c }));
    });
    sel.value = sel.querySelector('option[value="' + elegida + '"]') ? elegida : PORTADA;
    pintarFotos();
  }

  $('carpeta').addEventListener('change', pintarFotos);

  function miniatura(it, div) {
    if (it.tipo === 'nueva') { div.style.backgroundImage = 'url("' + it.url + '")'; return; }
    if (modo === 'php') { div.style.backgroundImage = 'url("' + it.ruta + '?v=' + encodeURIComponent(it.sha) + '")'; return; }
    if (miniaturas[it.sha]) { div.style.backgroundImage = 'url("' + miniaturas[it.sha] + '")'; return; }
    gh('/git/blobs/' + it.sha, { crudo: 'blob' }).then(function (b) {
      miniaturas[it.sha] = URL.createObjectURL(b);
      div.style.backgroundImage = 'url("' + miniaturas[it.sha] + '")';
    }).catch(function () { /* sin miniatura */ });
  }

  function pintarFotos() {
    var carpeta = carpetaActual();
    var e = estadoDe(carpeta);
    var cont = $('fotos');
    cont.innerHTML = '';
    if (!e.items.length) cont.appendChild(h('div', { class: 'fotos-vacio', text: 'Esta carpeta no tiene fotos. Agrega una o varias.' }));
    var finales = rutasFinales(carpeta, e.items);
    e.items.forEach(function (it, i) {
      var img = h('div', { class: 'foto-img' });
      miniatura(it, img);
      cont.appendChild(h('div', { class: 'foto' + (it.tipo === 'nueva' ? ' nueva' : '') }, [
        img,
        h('span', { class: 'foto-num', text: String(i + 1) }),
        it.tipo === 'nueva' ? h('span', { class: 'foto-etiqueta', text: 'Nueva' }) : null,
        h('div', { class: 'foto-info', title: it.tipo === 'nueva' ? it.nombre : it.ruta,
          text: it.tipo === 'nueva' ? it.ancho + '×' + it.alto + ' · ' + peso(it.blob.size) : (it.ruta === finales[i] ? it.ruta : it.ruta + ' → ' + finales[i].split('/').pop()) }),
        h('div', { class: 'foto-controles' }, [
          h('button', { type: 'button', class: 'btn-icono', title: 'Mover antes', 'aria-label': 'Mover antes', disabled: i === 0, text: '←', onclick: function () { mover(i, -1); } }),
          h('button', { type: 'button', class: 'btn-icono', title: 'Mover después', 'aria-label': 'Mover después', disabled: i === e.items.length - 1, text: '→', onclick: function () { mover(i, 1); } }),
          h('span', { class: 'espacio' }),
          h('button', { type: 'button', class: 'btn chico', text: 'Reemplazar', onclick: function () { reemplazarEn = i; $('reemplazar').click(); } }),
          h('button', { type: 'button', class: 'btn chico peligro', text: 'Quitar', onclick: function () { e.items.splice(i, 1); pintarFotos(); } })
        ])
      ]));
    });
    var cambio = carpetaCambio(carpeta);
    $('fotos-deshacer').hidden = !cambio;
    var huecos = e.originales.some(function (o, i) { return o.n !== i + 1; });
    $('fotos-nota').textContent = huecos && !cambio
      ? 'Ojo: los números de esta carpeta tienen saltos o repetidos, así que el sitio no muestra todas. Al publicar cualquier cambio aquí se renumeran.'
      : 'Ideal: fotos horizontales ' + (carpeta === PORTADA ? '1920×1080' : '1280×720') + ' (16:9).';
    resumir();
  }

  function mover(i, paso) {
    var items = estadoDe(carpetaActual()).items;
    var it = items.splice(i, 1)[0];
    items.splice(i + paso, 0, it);
    pintarFotos();
  }

  $('fotos-deshacer').addEventListener('click', function () {
    var e = estadoDe(carpetaActual());
    e.items = e.originales.slice();
    pintarFotos();
  });

  // Reduce la foto y la convierte a JPG (fondo blanco si tenía transparencia).
  function prepararFoto(archivo, anchoMax) {
    return createImageBitmap(archivo).catch(function () {
      throw new Error('No se pudo leer «' + archivo.name + '». Usa JPG, PNG o WEBP.');
    }).then(function (bmp) {
      var escala = Math.min(1, anchoMax / bmp.width, anchoMax / bmp.height);
      var lienzo = document.createElement('canvas');
      lienzo.width = Math.round(bmp.width * escala);
      lienzo.height = Math.round(bmp.height * escala);
      var ctx = lienzo.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, lienzo.width, lienzo.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
      // Baja la calidad si hace falta para que cada foto pese menos de MAX_BYTES_FOTO.
      function jpg(calidad) {
        return new Promise(function (ok) { lienzo.toBlob(ok, 'image/jpeg', calidad); }).then(function (b) {
          return b.size > MAX_BYTES_FOTO && calidad > 0.5 ? jpg(calidad - 0.08) : b;
        });
      }
      return jpg(CALIDAD_JPG).then(function (blob) {
        return { tipo: 'nueva', blob: blob, url: URL.createObjectURL(blob), nombre: archivo.name, ancho: lienzo.width, alto: lienzo.height };
      });
    });
  }

  function anchoDe(carpeta) { return carpeta === PORTADA ? ANCHO_MAX.portada : ANCHO_MAX.empresa; }

  $('fotos-agregar').addEventListener('change', function () {
    var archivos = Array.prototype.slice.call(this.files);
    this.value = '';
    var carpeta = carpetaActual();
    avisar('Preparando ' + archivos.length + (archivos.length === 1 ? ' foto…' : ' fotos…'), false, 0);
    Promise.all(archivos.map(function (a) { return prepararFoto(a, anchoDe(carpeta)).catch(function (e) { return e; }); }))
      .then(function (r) {
        var malas = r.filter(function (x) { return x instanceof Error; });
        var e = estadoDe(carpeta);
        r.forEach(function (x) { if (!(x instanceof Error)) e.items.push(x); });
        pintarFotos();
        if (malas.length) avisar(malas.map(function (m) { return m.message; }).join(' '), true, 8000);
        else $('mensaje').hidden = true;
      });
  });

  $('reemplazar').addEventListener('change', function () {
    var archivo = this.files[0];
    this.value = '';
    if (!archivo || reemplazarEn < 0) return;
    var carpeta = carpetaActual();
    var i = reemplazarEn;
    prepararFoto(archivo, anchoDe(carpeta)).then(function (it) {
      estadoDe(carpeta).items[i] = it;
      pintarFotos();
    }).catch(function (e) { avisar(e.message, true, 8000); });
  });

  /* ---------- Resumen y publicar ---------- */

  function nombreCarpeta(c) {
    if (c === PORTADA) return 'Portada';
    var id = c.replace(/^img\//, '');
    var e = (xmlNuevo ? xmlNuevo.empresas : empresasDe(xmlActual || '')).filter(function (x) { return x.id === id; })[0];
    return e ? e.nombre : c;
  }

  function cambiosDeCarpetas() { return Object.keys(carpetas).filter(carpetaCambio); }
  function hayCambios() { return !!xmlNuevo || cambiosDeCarpetas().length > 0; }

  function describir() {
    var partes = [];
    if (xmlNuevo) partes.push('contenido.xml');
    cambiosDeCarpetas().forEach(function (c) {
      var n = carpetas[c].items.filter(function (it) { return it.tipo === 'nueva'; }).length;
      partes.push('fotos de ' + nombreCarpeta(c) + (n ? ' (' + n + (n === 1 ? ' nueva)' : ' nuevas)') : ''));
    });
    return partes;
  }

  function resumir() {
    var partes = describir();
    $('resumen').textContent = partes.length ? 'Por publicar: ' + partes.join(' · ') : 'Sin cambios por publicar.';
    $('publicar').disabled = !partes.length;
  }

  function blobABase64(blob) { return blob.arrayBuffer().then(aBase64); }

  $('publicar').addEventListener('click', function () {
    if (!hayCambios()) return;
    var boton = this;
    var descripcion = describir();
    boton.disabled = true;
    document.body.classList.add('ocupado');

    // 1) Sube las fotos nuevas una por una (en PHP a admin/tmp/, en GitHub como blobs).
    var nuevas = [];
    cambiosDeCarpetas().forEach(function (c) {
      carpetas[c].items.forEach(function (it) { if (it.tipo === 'nueva' && !it.sha) nuevas.push(it); });
    });
    var hechas = 0;
    var subir = nuevas.reduce(function (p, it) {
      return p.then(function () {
        avisar('Subiendo fotos ' + (++hechas) + ' de ' + nuevas.length + '…', false, 0);
        if (modo === 'php') {
          var fd = new FormData();
          fd.append('foto', it.blob, 'foto.jpg');
          return api('foto', null, fd).then(function (r) { it.sha = r.id; });
        }
        return blobABase64(it.blob).then(function (b64) {
          return gh('/git/blobs', { method: 'POST', body: { content: b64, encoding: 'base64' } });
        }).then(function (r) { it.sha = r.sha; });
      });
    }, Promise.resolve());

    var shaXml = null;
    subir.then(function () {
      if (modo !== 'php') return;
      // 2) PHP: el servidor coloca todo en el orden de la lista.
      avisar('Publicando…', false, 0);
      var plan = {};
      cambiosDeCarpetas().forEach(function (c) {
        plan[c] = carpetas[c].items.map(function (it) { return it.tipo === 'nueva' ? { nueva: it.sha } : { existente: it.ruta }; });
      });
      return api('publicar', { xml: xmlNuevo ? xmlNuevo.texto : undefined, carpetas: plan });
    }).then(function () {
      if (modo === 'php' || !xmlNuevo) return;
      avisar('Subiendo contenido.xml…', false, 0);
      return gh('/git/blobs', { method: 'POST', body: { content: xmlNuevo.texto, encoding: 'utf-8' } }).then(function (r) { shaXml = r.sha; });
    }).then(function () {
      if (modo === 'php') return;
      // 2) Arma el árbol: rutas nuevas o movidas, y borra las que ya no van.
      var arbol = [];
      if (shaXml) arbol.push({ path: 'contenido.xml', mode: '100644', type: 'blob', sha: shaXml });
      cambiosDeCarpetas().forEach(function (c) {
        var e = carpetas[c];
        var finales = rutasFinales(c, e.items);
        e.items.forEach(function (it, i) {
          if (it.tipo === 'existente' && it.ruta === finales[i]) return;
          arbol.push({ path: finales[i], mode: '100644', type: 'blob', sha: it.sha });
        });
        e.originales.forEach(function (o) {
          if (finales.indexOf(o.ruta) < 0) arbol.push({ path: o.ruta, mode: '100644', type: 'blob', sha: null });
        });
      });
      var mensaje = 'Panel (' + sesion.usuario + '): ' + descripcion.join(', ');

      // 3) Commit sobre la última versión de la rama (reintenta si alguien publicó en medio).
      function commit(intento) {
        avisar('Publicando…', false, 0);
        return gh('/git/ref/heads/' + RAMA).then(function (ref) {
          var padre = ref.object.sha;
          return gh('/git/commits/' + padre).then(function (c) {
            return gh('/git/trees', { method: 'POST', body: { base_tree: c.tree.sha, tree: arbol } });
          }).then(function (t) {
            return gh('/git/commits', { method: 'POST', body: { message: mensaje, tree: t.sha, parents: [padre] } });
          }).then(function (nuevo) {
            return gh('/git/refs/heads/' + RAMA, { method: 'PATCH', body: { sha: nuevo.sha } });
          });
        }).catch(function (e) {
          if (e.status === 422 && intento < 2) return commit(intento + 1);
          throw e;
        });
      }
      return commit(0);
    }).then(function () {
      return cargarRepositorio().then(function () {
        carpetas = {};
        xmlNuevo = null;
        pintarXml();
        pintarCarpetas();
        avisar(modo === 'php' ? 'Publicado. Ya está en el sitio.' : 'Publicado. El sitio se actualiza en 1 o 2 minutos.', false, 8000);
      });
    }).catch(function (e) {
      avisar('No se pudo publicar: ' + explicarError(e), true, 0);
      boton.disabled = false;
    }).then(function () { document.body.classList.remove('ocupado'); resumir(); });
  });

  window.addEventListener('beforeunload', function (ev) {
    if (sesion && hayCambios()) { ev.preventDefault(); ev.returnValue = ''; }
  });

  iniciar();
})();
