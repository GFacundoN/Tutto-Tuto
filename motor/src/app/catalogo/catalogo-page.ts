import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Curso, CursoResumen } from '../core/contenido/modelos';
import { CursoActual } from '../core/curso-actual';
import { IlustracionHero } from '../shared/ilustraciones/ilustracion-hero';
import { Hero3d } from './hero-3d/hero-3d';
import { PanelesModulos } from './paneles-modulos/paneles-modulos';
import { RecorridoLeccion } from './recorrido-leccion/recorrido-leccion';
import { armarTarjeta } from './tarjeta-curso';

/**
 * Home: todos los cursos de contenido/cursos.json.
 * Para cada curso disponible carga su curso.json (recorridos, lecciones y tu avance guardado
 * en este navegador). Los "próximamente" se muestran solo con los datos del índice.
 */
@Component({
  selector: 'app-catalogo-page',
  imports: [RouterLink, IlustracionHero, Hero3d, PanelesModulos, RecorridoLeccion],
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
                  resumen.estado === 'proximamente'
                    ? of(armarTarjeta(resumen, null))
                    : this.http.get<Curso>(`contenido/${resumen.id}/curso.json`).pipe(
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
  protected readonly disponiblesLista = computed(() => this.lista().filter((c) => c.disponible));
  protected readonly proximosLista = computed(() => this.lista().filter((c) => !c.disponible));
  protected readonly disponibles = computed(() => this.disponiblesLista().length);
  protected readonly totalLecciones = computed(() => this.lista().reduce((t, c) => t + c.lecciones, 0));

  constructor() {
    // En el home no hay curso activo: el encabezado no muestra racha ni XP.
    inject(CursoActual).cursoId.set(null);
  }

  /** Letra clara u oscura sobre el color del curso: la que tenga más contraste (WCAG). */
  protected tintaSobre(color: string): string {
    const l = luminancia(color);
    const conBlanco = 1.05 / (l + 0.05);
    const conNegro = (l + 0.05) / (0.0056 + 0.05);
    return conBlanco >= conNegro ? '#ffffff' : '#101010';
  }
}

/** Luminancia relativa de un color hex (#rrggbb), como la define WCAG 2. */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
