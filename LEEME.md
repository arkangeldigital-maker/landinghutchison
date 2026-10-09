# Hutchison Ports México · sitio alimentado por XML

Todo el contenido (textos, fotos, direcciones, teléfonos, correos, redes y brochures) vive en **`contenido.xml`**.
La página lo lee al abrirse y se arma sola. No hay base de datos ni código de servidor.

```
sitio/
├── index.html        ← estructura vacía (se llena desde el XML)
├── contenido.xml     ← EDITA ESTE ARCHIVO (a mano o con editor.html)
├── editor.html       ← formulario para editar contenido.xml sin tocar el código
├── subir.html        ← panel con usuario y contraseña para subir el XML y las fotos
├── admin/api.php     ← lo que usa subir.html en un servidor con PHP (Azure)
├── css/estilos.css
├── js/sitio.js       ← lee el XML, arma la página y los efectos
├── img/              ← logos, íconos y carpetas de fotos:
│   ├── portada/      ← fotos del carrusel de la portada: 1.jpg, 2.jpg…
│   └── icave/, lct/… ← fotos de cada empresa (una carpeta por id): 1.jpg, 2.jpg…
└── docs/             ← aquí van los PDF de brochure (docs/icave.pdf, etc.)
```

## Probar la edición del XML

El navegador no deja leer el XML si abres `index.html` con doble clic, así que necesitas un servidor local.
Abre una terminal en esta carpeta y ejecuta uno de estos comandos:

```bash
npx http-server . -p 5190 -c-1
```

o, si tienes Python:

```bash
python3 -m http.server 5190
```

Abre http://localhost:5190, edita `contenido.xml` y **guarda**: en unos 2 segundos la página se actualiza sola,
sin recargar (esto solo pasa en localhost). Si el XML queda mal escrito, aparece un aviso rojo con la línea
aproximada del error, y la página sigue mostrando la última versión correcta.

¿Sin servidor? Abre `index.html` con doble clic y **arrastra `contenido.xml` a la ventana**.

## Editar con el formulario (editor.html)

Abre **http://localhost:5190/editor.html** (o `editor.html` en el sitio publicado). Carga el `contenido.xml` actual
y lo muestra como formulario: general, portada, mapa, categorías, empresas y pie.

- Cada empresa necesita **al menos una dirección, un teléfono y un correo**. Se pueden agregar más (y WhatsApp, celular, fax, horario…).
- **Redes, Brochure y Expansión son opcionales**: se agregan con los botones «+ LinkedIn», «+ Brochure», etc.
- Abajo se ve si falta algo; mientras haya pendientes no deja descargar.
- **Descargar contenido.xml** genera el archivo nuevo: súbelo al sitio reemplazando el anterior.
- Formato en textos y direcciones: `**negrita**`, `*cursiva*`, `[texto](https://link)`.
- Si cierras la página sin descargar, al volver ofrece recuperar los cambios (se guardan en ese navegador).
- Si se abre con doble clic (sin servidor), arrastra el `contenido.xml` a la ventana.
- Lo que el formulario no edita (como los bloques `<sede>`) se conserva tal cual en el XML.

El editor no guarda nada en el servidor: solo genera el archivo. Si no quieres que sea visible al público,
no subas `editor.html`, `js/editor.js` ni `css/editor.css` (el sitio funciona sin ellos).

## Subir cambios con usuario y contraseña (subir.html)

Abre **`/subir.html`** en el sitio. Con usuario y contraseña permite:

- Subir un **contenido.xml** nuevo (revisa que esté bien escrito antes de aceptarlo; el anterior se respalda).
- Manejar las fotos de **`img/portada/`** y de **`img/<id>/`** de cada empresa: agregar (con el botón o arrastrándolas a la página), reemplazar, quitar (bote de basura) y cambiar el orden.
  Las fotos se reducen (portada 1920 px, empresas 1280 px), se guardan como `.jpg` de menos de 1 MB y se renumeran `1, 2, 3…` solas.
- **Publicar cambios** aplica todo junto.

La página detecta sola dónde está:

### En el servidor de Azure (nginx + PHP) — modo principal

Solo sube la carpeta completa. `subir.html` usa `admin/api.php` y guarda directo en el servidor.

1. **Permisos:** el usuario de PHP-FPM (normalmente `www-data`) debe poder escribir en la raíz del sitio
   (por `contenido.xml`), en `img/` y en `admin/`. Por ejemplo, si el sitio está en `/var/www/sitio`:
   ```bash
   sudo chown -R www-data:www-data /var/www/sitio/img /var/www/sitio/admin /var/www/sitio/contenido.xml
   sudo chown www-data /var/www/sitio && sudo chmod 775 /var/www/sitio
   ```
   Si falta un permiso, `subir.html` lo avisa en rojo al abrir.
