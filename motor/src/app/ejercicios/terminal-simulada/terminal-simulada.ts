import { afterNextRender, Component, ElementRef, inject, Injector, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { EjercicioTerminal } from '../../core/contenido/modelos';
import { TextoMdPipe } from '../../shared/texto-md.pipe';
import { Pistas } from '../pistas/pistas';
import { pistasTrasFallo, ResultadoEjercicio } from '../resultado';
import { MotivoComando, validarComando } from '../validacion';

/** Un paso ya resuelto, tal como quedó en la "terminal". */
interface Linea {
  comando: string;
  salida?: string;
}

/** Qué se le dice a la persona según por qué no se aceptó el comando. */
const MENSAJES: Record<MotivoComando, string> = {
  vacio: 'Escribí un comando y apretá Enter.',
  programa: 'Este paso se resuelve con otro programa. Fijate con qué palabra empieza el comando.',
  'compose-viejo': 'docker-compose (con guion) es la versión vieja. Hoy se escribe docker compose, con espacio.',
  subcomando: 'Ese comando no hace lo que pide la consigna. Revisá el subcomando (run, ps, logs…).',
  opciones: 'Vas bien con el comando, pero faltan, sobran o cambian opciones (lo que empieza con - o --).',
  argumentos: 'Las opciones están bien. Revisá el nombre de la imagen, del contenedor o la ruta.',
};

/**
 * Ejercicio "terminal": una consola simulada donde se escriben comandos paso a paso.
 * Nada se ejecuta de verdad: validarComando() entiende el comando y lo compara con las
 * soluciones aceptando variantes equivalentes. Al acertar se muestra la salida simulada.
 */
@Component({
  selector: 'app-terminal-simulada',
  imports: [Pistas, TextoMdPipe],
  templateUrl: './terminal-simulada.html',
  styleUrls: ['../ejercicio.css', './terminal-simulada.css'],
})
export class TerminalSimulada {
  readonly ejercicio = input.required<EjercicioTerminal>();
  readonly resuelto = output<ResultadoEjercicio>();

  // linkedSignal: se reinicia solo si cambia el ejercicio (al pasar a otra lección).
  protected readonly historial = linkedSignal<EjercicioTerminal, Linea[]>({ source: this.ejercicio, computation: () => [] });
  protected readonly escrito = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly fallos = signal(0);
  protected readonly reveladas = signal(0);
  protected readonly completo = signal(false);
  private usoAyuda = false;

  // viewChild: referencia a un elemento del template (#entrada) para devolverle el foco.
  private readonly entrada = viewChild<ElementRef<HTMLInputElement>>('entrada');
  private readonly injector = inject(Injector);

  /** Índice del paso que falta resolver. */
  protected pasoActual(): number {
    return this.historial().length;
  }

  protected escribir(valor: string): void {
    this.escrito.set(valor);
    this.error.set(null);
  }

  protected enviar(): void {
    const paso = this.ejercicio().pasos[this.pasoActual()];
    if (!paso) return;
    const resultado = validarComando(paso.soluciones, this.escrito());
    if (resultado.ok) {
      // Se muestra sin el prompt que haya pegado la persona ("$ docker…" → "docker…").
      const comando = this.escrito().trim().replace(/^(?:PS [^>]*>|[$>#])\s*/, '');
      this.historial.update((h) => [...h, { comando, salida: paso.salida }]);
      this.escrito.set('');
      // [value] solo escribe en el input cuando cambia el valor enlazado: si se tipeó y se apretó Enter
      // antes de que Angular volviera a dibujar, el enlace "ya valía" '' y no lo limpiaría. Lo vaciamos directo.
      const input = this.entrada()?.nativeElement;
      if (input) input.value = '';
      this.error.set(null);
      if (this.pasoActual() === this.ejercicio().pasos.length) this.terminar();
      else this.enfocar();
    } else {
      this.error.set(MENSAJES[resultado.motivo]);
      this.fallos.update((f) => f + 1);
      this.reveladas.set(pistasTrasFallo(this.reveladas(), this.fallos(), this.ejercicio().pistas.length));
    }
  }

  protected mostrarSolucion(): void {
    this.usoAyuda = true;
    this.historial.set(this.ejercicio().pasos.map((p) => ({ comando: p.soluciones[0], salida: p.salida })));
    this.error.set(null);
    this.terminar();
  }

  /** Clic en cualquier parte de la terminal: el foco va a la línea de comando, como en una real. */
  protected enfocar(): void {
    // afterNextRender: espera a que Angular dibuje el cambio (el input nuevo) antes de enfocarlo.
    afterNextRender(() => this.entrada()?.nativeElement.focus(), { injector: this.injector });
  }

  private terminar(): void {
    if (this.completo()) return;
    this.completo.set(true);
    this.resuelto.emit({ sinAyuda: !this.usoAyuda && this.reveladas() === 0 });
  }
}
