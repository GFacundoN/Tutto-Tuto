// Valida el contenido de todos los cursos ANTES de publicarlo:
// - que el índice apunte a lecciones que existen,
// - que cada quiz tenga al menos una respuesta correcta y explicación en cada opción,
// - y lo más importante: que la corrección automática APRUEBE la solución y
//   NO APRUEBE el punto de partida (si no, el ejercicio se "resuelve" sin hacer nada).
// Usa la misma lógica de corrección que la app (src/app/ejercicios/validacion.ts).
//   npm run validar-contenido
import { build } from 'esbuild';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../contenido', import.meta.url));
const validacionTs = fileURLToPath(new URL('../src/app/ejercicios/validacion.ts', import.meta.url));

// Compilamos validacion.ts al vuelo para usar exactamente el mismo código que la app.
const { outputFiles } = await build({ entryPoints: [validacionTs], bundle: true, format: 'esm', write: false });
const { validarHuecos, validarOrden, verificarArchivos, validarComando } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64')
);

const errores = [];
const avisos = [];
const error = (donde, msg) => errores.push(`${donde}: ${msg}`);

function leerJson(ruta) {
  try {
    return JSON.parse(readFileSync(ruta, 'utf8'));
  } catch (e) {
    error(relative(raiz, ruta), `JSON inválido (${e.message})`);
    return null;
  }
}

function leerCarpeta(carpeta) {
  const archivos = {};
  if (!existsSync(carpeta)) return archivos;
  (function recorrer(dir) {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else archivos[relative(carpeta, ruta).split(sep).join('/')] = readFileSync(ruta, 'utf8');
    }
  })(carpeta);
  return archivos;
}

function validarBloques(donde, bloques) {
  if (!Array.isArray(bloques) || bloques.length === 0) return error(donde, 'no tiene bloques');
  for (const b of bloques) {
    if (!['texto', 'codigo', 'nota', 'lista', 'comando'].includes(b.tipo)) error(donde, `bloque de tipo desconocido "${b.tipo}"`);
    for (const md of [b.md, ...(b.items ?? [])].filter(Boolean)) {
      for (const [, url] of md.matchAll(/\]\((\S+?)\)/g)) {
        if (!url.startsWith('https://')) error(donde, `enlace que no es https: ${url}`);
      }
    }
  }
}

function validarQuiz(donde, quiz) {
  if (!Array.isArray(quiz) || quiz.length < 2 || quiz.length > 4) error(donde, `el quiz debe tener 2 a 4 preguntas (tiene ${quiz?.length})`);
  quiz?.forEach((p, i) => {
    const d = `${donde} pregunta ${i + 1}`;
    if (!p.opciones?.some((o) => o.correcta)) error(d, 'ninguna opción es correcta');
    if (p.opciones?.length < 2) error(d, 'necesita al menos 2 opciones');
    if (p.opciones?.some((o) => !o.explicacion?.trim())) error(d, 'hay opciones sin explicación');
    if (new Set(p.opciones?.map((o) => o.texto)).size !== p.opciones?.length) error(d, 'hay opciones repetidas');
  });
}

function validarEjercicio(donde, ej, plantilla) {
  if (!ej.enunciado?.trim()) error(donde, 'ejercicio sin enunciado');
  if (!Array.isArray(ej.pistas) || ej.pistas.length < 2) error(donde, 'el ejercicio necesita al menos 2 pistas');
  if (ej.local) validarBloques(`${donde} (local)`, ej.local.pasos);

  if (ej.tipo === 'completar') {
    const marcas = [...ej.plantilla.matchAll(/\{\{(\d+)\}\}/g)].map((m) => Number(m[1]));
    if (marcas.length !== ej.huecos.length || !marcas.every((n, i) => n === i)) {
      error(donde, `la plantilla tiene huecos ${marcas.join(',')} pero hay ${ej.huecos.length} definidos (deben ser 0..n en orden)`);
    }
    const ok = validarHuecos(ej.huecos, ej.huecos.map((h) => h.respuestas[0]));
    if (!ok.every(Boolean)) error(donde, 'la primera respuesta de algún hueco no se acepta');
    if (validarHuecos(ej.huecos, ej.huecos.map(() => '')).some(Boolean)) error(donde, 'un hueco vacío se acepta');
  } else if (ej.tipo === 'ordenar') {
    if (ej.lineas.length < 3) error(donde, 'ordenar necesita al menos 3 líneas');
    if (!validarOrden(ej.lineas, ej.lineas)) error(donde, 'el orden correcto no se acepta');
    if (validarOrden(ej.lineas, [...ej.lineas].reverse())) error(donde, 'el orden invertido se acepta');
  } else if (ej.tipo === 'proyecto') {
    for (const v of ej.verificaciones) {
      try {
        new RegExp(v.patron, 'm');
      } catch (e) {
        error(donde, `regex inválida "${v.patron}"`);
      }
    }
    const inicio = { ...plantilla, ...ej.archivos };
    const final = { ...inicio, ...ej.solucion };
    const conSolucion = verificarArchivos(ej.verificaciones, final);
    conSolucion.forEach((r, i) => !r.ok && error(donde, `la solución NO pasa: "${ej.verificaciones[i].mensaje}"`));
    if (verificarArchivos(ej.verificaciones, inicio).every((r) => r.ok)) error(donde, 'el punto de partida ya aprueba el ejercicio');
    for (const archivo of ej.abrirArchivo.split(',')) {
      if (!(archivo in inicio)) error(donde, `abrirArchivo apunta a "${archivo}", que no existe en el proyecto`);
    }
    if (Object.keys(plantilla).length === 0) error(donde, 'ejercicio de proyecto pero el curso no tiene plantilla-proyecto/');
  } else if (ej.tipo === 'terminal') {
    // Cada solución tiene que aprobar su propio paso, y un paso no puede resolverse con el comando de otro
    // (si dos pasos aceptan lo mismo se avisa: puede ser a propósito, como repetir docker ps).
    if (!Array.isArray(ej.pasos) || ej.pasos.length === 0) error(donde, 'terminal sin pasos');
    ej.pasos?.forEach((paso, i) => {
      const d = `${donde} paso ${i + 1}`;
      if (!paso.consigna?.trim()) error(d, 'sin consigna');
      if (!paso.soluciones?.length) return error(d, 'sin soluciones');
      for (const sol of paso.soluciones) if (!validarComando(paso.soluciones, sol).ok) error(d, `la solución "${sol}" no se acepta`);
      if (validarComando(paso.soluciones, '').ok) error(d, 'un comando vacío se acepta');
      ej.pasos.forEach((otro, j) => {
        if (j !== i && otro.soluciones?.some((sol) => validarComando(paso.soluciones, sol).ok)) {
          avisos.push(`${d}: acepta la solución del paso ${j + 1} (¿es a propósito?)`);
        }
      });
    });
  } else {
    error(donde, `tipo de ejercicio desconocido "${ej.tipo}"`);
  }
}

