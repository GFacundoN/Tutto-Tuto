import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, shareReplay } from 'rxjs';
import { Bloque, Leccion } from './modelos';

/**
 * Carga lecciones sueltas con HttpClient (Observables).
 * Las pantallas que cargan UNA cosa usan httpResource; acá necesitamos varias
 * lecciones a la vez (para el repaso), y forkJoin de RxJS resuelve eso:
 * espera a que terminen todos los pedidos y emite un array con los resultados.
 */
@Injectable({ providedIn: 'root' })
export class ContenidoCursos {
  private readonly http = inject(HttpClient);
  // Cache en memoria: si ya pedimos una lección, reutilizamos el mismo Observable.
  private readonly cache = new Map<string, Observable<Leccion>>();

  leccion(cursoId: string, leccionId: string): Observable<Leccion> {
    const url = urlLeccion(cursoId, leccionId);
    let pedido = this.cache.get(url);
    if (!pedido) {
      // shareReplay(1): comparte una sola respuesta HTTP entre todos los que se suscriban.
      pedido = this.http.get<Leccion>(url).pipe(shareReplay(1));
      this.cache.set(url, pedido);
    }
    return pedido;
  }

  /** Varias lecciones a la vez. Si alguna falla, se omite (no rompe el resto). */
  lecciones(cursoId: string, ids: string[]): Observable<Leccion[]> {
    if (!ids.length) return of([]);
    // pipe() encadena operadores de RxJS. catchError atrapa el error de UN pedido
    // y lo reemplaza por null, para que forkJoin no falle entero.
    const pedidos = ids.map((id) => this.leccion(cursoId, id).pipe(catchError(() => of(null))));
    return forkJoin(pedidos).pipe(map((lista) => lista.filter((l): l is Leccion => l !== null)));
  }
}

export function urlLeccion(cursoId: string, leccionId: string): string {
  return `contenido/${cursoId}/lecciones/${leccionId}.json`;
}

/**
 * Adapta la lección a la versión elegida: aplica sus reemplazos (ej. explicación
 * para principiantes) y saca los bloques marcados para otras versiones.
 */
export function aplicarVariante(leccion: Leccion, versionId: string | undefined): Leccion {
  const variante = versionId ? leccion.variantes?.[versionId] : undefined;
  const base = variante ? { ...leccion, ...variante } : leccion;
  const visible = (b: Bloque) => !b.soloVersiones || (!!versionId && b.soloVersiones.includes(versionId));
  return { ...base, explicacion: base.explicacion.filter(visible) };
}
