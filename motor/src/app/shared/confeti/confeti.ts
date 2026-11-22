import { Component, computed, input } from '@angular/core';

/**
 * Explosión de confeti para celebrar un logro. Una sola vez, ~1,2 s, solo con
 * transform y opacity (lo resuelve la GPU, no traba la página). Sin librerías.
 * Las posiciones se calculan con fórmulas fijas: no hace falta aleatoriedad.
 * Con "reducir movimiento" activado no se muestra.
 */
@Component({
  selector: 'app-confeti',
  template: `
    @for (p of piezas(); track $index) {
      <span
        class="pieza"
        [style.--x.px]="p.x"
        [style.--y.px]="p.y"
        [style.--giro.deg]="p.giro"
        [style.--retraso.ms]="p.retraso"
        [style.background]="p.color"
        [class.redonda]="p.redonda"
      ></span>
    }
  `,
  host: { 'aria-hidden': 'true' },
  styles: `
    :host {
      position: absolute;
      left: 50%;
      top: 36px;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    .pieza {
      position: absolute;
      width: 8px;
      height: 12px;
      border-radius: 2px;
      opacity: 0;
      animation: volar 1200ms cubic-bezier(0.15, 0.7, 0.3, 1) var(--retraso) both;
    }
    .redonda {
      width: 9px;
      height: 9px;
      border-radius: 50%;
    }
    @keyframes volar {
      0% {
        opacity: 1;
        transform: translate(0, 0) rotate(0) scale(0.6);
      }
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        transform: translate(var(--x), var(--y)) rotate(var(--giro)) scale(1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        display: none;
      }
    }
  `,
})
export class Confeti {
  readonly cantidad = input(28);
  // Colores del sistema: acento, éxito, aviso y rosa del logo de Angular.
  private readonly colores = ['var(--acento)', 'var(--exito)', '#f5b400', '#f60a48', 'var(--acento)'];

  protected readonly piezas = computed(() =>
    Array.from({ length: this.cantidad() }, (_, i) => {
      const angulo = (i / this.cantidad()) * Math.PI * 2 + (i % 3) * 0.3;
      const distancia = 90 + ((i * 37) % 80);
      return {
        x: Math.round(Math.cos(angulo) * distancia),
        // Más hacia arriba que hacia abajo, y caen un poco al final.
        y: Math.round(Math.sin(angulo) * distancia * 0.8 + 30),
        giro: ((i * 73) % 360) - 180,
        retraso: (i % 5) * 25,
        color: this.colores[i % this.colores.length],
        redonda: i % 4 === 0,
      };
    }),
  );
}
