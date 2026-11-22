import { Component, input } from '@angular/core';

export type TipoPaso = 'aprender' | 'ver' | 'practicar' | 'quiz';

/**
 * Ícono de cada parte de una lección (lectura, video, práctica, quiz).
 * SVG de trazo: con la clase "dibujar" en un ancestro, el trazo se dibuja al aparecer.
 */
@Component({
  selector: 'app-icono-paso',
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="tamano()" [attr.height]="tamano()" aria-hidden="true" focusable="false">
      @switch (tipo()) {
        @case ('aprender') {
          <path pathLength="1" d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
        }
        @case ('ver') {
          <rect pathLength="1" x="3" y="5" width="18" height="14" rx="3" />
          <path pathLength="1" d="M10 9.5v5l4.5-2.5z" />
        }
        @case ('practicar') {
          <path pathLength="1" d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5M13.5 5l-3 14" />
        }
        @case ('quiz') {
          <circle pathLength="1" cx="12" cy="12" r="9" />
          <path pathLength="1" d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    svg * {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    :host-context(.dibujar) svg * {
      stroke-dasharray: 1;
      animation: dibujar 900ms var(--ease-salida) both;
    }
    @keyframes dibujar {
      from {
        stroke-dashoffset: 1;
      }
      to {
        stroke-dashoffset: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host-context(.dibujar) svg * {
        animation: none;
      }
    }
  `,
})
export class IconoPaso {
  readonly tipo = input.required<TipoPaso>();
  readonly tamano = input(20);
}
