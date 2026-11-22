import { Component, input, linkedSignal, output, signal } from '@angular/core';
import { EjercicioOrdenar } from '../../core/contenido/modelos';
import { Pistas } from '../pistas/pistas';
import { pistasTrasFallo, ResultadoEjercicio } from '../resultado';
import { mezclar, validarOrden } from '../validacion';

/**
 * Ordenar líneas con botones subir/bajar (funciona igual con mouse, dedo y teclado,
 * a diferencia del drag and drop).
 */
@Component({
  selector: 'app-ordenar-lineas',
  imports: [Pistas],
  templateUrl: './ordenar-lineas.html',
  styleUrls: ['../ejercicio.css', './ordenar-lineas.css'],
})
export class OrdenarLineas {
  readonly ejercicio = input.required<EjercicioOrdenar>();
  /** Semilla para mezclar siempre igual la misma lección. */
  readonly semilla = input('');
  readonly resuelto = output<ResultadoEjercicio>();

  protected readonly orden = linkedSignal(() => mezclar(this.ejercicio().lineas, this.semilla()));
  protected readonly incorrecto = signal(false);
  protected readonly fallos = signal(0);
  protected readonly reveladas = signal(0);
  protected readonly completo = signal(false);
  /** Para anunciar a lectores de pantalla qué se movió. */
  protected readonly anuncio = signal('');
  private usoAyuda = false;

  protected mover(indice: number, delta: -1 | 1): void {
    const destino = indice + delta;
    this.orden.update((lineas) => {
      const copia = [...lineas];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
    this.incorrecto.set(false);
    this.anuncio.set(`Línea movida a la posición ${destino + 1} de ${this.orden().length}`);
    // Mantener el foco en el mismo botón de la línea movida, para poder seguir moviéndola.
    queueMicrotask(() => document.getElementById(`linea-${destino}-${delta < 0 ? 'subir' : 'bajar'}`)?.focus());
  }

  protected comprobar(): void {
    if (validarOrden(this.ejercicio().lineas, this.orden())) {
      this.terminar();
    } else {
      this.incorrecto.set(true);
      this.fallos.update((f) => f + 1);
      this.reveladas.set(pistasTrasFallo(this.reveladas(), this.fallos(), this.ejercicio().pistas.length));
    }
  }

  protected mostrarSolucion(): void {
    this.usoAyuda = true;
    this.orden.set([...this.ejercicio().lineas]);
    this.terminar();
  }

  private terminar(): void {
    if (this.completo()) return;
    this.incorrecto.set(false);
    this.completo.set(true);
    this.resuelto.emit({ sinAyuda: !this.usoAyuda && this.reveladas() === 0 });
  }
}
