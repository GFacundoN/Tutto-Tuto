import { Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Video } from '../../core/contenido/modelos';

/**
 * Video de YouTube (dominio youtube-nocookie) recortado al tramo útil.
 * No se carga hasta que la persona toca "Ver el video": así la página es liviana
 * y no se contacta a YouTube sin una acción explícita.
 * Si el reproductor no carga, siempre queda el enlace directo como alternativa.
 */
@Component({
  selector: 'app-video-youtube',
  template: `
    <figure>
      @if (cargado()) {
        <div class="marco">
          <iframe
            [src]="urlSegura()"
            [title]="video().titulo"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>
      } @else {
        <button type="button" class="portada" (click)="cargado.set(true)">
          <img [src]="miniatura()" alt="" loading="lazy" />
          <span class="play" aria-hidden="true"></span>
          <span class="solo-lectores">Ver el video: {{ video().titulo }}</span>
        </button>
      }
      <figcaption>
        <strong>{{ video().titulo }}</strong> · {{ video().canal }} · tramo {{ tramo() }}
        @if (video().idioma === 'en') {
          <span class="idioma">En inglés (podés activar subtítulos)</span>
        }
        <br />
        <a [href]="urlDirecta()" target="_blank" rel="noopener noreferrer">
          ¿No se ve? Abrilo en YouTube<span class="solo-lectores"> (abre en otra pestaña)</span>
        </a>
      </figcaption>
    </figure>
  `,
  styleUrl: './video-youtube.css',
})
export class VideoYoutube {
  readonly video = input.required<Video>();
  protected readonly cargado = signal(false);
  // DomSanitizer: Angular bloquea URLs dinámicas en iframes por seguridad.
  // Lo marcamos como confiable SOLO porque la armamos nosotros con un id validado.
  private readonly sanitizer = inject(DomSanitizer);

  private readonly id = computed(() => {
    const id = this.video().id;
    return /^[\w-]{11}$/.test(id) ? id : '';
  });

  protected readonly urlSegura = computed(() => {
    const v = this.video();
    const url = `https://www.youtube-nocookie.com/embed/${this.id()}?start=${v.inicio}&end=${v.fin}&rel=0&autoplay=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  protected readonly urlDirecta = computed(() => `https://www.youtube.com/watch?v=${this.id()}&t=${this.video().inicio}s`);
  protected readonly miniatura = computed(() => `https://i.ytimg.com/vi/${this.id()}/hqdefault.jpg`);
  protected readonly tramo = computed(() => `${mmss(this.video().inicio)}–${mmss(this.video().fin)}`);
}

function mmss(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}
