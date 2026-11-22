import { Component, computed, input, model, output } from '@angular/core';
import { TextoMdPipe } from '../../shared/texto-md.pipe';

/**
 * Pistas progresivas: pista 1 → pista 2 → solución. Nunca la solución de entrada.
 * El padre decide cuántas se ven (se revelan solas al fallar) y la persona puede pedir más.
 */
@Component({
  selector: 'app-pistas',
  imports: [TextoMdPipe],
  template: `
    @if (reveladas() > 0) {
      <ol class="pistas" aria-live="polite">
        <!-- slice es un pipe incorporado: corta el array como Array.prototype.slice. -->
        @for (pista of pistas().slice(0, reveladas()); track $index) {
          <li><strong>Pista {{ $index + 1 }}.</strong> <span [innerHTML]="pista | textoMd"></span></li>
        }
      </ol>
    }
    @if (!resuelto()) {
      <div class="acciones">
        @if (quedanPistas()) {
          <button type="button" class="boton boton-texto" (click)="reveladas.set(reveladas() + 1)">
            {{ reveladas() === 0 ? 'Pedir una pista' : 'Pedir otra pista' }}
          </button>
        } @else {
          <button type="button" class="boton boton-texto" (click)="verSolucion.emit()">Ver la solución</button>
        }
      </div>
    }
  `,
  styles: `
    .pistas {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
    }
    .pistas li {
      background: var(--aviso-fondo);
      border-radius: var(--radio-chico);
      padding: 10px 14px;
      margin-bottom: 8px;
    }
    .acciones {
      margin-top: 8px;
    }
  `,
})
export class Pistas {
  readonly pistas = input.required<string[]>();
  readonly resuelto = input(false);
  // model(): un input que el componente también puede modificar (two-way binding).
  // El padre lo usa con [(reveladas)]="contador" y ve los cambios que hace este componente.
  readonly reveladas = model(0);
  // output(): un evento que el componente emite hacia el padre: (verSolucion)="…".
  // En código viejo: @Output() verSolucion = new EventEmitter<void>().
  readonly verSolucion = output<void>();

  protected readonly quedanPistas = computed(() => this.reveladas() < this.pistas().length);
}
