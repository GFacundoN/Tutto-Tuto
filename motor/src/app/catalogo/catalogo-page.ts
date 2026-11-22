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
            <li>
              <a [routerLink]="['/', curso.id]">
                <span class="dato">Curso</span>
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
      font-size: clamp(2.2rem, 6vw, 3rem);
      letter-spacing: -0.03em;
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
    .cursos {
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }
    .cursos a {
      display: grid;
      gap: 6px;
      height: 100%;
      padding: 24px;
      background: var(--superficie);
      border: 1px solid var(--borde);
      border-radius: var(--radio);
      box-shadow: var(--sombra);
      text-decoration: none;
      transition: border-color var(--dur);
    }
    .cursos a:hover {
      border-color: var(--acento);
    }
    .titulo {
      font-weight: 800;
      font-size: var(--t-3);
      letter-spacing: -0.02em;
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
