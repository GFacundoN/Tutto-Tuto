import { Component, computed, ElementRef, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import type { VM } from '@stackblitz/sdk';
import { Camino } from '../../core/curso-actual';
import { EjercicioProyecto } from '../../core/contenido/modelos';
import { Bloques } from '../../shared/bloques/bloques';
import { CodigoCopiable } from '../../shared/codigo-copiable/codigo-copiable';
import { Pistas } from '../pistas/pistas';
import { pistasTrasFallo, ResultadoEjercicio } from '../resultado';
import { ResultadoVerificacion, verificarArchivos } from '../validacion';

type EstadoEditor = 'cerrado' | 'cargando' | 'listo' | 'error';

/**
 * Ejercicio sobre un proyecto Angular real.
 * - Camino navegador: StackBlitz (WebContainers) corre `ng serve` de verdad en el navegador.
 *   Para corregir, leemos los archivos del editor y corremos las verificaciones.
 * - Camino local (o si StackBlitz no carga): pegás tus archivos y se corrigen igual.
 */
@Component({
  selector: 'app-practica-proyecto',
  imports: [Pistas, Bloques, CodigoCopiable],
  templateUrl: './practica-proyecto.html',
  styleUrls: ['../ejercicio.css', './practica-proyecto.css'],
})
export class PracticaProyecto {
  readonly ejercicio = input.required<EjercicioProyecto>();
  readonly camino = input.required<Camino>();
  /** Archivos base del proyecto (package.json, angular.json, etc.). */
  readonly plantilla = input<Record<string, string>>({});
  readonly titulo = input('Ejercicio');
  readonly resuelto = output<ResultadoEjercicio>();

  // viewChild(): referencia a un elemento del template (#editor). Es un signal:
  // vale undefined hasta que el elemento existe en pantalla.
  private readonly contenedorEditor = viewChild<ElementRef<HTMLElement>>('editor');
  private vm: VM | null = null;

  protected readonly estadoEditor = signal<EstadoEditor>('cerrado');
  /** Modo "pegar archivos": siempre en el camino local, o como respaldo si StackBlitz falla. */
  protected readonly modoPegar = linkedSignal(() => this.camino() === 'local');
  protected readonly pegados = signal<Record<string, string>>({});
  protected readonly resultados = signal<ResultadoVerificacion[] | null>(null);
  protected readonly comprobando = signal(false);
  protected readonly fallos = signal(0);
  protected readonly reveladas = signal(0);
  protected readonly completo = signal(false);
  protected readonly solucionVisible = signal(false);
  private usoAyuda = false;

  /** Archivos que hay que pegar en modo local (los que se verifican). */
  protected readonly archivosAVerificar = computed(() => [
    ...new Set(this.ejercicio().verificaciones.map((v) => v.archivo)),
  ]);
  protected readonly solucion = computed(() => Object.entries(this.ejercicio().solucion));

  private proyecto() {
    return {
      title: this.titulo(),
      description: 'Ejercicio de Tutto-Tuto',
      template: 'node' as const,
      files: { ...this.plantilla(), ...this.ejercicio().archivos },
    };
  }

  protected async abrirEditor(): Promise<void> {
    const destino = this.contenedorEditor()?.nativeElement;
    if (!destino) return;
    this.estadoEditor.set('cargando');
    try {
      // import() dinámico: el SDK solo se descarga si alguien abre un ejercicio de proyecto.
      const sdk = (await import('@stackblitz/sdk')).default;
      // Si en 60 segundos no respondió, damos la alternativa en vez de esperar para siempre.
      const limite = new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), 60_000));
      this.vm = await Promise.race([
        sdk.embedProject(destino, this.proyecto(), {
          openFile: this.ejercicio().abrirArchivo,
          height: 560,
          view: 'default',
          showSidebar: false,
          terminalHeight: 30,
          startScript: 'start',
        }),
        limite,
      ]);
      this.estadoEditor.set('listo');
    } catch {
      this.estadoEditor.set('error');
    }
  }

  protected async abrirEnPestana(): Promise<void> {
    const sdk = (await import('@stackblitz/sdk')).default;
    sdk.openProject(this.proyecto(), { openFile: this.ejercicio().abrirArchivo, newWindow: true, startScript: 'start' });
    this.modoPegar.set(true);
  }

  protected pegar(archivo: string, contenido: string): void {
    this.pegados.update((p) => ({ ...p, [archivo]: contenido }));
  }

  protected async comprobar(): Promise<void> {
    this.comprobando.set(true);
    try {
      let archivos: Record<string, string> | null;
      if (this.modoPegar() || !this.vm) {
        archivos = this.pegados();
      } else {
        archivos = await this.vm.getFsSnapshot();
      }
      const resultados = verificarArchivos(this.ejercicio().verificaciones, archivos ?? {});
      this.resultados.set(resultados);
      if (resultados.every((r) => r.ok)) {
        this.terminar();
      } else {
        this.fallos.update((f) => f + 1);
        this.reveladas.set(pistasTrasFallo(this.reveladas(), this.fallos(), this.ejercicio().pistas.length));
      }
    } catch {
      this.resultados.set([
        { ok: false, mensaje: 'No pude leer los archivos del editor. Esperá a que termine de cargar y probá de nuevo.' },
      ]);
    } finally {
      this.comprobando.set(false);
    }
  }

  protected mostrarSolucion(): void {
    this.usoAyuda = true;
    this.solucionVisible.set(true);
  }

  /** Después de ver la solución, la persona confirma que la aplicó para seguir. */
  protected continuarConSolucion(): void {
    this.usoAyuda = true;
    this.terminar();
  }

  private terminar(): void {
    if (this.completo()) return;
    this.completo.set(true);
    this.resuelto.emit({ sinAyuda: !this.usoAyuda && this.reveladas() === 0 });
  }
}
