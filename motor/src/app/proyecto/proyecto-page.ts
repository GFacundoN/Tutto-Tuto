import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoActual } from '../core/curso-actual';
import { Progreso } from '../core/progreso/progreso';
import { Bloques } from '../shared/bloques/bloques';

/** Proyecto final: enunciado + checklist de criterios que la persona verifica y tilda. */
@Component({
  selector: 'app-proyecto-page',
  imports: [RouterLink, Bloques],
  templateUrl: './proyecto-page.html',
  styleUrl: './proyecto-page.css',
})
export class ProyectoPage {
  readonly cursoId = input.required<string>();
  private readonly cursoActual = inject(CursoActual);
  protected readonly progreso = inject(Progreso);

  protected readonly proyecto = computed(() => this.cursoActual.datos()?.proyectoFinal);

  /** Criterios que aplican a la versión elegida. */
  protected readonly criterios = computed(() => {
    const versionId = this.cursoActual.preferencias()?.versionId ?? '';
    return (this.proyecto()?.criterios ?? []).filter((c) => !c.versiones || c.versiones.includes(versionId));
  });
  protected readonly cumplidos = computed(
    () => this.criterios().filter((c) => this.progreso.estado().proyecto[c.id]).length,
  );
}
