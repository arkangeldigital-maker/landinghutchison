<?php
/* =====================================================================
   Hutchison Ports México — API de subir.html para servidores con PHP (nginx + PHP-FPM).
   Guarda contenido.xml en la raíz y las fotos en img/portada/ e img/<id>/.

   · Usuarios: admin/usuarios.php (se crea solo desde subir.html; contraseñas con password_hash).
     Es un .php para que el servidor nunca lo muestre como texto.
   · Fotos nuevas: se suben una por una a admin/tmp/ y se colocan al publicar.
   · Documentos: docs/ (solo PDF). Llegan en partes de menos de 1 MB (límite por defecto de nginx)
     y docs/lista.json se regenera para que editor.html ofrezca la lista.
   · Respaldo: cada contenido.xml reemplazado se guarda en admin/respaldos/ (los últimos 30).
   ===================================================================== */
declare(strict_types=1);

const RAIZ = __DIR__ . '/..';
const USUARIOS = __DIR__ . '/usuarios.php';
const TMP = __DIR__ . '/tmp';
const RESPALDOS = __DIR__ . '/respaldos';
const PORTADA = 'img/portada';
const EXTENSIONES = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FOTOS = 30;          // el sitio no busca más de 30 por carpeta
const MAX_FOTO = 8 * 1048576;  // bytes por foto
const MAX_RESPALDOS = 30;
const DOCS = 'docs';
const EXT_DOCS = ['pdf']; // en docs/ solo PDF
const MAX_DOC = 60 * 1048576;  // bytes por documento

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Detrás del Application Gateway el HTTPS termina antes de llegar a nginx: se revisa X-Forwarded-Proto.
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
  || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
session_name('subir_sesion');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

