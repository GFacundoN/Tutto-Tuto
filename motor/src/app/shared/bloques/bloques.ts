import { Component, input } from '@angular/core';
import { Bloque } from '../../core/contenido/modelos';
import { TextoMdPipe } from '../texto-md.pipe';
import { CodigoCopiable } from '../codigo-copiable/codigo-copiable';

const TITULO_NOTA: Record<string, string> = {
  version: 'Cambió entre versiones',
  'error-comun': 'Error común',
  comparacion: 'Si venís de React',
  dato: 'Para tener en cuenta',
};

/** Dibuja una lista de bloques de contenido (texto, código, notas, listas, comandos). */
@Component({
  selector: 'app-bloques',
  imports: [TextoMdPipe, CodigoCopiable],
  templateUrl: './bloques.html',
  styleUrl: './bloques.css',
})
export class Bloques {
  // input(): una propiedad que recibe datos del componente padre: <app-bloques [bloques]="…" />.
  // .required = es obligatorio pasarla (error de compilación si falta).
  // En código viejo vas a ver el decorador @Input() en su lugar.
  readonly bloques = input.required<Bloque[]>();
  protected readonly tituloNota = TITULO_NOTA;
}
