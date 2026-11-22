import { Component } from '@angular/core';

/**
 * Ilustración del home: una lección "en vivo" (editor con código que se completa,
 * corrección y XP). Es SVG inline + CSS: pesa unos pocos KB, no descarga nada
 * y solo anima transform/opacity (no provoca relayout).
 * Es decorativa: aria-hidden, el texto del home ya dice lo mismo.
 */
@Component({
  selector: 'app-ilustracion-hero',
  template: `
    <svg viewBox="0 0 420 340" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hero-brillo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="var(--acento)" stop-opacity="0.35" />
          <stop offset="1" stop-color="var(--acento)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <circle class="halo" cx="230" cy="160" r="150" fill="url(#hero-brillo)" />

      <!-- Ventana del editor -->
      <g class="entra ventana">
        <rect x="40" y="40" width="320" height="220" rx="18" class="sup" />
        <rect x="40" y="40" width="320" height="38" rx="18" class="sup-2" />
        <rect x="40" y="62" width="320" height="16" class="sup-2" />
        <circle cx="64" cy="59" r="5" class="punto" />
        <circle cx="82" cy="59" r="5" class="punto" />
        <circle cx="100" cy="59" r="5" class="punto" />
        <rect x="128" y="52" width="110" height="14" rx="7" class="pestana" />

        <!-- Líneas de código -->
        <g class="codigo">
          <rect x="64" y="100" width="54" height="10" rx="5" class="kw" />
          <rect x="124" y="100" width="120" height="10" rx="5" class="tx" />
          <rect x="84" y="124" width="40" height="10" rx="5" class="kw" />
          <rect x="130" y="124" width="70" height="10" rx="5" class="tx" />
          <!-- hueco que se completa -->
          <rect x="206" y="121" width="74" height="16" rx="5" class="hueco" />
          <rect x="212" y="124" width="62" height="10" rx="5" class="respuesta" />
          <rect x="84" y="148" width="150" height="10" rx="5" class="tx" />
          <rect x="104" y="172" width="96" height="10" rx="5" class="st" />
          <rect x="206" y="172" width="44" height="10" rx="5" class="tx" />
          <rect x="84" y="196" width="24" height="10" rx="5" class="kw" />
          <rect x="64" y="220" width="16" height="10" rx="5" class="tx" />
          <rect x="284" y="122" width="2.5" height="14" class="cursor" />
        </g>
      </g>

      <!-- Chip de corrección -->
      <g class="entra chip chip-ok">
        <rect x="250" y="230" width="140" height="44" rx="22" class="chip-fondo" />
        <circle cx="274" cy="252" r="12" class="ok-fondo" />
        <path d="M268 252.5l4 4 8-8.5" class="ok-trazo" />
        <rect x="294" y="247" width="78" height="10" rx="5" class="chip-tx" />
      </g>

      <!-- Chip de XP -->
      <g class="entra chip chip-xp">
        <rect x="8" y="196" width="104" height="44" rx="22" class="chip-fondo" />
        <text x="60" y="224" text-anchor="middle" class="xp">+15 XP</text>
      </g>

      <!-- Anillo de progreso -->
      <g class="entra chip chip-anillo">
        <circle cx="356" cy="58" r="30" class="chip-fondo" />
        <circle cx="356" cy="58" r="20" class="anillo-base" />
        <circle cx="356" cy="58" r="20" class="anillo" pathLength="100" />
      </g>
    </svg>
  `,
  styleUrl: './ilustracion-hero.css',
})
export class IlustracionHero {}
