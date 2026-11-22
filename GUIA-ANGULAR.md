# Guía del código del motor

Esta guía es para que puedas leer, explicar y modificar el motor **sin ayuda**. El motor está en `motor/` (Angular 22) y el contenido de cada curso en `contenido/<curso>/` (JSON). El motor no sabe nada de Angular-el-tema: si mañana creás `contenido/docker/`, lo muestra igual.

Cada concepto de Angular tiene un comentario corto en español **la primera vez que aparece**, siguiendo el orden de lectura de abajo.

## Cómo correrlo

```powershell
cd motor
npm install
npm start
```

Abrí <http://localhost:4200>. `npm start` copia `contenido/` dentro de `motor/public/contenido`: Angular CLI solo sirve archivos que están dentro del proyecto. Mientras edites un JSON, lo vuelve a copiar solo, así que alcanza con recargar el navegador.

| Comando | Qué hace |
|---|---|
| `npm start` | Servidor de desarrollo con el contenido en vivo |
| `npm test` | Tests unitarios con Vitest (corrección de ejercicios, racha, repaso, pipe) |
| `npm run validar-contenido` | Revisa todos los cursos: índices, quizzes y que cada ejercicio **rechace el punto de partida y apruebe la solución** |
| `npm run build` | Build de producción en `dist/motor/browser` |

Cada push a `main` dispara `.github/workflows/publicar.yml`: valida, testea y publica en GitHub Pages.

## Por dónde empezar a leer

Leelo en este orden. Cada archivo usa lo que explicaron los anteriores.

1. **`src/main.ts`**: arranca la app con `bootstrapApplication`.
2. **`src/app/app.config.ts`**: providers globales (`provideHttpClient`, `provideRouter` con `withComponentInputBinding` y `withHashLocation`).
3. **`src/app/app.routes.ts`**: la tabla de rutas, `loadComponent` (lazy loading) y `canActivate`.
4. **`src/app/core/curso.guards.ts`**: guards funcionales.
5. **`src/app/core/contenido/modelos.ts`**: los tipos del JSON. Es el contrato entre el contenido y el motor. Si entendés este archivo, entendés qué puede tener un curso.
6. **`src/app/core/curso-actual.ts`**: el servicio central (`@Injectable`, `signal`, `httpResource`, `linkedSignal`, `computed`, `effect`).
7. **`src/app/core/progreso/progreso.ts`** y **`calculos.ts`**: XP, racha, desbloqueo y repaso espaciado. La lógica pura vive en `calculos.ts`, que tiene tests.
8. **`src/app/app.ts`** + **`app.html`**: el componente raíz (`@Component`, `imports`, `host`, `@if`, interpolación, `(click)`, `routerLink`, `<router-outlet>`).
9. **`src/app/shared/`**: componentes chicos y reutilizables (`input()`, `@for` con `track`, `@switch`, pipe propio, `DomSanitizer`).
10. **`src/app/mapa/`**: el recorrido como línea de subte (`rxResource`, `@let`).
11. **`src/app/leccion/leccion-page.ts`**: la pantalla más importante (ver el flujo abajo).
12. **`src/app/ejercicios/`**: un componente por tipo de ejercicio, más `validacion.ts`, la corrección (funciones puras, testeadas). Acá aparecen `model()`, `output()` y `viewChild()`.
13. **`src/app/repaso/repaso-page.ts`**: RxJS conectado con signals (`toObservable`, `switchMap`, `toSignal`).

## Cómo fluye una lección desde los datos hasta la pantalla

Ejemplo: abrís `#/angular/leccion/signals`.

