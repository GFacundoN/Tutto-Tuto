# Tutto-Tuto

Cursos interactivos cortos, con práctica en cada paso: lecciones de 5 a 15 minutos con explicación, video, ejercicio con corrección automática y quiz. Guarda XP, racha y progreso en el navegador.

- **`motor/`**: la app en Angular 22. Es la misma para todos los cursos.
- **`contenido/`**: los cursos en JSON, cada uno con dos recorridos: *En una semana* (para quien ya programa) y *Desde cero*.
  - `contenido/angular/`: Angular 22, del primer componente a una app que consume una API.
  - `contenido/docker/`: Docker Engine 29 y Compose v5, de `docker run` a levantar front, API y base con un comando.
  - `contenido/cursos.json`: el índice del home. Un curso con `"estado": "proximamente"` se anuncia sin contenido todavía.
- **Tipos de ejercicio**: `completar` (huecos en código), `ordenar` (líneas o pasos), `proyecto` (proyecto real en StackBlitz) y `terminal` (comandos que se corrigen sin ejecutarse, aceptando variantes equivalentes).
- **`RECURSOS.md`**: los videos y la documentación de cada curso, verificados.
- **`GUIA-ANGULAR.md`**: recorrido del código del motor y 5 ejercicios para modificarlo.

## Correrlo en tu PC

Necesitás Node.js 22.22+ o 24.15+.

```powershell
cd motor
npm install
npm start
```

Abrí <http://localhost:4200>.

## Publicación

Cada push a `main` valida el contenido, corre los tests y publica en GitHub Pages (`.github/workflows/publicar.yml`).
