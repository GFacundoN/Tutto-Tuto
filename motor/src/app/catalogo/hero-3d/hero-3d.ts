import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TarjetaCurso } from '../tarjeta-curso';
import type { EscenaHero, Paleta } from './escena';

/**
 * Hero 3D: los logos oficiales de los cursos, en relieve, flotando dispersos como en una atmósfera.
 * La atmósfera gira sola muy despacio y se puede girar arrastrando. Al pasar el mouse por un logo
 * se agranda un poco y aparece su nombre; con un clic se entra al curso.
 *
 * Rendimiento:
 * - Three.js se carga con import() recién después del primer dibujo (afterNextRender), en un chunk aparte.
 * - Solo se dibuja mientras el hero está en pantalla (IntersectionObserver) y la pestaña está visible.
 * - Si el navegador no tiene WebGL, queda la ilustración en SVG de antes.
 * Accesibilidad: es decorativo (aria-hidden). Los mismos cursos, con sus enlaces, están en la lista de abajo.
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

  /** Solo los cursos que tienen logo flotan en la escena. */
  private readonly conLogo = computed(() => this.cursos().filter((c) => !!c.resumen.logo));

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly marco = viewChild.required<ElementRef<HTMLElement>>('marco');
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
      const cursos = this.conLogo();
      // Los logos y Three.js se piden en paralelo.
      const [{ crearEscena }, svgs] = await Promise.all([
        import('./escena'),
        Promise.all(cursos.map((c) => fetch(`contenido/${c.resumen.logo}`).then((r) => r.text()))),
      ]);
      if (destruido) return;

      const lienzo = this.canvas().nativeElement;
      this.escena = crearEscena({
        canvas: lienzo,
        superficie: this.marco().nativeElement,
        logos: cursos.map((c, i) => ({ svg: svgs[i], disponible: c.disponible })),
        paleta: leerPaleta(),
        movimientoReducido: matchMedia('(prefers-reduced-motion: reduce)').matches,
        alResaltar: (i, x, y) => {
          const actual = this.etiqueta();
          if (i === null) {
            if (actual) this.etiqueta.set(null);
            return;
          }
          const c = cursos[i];
          const texto = `${c.resumen.titulo} · ${c.disponible ? `${c.lecciones} lecciones` : 'próximamente'}`;
          // Solo actualizamos si cambió algo visible: evita trabajo de más en cada cuadro.
          if (!actual || actual.texto !== texto || Math.abs(actual.x - x) > 1 || Math.abs(actual.y - y) > 1) {
            this.etiqueta.set({ texto, x, y });
          }
        },
        alElegir: (i) => {
          if (cursos[i].disponible) this.router.navigate(['/', cursos[i].resumen.id]);
        },
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

      // El tema cambia con el selector (atributo data-theme en <html>) o con el sistema operativo.
      const recolorear = () => requestAnimationFrame(() => this.escena?.cambiarPaleta(leerPaleta()));
      const tema = new MutationObserver(recolorear);
      tema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      const sistema = matchMedia('(prefers-color-scheme: dark)');
      sistema.addEventListener('change', recolorear);

      destroyRef.onDestroy(() => {
        visible.disconnect();
        tema.disconnect();
        sistema.removeEventListener('change', recolorear);
        document.removeEventListener('visibilitychange', actualizar);
      });
    });
  }
}

/** Colores de la escena a partir de las variables CSS del tema (los mismos del resto de la página). */
function leerPaleta(): Paleta {
  const css = getComputedStyle(document.documentElement);
  const v = (nombre: string) => css.getPropertyValue(nombre).trim();
  return { acento: v('--acento'), apagado: v('--borde-control') };
}

function soportaWebgl(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}
