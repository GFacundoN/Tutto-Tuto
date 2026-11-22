import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoActual } from '../core/curso-actual';
import { Bloques } from '../shared/bloques/bloques';

/** Guía de instalación para el camino local. */
@Component({
  selector: 'app-instalacion-page',
  imports: [RouterLink, Bloques],
  template: `
    <div class="contenedor">
      @if (curso(); as curso) {
        <h1>Instalación en tu PC</h1>
        <p class="tinta-suave">Para el camino local de {{ curso.titulo }} ({{ curso.versionHerramienta }}).</p>
        <app-bloques [bloques]="curso.instalacion" />
        <a class="boton boton-principal" [routerLink]="['/', cursoId()]">Volver al recorrido</a>
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
  `,
})
export class InstalacionPage {
  readonly cursoId = input.required<string>();
  protected readonly curso = inject(CursoActual).datos;
}
