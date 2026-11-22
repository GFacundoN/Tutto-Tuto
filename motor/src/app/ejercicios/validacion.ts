// Corrección automática de ejercicios. Son funciones puras (sin Angular) a propósito:
// así se testean fácil y la lógica no depende de cómo se ve la pantalla.
import { Hueco, Verificacion } from '../core/contenido/modelos';

/**
 * Normaliza código para comparar respuestas cortas:
 * - colapsa espacios, unifica comillas y saca espacios alrededor de símbolos.
 * Así `count = signal(0)` y `count=signal( 0 )` cuentan como iguales,
 * pero `signal(1)` sigue siendo distinto de `signal(0)`.
 */
export function normalizarCodigo(codigo: string): string {
  return codigo
    .trim()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/"/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\s*([()[\]{}<>;,.:=+\-*/!?|&@#])\s*/g, '$1')
    .replace(/;$/, '');
}

/** Devuelve, para cada hueco, si la respuesta es aceptada. */
export function validarHuecos(huecos: Hueco[], respuestas: string[]): boolean[] {
  return huecos.map((hueco, i) => {
    const dada = normalizarCodigo(respuestas[i] ?? '');
    if (dada === '') return false;
    return hueco.respuestas.some((aceptada) => normalizarCodigo(aceptada) === dada);
  });
}

/**
 * Compara el orden elegido con el correcto. Dos líneas con el mismo texto
 * son intercambiables (por eso se compara el texto y no el índice original).
 */
export function validarOrden(correctas: string[], elegidas: string[]): boolean {
  return (
    correctas.length === elegidas.length &&
    correctas.every((linea, i) => linea.trim() === elegidas[i]?.trim())
  );
}

/** Mezcla determinística (misma semilla = mismo orden) que nunca devuelve el orden original. */
export function mezclar<T>(items: T[], semilla: string): T[] {
  if (items.length < 2) return [...items];
  let h = 0;
  for (const c of semilla) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  const azar = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const r = [...items];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  // Si quedó igual que el original, rotamos una posición.
  if (r.every((x, i) => x === items[i])) r.push(r.shift()!);
  return r;
}

/**
 * Quita comentarios de TS/JS/CSS (// y /* *\/) y de HTML (<!-- -->),
 * para que dejar la respuesta comentada no apruebe el ejercicio.
 * Respeta strings simples para no romper URLs como 'http://…'.
 */
export function quitarComentarios(codigo: string): string {
  let salida = '';
  let i = 0;
  let enString: string | null = null;
  while (i < codigo.length) {
    const c = codigo[i];
    const sig = codigo[i + 1];
    if (enString) {
      salida += c;
      if (c === '\\') {
        salida += sig ?? '';
        i += 2;
        continue;
      }
      if (c === enString) enString = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      enString = c;
      salida += c;
      i++;
    } else if (c === '/' && sig === '/') {
      while (i < codigo.length && codigo[i] !== '\n') i++;
    } else if (c === '/' && sig === '*') {
      const fin = codigo.indexOf('*/', i + 2);
      i = fin === -1 ? codigo.length : fin + 2;
    } else if (codigo.startsWith('<!--', i)) {
      const fin = codigo.indexOf('-->', i + 4);
      i = fin === -1 ? codigo.length : fin + 3;
    } else {
      salida += c;
      i++;
    }
  }
  return salida;
}

export interface ResultadoVerificacion {
  ok: boolean;
  mensaje: string;
}

/**
 * Lee un archivo del proyecto. Admite alternativas separadas por | (ej. "app.ts|app.html"
 * para un template que puede estar inline o en un archivo aparte): junta las que existan.
 */
function leerArchivo(archivos: Record<string, string>, ruta: string): string | undefined {
  if (archivos[ruta] !== undefined) return archivos[ruta];
  const encontrados = ruta.split('|').filter((r) => archivos[r] !== undefined);
  return encontrados.length ? encontrados.map((r) => archivos[r]).join('\n') : undefined;
}

