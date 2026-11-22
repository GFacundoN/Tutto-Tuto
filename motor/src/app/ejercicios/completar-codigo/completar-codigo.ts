import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { EjercicioCompletar } from '../../core/contenido/modelos';
import { Pistas } from '../pistas/pistas';
import { pistasTrasFallo, ResultadoEjercicio } from '../resultado';
import { validarHuecos } from '../validacion';

type Segmento = { tipo: 'texto'; texto: string } | { tipo: 'hueco'; indice: number };

/** Código con huecos para completar. Cada hueco se corrige por separado. */
@Component({
  selector: 'app-completar-codigo',
  imports: [Pistas],
  templateUrl: './completar-codigo.html',
  styleUrl: '../ejercicio.css',
})
export class CompletarCodigo {
  readonly ejercicio = input.required<EjercicioCompletar>();
  readonly resuelto = output<ResultadoEjercicio>();

  /** Parte la plantilla en texto fijo y huecos {{n}}. */
  protected readonly segmentos = computed<Segmento[]>(() =>
    this.ejercicio()
      .plantilla.split(/(\{\{\d+\}\})/)
      .filter((parte) => parte !== '')
      .map((parte) => {
        const m = parte.match(/^\{\{(\d+)\}\}$/);
        return m ? { tipo: 'hueco', indice: Number(m[1]) } : { tipo: 'texto', texto: parte };
      }),
  );

  // Si cambia el ejercicio (otra lección), las respuestas se vacían solas.
  protected readonly respuestas = linkedSignal(() => this.ejercicio().huecos.map(() => ''));
  /** Resultado por hueco: true/false después de comprobar, null si se editó desde entonces. */
  protected readonly correccion = signal<(boolean | null)[] | null>(null);
  protected readonly fallos = signal(0);
  protected readonly reveladas = signal(0);
  protected readonly completo = signal(false);
  private usoAyuda = false;

  protected escribir(indice: number, valor: string): void {
    this.respuestas.update((r) => r.map((x, i) => (i === indice ? valor : x)));
    // Al editar, se borra la marca de ese hueco para no mostrar un error viejo.
    this.correccion.update((c) => c && c.map((ok, i) => (i === indice ? null : ok)));
  }

  protected comprobar(): void {
    const resultado = validarHuecos(this.ejercicio().huecos, this.respuestas());
    this.correccion.set(resultado);
    if (resultado.every(Boolean)) {
      this.terminar();
    } else {
      this.fallos.update((f) => f + 1);
      this.reveladas.set(pistasTrasFallo(this.reveladas(), this.fallos(), this.ejercicio().pistas.length));
    }
  }

  protected mostrarSolucion(): void {
    this.usoAyuda = true;
    this.respuestas.set(this.ejercicio().huecos.map((h) => h.respuestas[0]));
    this.correccion.set(this.ejercicio().huecos.map(() => true));
    this.terminar();
  }

  private terminar(): void {
    if (this.completo()) return;
    this.completo.set(true);
    this.resuelto.emit({ sinAyuda: !this.usoAyuda && this.reveladas() === 0 });
  }
}
