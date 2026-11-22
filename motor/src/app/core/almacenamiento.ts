// Acceso seguro a localStorage. En modo incógnito o con el almacenamiento bloqueado,
// localStorage puede tirar error: en ese caso la app sigue andando, solo que sin recordar nada.

const PREFIJO = 'tutto-tuto';

export function claveDe(...partes: string[]): string {
  return [PREFIJO, ...partes].join(':');
}

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(clave);
    return crudo === null ? porDefecto : (JSON.parse(crudo) as T);
  } catch {
    return porDefecto;
  }
}

export function guardar(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: no hay nada más que hacer.
  }
}

export function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Ídem.
  }
}
