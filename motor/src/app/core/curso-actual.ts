import { httpResource } from '@angular/common/http';
import { computed, effect, Injectable, linkedSignal, signal } from '@angular/core';
import { claveDe, guardar, leer } from './almacenamiento';
import { Curso } from './contenido/modelos';

export type Camino = 'navegador' | 'local';

export interface Preferencias {
  versionId: string;
  camino: Camino;
}

// @Injectable marca la clase como "servicio": Angular crea la instancia y la entrega
// a quien la pida con inject(). providedIn: 'root' = una sola instancia para toda la app
// (un singleton), ideal para estado compartido como "qué curso estoy viendo".
@Injectable({ providedIn: 'root' })
export class CursoActual {
  // signal(): un valor reactivo. Se lee llamándolo como función (cursoId())
  // y se cambia con .set() o .update(). Todo lo que lo lea se actualiza solo.
  readonly cursoId = signal<string | null>(null);

  // httpResource(): hace un GET cada vez que cambia la URL que devuelve la función.
  // Expone value(), isLoading() y error() como signals, sin subscribe() manual.
  // Si la función devuelve undefined, no hace ningún pedido.
  readonly curso = httpResource<Curso>(() => {
    const id = this.cursoId();
    return id ? `contenido/${id}/curso.json` : undefined;
  });

  /** El curso cargado, o undefined mientras carga o si falló (value() tira error si el pedido falló). */
  readonly datos = computed(() => (this.curso.hasValue() ? this.curso.value() : undefined));

  // linkedSignal(): un signal editable que se "resetea" cuando cambia otro.
  // Acá: al cambiar de curso, vuelve a leer las preferencias guardadas de ese curso,
  // pero mientras tanto lo podemos modificar con .set() al elegir versión o camino.
  readonly preferencias = linkedSignal<Preferencias | null>(() => {
    const id = this.cursoId();
    return id ? leer<Preferencias | null>(claveDe(id, 'preferencias'), null) : null;
  });

  // computed(): un valor derivado de otros signals. Se recalcula solo cuando cambian
  // sus dependencias y es de solo lectura (no tiene .set()).
  readonly version = computed(() => {
    const prefs = this.preferencias();
    const curso = this.datos();
    return curso?.versiones.find((v) => v.id === prefs?.versionId) ?? null;
  });

  /** Todas las lecciones de la versión elegida, en orden. */
  readonly ordenLecciones = computed(() => this.version()?.niveles.flatMap((n) => n.lecciones) ?? []);

  constructor() {
    // effect(): corre código cuando cambian los signals que lee. Se usa para efectos
    // "hacia afuera" de Angular (acá, guardar en localStorage), no para derivar estado:
    // para eso está computed().
    effect(() => {
      const id = this.cursoId();
      const prefs = this.preferencias();
      if (id && prefs) guardar(claveDe(id, 'preferencias'), prefs);
    });
  }

  elegir(versionId: string, camino: Camino): void {
    this.preferencias.set({ versionId, camino });
  }

  cambiarCamino(camino: Camino): void {
    // update(): cambia el valor a partir del anterior. Siempre devolvemos un objeto
    // nuevo (inmutable): si mutáramos el mismo objeto, el signal no detectaría el cambio.
    this.preferencias.update((p) => (p ? { ...p, camino } : p));
  }
}
