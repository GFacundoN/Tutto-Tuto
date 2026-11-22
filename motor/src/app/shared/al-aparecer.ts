import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Directiva: agrega comportamiento a un elemento existente sin crear un componente.
 * Uso: <div appAlAparecer>…</div>. Cuando el elemento entra en pantalla le agrega la
 * clase "dibujar" (una sola vez), para disparar animaciones de entrada solo cuando se ven.
 * Usa IntersectionObserver: el navegador avisa, no hay que escuchar el scroll.
 */
@Directive({
  selector: '[appAlAparecer]',
  // host en una directiva: une la clase "dibujar" del elemento al signal "visible".
  host: { '[class.dibujar]': 'visible()' },
})
export class AlAparecer {
  protected readonly visible = signal(false);

  constructor() {
    const elemento = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    // afterNextRender: corre cuando el elemento ya está en el DOM (y solo en el navegador).
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) {
        this.visible.set(true);
        return;
      }
      const observador = new IntersectionObserver(
        ([entrada]) => {
          if (entrada.isIntersecting) {
            this.visible.set(true);
            observador.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      observador.observe(elemento);
      // DestroyRef.onDestroy: limpieza al destruir la directiva (reemplaza a ngOnDestroy).
      destroyRef.onDestroy(() => observador.disconnect());
    });
  }
}
