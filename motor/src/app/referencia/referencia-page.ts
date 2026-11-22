import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoActual } from '../core/curso-actual';
import { TextoMdPipe } from '../shared/texto-md.pipe';

/** Hoja de referencia (cheatsheet) imprimible. */
@Component({
  selector: 'app-referencia-page',
  imports: [RouterLink, TextoMdPipe],
  template: `
    <div class="contenedor ancha">
      @if (curso(); as curso) {
        <div class="cabecera">
          <h1>{{ curso.titulo }}: hoja de referencia</h1>
          <p class="tinta-suave">{{ curso.versionHerramienta }}. Lo que más vas a usar, en una página.</p>
          <div class="no-imprimir acciones">
            <button type="button" class="boton boton-principal" (click)="imprimir()">Imprimir o guardar como PDF</button>
            <a class="boton boton-texto" [routerLink]="['/', cursoId()]">Volver al recorrido</a>
          </div>
        </div>
        <div class="secciones">
          @for (seccion of curso.referencia; track seccion.titulo) {
            <section>
              <h2>{{ seccion.titulo }}</h2>
              @for (item of seccion.items; track item.titulo) {
                <h3>{{ item.titulo }}</h3>
                <pre><code>{{ item.codigo }}</code></pre>
                @if (item.nota) {
                  <p class="nota" [innerHTML]="item.nota | textoMd"></p>
                }
              }
            </section>
          }
        </div>
      } @else {
        <p class="tinta-suave" role="status">Cargando…</p>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding-top: 32px;
    }
    .ancha {
      max-width: 1100px;
    }
    .acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }
    .secciones {
      columns: 2 420px;
      column-gap: 32px;
    }
    section {
      break-inside: avoid-column;
      margin-bottom: 24px;
    }
    h2 {
      font-size: var(--t-2);
      border-bottom: 3px solid var(--linea);
      padding-bottom: 4px;
    }
    h3 {
      font-size: var(--t-1);
      margin: 12px 0 4px;
    }
    pre {
      font-size: 0.85rem;
      margin-bottom: 4px;
      break-inside: avoid;
    }
    .nota {
      font-size: 0.9rem;
      color: var(--tinta-suave);
    }
    @media print {
      :host {
        padding-top: 0;
      }
      .secciones {
        columns: 2;
        font-size: 0.8rem;
      }
    }
  `,
})
export class ReferenciaPage {
  readonly cursoId = input.required<string>();
  protected readonly curso = inject(CursoActual).datos;

  protected imprimir(): void {
    window.print();
  }
}
