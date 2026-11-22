import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TarjetaCurso } from '../tarjeta-curso';
import type { EscenaHero, Paleta } from './escena';

/**
 * Hero 3D: un carrusel con los logos oficiales de los cursos en relieve.
 * Se gira arrastrando o con las flechas; el curso del frente se abre con un clic o con su botón.
 *
 * Rendimiento:
 * - Three.js se carga con import() recién después del primer dibujo (afterNextRender), en un chunk aparte.
 * - Solo se dibuja mientras el hero está en pantalla (IntersectionObserver) y la pestaña está visible.
 * - Si el navegador no tiene WebGL, queda la ilustración en SVG de antes.
 * Accesibilidad: el canvas es decorativo (aria-hidden); las flechas y el botón son controles reales.
 */
@Component({
  selector: 'app-hero-3d',
  imports: [RouterLink],
  templateUrl: './hero-3d.html',
  styleUrl: './hero-3d.css',
})
export class Hero3d {
  readonly cursos = input.required<TarjetaCurso[]>();

  protected readonly estado = signal<'cargando' | 'lista' | 'sin-webgl'>('cargando');
  protected readonly indice = signal(0);
  protected readonly actual = computed(() => this.conLogo()[this.indice()]);

  /** Solo los cursos que tienen logo entran al carrusel. */
  protected readonly conLogo = computed(() => this.cursos().filter((c) => !!c.resumen.logo));

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
        logos: cursos.map((c, i) => ({ svg: svgs[i], disponible: c.disponible })),
        paleta: leerPaleta(),
        movimientoReducido: matchMedia('(prefers-reduced-motion: reduce)').matches,
        alCambiar: (i) => this.indice.set(i),
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

  protected mover(delta: number): void {
    const n = this.conLogo().length;
    const destino = (this.indice() + delta + n) % n;
    this.indice.set(destino);
    this.escena?.irA(destino);
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
