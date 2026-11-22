import { Component, input, signal } from '@angular/core';

/** Bloque de código con nombre de archivo opcional y botón para copiar. */
@Component({
  selector: 'app-codigo-copiable',
  template: `
    <figure>
      @if (archivo() || lenguaje() === 'terminal') {
        <figcaption>
          <span>{{ archivo() ?? 'Terminal' }}</span>
          <button type="button" class="copiar no-imprimir" (click)="copiar()">
            {{ copiado() ? 'Copiado' : 'Copiar' }}
          </button>
        </figcaption>
      }
      <pre
        tabindex="0"
        [attr.aria-label]="'Código' + (archivo() ? ' de ' + archivo() : '')"
      ><code>{{ lenguaje() === 'terminal' ? '> ' : '' }}{{ codigo() }}</code></pre>
      @if (salida()) {
        <pre class="salida" aria-label="Salida esperada"><code>{{ salida() }}</code></pre>
      }
    </figure>
  `,
  styles: `
    figure {
      margin: 0 0 1em;
    }
    figcaption {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: color-mix(in oklab, var(--codigo-fondo) 85%, white);
      color: var(--codigo-tinta);
      font: 0.85rem var(--fuente-codigo);
      padding: 4px 6px 4px 14px;
      border-radius: var(--radio-chico) var(--radio-chico) 0 0;
    }
    figcaption + pre {
      border-radius: 0 0 var(--radio-chico) var(--radio-chico);
    }
    .copiar {
      background: transparent;
      color: inherit;
      border: 1px solid currentColor;
      border-radius: 999px;
      font: inherit;
      padding: 4px 12px;
      min-height: 32px;
      cursor: pointer;
    }
    .salida {
      margin-top: -0.6em;
      border-top: 1px dashed var(--tinta-suave);
      border-radius: 0 0 var(--radio-chico) var(--radio-chico);
      opacity: 0.9;
    }
  `,
})
export class CodigoCopiable {
  readonly codigo = input.required<string>();
  readonly archivo = input<string>();
  readonly lenguaje = input<string>();
  readonly salida = input<string>();
  protected readonly copiado = signal(false);

  protected async copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.codigo());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 1800);
    } catch {
      // El navegador no dejó copiar (permisos): el código sigue visible para seleccionarlo a mano.
    }
  }
}
