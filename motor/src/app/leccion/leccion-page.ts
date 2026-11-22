import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { aplicarVariante, urlLeccion } from '../core/contenido/contenido-cursos';
import { Leccion } from '../core/contenido/modelos';
import { CursoActual } from '../core/curso-actual';
import { estaDesbloqueada } from '../core/progreso/calculos';
import { Progreso, XP } from '../core/progreso/progreso';
import { CompletarCodigo } from '../ejercicios/completar-codigo/completar-codigo';
import { OrdenarLineas } from '../ejercicios/ordenar-lineas/ordenar-lineas';
import { PracticaProyecto } from '../ejercicios/practica-proyecto/practica-proyecto';
import { ResultadoEjercicio } from '../ejercicios/resultado';
import { Pregunta } from '../quiz/pregunta/pregunta';
import { Bloques } from '../shared/bloques/bloques';
import { VideoYoutube } from '../shared/video-youtube/video-youtube';
import { TitulosLecciones } from '../core/contenido/titulos-lecciones';

/** Los pasos de toda lección, en orden. */
export const PASOS = [
  { id: 'aprender', titulo: 'Lectura' },
  { id: 'ver', titulo: 'Video' },
  { id: 'practicar', titulo: 'Práctica' },
  { id: 'quiz', titulo: 'Quiz' },
] as const;

@Component({
  selector: 'app-leccion-page',
  imports: [RouterLink, Bloques, VideoYoutube, CompletarCodigo, OrdenarLineas, PracticaProyecto, Pregunta],
  templateUrl: './leccion-page.html',
  styleUrl: './leccion-page.css',
})
export class LeccionPage {
  // Llegan desde la URL gracias a withComponentInputBinding() (ver app.config.ts).
  readonly cursoId = input.required<string>();
  readonly leccionId = input.required<string>();

  protected readonly cursoActual = inject(CursoActual);
  private readonly progreso = inject(Progreso);
  protected readonly pasos = PASOS;

  private readonly recurso = httpResource<Leccion>(() => urlLeccion(this.cursoId(), this.leccionId()));

  /** La lección con los reemplazos de la versión elegida ya aplicados. */
  protected readonly leccion = computed(() => {
    // hasValue() evita leer value() cuando el pedido falló (leerlo en error tira excepción).
    if (!this.recurso.hasValue()) return undefined;
    return aplicarVariante(this.recurso.value(), this.cursoActual.preferencias()?.versionId);
  });
  protected readonly cargando = this.recurso.isLoading;
  protected readonly error = this.recurso.error;

  /** Archivos base para los ejercicios de proyecto (solo se piden si hacen falta). */
  private readonly plantilla = httpResource<Record<string, string>>(() => {
    const ruta = this.cursoActual.datos()?.plantillaProyecto;
    return ruta && this.leccion()?.ejercicio.tipo === 'proyecto' ? `contenido/${this.cursoId()}/${ruta}` : undefined;
  });
  protected readonly archivosPlantilla = computed(() => (this.plantilla.hasValue() ? this.plantilla.value() : {}));

  protected readonly camino = computed(() => this.cursoActual.preferencias()?.camino ?? 'navegador');

  private readonly orden = this.cursoActual.ordenLecciones;
  protected readonly posicion = computed(() => this.orden().indexOf(this.leccionId()));
  protected readonly desbloqueada = computed(() =>
    estaDesbloqueada(this.orden(), this.leccionId(), this.progreso.completadas()),
  );
  protected readonly yaCompletada = computed(() => this.progreso.completadas().has(this.leccionId()));
  protected readonly siguiente = computed(() => this.orden()[this.posicion() + 1] ?? null);

  /** Módulo (nivel) que contiene esta lección, con el estado de cada lección para la barra lateral. */
  private readonly titulos = inject(TitulosLecciones).titulos;
  protected readonly modulo = computed(() => {
    const niveles = this.cursoActual.version()?.niveles ?? [];
    const indice = niveles.findIndex((n) => n.lecciones.includes(this.leccionId()));
    if (indice === -1) return null;
    const hechas = this.progreso.completadas();
    const lecciones = niveles[indice].lecciones.map((id) => ({
      id,
      titulo: this.titulos()[id]?.titulo ?? id,
      minutos: this.titulos()[id]?.minutos,
      hecha: hechas.has(id),
      disponible: hechas.has(id) || estaDesbloqueada(this.orden(), id, hechas),
    }));
    return { numero: indice + 1, titulo: niveles[indice].titulo, lecciones };
  });
  /** En celular la lista del módulo arranca cerrada para que la lección quede arriba. */
  protected readonly pantallaAncha = matchMedia('(min-width: 960px)').matches;
  protected readonly numeroEnModulo = computed(
    () => (this.modulo()?.lecciones.findIndex((l) => l.id === this.leccionId()) ?? -1) + 1,
  );

  // Estado del recorrido por la lección. linkedSignal: vuelve a 0 al cambiar de lección.
  protected readonly paso = linkedSignal({ source: this.leccionId, computation: () => 0 });
  protected readonly terminada = linkedSignal({ source: this.leccionId, computation: () => false });
  protected readonly ejercicioHecho = linkedSignal({ source: this.leccionId, computation: () => false });
  protected readonly preguntaActual = linkedSignal({ source: this.leccionId, computation: () => 0 });
  protected readonly preguntaRespondida = linkedSignal({ source: this.leccionId, computation: () => false });
  protected readonly aciertos = linkedSignal({ source: this.leccionId, computation: () => 0 });
  protected readonly xpGanada = linkedSignal({ source: this.leccionId, computation: () => 0 });

  protected readonly puedeAvanzar = computed(() => {
    switch (PASOS[this.paso()].id) {
      case 'practicar':
        return this.ejercicioHecho();
      case 'quiz':
        return this.preguntaRespondida();
      default:
        return true;
    }
  });

  protected irAPaso(indice: number): void {
    this.paso.set(indice);
    // Mover el foco al título del paso para que teclado y lectores de pantalla sigan el cambio.
    queueMicrotask(() => document.getElementById('titulo-paso')?.focus());
  }

  protected alResolverEjercicio(resultado: ResultadoEjercicio): void {
    this.ejercicioHecho.set(true);
    if (resultado.sinAyuda && !this.yaCompletada()) this.sumar(XP.ejercicioSinPistas);
  }

  protected alResponder(correcta: boolean): void {
    this.preguntaRespondida.set(true);
    if (correcta) {
      this.aciertos.update((a) => a + 1);
      if (!this.yaCompletada()) this.sumar(XP.respuestaQuiz);
    }
  }

  protected avanzar(): void {
    const leccion = this.leccion();
    if (!leccion) return;
    if (PASOS[this.paso()].id === 'quiz' && this.preguntaActual() < leccion.quiz.length - 1) {
      this.preguntaActual.update((p) => p + 1);
      this.preguntaRespondida.set(false);
      return;
    }
    if (this.paso() < PASOS.length - 1) {
      this.irAPaso(this.paso() + 1);
      return;
    }
    if (!this.yaCompletada()) {
      this.progreso.completarLeccion(leccion.id);
      this.xpGanada.update((x) => x + XP.leccion);
    }
    this.terminada.set(true);
    queueMicrotask(() => document.getElementById('titulo-fin')?.focus());
  }

  private sumar(xp: number): void {
    this.progreso.sumarXp(xp);
    this.xpGanada.update((x) => x + xp);
  }
}
