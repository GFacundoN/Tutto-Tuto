import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { claveDe, leer } from '../core/almacenamiento';
import { Curso, CursoResumen } from '../core/contenido/modelos';
import { CursoActual } from '../core/curso-actual';
import { AlAparecer } from '../shared/al-aparecer';
import { IconoPaso } from '../shared/ilustraciones/icono-paso';
import { IlustracionHero } from '../shared/ilustraciones/ilustracion-hero';
import { PanelesModulos } from './paneles-modulos/paneles-modulos';

/** Lo que muestra cada tarjeta del home. */
interface TarjetaCurso {
  resumen: CursoResumen;
  versionHerramienta?: string;
  recorridos: string[];
  lecciones: number;
  completadas: number;
}

/**
 * Home: todos los cursos de contenido/cursos.json.
 * Para cada uno carga su curso.json y arma la tarjeta (logo, recorridos, cantidad de
 * lecciones y tu avance guardado en este navegador).
 */
@Component({
  selector: 'app-catalogo-page',
  imports: [RouterLink, IlustracionHero, IconoPaso, AlAparecer, PanelesModulos],
  templateUrl: './catalogo-page.html',
  styleUrl: './catalogo-page.css',
})
export class CatalogoPage {
  private readonly http = inject(HttpClient);

  // rxResource con un solo Observable: lee el índice y después (switchMap) pide todos los
  // curso.json en paralelo (forkJoin). Si un curso falla, se muestra igual con lo del índice.
  protected readonly cursos = rxResource({
    stream: () =>
      this.http.get<CursoResumen[]>('contenido/cursos.json').pipe(
        switchMap((resumenes) =>
          resumenes.length
            ? forkJoin(
                resumenes.map((resumen) =>
                  this.http.get<Curso>(`contenido/${resumen.id}/curso.json`).pipe(
                    map((curso) => armarTarjeta(resumen, curso)),
                    catchError(() => of(armarTarjeta(resumen, null))),
                  ),
                ),
              )
            : of([]),
        ),
      ),
  });

  protected readonly lista = computed(() => (this.cursos.hasValue() ? this.cursos.value() : []));
  protected readonly totalLecciones = computed(() => this.lista().reduce((t, c) => t + c.lecciones, 0));

  constructor() {
    // En el home no hay curso activo: el encabezado no muestra racha ni XP.
    inject(CursoActual).cursoId.set(null);
  }
}

function armarTarjeta(resumen: CursoResumen, curso: Curso | null): TarjetaCurso {
  // Todas las lecciones distintas del curso (las versiones comparten muchas).
  const ids = new Set(curso?.versiones.flatMap((v) => v.niveles.flatMap((n) => n.lecciones)) ?? []);
  const progreso = leer<{ completadas?: Record<string, string> }>(claveDe(resumen.id, 'progreso'), {});
  const completadas = Object.keys(progreso.completadas ?? {}).filter((id) => ids.has(id)).length;
  return {
    resumen,
    versionHerramienta: curso?.versionHerramienta,
    recorridos: curso?.versiones.map((v) => v.titulo) ?? [],
    lecciones: ids.size,
    completadas,
  };
}
