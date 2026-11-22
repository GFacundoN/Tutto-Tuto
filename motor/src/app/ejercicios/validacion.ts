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
