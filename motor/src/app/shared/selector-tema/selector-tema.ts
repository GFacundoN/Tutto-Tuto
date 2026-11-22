import { Component, effect, signal } from '@angular/core';
import { guardar, leer } from '../../core/almacenamiento';

type Tema = 'sistema' | 'claro' | 'oscuro';

const SIGUIENTE: Record<Tema, Tema> = { sistema: 'claro', claro: 'oscuro', oscuro: 'sistema' };
const ETIQUETA: Record<Tema, string> = { sistema: 'Tema del sistema', claro: 'Tema claro', oscuro: 'Tema oscuro' };

/** Botón que alterna sistema → claro → oscuro. */
@Component({
  selector: 'app-selector-tema',
  template: `
    <button
      type="button"
      class="boton boton-secundario"
      (click)="tema.set(siguiente[tema()])"
      [attr.aria-label]="etiqueta[tema()] + '. Cambiar tema'"
      [title]="etiqueta[tema()]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        @switch (tema()) {
          @case ('claro') {
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <path
              d="M12 1v3M12 20v3M1 12h3M20 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          }
          @case ('oscuro') {
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" />
          }
          @default {
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" />
          }
        }
      </svg>
    </button>
  `,
  styles: `
    button {
      width: 44px;
      padding: 0;
    }
  `,
})
export class SelectorTema {
  protected readonly tema = signal<Tema>(leer<Tema>('tutto-tuto:tema', 'sistema'));
  protected readonly siguiente = SIGUIENTE;
  protected readonly etiqueta = ETIQUETA;

  constructor() {
    effect(() => {
      const tema = this.tema();
      guardar('tutto-tuto:tema', tema);
      const raiz = document.documentElement;
      if (tema === 'sistema') delete raiz.dataset['theme'];
      else raiz.dataset['theme'] = tema === 'claro' ? 'light' : 'dark';
    });
  }
}
