import { claveDe, leer } from '../core/almacenamiento';
import { Curso, CursoResumen } from '../core/contenido/modelos';

/** Lo que el home sabe de cada curso: el índice más lo calculado de su curso.json y tu progreso. */
export interface TarjetaCurso {
  resumen: CursoResumen;
  disponible: boolean;
  versionHerramienta?: string;
  recorridos: string[];
  modulos: number;
  lecciones: number;
  completadas: number;
}

export function armarTarjeta(resumen: CursoResumen, curso: Curso | null): TarjetaCurso {
  // Todas las lecciones distintas del curso (las versiones comparten muchas).
  const ids = new Set(curso?.versiones.flatMap((v) => v.niveles.flatMap((n) => n.lecciones)) ?? []);
  const progreso = leer<{ completadas?: Record<string, string> }>(claveDe(resumen.id, 'progreso'), {});
  const completadas = Object.keys(progreso.completadas ?? {}).filter((id) => ids.has(id)).length;
  return {
    resumen,
    disponible: resumen.estado !== 'proximamente' && !!curso,
    versionHerramienta: curso?.versionHerramienta,
    recorridos: curso?.versiones.map((v) => v.titulo) ?? [],
    modulos: Math.max(0, ...(curso?.versiones.map((v) => v.niveles.length) ?? [])),
    lecciones: ids.size,
    completadas,
  };
}
