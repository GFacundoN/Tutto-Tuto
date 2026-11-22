import { Component, ElementRef, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaCurso } from '../tarjeta-curso';

/**
 * Paneles expandibles (estilo "expanding panels"), uno por curso del índice:
 * - Desktop (≥1025px): fila de tarjetas con alturas escalonadas alineadas abajo. La activa
 *   (hover, foco o clic) se ensancha, crece al alto completo, se ilumina con el color del
 *   curso y recién entonces muestra su detalle.
 * - Celular/tablet: carrusel horizontal con flechas y puntos; todas las tarjetas completas.
 * Los datos vienen del home (cursos.json + lo calculado de cada curso.json): agregar un
 * curso al índice agrega su panel, sin tocar código.
 */
@Component({
  selector: 'app-paneles-modulos',
  imports: [RouterLink],
  templateUrl: './paneles-modulos.html',
  styleUrl: './paneles-modulos.css',
})
export class PanelesModulos {
  // input(): propiedad que recibe un valor del padre (<app-paneles-modulos [cursos]="...">). Es un signal.
  readonly cursos = input.required<TarjetaCurso[]>();
  protected readonly paneles = this.cursos;
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

