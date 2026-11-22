// Punto de entrada de la app. bootstrapApplication() arranca Angular con un componente
// raíz (App) y la configuración global (appConfig). Reemplaza al viejo
// platformBrowserDynamic().bootstrapModule(AppModule) de los proyectos con NgModules.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
