# Hutchison Ports México · sitio alimentado por XML

Todo el contenido (textos, fotos, direcciones, teléfonos, correos, redes y brochures) vive en **`contenido.xml`**.
La página lo lee al abrirse y se arma sola. No hay base de datos ni código de servidor.

```
sitio/
├── index.html        ← estructura vacía (se llena desde el XML)
├── contenido.xml     ← EDITA ESTE ARCHIVO
├── css/estilos.css
├── js/sitio.js       ← lee el XML, arma la página y los efectos
├── img/              ← fotos y logos
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

## Qué se puede cambiar desde el XML

| Qué | Dónde |
|---|---|
| Título de la pestaña, descripción para Google | `<general>` |
| Colores de la marca | `<color-principal>`, `<color-acento>` |
| Título, texto, fotos del carrusel y links de la portada | `<portada>` |
| Categorías (título, texto del menú, orden) | `<categoria nombre="…" corto="…">` |
| Empresas (nombre, logo, ciudad, dirección, teléfono, correos, redes) | `<empresa>` |
| Ocultar una empresa o categoría sin borrarla | `visible="no"` |
| Texto y redes del pie | `<pie>` |

Las cifras (empresas, líneas de negocio, ciudades) y la lista de ciudades **se calculan solas** a partir del XML.

Si una empresa no tiene `<logo>`, se genera el logotipo "HUTCHISON PORTS + NOMBRE" con el símbolo de la marca.
Si tiene `<logo>img/archivo.png</logo>`, se usa esa imagen (como Container Care).

## Pendientes

- Las redes y brochures sin link (`url=""` o `url="#"`) no se muestran. El brochure original no traía esas direcciones: al llenar el `url`, el ícono aparece solo.
- Los sitios web de cada terminal se dedujeron del dominio de su correo: **hay que verificarlos**.
- Las fotos de la portada se extrajeron del PDF. Para mejor calidad, reemplázalas por los originales en alta resolución (mismo nombre, o cambia la ruta en el XML).

## Publicar en Azure App Service

Sube la carpeta completa a `wwwroot`. App Service sirve `.xml` sin configuración extra.
Para que el cliente actualice el XML desde un link con usuario y contraseña, ver la recomendación de
usar Blob Storage y el panel `/admin` (proyecto `sitio-xml`).
