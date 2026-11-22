import { computed, effect, inject, Injectable, linkedSignal } from '@angular/core';
import { borrar, claveDe, guardar, leer } from '../almacenamiento';
import { CursoActual } from '../curso-actual';
import { actualizarCaja, calcularRacha, EstadoRepaso, fechaLocal } from './calculos';

/** Lo que se guarda en localStorage por curso. */
export interface EstadoProgreso {
  /** leccionId -> fecha en que se completó */
  completadas: Record<string, string>;
  xp: number;
  diasActivos: string[];
  /** Estado del repaso espaciado por pregunta ("leccionId#indice"). */
  repaso: Record<string, EstadoRepaso>;
  /** Último día en que se hizo el repaso de inicio de sesión. */
  ultimoRepaso: string | null;
  /** Criterios del proyecto final tildados. */
  proyecto: Record<string, boolean>;
}

const VACIO: EstadoProgreso = {
  completadas: {},
  xp: 0,
  diasActivos: [],
  repaso: {},
  ultimoRepaso: null,
  proyecto: {},
};

/** XP que da cada acción. */
export const XP = {
  leccion: 10,
  ejercicioSinPistas: 5,
  respuestaQuiz: 2,
  respuestaRepaso: 1,
} as const;

@Injectable({ providedIn: 'root' })
export class Progreso {
  // inject(): pide una dependencia al sistema de inyección de Angular.
  // Reemplaza a la inyección por constructor (constructor(private x: X)) que vas a ver en código viejo.
  private readonly cursoActual = inject(CursoActual);

  /** Estado completo; se recarga desde localStorage al cambiar de curso. */
  readonly estado = linkedSignal<EstadoProgreso>(() => {
    const id = this.cursoActual.cursoId();
    return id ? { ...VACIO, ...leer<Partial<EstadoProgreso>>(claveDe(id, 'progreso'), {}) } : VACIO;
  });

  readonly completadas = computed(() => new Set(Object.keys(this.estado().completadas)));
  readonly xp = computed(() => this.estado().xp);
  readonly racha = computed(() => calcularRacha(this.estado().diasActivos));
  readonly practicoHoy = computed(() => this.estado().diasActivos.includes(fechaLocal()));

  constructor() {
    effect(() => {
      const id = this.cursoActual.cursoId();
      if (id) guardar(claveDe(id, 'progreso'), this.estado());
    });
  }

  /** Suma XP y marca el día como activo (cuenta para la racha). */
  sumarXp(cantidad: number): void {
    const hoy = fechaLocal();
    this.estado.update((e) => ({
      ...e,
      xp: e.xp + cantidad,
      diasActivos: e.diasActivos.includes(hoy) ? e.diasActivos : [...e.diasActivos, hoy],
    }));
  }

  completarLeccion(leccionId: string): void {
    if (this.completadas().has(leccionId)) return;
    this.estado.update((e) => ({ ...e, completadas: { ...e.completadas, [leccionId]: fechaLocal() } }));
    this.sumarXp(XP.leccion);
  }

  registrarRepaso(clave: string, acerto: boolean): void {
    this.estado.update((e) => ({
      ...e,
      repaso: { ...e.repaso, [clave]: actualizarCaja(e.repaso[clave], acerto) },
    }));
    if (acerto) this.sumarXp(XP.respuestaRepaso);
  }

  terminarRepasoDelDia(): void {
    this.estado.update((e) => ({ ...e, ultimoRepaso: fechaLocal() }));
  }

  marcarCriterio(id: string, hecho: boolean): void {
    this.estado.update((e) => ({ ...e, proyecto: { ...e.proyecto, [id]: hecho } }));
  }

  reiniciar(): void {
    const id = this.cursoActual.cursoId();
    if (id) borrar(claveDe(id, 'progreso'));
    this.estado.set(VACIO);
  }
}
