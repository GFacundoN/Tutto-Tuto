import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CursoActual } from './curso-actual';

// Guard funcional: una función que devuelve true (pasa) o una UrlTree (redirige).
// Reemplaza a las clases que implementaban CanActivate en versiones viejas.

/** Registra el :cursoId de la URL en el servicio CursoActual. Siempre deja pasar. */
export const seleccionarCursoGuard: CanActivateFn = (route) => {
  inject(CursoActual).cursoId.set(route.paramMap.get('cursoId'));
  return true;
};

/**
 * Deja pasar solo si ya se eligió recorrido; si no, redirige a "empezar".
 * Lee el signal del servicio (no localStorage): el effect que guarda en localStorage
 * corre un instante después, y leer de ahí justo al confirmar daría un falso "no elegido".
 * Funciona porque Angular ejecuta los guards de padre a hijo: seleccionarCursoGuard ya corrió.
 */
export const cursoElegidoGuard: CanActivateFn = (route) => {
  const cursoActual = inject(CursoActual);
  if (cursoActual.preferencias()) return true;
  return inject(Router).createUrlTree(['/', route.paramMap.get('cursoId'), 'empezar']);
};
