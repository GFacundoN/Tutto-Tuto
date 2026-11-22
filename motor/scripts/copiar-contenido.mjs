// Copia ../contenido a public/contenido, porque Angular CLI solo sirve assets
// que estén dentro del workspace (motor/). Así el contenido vive aparte del motor.
// Además, si un curso tiene una carpeta plantilla-proyecto/, la empaqueta en
// plantilla-proyecto.json (los archivos base del proyecto que se abre en StackBlitz).
//   node scripts/copiar-contenido.mjs            -> copia una vez
//   node scripts/copiar-contenido.mjs --watch    -> copia y vuelve a copiar al guardar cambios
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, watch, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const origen = fileURLToPath(new URL('../../contenido', import.meta.url));
const destino = fileURLToPath(new URL('../public/contenido', import.meta.url));

function empaquetar(carpeta) {
  const archivos = {};
  (function recorrer(dir) {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else archivos[relative(carpeta, ruta).split(sep).join('/')] = readFileSync(ruta, 'utf8');
    }
  })(carpeta);
  return archivos;
}

function copiar() {
  rmSync(destino, { recursive: true, force: true });
  cpSync(origen, destino, {
    recursive: true,
    filter: (ruta) => !ruta.split(sep).includes('plantilla-proyecto'),
  });
  for (const curso of readdirSync(origen)) {
    const plantilla = join(origen, curso, 'plantilla-proyecto');
    if (existsSync(plantilla)) {
      writeFileSync(join(destino, curso, 'plantilla-proyecto.json'), JSON.stringify(empaquetar(plantilla)));
    }
  }
}

copiar();
console.log('Contenido copiado a public/contenido');

if (process.argv.includes('--watch')) {
  let espera;
  watch(origen, { recursive: true }, () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      copiar();
      console.log('Contenido actualizado');
    }, 150);
  });
}
