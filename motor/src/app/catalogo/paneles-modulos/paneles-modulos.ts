import { HttpClient } from '@angular/common/http';
import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { ContenidoCursos } from '../../core/contenido/contenido-cursos';
import { Curso } from '../../core/contenido/modelos';

interface Panel {
  id: string;
  numero: number;
  dia?: string;
  titulo: string;
  descripcion: string;
  lecciones: string[];
}

/**
 * Paneles expandibles con los módulos de un curso.
 * Desktop: una fila de paneles; el activo se ensancha y muestra el detalle (hover, foco o clic).
 * Celular: carrusel horizontal con scroll-snap, flechas y puntos.
 * Los datos salen del curso.json y de los títulos de sus lecciones: sirve para cualquier curso.
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

  // params: cuando cambia cursoId, se vuelve a cargar. stream: curso.json y después sus lecciones.
  private readonly datos = rxResource({
    params: () => this.cursoId(),
    stream: ({ params: cursoId }) =>
      this.http.get<Curso>(`contenido/${cursoId}/curso.json`).pipe(
        switchMap((curso) => {
          // Se muestra el primer recorrido (el más completo).
          const niveles = curso.versiones[0]?.niveles ?? [];
          return this.contenido.lecciones(cursoId, niveles.flatMap((n) => n.lecciones)).pipe(
            map((lecciones) => {
              const titulos = new Map(lecciones.map((l) => [l.id, l.titulo]));
              return niveles.map<Panel>((n, i) => ({
                id: n.id,
                numero: i + 1,
                dia: n.dia,
                titulo: n.titulo,
                descripcion: n.descripcion,
                lecciones: n.lecciones.map((id) => titulos.get(id) ?? id).slice(0, 4),
              }));
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

  /** Flechas y puntos: activan el panel y, en celular, lo traen a la vista. */
  protected irA(indice: number): void {
    const total = this.paneles().length;
    const destino = Math.max(0, Math.min(total - 1, indice));
    this.activo.set(destino);
    const pista = this.pista()?.nativeElement;
    const panel = pista?.children[destino] as HTMLElement | undefined;
    if (pista && panel && pista.scrollWidth > pista.clientWidth) {
      const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
      pista.scrollTo({ left: panel.offsetLeft - pista.offsetLeft, behavior: reducir ? 'auto' : 'smooth' });
    }
  }

  /** En celular, el punto activo sigue al scroll con el dedo. requestAnimationFrame evita recalcular de más. */
  private esperando = false;
  protected alDesplazar(): void {
    if (this.esperando) return;
    this.esperando = true;
    requestAnimationFrame(() => {
      this.esperando = false;
      const pista = this.pista()?.nativeElement;
      if (!pista || pista.scrollWidth <= pista.clientWidth) return;
      const ancho = (pista.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
      this.activo.set(Math.round(pista.scrollLeft / (ancho + 16)));
    });
  }
}
