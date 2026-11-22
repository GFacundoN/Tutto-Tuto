import { Component, signal } from '@angular/core';
import { IconoPaso, TipoPaso } from '../../shared/ilustraciones/icono-paso';

interface Paso {
  tipo: TipoPaso;
  nombre: string;
  titulo: string;
  texto: string;
}

/**
 * "Cómo es cada lección": los 4 pasos a la izquierda y, a la derecha, una ventana con cómo se
 * ve ese paso de verdad. Es un tablist accesible: clic, o flechas del teclado entre pestañas.
 * No avanza solo: el usuario decide qué mirar (la animación solo responde a su elección).
 */
@Component({
  selector: 'app-recorrido-leccion',
  imports: [IconoPaso],
  templateUrl: './recorrido-leccion.html',
  styleUrl: './recorrido-leccion.css',
})
export class RecorridoLeccion {
  protected readonly pasos: Paso[] = [
    {
      tipo: 'aprender',
      nombre: 'Lectura',
      titulo: 'Leés lo justo',
      texto: 'Una explicación corta con un ejemplo de trabajo real y el código para copiar.',
    },
    {
      tipo: 'ver',
      nombre: 'Video',
      titulo: 'Lo ves en acción',
      texto: 'Solo el tramo del video que lo explica, más el enlace a la documentación oficial.',
    },
    {
      tipo: 'practicar',
      nombre: 'Práctica',
      titulo: 'Lo hacés vos',
      texto: 'Un ejercicio que se corrige solo. Si te trabás, pedís pistas de a una.',
    },
    {
      tipo: 'quiz',
      nombre: 'Quiz',
      titulo: 'Lo confirmás',
      texto: 'Preguntas que explican por qué cada opción está bien o mal. Sumás XP y racha.',
    },
  ];

  protected readonly activo = signal(0);

  /** Flechas, Inicio y Fin mueven entre pestañas (patrón de tabs de WAI-ARIA). */
  protected alTeclear(evento: KeyboardEvent): void {
    const total = this.pasos.length;
    const destino: Record<string, number> = {
      ArrowDown: (this.activo() + 1) % total,
      ArrowRight: (this.activo() + 1) % total,
      ArrowUp: (this.activo() - 1 + total) % total,
      ArrowLeft: (this.activo() - 1 + total) % total,
      Home: 0,
      End: total - 1,
    };
    if (!(evento.key in destino)) return;
    evento.preventDefault();
    this.activo.set(destino[evento.key]);
    document.getElementById(`pestana-${destino[evento.key]}`)?.focus();
  }
}
