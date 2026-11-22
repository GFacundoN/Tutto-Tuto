/** Lo que emite un ejercicio cuando se completa. */
export interface ResultadoEjercicio {
  /** true si se resolvió sin pistas ni solución (da XP extra). */
  sinAyuda: boolean;
}

/** Después de cada intento fallido se revela una pista más (hasta agotarlas). */
export function pistasTrasFallo(reveladas: number, fallos: number, total: number): number {
  return Math.max(reveladas, Math.min(fallos, total));
}