function responder(array $datos, int $estado = 200): never
{
  http_response_code($estado);
  echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function fallar(string $mensaje, int $estado = 400): never
{
  responder(['error' => $mensaje], $estado);
}

function usuarios(): array
{
  if (!is_file(USUARIOS)) return [];
  $u = include USUARIOS;
  return is_array($u) ? $u : [];
}

function guardarUsuarios(array $usuarios): void
{
  ksort($usuarios);
  $php = "<?php\n// Usuarios de subir.html. Se crea y cambia desde la página; no lo subas al repositorio.\nreturn " . var_export($usuarios, true) . ";\n";
  escribirAtomico(USUARIOS, $php);
  if (function_exists('opcache_invalidate')) opcache_invalidate(USUARIOS, true);
}

function escribirAtomico(string $ruta, string $contenido): void
{
  $tmp = $ruta . '.tmp-' . bin2hex(random_bytes(4));
  if (@file_put_contents($tmp, $contenido) === false || !@rename($tmp, $ruta)) {
    @unlink($tmp);
    fallar('No se pudo escribir ' . basename($ruta) . ': el servidor no tiene permiso de escritura en esa carpeta.', 500);
  }
  @chmod($ruta, 0664);
}

function usuarioActual(): ?string
{
  return $_SESSION['usuario'] ?? null;
}

function pedirSesion(): string
{
  $u = usuarioActual();
  if (!$u || !isset(usuarios()[$u])) fallar('Tu sesión terminó. Vuelve a entrar.', 401);
  return $u;
}

function csrf(): string
{
  return $_SESSION['csrf'] ??= bin2hex(random_bytes(16));
}

function datosJson(): array
{
  $d = json_decode(file_get_contents('php://input') ?: '', true);
  return is_array($d) ? $d : [];
}

function normalizarUsuario(string $u): string
{
  return strtolower(trim($u));
}

// Carpeta válida: img/portada o img/<id> (el id de <empresa id="…">).
function validarCarpeta(string $c): string
{
  if ($c !== PORTADA && !preg_match('#^img/[a-z0-9][a-z0-9_-]{0,60}$#', $c)) fallar('Carpeta no válida: ' . $c);
  return $c;
}

function fotosDe(string $carpeta): array
{
  $lista = [];
  foreach (glob(RAIZ . '/' . $carpeta . '/*') ?: [] as $f) {
    if (preg_match('#/(\d+)\.(' . implode('|', EXTENSIONES) . ')$#', $f, $m) && is_file($f)) {
      $lista[] = ['ruta' => $carpeta . '/' . $m[1] . '.' . $m[2], 'n' => (int)$m[1], 'version' => filemtime($f) . '-' . filesize($f)];
    }
  }
  usort($lista, fn($a, $b) => $a['n'] <=> $b['n'] ?: strcmp($a['ruta'], $b['ruta']));
  return $lista;
}

// Nombre de documento seguro: letras, números, punto, guion y guion bajo, con extensión permitida.
function nombreDoc(string $n): string
{
  if (!preg_match('/^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/', $n) || str_contains($n, '..')
    || !in_array(strtolower(pathinfo($n, PATHINFO_EXTENSION)), EXT_DOCS, true)) {
    fallar('Nombre de documento no válido: ' . $n);
  }
  return $n;
}

function listaDocs(): array
{
  $lista = [];
  foreach (glob(RAIZ . '/' . DOCS . '/*') ?: [] as $f) {
    $n = basename($f);
    if (is_file($f) && $n[0] !== '.' && in_array(strtolower(pathinfo($n, PATHINFO_EXTENSION)), EXT_DOCS, true)) {
      $lista[] = ['nombre' => $n, 'url' => DOCS . '/' . $n, 'tamano' => filesize($f)];
    }
  }
  usort($lista, fn($a, $b) => strnatcasecmp($a['nombre'], $b['nombre']));
  return $lista;
}

function guardarListaDocs(): void
{
  escribirAtomico(RAIZ . '/' . DOCS . '/lista.json',
    json_encode(['documentos' => listaDocs()], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
}

function limpiarTmp(): void
{
  foreach (glob(TMP . '/*') ?: [] as $f) {
    if (is_file($f) && filemtime($f) < time() - 86400) @unlink($f);
  }
}

function revisarXml(string $texto): void
{
  if (trim($texto) === '') fallar('El XML está vacío.');
  if (!class_exists('DOMDocument')) return; // sin la extensión dom no se puede revisar; el sitio avisa si viene mal
  libxml_use_internal_errors(true);
  $doc = new DOMDocument();
  $ok = $doc->loadXML($texto, LIBXML_NONET);
  $err = libxml_get_errors();
  libxml_clear_errors();
  if (!$ok || $err) fallar('El XML está mal escrito (línea ' . ($err[0]->line ?? '?') . '): ' . trim($err[0]->message ?? ''));
  if ($doc->getElementsByTagName('empresa')->length === 0) fallar('El XML no tiene ninguna <empresa>.');
}

$accion = $_GET['accion'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Todo lo que cambia algo va por POST con el token CSRF de la sesión.
if ($metodo === 'POST' && !hash_equals(csrf(), $_SERVER['HTTP_X_CSRF'] ?? '')) {
  fallar('La página caducó. Recárgala.', 403);
}

switch ($accion) {

  case 'estado':
    $carpetas = ['raíz del sitio' => RAIZ, 'img' => RAIZ . '/img', 'docs' => RAIZ . '/' . DOCS, 'admin' => __DIR__];
    $sinPermiso = array_keys(array_filter($carpetas, fn($c) => !is_writable($c)));
    responder([
      'modo' => 'php',
      'usuario' => usuarioActual() && isset(usuarios()[usuarioActual()]) ? usuarioActual() : null,
      'hayUsuarios' => count(usuarios()) > 0,
      'csrf' => csrf(),
      'sinPermiso' => $sinPermiso,
    ]);

  case 'entrar':
    $d = datosJson();
    $u = normalizarUsuario((string)($d['usuario'] ?? ''));
    $hash = usuarios()[$u] ?? null;
    if (!$hash || !password_verify((string)($d['clave'] ?? ''), $hash)) {
      sleep(2); // frena a quien intente adivinar
      fallar('Usuario o contraseña incorrectos.', 401);
    }
    session_regenerate_id(true);
    $_SESSION['usuario'] = $u;
    responder(['usuario' => $u]);

  case 'salir':
    $_SESSION = [];
    session_destroy();
    responder(['ok' => true]);

  case 'usuario':
    // Crear o cambiar un usuario: libre solo si todavía no hay ninguno; después hay que haber entrado.
    $lista = usuarios();
    if ($lista) pedirSesion();
    $d = datosJson();
    $u = normalizarUsuario((string)($d['usuario'] ?? ''));
    $clave = (string)($d['clave'] ?? '');
    if (!preg_match('/^[a-z0-9._-]{2,40}$/', $u)) fallar('El usuario solo puede llevar letras, números, punto, guion y guion bajo.');
    if (strlen($clave) < 10) fallar('La contraseña debe tener al menos 10 caracteres.');
    $lista[$u] = password_hash($clave, PASSWORD_DEFAULT);
    guardarUsuarios($lista);
    responder(['ok' => true, 'usuario' => $u]);

  case 'archivos':
    pedirSesion();
    $xml = @file_get_contents(RAIZ . '/contenido.xml');
    if ($xml === false) fallar('No se encontró contenido.xml en el servidor.', 500);
    $rutas = [];
    foreach (array_merge([PORTADA], array_map(fn($d) => 'img/' . basename($d), glob(RAIZ . '/img/*', GLOB_ONLYDIR) ?: [])) as $c) {
      if ($c !== PORTADA && !preg_match('#^img/[a-z0-9][a-z0-9_-]*$#', $c)) continue;
      foreach (fotosDe($c) as $f) $rutas[$f['ruta']] = $f['version'];
    }
    responder(['xml' => $xml, 'rutas' => $rutas, 'docs' => listaDocs()]);

  case 'docs':
    // Público a propósito: los documentos ya son públicos; editor.html usa esta lista.
    responder(['documentos' => listaDocs()]);

  case 'doc-parte':
    // Un documento llega en partes: la primera crea el id, las siguientes se agregan al final.
    pedirSesion();
    $f = $_FILES['parte'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) fallar('No llegó una parte del documento.');
    if (!is_dir(TMP) && !@mkdir(TMP, 0775, true)) fallar('No se pudo crear admin/tmp: falta permiso de escritura en admin/.', 500);
    $id = (string)($_POST['id'] ?? '');
    if ($id === '') { limpiarTmp(); $id = bin2hex(random_bytes(12)); }
    if (!preg_match('/^[a-f0-9]{24}$/', $id)) fallar('Id de documento no válido.');
    $destino = TMP . '/' . $id . '.doc';
    if ((is_file($destino) ? filesize($destino) : 0) + $f['size'] > MAX_DOC) fallar('El documento pesa más de ' . (MAX_DOC / 1048576) . ' MB.');
    if (@file_put_contents($destino, file_get_contents($f['tmp_name']), FILE_APPEND) === false) fallar('No se pudo guardar el documento en admin/tmp.', 500);
    responder(['id' => $id]);

  case 'foto':
    pedirSesion();
    $f = $_FILES['foto'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) {
      fallar(in_array($f['error'] ?? 0, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
        ? 'La foto pesa más de lo que permite PHP (upload_max_filesize).' : 'No llegó la foto.');
    }
    if ($f['size'] > MAX_FOTO) fallar('La foto pesa demasiado.');
    $info = @getimagesize($f['tmp_name']);
    if (!$info || $info[2] !== IMAGETYPE_JPEG) fallar('La foto debe ser JPG.');
    if (!is_dir(TMP) && !@mkdir(TMP, 0775, true)) fallar('No se pudo crear admin/tmp: falta permiso de escritura en admin/.', 500);
    limpiarTmp();
    $id = bin2hex(random_bytes(12));
    if (!move_uploaded_file($f['tmp_name'], TMP . '/' . $id . '.jpg')) fallar('No se pudo guardar la foto en admin/tmp.', 500);
    responder(['id' => $id]);

  case 'publicar':
    $usuario = pedirSesion();
    $d = datosJson();
    $candado = fopen(__DIR__ . '/.candado', 'c');
    if ($candado) flock($candado, LOCK_EX);

    // 1) Revisa todo antes de tocar archivos.
    $planes = [];
    foreach ((array)($d['carpetas'] ?? []) as $carpeta => $items) {
      $carpeta = validarCarpeta((string)$carpeta);
      if (!is_array($items) || count($items) > MAX_FOTOS) fallar('Máximo ' . MAX_FOTOS . ' fotos por carpeta.');
      $actuales = array_column(fotosDe($carpeta), 'ruta');
      $plan = [];
      foreach (array_values($items) as $i => $it) {
        if (isset($it['nueva'])) {
          $id = (string)$it['nueva'];
          $origen = TMP . '/' . $id . '.jpg';
          if (!preg_match('/^[a-f0-9]{24}$/', $id) || !is_file($origen)) fallar('Una foto nueva ya no está en el servidor. Vuelve a agregarla.');
          $plan[] = ['origen' => $origen, 'destino' => $carpeta . '/' . ($i + 1) . '.jpg'];
        } else {
          $ruta = (string)($it['existente'] ?? '');
          if (!in_array($ruta, $actuales, true)) fallar('La foto ' . $ruta . ' ya no existe. Recarga la página.');
          $plan[] = ['origen' => RAIZ . '/' . $ruta, 'destino' => $carpeta . '/' . ($i + 1) . '.' . pathinfo($ruta, PATHINFO_EXTENSION)];
        }
      }
      $planes[$carpeta] = ['plan' => $plan, 'actuales' => $actuales];
    }
    $xml = isset($d['xml']) ? (string)$d['xml'] : null;
    if ($xml !== null) revisarXml($xml);
    $docsSubir = [];
    foreach ((array)($d['docs']['subir'] ?? []) as $doc) {
      $id = (string)($doc['id'] ?? '');
      if (!preg_match('/^[a-f0-9]{24}$/', $id) || !is_file(TMP . '/' . $id . '.doc')) fallar('Un documento nuevo ya no está en el servidor. Vuelve a agregarlo.');
      if (file_get_contents(TMP . '/' . $id . '.doc', false, null, 0, 5) !== '%PDF-') fallar('«' . ($doc['nombre'] ?? '') . '» no es un PDF válido.');
      $docsSubir[] = ['origen' => TMP . '/' . $id . '.doc', 'nombre' => nombreDoc((string)($doc['nombre'] ?? ''))];
    }
    $docsBorrar = array_map(fn($n) => nombreDoc((string)$n), (array)($d['docs']['borrar'] ?? []));

    // 2) contenido.xml (con respaldo del anterior).
    if ($xml !== null) {
      if (!is_dir(RESPALDOS)) @mkdir(RESPALDOS, 0775, true);
      if (is_file(RAIZ . '/contenido.xml')) @copy(RAIZ . '/contenido.xml', RESPALDOS . '/contenido-' . date('Ymd-His') . '-' . $usuario . '.xml');
      $viejos = glob(RESPALDOS . '/contenido-*.xml') ?: [];
      sort($viejos);
      foreach (array_slice($viejos, 0, max(0, count($viejos) - MAX_RESPALDOS)) as $v) @unlink($v);
      escribirAtomico(RAIZ . '/contenido.xml', $xml);
    }

    // 3) Fotos: primero todo a nombres temporales (así se pueden intercambiar), luego a 1, 2, 3…
    foreach ($planes as $carpeta => $p) {
      $dir = RAIZ . '/' . $carpeta;
      if (!is_dir($dir) && !@mkdir($dir, 0775, true)) fallar('No se pudo crear ' . $carpeta . ': falta permiso de escritura en img/.', 500);
      if (!is_writable($dir)) fallar('El servidor no puede escribir en ' . $carpeta . '.', 500);
      $marca = '.mov-' . bin2hex(random_bytes(4)) . '-';
      $temporales = [];
      foreach ($p['plan'] as $i => $paso) {
        $tmp = $dir . '/' . $marca . $i;
        $esNueva = str_starts_with($paso['origen'], TMP . '/');
        $ok = $esNueva ? @rename($paso['origen'], $tmp) || @copy($paso['origen'], $tmp) : @rename($paso['origen'], $tmp);
        if (!$ok) fallar('No se pudo mover ' . basename($paso['origen']) . ' en ' . $carpeta . '.', 500);
        if ($esNueva) @unlink($paso['origen']);
        $temporales[$i] = $tmp;
      }
      // Lo que no quedó en la lista se borra (las que se movieron ya no están en su nombre original).
      foreach ($p['actuales'] as $ruta) if (is_file(RAIZ . '/' . $ruta)) @unlink(RAIZ . '/' . $ruta);
      foreach ($p['plan'] as $i => $paso) {
        if (!@rename($temporales[$i], RAIZ . '/' . $paso['destino'])) fallar('No se pudo guardar ' . $paso['destino'] . '.', 500);
        @chmod(RAIZ . '/' . $paso['destino'], 0664);
      }
    }

    // 4) Documentos y su lista para editor.html.
    if ($docsSubir || $docsBorrar) {
      $dir = RAIZ . '/' . DOCS;
      if (!is_dir($dir) && !@mkdir($dir, 0775, true)) fallar('No se pudo crear docs/: falta permiso de escritura.', 500);
      foreach ($docsBorrar as $n) if (is_file($dir . '/' . $n)) @unlink($dir . '/' . $n);
      foreach ($docsSubir as $doc) {
        if (!@rename($doc['origen'], $dir . '/' . $doc['nombre'])) fallar('No se pudo guardar docs/' . $doc['nombre'] . '.', 500);
        @chmod($dir . '/' . $doc['nombre'], 0664);
      }
      guardarListaDocs();
    }

    if ($candado) { flock($candado, LOCK_UN); fclose($candado); }
    responder(['ok' => true]);

  default:
    fallar('Acción desconocida.', 404);
}