/** Corre las verificaciones de un ejercicio de proyecto contra los archivos dados. */
export function verificarArchivos(
  verificaciones: Verificacion[],
  archivos: Record<string, string>,
): ResultadoVerificacion[] {
  return verificaciones.map((v) => {
    const contenido = leerArchivo(archivos, v.archivo);
    if (contenido === undefined) {
      return { ok: false, mensaje: `No encuentro el archivo ${v.archivo}. ¿Lo borraste o lo renombraste?` };
    }
    const coincide = new RegExp(v.patron, 'm').test(quitarComentarios(contenido));
    const ok = (v.debeCoincidir ?? true) ? coincide : !coincide;
    return { ok, mensaje: v.mensaje };
  });
}

// ---------- Comandos de terminal (ejercicio "terminal") ----------
//
// No se ejecuta nada: el comando se "entiende" y se compara con las soluciones en forma
// canónica. Así `docker run -d -p 8080:80 nginx`, `docker container run --publish 8080:80 -d nginx`
// y `$ docker run -dp 8080:80 nginx` cuentan como el mismo comando.

/** Por qué un comando no se acepta. La pantalla traduce cada motivo a un mensaje útil. */
export type MotivoComando = 'vacio' | 'programa' | 'compose-viejo' | 'subcomando' | 'opciones' | 'argumentos';

export interface ComandoNormalizado {
  programa: string;
  /** Subcomandos, ej. ["compose", "up"] o ["run"]. */
  ruta: string[];
  /** Opciones en forma corta con su valor, ordenadas: el orden en que se escriben no importa. */
  opciones: string[];
  /** Argumentos (imagen, contenedor, ruta…) en orden. */
  args: string[];
}

/** Grupos de comandos de Docker: después de ellos viene otro subcomando (docker volume create). */
const GRUPOS = new Set(['container', 'image', 'volume', 'network', 'compose', 'system', 'builder', 'buildx']);
const SUBCOMANDOS = new Set([
  ...GRUPOS,
  ...('run ps stop start restart rm rmi logs exec build pull push tag images inspect login logout cp up down ' +
    'create ls list prune connect disconnect config version info kill top stats port search history save load ' +
    'attach rename pause unpause wait diff commit df init events'
  ).split(' '),
]);

/** Forma larga de un comando → forma corta habitual. */
const ALIAS: Record<string, string> = {
  'container run': 'run',
  'container ls': 'ps',
  'container list': 'ps',
  'container ps': 'ps',
  'container rm': 'rm',
  'container stop': 'stop',
  'container start': 'start',
  'container restart': 'restart',
  'container logs': 'logs',
  'container exec': 'exec',
  'container inspect': 'inspect',
  'container kill': 'kill',
  'image ls': 'images',
  'image list': 'images',
  'image build': 'build',
  'buildx build': 'build',
  'builder build': 'build',
  'image pull': 'pull',
  'image push': 'push',
  'image rm': 'rmi',
  'image tag': 'tag',
  'image inspect': 'inspect',
  'volume list': 'volume ls',
  'network list': 'network ls',
};

/** Opciones que no llevan valor, por comando (las demás toman el siguiente token como valor). */
const SIN_VALOR: Record<string, string[]> = {
  '': ['-v'],
  run: ['-d', '-i', '-t', '--rm', '-P', '--init', '--privileged'],
  exec: ['-d', '-i', '-t'],
  ps: ['-a', '-q', '-s', '-l', '--no-trunc'],
  images: ['-a', '-q'],
  rm: ['-f', '-v', '-l'],
  rmi: ['-f'],
  logs: ['-f', '-t'],
  build: ['-q', '--no-cache', '--pull'],
  start: ['-a', '-i'],
  pull: ['-a', '-q'],
  push: ['-a', '-q'],
  inspect: ['-s'],
  login: ['--password-stdin'],
  'compose up': ['-d', '--build', '--force-recreate', '--no-deps', '--remove-orphans', '-V', '--wait'],
  'compose down': ['-v', '--remove-orphans'],
  'compose logs': ['-f', '-t'],
  'compose ps': ['-a', '-q'],
  'compose build': ['--no-cache', '--pull'],
  'compose exec': ['-d', '-T'],
  'compose run': ['-d', '--rm', '-T'],
  'compose config': ['-q'],
  'volume ls': ['-q'],
  'network ls': ['-q'],
  prune: ['-a', '-f', '--volumes'],
};