2. **Primer usuario:** abre `subir.html`; como no hay usuarios, pide crear el primero. Después, para agregar
   o cambiar contraseñas hay que entrar y usar el botón **Usuarios**.
3. Los usuarios quedan en `admin/usuarios.php` (contraseñas con `password_hash`; al ser `.php`, el servidor nunca
   lo muestra). Para borrar un usuario, quita su línea de ese archivo. **No lo subas al repositorio** (ya está en `.gitignore`).
4. Cada `contenido.xml` reemplazado se guarda en `admin/respaldos/` (los últimos 30), por si hay que regresar.

No hace falta tocar la configuración de nginx: cada foto viaja en su propia petición de menos de 1 MB
(el límite por defecto de `client_max_body_size`). Si el Application Gateway tiene WAF y bloquea las subidas,
hay que permitir `POST /admin/api.php` en sus reglas.

Al volver a subir el sitio completo, **no sobrescribas** `contenido.xml` ni las carpetas de `img/` del servidor
si se cambiaron desde el panel (esa es ahora la versión buena).

### En GitHub Pages (sin PHP)

Ahí `admin/api.php` no corre, así que la página guarda los cambios como un commit en el repositorio con la API de
GitHub, y el workflow de Pages republica en 1–2 minutos. El acceso se crea en «Configurar acceso» con un
*fine-grained token* (solo el repo `landinghutchison`, permiso **Contents: Read and write**), que se guarda cifrado
con la contraseña en `admin/acceso.json`.

## Qué se puede cambiar desde el XML

| Qué | Dónde |
|---|---|
| Título de la pestaña, descripción para Google | `<general>` |
| Colores de la marca | `<color-principal>`, `<color-acento>` |
| Título, texto y links de la portada | `<portada>` |
| Categorías (título, texto del menú, orden) | `<categoria nombre="…" corto="…">` |
| Empresas (nombre, logo, ciudad, dirección, teléfono, correos, redes) | `<empresa>` |
| Ocultar una empresa o categoría sin borrarla | `visible="no"` |
| Texto y redes del pie | `<pie>` |

## Fotos: se toman solas de las carpetas

Las fotos **no se escriben en el XML**. Se ponen en carpetas dentro de `img/`:

| Carpeta | Qué fotos |
|---|---|
| `img/portada/` | carrusel de la portada (ideal 1920×1080) |
| `img/<id>/` | slider de la tarjeta de cada empresa; `<id>` es el de `<empresa id="icave">` → `img/icave/` (ideal 1280×720) |

- Nombra las fotos **`1.jpg`, `2.jpg`, `3.jpg`…** (también `.jpeg`, `.png` o `.webp`, en minúsculas). Salen en ese orden.
- **Sin saltos:** el navegador no puede ver qué hay en una carpeta, así que pregunta por la 1, la 2, la 3… y se detiene en el primer número que falta. Si borras la `2.jpg`, renombra las siguientes.
- Carpeta vacía o inexistente = esa tarjeta sale sin fotos. Para ocultarlas sin borrarlas: `<fotos visible="no"/>` dentro de la empresa.
- Al agregar o cambiar fotos, recarga la página.

Las cifras (empresas, líneas de negocio, ciudades) y la lista de ciudades **se calculan solas** a partir del XML.

Si una empresa no tiene `<logo>`, se genera el logotipo "HUTCHISON PORTS + NOMBRE" con el símbolo de la marca.
Si tiene `<logo>img/archivo.png</logo>`, se usa esa imagen (como Container Care).

## Pendientes

- Las redes y brochures sin link (`url=""` o `url="#"`) no se muestran. El brochure original no traía esas direcciones: al llenar el `url`, el ícono aparece solo.
- Los links a archivos del sitio (`docs/archivo.pdf`) se revisan al cargar: **si el archivo no existe, el botón no se muestra** (no hay links rotos). El editor avisa cuáles faltan. Los links a otros sitios (`https://…`) no se pueden revisar y se muestran siempre.
- Los sitios web de cada terminal se dedujeron del dominio de su correo: **hay que verificarlos**.
- Las fotos de la portada se extrajeron del PDF. Para mejor calidad, reemplázalas por los originales en alta resolución (mismo nombre: `img/portada/1.jpg`, `2.jpg`).
- Las fotos de `img/icave/` y `img/tilh/` son de ejemplo: reemplázalas por las de cada terminal.

## Publicar en Azure (nginx + PHP)

Sube la carpeta completa al directorio del sitio y da los permisos de escritura descritos arriba en
«En el servidor de Azure». nginx sirve `.xml` sin configuración extra.
