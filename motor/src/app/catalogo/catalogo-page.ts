import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoResumen } from '../core/contenido/modelos';
import { CursoActual } from '../core/curso-actual';

/** Lista de cursos disponibles (contenido/cursos.json). */
@Component({
  selector: 'app-catalogo-page',
  imports: [RouterLink],
  template: `
    <div class="contenedor">
      <h1>Cursos cortos, con práctica en cada paso</h1>
      <p class="tinta-suave bajada">Lecciones de 5 a 15 minutos. Cada una termina con un ejercicio y un quiz.</p>

      @if (cursos.error()) {
        <p role="alert">No pude cargar la lista de cursos. Revisá tu conexión y recargá la página.</p>
      } @else {
        <ul class="cursos">
          @for (curso of lista(); track curso.id) {
            <li [style.--color-curso]="curso.color">
              <a [routerLink]="['/', curso.id]">
                <span class="titulo">{{ curso.titulo }}</span>
                <span class="tinta-suave">{{ curso.descripcion }}</span>
              </a>
            </li>
          } @empty {
            <li class="tinta-suave">Cargando cursos…</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      padding-top: 40px;
    }
    h1 {
      font-size: var(--t-5);
      max-width: 18ch;
    }
    .bajada {
      font-size: var(--t-2);
    }
    .cursos {
      list-style: none;
      padding: 0;
      margin: 32px 0 0;
      display: grid;
      gap: 12px;
    }
    .cursos a {
      display: grid;
      gap: 4px;
      padding: 18px 20px 18px 28px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-left: 8px solid var(--color-curso);
      border-radius: var(--radio);
      text-decoration: none;
    }
    .cursos a:hover {
      border-color: var(--color-curso);
    }
    .titulo {
      font-family: var(--fuente-titulo);
      font-weight: 800;
      font-size: var(--t-3);
    }
  `,
})
export class CatalogoPage {
  protected readonly cursos = httpResource<CursoResumen[]>(() => 'contenido/cursos.json');
  protected readonly lista = computed(() => (this.cursos.hasValue() ? this.cursos.value() : []));

  constructor() {
    // En el catálogo no hay curso activo: el encabezado no muestra racha ni XP.
    inject(CursoActual).cursoId.set(null);
  }
}
