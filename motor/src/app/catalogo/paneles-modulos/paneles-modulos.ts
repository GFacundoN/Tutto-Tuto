import { HttpClient } from '@angular/common/http';
import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Curso, Destacado } from '../../core/contenido/modelos';

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

  private readonly datos = rxResource({
    params: () => this.cursoId(),
    stream: ({ params: cursoId }) =>
      this.http.get<Curso>(`contenido/${cursoId}/curso.json`).pipe(
        map<Curso, Destacado[]>(
          (curso) =>
            curso.destacados ??
            (curso.versiones[0]?.niveles ?? []).slice(0, 5).map((n) => ({
              titulo: n.titulo,
              descripcion: n.descripcion,
              usas: [],
              logros: [],
            })),
        ),
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
