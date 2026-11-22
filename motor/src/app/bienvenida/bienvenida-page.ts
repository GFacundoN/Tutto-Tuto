import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Camino, CursoActual } from '../core/curso-actual';

/** Primera pantalla de un curso: elegir versión (recorrido) y camino de práctica. Se puede volver a cambiar. */
@Component({
  selector: 'app-bienvenida-page',
  imports: [RouterLink],
  templateUrl: './bienvenida-page.html',
  styleUrl: './bienvenida-page.css',
})
export class BienvenidaPage {
  readonly cursoId = input.required<string>();
  protected readonly cursoActual = inject(CursoActual);
  private readonly router = inject(Router);

  protected readonly curso = this.cursoActual.datos;
  // Arranca con lo ya elegido (si había) y se edita localmente hasta confirmar.
  protected readonly versionId = linkedSignal(
    () => this.cursoActual.preferencias()?.versionId ?? this.curso()?.versiones[0]?.id ?? '',
  );
  protected readonly camino = linkedSignal<Camino>(() => this.cursoActual.preferencias()?.camino ?? 'navegador');
  protected readonly yaElegido = computed(() => !!this.cursoActual.preferencias());

  protected confirmar(): void {
    this.cursoActual.elegir(this.versionId(), this.camino());
    this.router.navigate(['/', this.cursoId()]);
  }
}
