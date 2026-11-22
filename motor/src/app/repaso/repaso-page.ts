import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { aplicarVariante, ContenidoCursos } from '../core/contenido/contenido-cursos';
import { PreguntaQuiz } from '../core/contenido/modelos';
import { CursoActual } from '../core/curso-actual';
import { elegirRepaso } from '../core/progreso/calculos';
import { Progreso } from '../core/progreso/progreso';
import { Pregunta } from '../quiz/pregunta/pregunta';

interface ItemRepaso {
  clave: string;
  leccionTitulo: string;
  pregunta: PreguntaQuiz;
}

/** Repaso espaciado: 3 preguntas de lecciones ya completadas, priorizando las que más cuestan. */
@Component({
  selector: 'app-repaso-page',
  imports: [RouterLink, Pregunta],
  templateUrl: './repaso-page.html',
  styleUrl: './repaso-page.css',
})
export class RepasoPage {
  readonly cursoId = input.required<string>();
  private readonly contenido = inject(ContenidoCursos);
  private readonly cursoActual = inject(CursoActual);
  private readonly progreso = inject(Progreso);

  /** Lecciones completadas que pertenecen al recorrido actual. */
  private readonly hechas = computed(() =>
    this.cursoActual.ordenLecciones().filter((id) => this.progreso.completadas().has(id)),
  );

  // toObservable() convierte un signal en Observable; switchMap cancela el pedido anterior
  // si cambia la lista; toSignal() vuelve a convertir el resultado en signal.
  // (toSignal además se desuscribe solo cuando se destruye el componente.)
  private readonly lecciones = toSignal(
    toObservable(this.hechas).pipe(switchMap((ids) => this.contenido.lecciones(this.cursoId(), ids))),
  );

  /** Las 3 preguntas elegidas. Se calcula una sola vez al cargar, para que no cambien mientras respondés. */
  protected readonly items = computed<ItemRepaso[] | undefined>(() => {
    const lecciones = this.lecciones();
    if (!lecciones) return undefined;
    const versionId = this.cursoActual.preferencias()?.versionId;
    const todas = new Map<string, ItemRepaso>();
    for (const l of lecciones.map((x) => aplicarVariante(x, versionId))) {
      l.quiz.forEach((pregunta, i) => todas.set(`${l.id}#${i}`, { clave: `${l.id}#${i}`, leccionTitulo: l.titulo, pregunta }));
    }
    const elegidas = elegirRepaso([...todas.keys()], this.estadoInicial);
    return elegidas.map((clave) => todas.get(clave)!);
  });
  // Foto del estado al entrar: si usáramos el estado vivo, al responder cambiarían las preguntas elegidas.
  private readonly estadoInicial = this.progreso.estado().repaso;

  protected readonly actual = signal(0);
  protected readonly respondida = signal(false);
  protected readonly aciertos = signal(0);
  protected readonly terminado = signal(false);

  protected alResponder(item: ItemRepaso, correcta: boolean): void {
    this.respondida.set(true);
    this.progreso.registrarRepaso(item.clave, correcta);
    if (correcta) this.aciertos.update((a) => a + 1);
  }

  protected siguiente(total: number): void {
    if (this.actual() < total - 1) {
      this.actual.update((a) => a + 1);
      this.respondida.set(false);
    } else {
      this.progreso.terminarRepasoDelDia();
      this.terminado.set(true);
    }
  }
}
