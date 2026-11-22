// Reglas de progreso (racha, desbloqueo, repaso espaciado) como funciones puras y testeables.

/** Fecha local en formato AAAA-MM-DD (no UTC: la racha tiene que seguir tu día, no el de Greenwich). */
export function fechaLocal(fecha = new Date()): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

function restarDia(dia: string): string {
  const [a, m, d] = dia.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d - 1));
}

/**
 * Días seguidos con actividad. La racha sigue viva si practicaste hoy o ayer
 * (todavía estás a tiempo de practicar hoy).
 */
export function calcularRacha(diasActivos: string[], hoy = fechaLocal()): number {
  const dias = new Set(diasActivos);
  let dia = dias.has(hoy) ? hoy : restarDia(hoy);
  let racha = 0;
  while (dias.has(dia)) {
    racha++;
    dia = restarDia(dia);
  }
  return racha;
}

/** Una lección está desbloqueada si es la primera o si la anterior está completa. */
export function estaDesbloqueada(orden: string[], leccionId: string, completadas: Set<string>): boolean {
  const i = orden.indexOf(leccionId);
  if (i <= 0) return i === 0;
  return completadas.has(orden[i - 1]);
}

/** Estado de una pregunta en el repaso espaciado (sistema de cajas de Leitner). */
export interface EstadoRepaso {
  /** 0 = la erraste hace poco, 4 = la sabés bien. */
  caja: number;
  /** Último día en que se repasó (AAAA-MM-DD). */
  ultima: string;
}

/** Días que espera cada caja antes de volver a preguntar. */
const ESPERA_POR_CAJA = [0, 1, 3, 7, 14];

export function actualizarCaja(estado: EstadoRepaso | undefined, acerto: boolean, hoy = fechaLocal()): EstadoRepaso {
  const caja = acerto ? Math.min((estado?.caja ?? 0) + 1, ESPERA_POR_CAJA.length - 1) : 0;
  return { caja, ultima: hoy };
}

function diasEntre(desde: string, hasta: string): number {
  const a = new Date(desde + 'T00:00:00');
  const b = new Date(hasta + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Elige hasta `cantidad` preguntas para repasar: primero las que "vencieron"
 * (pasó su tiempo de espera), las de caja más baja antes. Si no alcanza,
 * completa con las menos repasadas.
 */
export function elegirRepaso(
  claves: string[],
  estados: Record<string, EstadoRepaso>,
  cantidad = 3,
  hoy = fechaLocal(),
): string[] {
  const puntaje = (clave: string) => {
    const e = estados[clave];
    if (!e) return { vencida: true, caja: 0, atraso: 0 };
    const atraso = diasEntre(e.ultima, hoy) - ESPERA_POR_CAJA[e.caja];
    return { vencida: atraso >= 0, caja: e.caja, atraso };
  };
  return [...claves]
    .sort((a, b) => {
      const pa = puntaje(a);
      const pb = puntaje(b);
      if (pa.vencida !== pb.vencida) return pa.vencida ? -1 : 1;
      if (pa.caja !== pb.caja) return pa.caja - pb.caja;
      return pb.atraso - pa.atraso;
    })
    .slice(0, cantidad);
}