function validarLeccion(cursoId, id, plantilla, versiones) {
  const ruta = join(raiz, cursoId, 'lecciones', `${id}.json`);
  const donde = `${cursoId}/${id}`;
  if (!existsSync(ruta)) return error(donde, 'el índice la nombra pero no existe el archivo');
  const l = leerJson(ruta);
  if (!l) return;
  if (l.id !== id) error(donde, `el id interno es "${l.id}"`);
  for (const campo of ['titulo', 'minutos', 'objetivo', 'explicacion', 'recursos', 'ejercicio', 'quiz']) {
    if (l[campo] === undefined) error(donde, `falta "${campo}"`);
  }
  if (l.minutos < 5 || l.minutos > 15) avisos.push(`${donde}: dura ${l.minutos} min (el objetivo es 5 a 15)`);
  validarBloques(donde, l.explicacion);
  validarQuiz(donde, l.quiz);
  validarEjercicio(donde, l.ejercicio, plantilla);
  const v = l.recursos?.video;
  if (v && (!/^[\w-]{11}$/.test(v.id) || !(v.fin > v.inicio))) error(donde, 'video con id o tramo inválido');
  if (!v && !l.recursos?.docs?.length) error(donde, 'no tiene ni video ni documentación');
  for (const d of l.recursos?.docs ?? []) if (!d.url.startsWith('https://')) error(donde, `doc sin https: ${d.url}`);
  for (const [versionId, variante] of Object.entries(l.variantes ?? {})) {
    if (!versiones.includes(versionId)) error(donde, `variante para versión inexistente "${versionId}"`);
    if (variante.explicacion) validarBloques(`${donde} (${versionId})`, variante.explicacion);
    if (variante.quiz) validarQuiz(`${donde} (${versionId})`, variante.quiz);
    if (variante.ejercicio) validarEjercicio(`${donde} (${versionId})`, variante.ejercicio, plantilla);
  }
  for (const b of l.explicacion) {
    for (const vId of b.soloVersiones ?? []) if (!versiones.includes(vId)) error(donde, `soloVersiones con versión inexistente "${vId}"`);
  }
}

const indice = leerJson(join(raiz, 'cursos.json')) ?? [];
for (const { id: cursoId, logo, portada, estado } of indice) {
  if (logo && !existsSync(join(raiz, logo))) error(cursoId, `el logo "${logo}" no existe en contenido/`);
  if (portada && !existsSync(join(raiz, portada))) error(cursoId, `la portada "${portada}" no existe en contenido/`);
  // Los cursos anunciados todavía no tienen curso.json ni lecciones.
  if (estado === 'proximamente') continue;
  const curso = leerJson(join(raiz, cursoId, 'curso.json'));
  if (!curso) continue;
  const plantilla = leerCarpeta(join(raiz, cursoId, 'plantilla-proyecto'));
  const versiones = curso.versiones.map((v) => v.id);
  const todas = new Set(curso.versiones.flatMap((v) => v.niveles.flatMap((n) => n.lecciones)));
  for (const v of curso.versiones) {
    const ids = v.niveles.flatMap((n) => n.lecciones);
    if (new Set(ids).size !== ids.length) error(`${cursoId}/${v.id}`, 'hay lecciones repetidas en el recorrido');
  }
  for (const id of todas) validarLeccion(cursoId, id, plantilla, versiones);
  for (const c of curso.proyectoFinal.criterios) {
    if (c.leccion && !todas.has(c.leccion)) error(`${cursoId}/proyecto`, `el criterio "${c.id}" apunta a la lección inexistente "${c.leccion}"`);
  }
  validarBloques(`${cursoId}/instalacion`, curso.instalacion);
  const sobrantes = readdirSync(join(raiz, cursoId, 'lecciones')).map((f) => f.replace(/\.json$/, '')).filter((f) => !todas.has(f));
  if (sobrantes.length) avisos.push(`${cursoId}: lecciones que ningún recorrido usa: ${sobrantes.join(', ')}`);
  console.log(`${cursoId}: ${todas.size} lecciones revisadas`);
}

avisos.forEach((a) => console.warn('AVISO  ' + a));
errores.forEach((e) => console.error('ERROR  ' + e));
if (errores.length) {
  console.error(`\n${errores.length} error(es) en el contenido.`);
  process.exit(1);
}
console.log('Contenido OK.');
