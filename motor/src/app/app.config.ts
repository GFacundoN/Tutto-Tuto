import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';

// ApplicationConfig: la configuración global de la app (lo que antes iba en AppModule).
// Los "providers" registran servicios y funcionalidades para toda la aplicación.
export const appConfig: ApplicationConfig = {
  providers: [
    // Muestra en consola errores que se escapan de Angular (promesas sin catch, etc.).
    provideBrowserGlobalErrorListeners(),
    // Habilita HttpClient e httpResource. En Angular 22 usa fetch() por defecto.
    provideHttpClient(),
    provideRouter(
      routes,
      // Los parámetros de la URL (:cursoId, :leccionId) llegan como input() del componente.
      withComponentInputBinding(),
      // URLs con # (…/#/angular/leccion/x): GitHub Pages no sabe redirigir rutas de una SPA,
      // y con # el servidor siempre recibe la misma página index.html.
      withHashLocation(),
      // Al navegar, vuelve arriba de la página (como un sitio normal).
      withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
      // Las rutas hijas también reciben los parámetros del padre (el :cursoId).
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
  ],
};
