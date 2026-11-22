import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { claveDe, leer } from './almacenamiento';
import { CursoActual, Preferencias } from './curso-actual';

// Guard funcional: una función que devuelve true (pasa) o una UrlTree (redirige).
// Reemplaza a las clases que implementaban CanActivate en versiones viejas.
export const cursoElegidoGuard: CanActivateFn = (route) => {
  // Los guards de rutas hijas reciben solo su parte de la URL: el :cursoId está en el padre.
  const cursoId = route.paramMap.get('cursoId') ?? route.parent?.paramMap.get('cursoId');
  if (!cursoId) return inject(Router).createUrlTree(['/']);
  const prefs = leer<Preferencias | null>(claveDe(cursoId, 'preferencias'), null);
  return prefs ? true : inject(Router).createUrlTree(['/', cursoId, 'empezar']);
};

/** Registra el :cursoId de la URL en el servicio CursoActual. Siempre deja pasar. */
export const seleccionarCursoGuard: CanActivateFn = (route) => {
  inject(CursoActual).cursoId.set(route.paramMap.get('cursoId'));
  return true;
};