/** Forma larga → corta de cada opción, por comando. */
const CORTAS: Record<string, Record<string, string>> = {
  '': { '--version': '-v' },
  run: {
    '--detach': '-d',
    '--interactive': '-i',
    '--tty': '-t',
    '--publish': '-p',
    '--env': '-e',
    '--volume': '-v',
    '--workdir': '-w',
    '--user': '-u',
    '--publish-all': '-P',
  },
  exec: { '--detach': '-d', '--interactive': '-i', '--tty': '-t', '--env': '-e', '--workdir': '-w', '--user': '-u' },
  ps: { '--all': '-a', '--quiet': '-q', '--size': '-s', '--filter': '-f', '--latest': '-l', '--last': '-n' },
  images: { '--all': '-a', '--quiet': '-q', '--filter': '-f' },
  rm: { '--force': '-f', '--volumes': '-v', '--link': '-l' },
  rmi: { '--force': '-f' },
  logs: { '--follow': '-f', '--timestamps': '-t', '--tail': '-n' },
  build: { '--tag': '-t', '--file': '-f', '--quiet': '-q' },
  start: { '--attach': '-a', '--interactive': '-i' },
  stop: { '--time': '-t' },
  restart: { '--time': '-t' },
  pull: { '--all-tags': '-a', '--quiet': '-q' },
  login: { '--username': '-u', '--password': '-p' },
  inspect: { '--format': '-f', '--size': '-s' },
  compose: { '--file': '-f', '--project-name': '-p' },
  'compose up': { '--detach': '-d', '--renew-anon-volumes': '-V' },
  'compose down': { '--volumes': '-v' },
  'compose logs': { '--follow': '-f', '--timestamps': '-t', '--tail': '-n' },
  'compose ps': { '--all': '-a', '--quiet': '-q' },
  'compose exec': { '--detach': '-d', '--env': '-e', '--workdir': '-w', '--user': '-u' },
  'compose run': { '--detach': '-d', '--env': '-e', '--publish': '-p', '--volume': '-v', '--workdir': '-w', '--user': '-u' },
  'volume ls': { '--quiet': '-q', '--filter': '-f' },
  'network ls': { '--quiet': '-q', '--filter': '-f' },
  prune: { '--all': '-a', '--force': '-f' },
};

/** Comandos en los que, después del primer argumento, todo es del programa de adentro. */
const PASAN_EL_RESTO = new Set(['run', 'exec', 'compose run', 'compose exec']);

/**
 * Parte una línea como lo haría la terminal: respeta comillas y las saca.
 * También quita el prompt pegado ("$ ", "PS C:\>", "> ") y las continuaciones de línea (\ o `).
 */
