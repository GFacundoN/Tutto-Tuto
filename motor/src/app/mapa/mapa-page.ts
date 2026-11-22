import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CursoActual } from '../core/curso-actual';
import { estaDesbloqueada, fechaLocal } from '../core/progreso/calculos';
import { Progreso } from '../core/progreso/progreso';
import { TitulosLecciones } from '../core/contenido/titulos-lecciones';

type EstadoEstacion = 'completa' | 'actual' | 'disponible' | 'bloqueada';

/** Página del curso: encabezado, temario por módulos (niveles) y tarjeta lateral de progreso. */
@Component({
  selector: 'app-mapa-page',
  imports: [RouterLink],
  templateUrl: './mapa-page.html',
  styleUrl: './mapa-page.css',
})
export class MapaPage {
  readonly cursoId = input.required<string>();
  protected readonly cursoActual = inject(CursoActual);
  protected readonly progreso = inject(Progreso);
  private readonly titulos = inject(TitulosLecciones);

  protected readonly curso = this.cursoActual.datos;
  protected readonly version = this.cursoActual.version;
  protected readonly titulosLecciones = this.titulos.titulos;

  /** La próxima lección por hacer (la primera no completada del recorrido). */
  protected readonly proxima = computed(() => {
    const hechas = this.progreso.completadas();
    return this.cursoActual.ordenLecciones().find((id) => !hechas.has(id)) ?? null;
  });

  /** Niveles con el estado de cada estación y el avance del nivel. */
  protected readonly niveles = computed(() => {
    const orden = this.cursoActual.ordenLecciones();
    const hechas = this.progreso.completadas();
    const proxima = this.proxima();
    return (this.version()?.niveles ?? []).map((nivel) => {
      const estaciones = nivel.lecciones.map((id) => {
        let estado: EstadoEstacion = 'bloqueada';
        if (hechas.has(id)) estado = 'completa';
        else if (id === proxima) estado = 'actual';
        else if (estaDesbloqueada(orden, id, hechas)) estado = 'disponible';
        return { id, estado };
      });
      const completas = estaciones.filter((e) => e.estado === 'completa').length;
      const minutos = nivel.lecciones.reduce((total, id) => total + (this.titulosLecciones()[id]?.minutos ?? 0), 0);
      const tieneLaProxima = !!proxima && nivel.lecciones.includes(proxima);
      return { ...nivel, estaciones, completas, minutos, tieneLaProxima };
    });
  });

  protected readonly minutosTotales = computed(() => this.niveles().reduce((t, n) => t + n.minutos, 0));
  protected readonly porcentaje = computed(() => {
    const total = this.cursoActual.ordenLecciones().length;
    return total ? Math.round((this.totalCompletas() / total) * 100) : 0;
  });

  protected readonly totalCompletas = computed(
    () => this.cursoActual.ordenLecciones().filter((id) => this.progreso.completadas().has(id)).length,
  );

  /** Se ofrece el repaso si hay al menos una lección hecha y todavía no se repasó hoy. */
  protected readonly ofrecerRepaso = computed(
    () => this.totalCompletas() > 0 && this.progreso.estado().ultimoRepaso !== fechaLocal(),
  );

  protected readonly etiquetaEstado: Record<EstadoEstacion, string> = {
    completa: 'completa',
    actual: 'siguiente',
    disponible: 'disponible',
    bloqueada: 'bloqueada',
  };
}
