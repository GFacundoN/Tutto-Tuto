import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { claveDe, leer } from './core/almacenamiento';
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
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SelectorTema],
  templateUrl: './app.html',
  styleUrl: './app.css',
  // host: atributos y eventos de la propia etiqueta <app-root>. Escape cierra el menú en celular.
  host: { '(document:keydown.escape)': 'menuAbierto.set(false)' },
})
export class App {
  protected readonly cursoActual = inject(CursoActual);
  protected readonly progreso = inject(Progreso);
  private readonly router = inject(Router);

  // "protected": el template puede leerlo, pero no queda expuesto como API pública de la clase.
  protected readonly curso = computed(() => (this.cursoActual.cursoId() ? this.cursoActual.datos() : undefined));

  /** Último curso visitado (para "Seguir aprendiendo" desde el home). */
  protected readonly ultimoCurso = signal(leer<string | null>(claveDe('ultimo-curso'), null));

  /** Próxima lección del recorrido elegido, o null si ya terminó todas. */
  protected readonly proxima = computed(() => {
    const hechas = this.progreso.completadas();
    return this.cursoActual.ordenLecciones().find((id) => !hechas.has(id)) ?? null;
  });

  protected readonly avance = computed(() => {
    const orden = this.cursoActual.ordenLecciones();
    const hechas = orden.filter((id) => this.progreso.completadas().has(id)).length;
    return { hechas, total: orden.length, porcentaje: orden.length ? Math.round((hechas / orden.length) * 100) : 0 };
  });

  protected readonly menuAbierto = signal(false);

  constructor() {
    effect(() => {
      const id = this.cursoActual.cursoId();
      if (id) this.ultimoCurso.set(id);
    });
    // Al navegar a otra pantalla, el menú de celular se cierra solo.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAbierto.set(false));
  }

  protected saltarAlContenido(): void {
    document.getElementById('contenido-principal')?.focus();
  }

  /**
   * Links a secciones del home. Con el router en modo hash no se puede usar href="#id"
   * (cambiaría de ruta), así que navegamos al home si hace falta y después hacemos scroll.
   */
  protected async irASeccion(id: string): Promise<void> {
    this.menuAbierto.set(false);
    if (this.router.url !== '/') await this.router.navigate(['/']);
    requestAnimationFrame(() => {
      const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(id)?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
    });
  }
}
