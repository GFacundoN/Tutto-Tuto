// Copia ../contenido a public/contenido, porque Angular CLI solo sirve assets
// que estén dentro del workspace (motor/). Así el contenido vive aparte del motor.
//   node scripts/copiar-contenido.mjs            -> copia una vez
//   node scripts/copiar-contenido.mjs --watch    -> copia y vuelve a copiar al guardar cambios
import { cpSync, rmSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const origen = fileURLToPath(new URL('../../contenido', import.meta.url));
const destino = fileURLToPath(new URL('../public/contenido', import.meta.url));

function copiar() {
  rmSync(destino, { recursive: true, force: true });
  cpSync(origen, destino, { recursive: true });
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
