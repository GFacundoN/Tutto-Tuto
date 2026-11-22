import { Routes } from '@angular/router';
import { cursoElegidoGuard, seleccionarCursoGuard } from './core/curso.guards';

// Routes: la tabla de rutas. Cada ruta asocia una URL con un componente.
// loadComponent carga el componente recién cuando se visita la ruta (lazy loading):
// el JavaScript de esa pantalla viaja en un archivo aparte y el arranque es más rápido.
export const routes: Routes = [
  {
    path: '',
    title: 'Tutto-Tuto',
    loadComponent: () => import('./catalogo/catalogo-page').then((m) => m.CatalogoPage),
  },
  {
    // :cursoId es un parámetro: /angular, /docker, etc.
    path: ':cursoId',
    // Este guard no bloquea nada: registra qué curso se está viendo para que el resto
    // de la app (encabezado, progreso) lo sepa. Corre cada vez que cambia :cursoId.
    canActivate: [seleccionarCursoGuard],
    children: [
      {
        path: 'empezar',
        title: 'Elegí cómo aprender',
        loadComponent: () => import('./bienvenida/bienvenida-page').then((m) => m.BienvenidaPage),
      },
      {
        path: 'instalacion',
        title: 'Instalación en tu PC',
        loadComponent: () => import('./instalacion/instalacion-page').then((m) => m.InstalacionPage),
      },
      {
        path: 'referencia',
        title: 'Hoja de referencia',
        loadComponent: () => import('./referencia/referencia-page').then((m) => m.ReferenciaPage),
      },
      {
        // canActivate: guards que deciden si se puede entrar a la ruta.
        // Sin recorrido elegido, estas pantallas no tienen sentido: el guard redirige a "empezar".
        path: '',
        canActivate: [cursoElegidoGuard],
        children: [
          {
            path: '',
            title: 'Tu recorrido',
            loadComponent: () => import('./mapa/mapa-page').then((m) => m.MapaPage),
          },
          {
            path: 'leccion/:leccionId',
            title: 'Lección',
            loadComponent: () => import('./leccion/leccion-page').then((m) => m.LeccionPage),
          },
          {
            path: 'repaso',
            title: 'Repaso rápido',
            loadComponent: () => import('./repaso/repaso-page').then((m) => m.RepasoPage),
          },
          {
            path: 'proyecto',
            title: 'Proyecto final',
            loadComponent: () => import('./proyecto/proyecto-page').then((m) => m.ProyectoPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
