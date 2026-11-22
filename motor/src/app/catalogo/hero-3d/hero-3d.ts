import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TarjetaCurso } from '../tarjeta-curso';
import type { BloqueCurso, EscenaHero } from './escena';

/**
 * Hero 3D: una pila de bloques, uno por curso, que se puede girar arrastrando.
 * Al pasar el mouse un bloque se levanta y muestra su nombre; con un clic entra al curso.
 *
 * Rendimiento:
 * - Three.js se carga con import() recién después del primer dibujo (afterNextRender), en un chunk aparte.
 * - Solo se dibuja mientras el hero está en pantalla (IntersectionObserver) y la pestaña está visible.
 * - Si el navegador no tiene WebGL, se queda la ilustración en SVG que ya estaba.
 * Accesibilidad: el canvas es decorativo (aria-hidden); los mismos cursos están en las tarjetas de abajo.
 */
@Component({
  selector: 'app-hero-3d',
  templateUrl: './hero-3d.html',
  styleUrl: './hero-3d.css',
})
export class Hero3d {
  readonly cursos = input.required<TarjetaCurso[]>();

  protected readonly estado = signal<'cargando' | 'lista' | 'sin-webgl'>('cargando');
  protected readonly etiqueta = signal<{ texto: string; x: number; y: number } | null>(null);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly router = inject(Router);
  private escena?: EscenaHero;

  constructor() {
    const destroyRef = inject(DestroyRef);
    let destruido = false;
    destroyRef.onDestroy(() => {
      destruido = true;
      this.escena?.destruir();
    });

    // afterNextRender: corre una sola vez, en el navegador, después de que Angular dibujó la vista.
    afterNextRender(async () => {
      if (!soportaWebgl()) {
        this.estado.set('sin-webgl');
        return;
      }
      const { crearEscena } = await import('./escena');
      if (destruido) return;
      const lienzo = this.canvas().nativeElement;
      const bloques: BloqueCurso[] = this.cursos().map((c) => ({
        id: c.resumen.id,
        titulo: c.resumen.titulo,
        color: c.resumen.color,
        logo: c.resumen.logo ? `contenido/${c.resumen.logo}` : undefined,
        disponible: c.disponible,
      }));
      const lecciones = new Map(this.cursos().map((c) => [c.resumen.id, c.lecciones]));

      this.escena = crearEscena({
        canvas: lienzo,
        bloques,
        movimientoReducido: matchMedia('(prefers-reduced-motion: reduce)').matches,
        alResaltar: (b, x, y) => {
          const texto = b ? `${b.titulo} · ${b.disponible ? `${lecciones.get(b.id)} lecciones` : 'próximamente'}` : null;
          // Evita re-dibujar Angular en cada cuadro si la etiqueta no cambió de forma visible.
          const actual = this.etiqueta();
          if (!texto) {
            if (actual) this.etiqueta.set(null);
          } else if (!actual || actual.texto !== texto || Math.abs(actual.x - x) > 1 || Math.abs(actual.y - y) > 1) {
            this.etiqueta.set({ texto, x, y });
          }
        },
        alElegir: (b) => this.router.navigate(['/', b.id]),
      });
      this.estado.set('lista');

      // Solo animamos mientras se ve: fuera de pantalla o con la pestaña oculta, cero trabajo.
      let enPantalla = false;
      const actualizar = () => (enPantalla && !document.hidden ? this.escena?.reanudar() : this.escena?.pausar());
      const visible = new IntersectionObserver(([e]) => {
        enPantalla = e.isIntersecting;
        actualizar();
      });
      visible.observe(lienzo);
      document.addEventListener('visibilitychange', actualizar);
      destroyRef.onDestroy(() => {
        visible.disconnect();
        document.removeEventListener('visibilitychange', actualizar);
      });
    });
  }
}

function soportaWebgl(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}
