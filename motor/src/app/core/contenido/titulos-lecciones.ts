import { computed, inject, Injectable } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ContenidoCursos } from '../core/contenido/contenido-cursos';
import { CursoActual } from '../core/curso-actual';

/**
 * Títulos y duración de las lecciones del recorrido, para dibujar el mapa.
 * Carga todas las lecciones de la versión elegida (son JSON chicos y quedan en cache).
 */
@Injectable({ providedIn: 'root' })
export class TitulosLecciones {
  private readonly contenido = inject(ContenidoCursos);
  private readonly cursoActual = inject(CursoActual);

  // rxResource(): como httpResource, pero para cualquier Observable. "params" es lo que
  // dispara la recarga; "stream" devuelve el Observable a partir de esos params.
  private readonly recurso = rxResource({
    params: () => ({ cursoId: this.cursoActual.cursoId(), ids: this.cursoActual.ordenLecciones() }),
    stream: ({ params }) =>
      this.contenido
        .lecciones(params.cursoId ?? '', params.ids)
        .pipe(map((lecciones) => Object.fromEntries(lecciones.map((l) => [l.id, { titulo: l.titulo, minutos: l.minutos }])))),
  });

  readonly titulos = computed<Record<string, { titulo: string; minutos: number }>>(() =>
    this.recurso.hasValue() ? this.recurso.value() : {},
  );
}
