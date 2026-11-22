import { HttpClient } from '@angular/common/http';
import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { ContenidoCursos } from '../../core/contenido/contenido-cursos';
import { Curso, Destacado } from '../../core/contenido/modelos';

/** Tarjeta lista para mostrar: el destacado más los datos calculados de sus módulos. */
interface Tarjeta extends Destacado {
  /** Ej. "Módulos 2, 3 y 4" */
  rotulo: string;
  lecciones: number;
  minutos: number;
}

/**
 * Paneles expandibles (estilo "expanding panels"):
 * - Desktop (≥1025px): fila de tarjetas con alturas escalonadas alineadas abajo. La activa
 *   (hover, foco o clic) se ensancha, crece al alto completo, toma el color de marca y recién
 *   entonces muestra su detalle.
 * - Celular/tablet: carrusel horizontal con flechas y puntos; todas las tarjetas completas.
 * Los datos son los "destacados" del curso.json (o sus niveles, si no tiene destacados).
 */
@Component({
  selector: 'app-paneles-modulos',
  imports: [RouterLink],
  templateUrl: './paneles-modulos.html',
  styleUrl: './paneles-modulos.css',
})
export class PanelesModulos {
  readonly cursoId = input.required<string>();
  private readonly http = inject(HttpClient);
  private readonly contenido = inject(ContenidoCursos);

  // curso.json y después las lecciones del primer recorrido, para sumar cantidad y minutos.
  private readonly datos = rxResource({
    params: () => this.cursoId(),
    stream: ({ params: cursoId }) =>
      this.http.get<Curso>(`contenido/${cursoId}/curso.json`).pipe(
        switchMap((curso) => {
          const niveles = curso.versiones[0]?.niveles ?? [];
          const destacados: Destacado[] =
            curso.destacados ??
            niveles.slice(0, 5).map((n) => ({ titulo: n.titulo, descripcion: n.descripcion, usas: [], logros: [], modulos: [n.id] }));
          return this.contenido.lecciones(cursoId, niveles.flatMap((n) => n.lecciones)).pipe(
            map((lecciones) => {
              const minutos = new Map(lecciones.map((l) => [l.id, l.minutos]));
              return destacados.map<Tarjeta>((d) => {
                const indices = (d.modulos ?? []).map((id) => niveles.findIndex((n) => n.id === id)).filter((i) => i >= 0);
                const ids = indices.flatMap((i) => niveles[i].lecciones);
                return {
                  ...d,
                  rotulo: rotular(indices.map((i) => i + 1)),
                  lecciones: ids.length,
                  minutos: ids.reduce((total, id) => total + (minutos.get(id) ?? 0), 0),
                };
              });
            }),
          );
        }),
      ),
  });

  protected readonly paneles = computed(() => (this.datos.hasValue() ? this.datos.value() : []));
  protected readonly activo = signal(0);

  private readonly pista = viewChild<ElementRef<HTMLElement>>('pista');

  protected activar(indice: number): void {
    this.activo.set(indice);
  }

  /** El hover solo abre tarjetas en desktop; en el carrusel el punto activo lo marca el scroll. */
  protected alPasar(indice: number): void {
    if (matchMedia('(min-width: 1025px)').matches) this.activo.set(indice);
  }

  /** Flechas y puntos: activan la tarjeta y, en el carrusel, la traen a la vista. */
  protected irA(indice: number): void {
    const destino = Math.max(0, Math.min(this.paneles().length - 1, indice));
    this.activo.set(destino);
    const pista = this.pista()?.nativeElement;
    const tarjeta = pista?.children[destino] as HTMLElement | undefined;
    if (pista && tarjeta && pista.scrollWidth > pista.clientWidth) {
      const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
      pista.scrollTo({ left: tarjeta.offsetLeft - pista.offsetLeft, behavior: reducir ? 'auto' : 'smooth' });
    }
  }

  /** En el carrusel, el punto activo sigue al scroll. requestAnimationFrame evita recalcular de más. */
  private esperando = false;
  protected alDesplazar(): void {
    if (this.esperando) return;
    this.esperando = true;
    requestAnimationFrame(() => {
      this.esperando = false;
      const pista = this.pista()?.nativeElement;
      if (!pista || pista.scrollWidth <= pista.clientWidth) return;
      const ancho = (pista.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      this.activo.set(Math.round(pista.scrollLeft / (ancho + 12)));
    });
  }
}

/** [2, 3, 4] -> "Módulos 2, 3 y 4"; [1] -> "Módulo 1"; [] -> "" */
function rotular(numeros: number[]): string {
  if (numeros.length === 0) return '';
  if (numeros.length === 1) return `Módulo ${numeros[0]}`;
  return `Módulos ${numeros.slice(0, -1).join(', ')} y ${numeros.at(-1)}`;
}
