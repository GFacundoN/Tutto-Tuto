import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { OpcionQuiz, PreguntaQuiz } from '../../core/contenido/modelos';
import { mezclar } from '../../ejercicios/validacion';
import { CodigoCopiable } from '../../shared/codigo-copiable/codigo-copiable';
import { TextoMdPipe } from '../../shared/texto-md.pipe';

/**
 * Una pregunta de opción múltiple. Al elegir, se bloquea y muestra
 * por qué cada opción está bien o mal (no solo la elegida).
 */
@Component({
  selector: 'app-pregunta',
  imports: [TextoMdPipe, CodigoCopiable],
  templateUrl: './pregunta.html',
  styleUrl: './pregunta.css',
})
export class Pregunta {
  readonly pregunta = input.required<PreguntaQuiz>();
  readonly semilla = input('');
  /** Encabezado chico, ej. "Pregunta 2 de 3". */
  readonly contexto = input('');
  readonly respondida = output<boolean>();

  protected readonly opciones = computed(() => mezclar(this.pregunta().opciones, this.semilla() + this.pregunta().pregunta));
  // Se resetea si cambia la pregunta.
  protected readonly elegida = linkedSignal<PreguntaQuiz, OpcionQuiz | null>({
    source: this.pregunta,
    computation: () => null,
  });

  protected elegir(opcion: OpcionQuiz): void {
    if (this.elegida()) return;
    this.elegida.set(opcion);
    this.respondida.emit(opcion.correcta);
  }
}