1. **URL → router.** Con `withHashLocation()`, el router lee lo que va después del `#`. Coincide con `:cursoId` → `leccion/:leccionId` en `app.routes.ts`.
2. **Guards, de padre a hijo.** `seleccionarCursoGuard` guarda `"angular"` en `CursoActual.cursoId` (un `signal`). Después `cursoElegidoGuard` verifica que ya hayas elegido un recorrido. Si no, redirige a `empezar`.
3. **Carga del curso.** En `CursoActual`, `httpResource` depende de `cursoId()`. Al cambiar, pide `contenido/angular/curso.json`. Con eso se calculan `version()` (el recorrido elegido) y `ordenLecciones()` con `computed`.
4. **Lazy loading.** El router descarga el chunk de `LeccionPage` (`loadComponent`).
5. **Parámetros como inputs.** Con `withComponentInputBinding()`, `:cursoId` y `:leccionId` llegan como `input.required<string>()` del componente.
6. **Carga de la lección.** `LeccionPage` tiene un `httpResource` cuya URL depende de esos inputs: pide `contenido/angular/lecciones/signals.json`.
7. **Adaptación a la versión.** `aplicarVariante()` (en `contenido-cursos.ts`) aplica los reemplazos de `variantes.principiantes` y saca los bloques con `soloVersiones` que no corresponden. Es un `computed`, así que se recalcula si cambiás de recorrido.
8. **Estado del recorrido.** `paso`, `ejercicioHecho`, etc. son `linkedSignal` que vuelven a cero si cambia `leccionId`.
9. **Render.** `leccion-page.html` usa `@switch` sobre el paso actual:
   - **Aprender**: `<app-bloques>` dibuja la explicación. Cada bloque pasa por el pipe `textoMd`, que escapa el HTML antes de dar formato.
   - **Ver**: `<app-video-youtube>` (no carga YouTube hasta que tocás el botón) y los enlaces a la documentación.
   - **Practicar**: según `ejercicio.tipo`, `<app-completar-codigo>`, `<app-ordenar-lineas>` o `<app-practica-proyecto>`.
   - **Quiz**: `<app-pregunta>` por cada pregunta.
10. **Corrección.** El ejercicio llama a `validarHuecos`, `validarOrden` o `verificarArchivos` (`validacion.ts`). Si falla, suma un fallo y `pistasTrasFallo` revela la próxima pista. Si aprueba, emite `resuelto` con `output()`.
11. **Progreso.** `LeccionPage` llama a `Progreso.completarLeccion()`. Eso hace `update` del signal `estado` y un `effect` lo guarda en `localStorage`. El encabezado (XP, racha) y el mapa leen esos signals y se actualizan solos.

## Dónde está cada concepto de Angular

| Concepto | Primer lugar donde aparece explicado |
|---|---|
| `bootstrapApplication` | `main.ts` |
| `ApplicationConfig`, providers | `app.config.ts` |
| Rutas, `loadComponent`, `canActivate` | `app.routes.ts` |
| Guard funcional, `inject()` en funciones | `core/curso.guards.ts` |
| `@Injectable`, `providedIn: 'root'` | `core/curso-actual.ts` |
| `signal`, `computed`, `effect`, `linkedSignal`, `httpResource` | `core/curso-actual.ts` |
| `inject()` en clases | `core/progreso/progreso.ts` |
| `@Component`, `imports`, `host`, `protected` | `app.ts` |
| Interpolación, `@if`, `(click)`, `routerLink`, `<router-outlet>` | `app.html` |
| `input()` / `input.required()` | `shared/bloques/bloques.ts` |
| `@for` + `track`, `@switch`, `[innerHTML]` | `shared/bloques/bloques.html` |
| `@Pipe` | `shared/texto-md.pipe.ts` |
| `DomSanitizer` | `shared/video-youtube/video-youtube.ts` |
| `model()`, `output()` | `ejercicios/pistas/pistas.ts` |
| `viewChild()`, `import()` dinámico | `ejercicios/practica-proyecto/practica-proyecto.ts` |
| `@let` | `quiz/pregunta/pregunta.html` |
| `HttpClient`, `forkJoin`, `catchError`, `shareReplay` | `core/contenido/contenido-cursos.ts` |
| `rxResource` | `mapa/titulos-lecciones.ts` |
| `toObservable`, `switchMap`, `toSignal` | `repaso/repaso-page.ts` |

## Crear un curso nuevo (Docker, Java, SQL…)

1. Agregá el curso a `contenido/cursos.json`.
2. Creá `contenido/<id>/curso.json` con la misma forma que el de Angular (`versiones`, `instalacion`, `proyectoFinal`, `referencia`).
3. Escribí las lecciones en `contenido/<id>/lecciones/<leccion>.json`.
4. Si vas a usar ejercicios de `tipo: "proyecto"`, creá `contenido/<id>/plantilla-proyecto/` con los archivos base. El script de copia la empaqueta sola.
5. Corré `npm run validar-contenido` hasta que diga `Contenido OK.`

> Elegí un `color` de curso con buen contraste sobre blanco (al menos 4.5:1). En modo oscuro el motor lo aclara solo.

## 5 ejercicios para modificar el motor (de menor a mayor dificultad)

Hacelos en una rama (`git switch -c ejercicio-1`), con `npm start` corriendo. Al final de cada uno, corré `npm test` y `npm run validar-contenido`.

### 1. Mostrar la dificultad de cada lección (fácil)

Agregá un campo opcional `dificultad: 'baja' | 'media' | 'alta'` a las lecciones y mostralo en el encabezado de la lección, al lado de los minutos.