export function partirComando(linea: string): string[] {
  const limpia = linea
    .replace(/[\\`]\r?\n/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .replace(/^(?:PS [^>]*>|[$>#])\s*/, '')
    .replace(/^sudo\s+/, '');
  const tokens: string[] = [];
  let actual = '';
  let comilla: string | null = null;
  let hay = false;
  for (const c of limpia) {
    if (comilla) {
      if (c === comilla) comilla = null;
      else actual += c;
    } else if (c === '"' || c === "'") {
      comilla = c;
      hay = true;
    } else if (/\s/.test(c)) {
      if (hay || actual) tokens.push(actual);
      actual = '';
      hay = false;
    } else {
      actual += c;
    }
  }
  if (hay || actual) tokens.push(actual);
  return tokens;
}

/** Busca la tabla del comando ("compose up"; los "... prune" comparten una). */
function tablaDe<T>(tablas: Record<string, T>, clave: string): T | undefined {
  return tablas[clave] ?? (clave.endsWith('prune') ? tablas['prune'] : undefined);
}

/** Lleva un comando a su forma canónica para poder comparar variantes equivalentes. */
export function normalizarComando(linea: string): ComandoNormalizado {
  const tokens = partirComando(linea);
  const programa = tokens.shift() ?? '';
  const ruta: string[] = [];
  const opciones: string[] = [];
  const args: string[] = [];
  const esDocker = programa === 'docker';
  const clave = () => ALIAS[ruta.join(' ')] ?? ruta.join(' ');

  while (tokens.length) {
    const token = tokens.shift()!;
    // Después del primer argumento de "run"/"exec", lo que sigue es del comando de adentro.
    if (args.length && PASAN_EL_RESTO.has(clave())) {
      args.push(token, ...tokens);
      break;
    }
    if (esDocker && token.startsWith('-') && token.length > 1) {
      const igual = token.startsWith('--') ? token.indexOf('=') : -1;
      let nombre = igual > 0 ? token.slice(0, igual) : token;
      let valor: string | undefined = igual > 0 ? token.slice(igual + 1) : undefined;
      // -it → -i -t ; -dp 8080:80 → -d -p 8080:80 (la última letra puede llevar valor).
      if (/^-[a-zA-Z]{2,}$/.test(nombre)) {
        const letras = nombre.slice(1).split('');
        tokens.unshift(...letras.slice(1).map((l) => '-' + l));
        nombre = '-' + letras[0];
      }
      const k = clave();
      nombre = tablaDe(CORTAS, k)?.[nombre] ?? nombre;
      const sinValor = tablaDe(SIN_VALOR, k)?.includes(nombre) ?? false;
      if (valor === undefined && !sinValor && tokens.length && !tokens[0].startsWith('-')) valor = tokens.shift();
      opciones.push(valor === undefined ? nombre : `${nombre} ${valor}`);
    } else if (esDocker && !args.length && (ruta.length === 0 || GRUPOS.has(ruta.at(-1)!)) && SUBCOMANDOS.has(token)) {
      ruta.push(token);
    } else {
      args.push(token === './' ? '.' : token);
    }
  }
  const canonica = clave();
  return { programa, ruta: canonica ? canonica.split(' ') : [], opciones: opciones.sort(), args };
}

const iguales = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Compara lo que escribió la persona con las soluciones del paso.
 * Si no coincide, devuelve el motivo más cercano, para dar un mensaje que ayude.
 */
export function validarComando(
  soluciones: string[],
  escrito: string,
): { ok: true } | { ok: false; motivo: MotivoComando } {
  const dado = normalizarComando(escrito);
  if (!dado.programa) return { ok: false, motivo: 'vacio' };
  if (dado.programa === 'docker-compose') return { ok: false, motivo: 'compose-viejo' };
  const esperados = soluciones.map(normalizarComando);
  if (!esperados.some((e) => e.programa === dado.programa)) return { ok: false, motivo: 'programa' };
  const mismaRuta = esperados.filter((e) => e.programa === dado.programa && iguales(e.ruta, dado.ruta));
  if (!mismaRuta.length) return { ok: false, motivo: 'subcomando' };
  if (mismaRuta.some((e) => iguales(e.opciones, dado.opciones) && iguales(e.args, dado.args))) return { ok: true };
  return { ok: false, motivo: mismaRuta.some((e) => iguales(e.opciones, dado.opciones)) ? 'argumentos' : 'opciones' };
}
