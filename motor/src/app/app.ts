import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CursoActual } from './core/curso-actual';
import { Progreso } from './core/progreso/progreso';
import { SelectorTema } from './shared/selector-tema/selector-tema';

// @Component: convierte una clase en un componente (una pieza de interfaz).
// - selector: la etiqueta HTML con la que se usa (<app-root> está en index.html).
// - imports: los componentes/directivas que usa su template. Desde Angular 19 todos
//   los componentes son "standalone" por defecto: no hace falta un NgModule.
// - templateUrl / styleUrl: el HTML y el CSS del componente (el CSS queda encapsulado:
//   no afecta a otros componentes).
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, SelectorTema],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly cursoActual = inject(CursoActual);
  protected readonly progreso = inject(Progreso);

  // "protected": el template puede leerlo, pero no queda expuesto como API pública de la clase.
  protected readonly curso = computed(() => (this.cursoActual.cursoId() ? this.cursoActual.datos() : undefined));

  protected saltarAlContenido(): void {
    document.getElementById('contenido-principal')?.focus();
  }
}