- **Archivos:** `modelos.ts` (interface `Leccion`), `leccion-page.html`, y un par de JSON de lecciones.
- **Practicás:** interfaces, `@if`, interpolación.
- **Lo lograste si:** las lecciones con dificultad la muestran y las que no la tienen siguen igual (sin "undefined" en pantalla).

### 2. Un pipe para la duración total (fácil-media)

Creá un pipe `duracion` que convierta minutos en texto: `75 | duracion` → `"1 h 15 min"` y `40 | duracion` → `"40 min"`. Usalo en el mapa para mostrar cuánto dura cada nivel (la suma de sus lecciones).

- **Archivos:** `ng g pipe shared/duracion`, `mapa-page.ts` (un `computed` con la suma) y `mapa-page.html`.
- **Practicás:** `@Pipe`, `computed`, y un test con Vitest para el pipe (`duracion.spec.ts`, como `texto-md.pipe.spec.ts`).
- **Lo lograste si:** cada nivel muestra su duración y el test cubre 0, 40, 60 y 75 minutos.

### 3. Un tipo de bloque nuevo: imagen con epígrafe (media)

Agregá el bloque `{ "tipo": "imagen", "src": "…", "alt": "…", "epigrafe": "…" }` para poner diagramas en las explicaciones.

- **Archivos:** `modelos.ts` (agregalo a la unión `Bloque`), `bloques.html` (un `@case ('imagen')`) y `scripts/validar-contenido.mjs`, para que acepte el tipo nuevo y **falle si falta `alt`**.
- **Practicás:** uniones discriminadas de TypeScript, `@switch`, property binding (`[src]`, `[alt]`).
- **Lo lograste si:** una lección con una imagen la muestra, y un bloque de imagen sin `alt` hace fallar `validar-contenido`.

### 4. Un tipo de pregunta nuevo: "encontrá la línea con el error" (media-alta)

Un ejercicio nuevo, `tipo: "linea-con-error"`. Se muestra un fragmento de código y la persona toca la línea que tiene el bug.

```json
{ "tipo": "linea-con-error", "enunciado": "…", "lenguaje": "typescript",
  "lineas": ["…", "…"], "lineaIncorrecta": 2, "pistas": ["…", "…"] }
```

- **Archivos:**
  - `modelos.ts`: nueva interface y sumarla a la unión `Ejercicio`.
  - `validacion.ts`: `validarLinea()`, con su test en `validacion.spec.ts`.
  - Un componente nuevo `ejercicios/linea-con-error/` con `input()`, `output<ResultadoEjercicio>()` y `<app-pistas>`. Copiá la estructura de `ordenar-lineas`.
  - Un `@case` en `leccion-page.html`.
  - Una rama más en `validarEjercicio()` de `scripts/validar-contenido.mjs`.
- **Practicás:** todo el circuito de un ejercicio: modelo → validación pura → componente → integración → validación de contenido.
- **Lo lograste si:**
  - una lección con este ejercicio se puede resolver;
  - tocar una línea incorrecta revela la pista 1;
  - un test asegura que una línea incorrecta nunca se aprueba;
  - `validar-contenido` falla si `lineaIncorrecta` está fuera de rango.
- **Cuidá la accesibilidad:** cada línea es un `<button>`, no un `<div>` con `(click)`, así funciona con teclado.

### 5. Exportar e importar el progreso (alta)

El progreso vive en el `localStorage` de un solo navegador. Agregá en el mapa dos acciones: **Exportar progreso**, que descarga un `.json`, e **Importar progreso**, que lo carga desde un archivo y lo valida.

- **Archivos:**
  - `progreso.ts`: métodos `exportar()` e `importar(json: unknown)`.
  - `calculos.ts`: una función pura `esEstadoProgresoValido(x: unknown): x is EstadoProgreso`, con tests.
  - `mapa-page.html`: un `<input type="file">` y un botón.
- **Practicás:** servicios con signals, type guards de TypeScript, manejo de archivos con `FileReader` o `file.text()`, y mensajes de error útiles.
- **Lo lograste si:**
  - exportás en un navegador, importás en otro (o en una ventana de incógnito) y ves el mismo XP, racha y lecciones;
  - un archivo inválido muestra un mensaje claro y **no** borra el progreso actual;
  - los tests de `esEstadoProgresoValido` cubren un JSON correcto, uno con `xp` como texto y uno vacío.
- **Extra:** pedí confirmación antes de reemplazar un progreso que ya tiene lecciones completadas.
