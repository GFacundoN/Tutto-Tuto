// Escena 3D del home, con Three.js puro (sin Angular). Este archivo se importa con import()
// dinámico desde el componente: así Three.js queda en un chunk aparte que solo se descarga
// en el home, después de dibujar la página, y no frena la carga inicial.
import {
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Lo que la escena necesita saber de cada curso (un bloque por curso). */
export interface BloqueCurso {
  id: string;
  titulo: string;
  /** URL del logo (SVG). Sin logo, la cara muestra el nombre. */
  logo?: string;
  disponible: boolean;
}

/** Colores del tema del sitio (se leen de las variables CSS): los cubos no usan el color de cada curso. */
export interface Paleta {
  /** Cubos de cursos disponibles. */
  cubo: string;
  /** Cubos de cursos en preparación. */
  apagado: string;
  /** Nombre escrito en las caras de los cursos sin logo. */
  texto: string;
}

export interface OpcionesEscena {
  canvas: HTMLCanvasElement;
  bloques: BloqueCurso[];
  paleta: Paleta;
  movimientoReducido: boolean;
  /** Se llama con el bloque bajo el puntero (o null) y su posición en pantalla, para la etiqueta. */
  alResaltar: (bloque: BloqueCurso | null, x: number, y: number) => void;
  alElegir: (bloque: BloqueCurso) => void;
}

/** Interfaz mínima que usa el componente: arrancar/parar el dibujo y liberar la GPU. */
export interface EscenaHero {
  /** Cambia los colores (por ejemplo, al pasar de tema oscuro a claro). */
  cambiarPaleta(paleta: Paleta): void;
  reanudar(): void;
  pausar(): void;
  destruir(): void;
}

/**
 * Posiciones de los bloques: abajo una fila de tres y arriba dos, como una pila de cubos.
 * Los primeros cursos de la lista (los disponibles) van arriba, al frente y un poco más grandes.
 */
const LUGARES: [number, number, number][] = [
  [-0.58, 0.52, 0.25],
  [0.6, 0.55, -0.05],
  [-1.18, -0.6, -0.15],
  [0, -0.6, 0.2],
  [1.18, -0.6, -0.1],
];

export function crearEscena(op: OpcionesEscena): EscenaHero {
  const renderer = new WebGLRenderer({ canvas: op.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  // Más de 2x de densidad no se nota y multiplica el trabajo de la GPU.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const escena = new Scene();
  // Iluminación de "estudio" generada por código (no se descarga ningún archivo HDR).
  const pmrem = new PMREMGenerator(renderer);
  const ambiente = new RoomEnvironment();
  escena.environment = pmrem.fromScene(ambiente, 0.04).texture;
  ambiente.dispose();

  const camara = new PerspectiveCamera(32, 1, 0.1, 50);
  camara.position.set(0, 0.25, 6.4);

  const pila = new Group();
  pila.rotation.set(0.32, -0.55, 0);
  escena.add(pila);

  const geometria = new RoundedBoxGeometry(1, 1, 1, 6, 0.16);
  const geometriaCara = new PlaneGeometry(0.62, 0.62);
  const piezas: { malla: Mesh; base: Vector3; escala: number; desfase: number; bloque: BloqueCurso; foco: number }[] = [];

  op.bloques.slice(0, LUGARES.length).forEach((bloque, i) => {
    // Los cursos que todavía no están quedan más apagados y mate.
    const material = new MeshPhysicalMaterial({
      color: new Color(bloque.disponible ? op.paleta.cubo : op.paleta.apagado),
      roughness: bloque.disponible ? 0.28 : 0.55,
      metalness: 0,
      clearcoat: bloque.disponible ? 1 : 0.3,
      clearcoatRoughness: 0.2,
    });
    const malla = new Mesh(geometria, material);
    const escala = bloque.disponible ? 1.08 : 0.92;
    const base = new Vector3(...LUGARES[i]);
    malla.position.copy(base);
    malla.scale.setScalar(escala);
    malla.rotation.y = (i % 2 ? 1 : -1) * 0.12;
    malla.userData['indice'] = piezas.length;

    // La cara de adelante lleva el logo (o el nombre), dibujado en un canvas 2D.
    const cara = new Mesh(geometriaCara, new MeshBasicMaterial({ map: texturaCara(bloque, op.paleta), transparent: true }));
    cara.position.z = 0.501;
    malla.add(cara);

    pila.add(malla);
    piezas.push({ malla, base, escala, desfase: i * 1.3, bloque, foco: 0 });
  });

  // ---- Interacción: arrastrar para girar, pasar el mouse para resaltar, clic para entrar ----
  const raycaster = new Raycaster();
  const puntero = new Vector2(2, 2);
  let resaltada = -1;
  let arrastrando = false;
  let movio = 0;
  let ultimoX = 0;
  let ultimoY = 0;
  let velocidadY = 0;
  let velocidadX = 0;
  // Inclinación suave hacia el puntero (parallax), sumada al giro por arrastre.
  const inclinacion = new Vector2();

  const canvas = op.canvas;
  const alBajar = (e: PointerEvent) => {
    arrastrando = true;
    movio = 0;
    ultimoX = e.clientX;
    ultimoY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const alMover = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    inclinacion.set(puntero.x, puntero.y);
    if (arrastrando) {
      const dx = e.clientX - ultimoX;
      const dy = e.clientY - ultimoY;
      movio += Math.abs(dx) + Math.abs(dy);
      velocidadY = dx * 0.008;
      velocidadX = dy * 0.004;
      pila.rotation.y += velocidadY;
      pila.rotation.x = limitar(pila.rotation.x + velocidadX, -0.2, 0.75);
      ultimoX = e.clientX;
      ultimoY = e.clientY;
    }
    pedirCuadro();
  };
  const alSoltar = (e: PointerEvent) => {
    arrastrando = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    // Un clic (casi sin movimiento) sobre un curso disponible lo abre.
    if (movio < 6 && resaltada >= 0 && piezas[resaltada].bloque.disponible) op.alElegir(piezas[resaltada].bloque);
  };
  const alSalir = () => {
    puntero.set(2, 2);
    inclinacion.set(0, 0);
    pedirCuadro();
  };
  canvas.addEventListener('pointerdown', alBajar);
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerup', alSoltar);
  canvas.addEventListener('pointerleave', alSalir);

  // ---- Tamaño: el canvas sigue al contenedor ----
  const ajustar = () => {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // En pantallas angostas alejamos la cámara para que entre toda la pila.
    camara.position.z = ancho / alto < 0.9 ? 8 : 6.4;
    camara.updateProjectionMatrix();
    pedirCuadro();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(canvas);

  // ---- Bucle de dibujo: solo corre mientras hace falta ----
  let activa = false;
  let idCuadro = 0;
  let inicio = performance.now();
  const proyectada = new Vector3();

  function pedirCuadro() {
    if (activa && !idCuadro) idCuadro = requestAnimationFrame(cuadro);
  }

  function cuadro(ahora: number) {
    idCuadro = 0;
    const t = (ahora - inicio) / 1000;

    // Inercia después de soltar; en reposo, un giro muy lento (salvo movimiento reducido).
    if (!arrastrando) {
      velocidadY *= 0.92;
      velocidadX *= 0.88;
      pila.rotation.y += velocidadY + (op.movimientoReducido ? 0 : 0.0016);
      pila.rotation.x = limitar(pila.rotation.x + velocidadX, -0.2, 0.75);
    }

    raycaster.setFromCamera(puntero, camara);
    const toque = raycaster.intersectObjects(piezas.map((p) => p.malla), false)[0];
    const nueva = toque ? (toque.object.userData['indice'] as number) : -1;
    if (nueva !== resaltada) {
      resaltada = nueva;
      canvas.style.cursor = nueva >= 0 && piezas[nueva].bloque.disponible ? 'pointer' : arrastrando ? 'grabbing' : 'grab';
    }

    let quieta = Math.abs(velocidadY) < 0.0002 && Math.abs(velocidadX) < 0.0002 && op.movimientoReducido;
    piezas.forEach((p, i) => {
      // foco va de 0 a 1 con una transición suave (lerp), sin librerías de animación.
      const objetivo = i === resaltada ? 1 : 0;
      p.foco += (objetivo - p.foco) * 0.15;
      if (Math.abs(objetivo - p.foco) > 0.001) quieta = false;
      const flotar = op.movimientoReducido ? 0 : Math.sin(t * 1.1 + p.desfase) * 0.04;
      p.malla.position.set(p.base.x, p.base.y + flotar + p.foco * 0.22, p.base.z + p.foco * 0.25);
      p.malla.scale.setScalar(p.escala * (1 + p.foco * 0.08));
    });

    // Parallax: la pila se inclina apenas hacia el puntero.
    pila.position.x += (inclinacion.x * 0.15 - pila.position.x) * 0.06;
    pila.position.y += (inclinacion.y * 0.1 - pila.position.y) * 0.06;

    renderer.render(escena, camara);

    if (resaltada >= 0) {
      const p = piezas[resaltada];
      proyectada.set(0, 0.62, 0).applyMatrix4(p.malla.matrixWorld).project(camara);
      op.alResaltar(p.bloque, ((proyectada.x + 1) / 2) * canvas.clientWidth, ((1 - proyectada.y) / 2) * canvas.clientHeight);
    } else {
      op.alResaltar(null, 0, 0);
    }

    // Con movimiento reducido y nada pendiente, dejamos de dibujar hasta el próximo evento.
    if (!quieta) pedirCuadro();
  }

  ajustar();

  return {
    cambiarPaleta(paleta: Paleta) {
      for (const p of piezas) {
        (p.malla.material as MeshPhysicalMaterial).color.set(p.bloque.disponible ? paleta.cubo : paleta.apagado);
        // Las caras con logo no cambian; las que tienen el nombre se vuelven a dibujar con el color nuevo.
        if (!p.bloque.logo) {
          const cara = p.malla.children[0] as Mesh<PlaneGeometry, MeshBasicMaterial>;
          cara.material.map?.dispose();
          cara.material.map = texturaCara(p.bloque, paleta);
        }
      }
      pedirCuadro();
    },
    reanudar() {
      if (activa) return;
      activa = true;
      inicio = performance.now() - 0;
      pedirCuadro();
    },
    pausar() {
      activa = false;
      cancelAnimationFrame(idCuadro);
      idCuadro = 0;
    },
    destruir() {
      this.pausar();
      observador.disconnect();
      canvas.removeEventListener('pointerdown', alBajar);
      canvas.removeEventListener('pointermove', alMover);
      canvas.removeEventListener('pointerup', alSoltar);
      canvas.removeEventListener('pointerleave', alSalir);
      // La GPU no libera sola: hay que descartar geometrías, materiales y texturas.
      escena.traverse((o) => {
        if (o instanceof Mesh) {
          const m = o.material as MeshBasicMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      geometria.dispose();
      geometriaCara.dispose();
      escena.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Dibuja la cara del bloque: el logo sobre una placa clara, o el nombre si no hay logo. */
function texturaCara(bloque: BloqueCurso, paleta: Paleta): CanvasTexture {
  const lado = 512;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;

  if (bloque.logo) {
    // Placa clara redondeada: así cualquier logo oficial se ve con sus colores reales.
    ctx.fillStyle = '#fffdfa';
    ctx.beginPath();
    ctx.roundRect(56, 56, lado - 112, lado - 112, 72);
    ctx.fill();
    const img = new Image();
    img.onload = () => {
      // Un SVG con solo viewBox informa un tamaño "natural" con su proporción: escalamos a la caja.
      const ancho = img.naturalWidth || 1;
      const alto = img.naturalHeight || 1;
      const max = lado * 0.58;
      const k = Math.min(max / ancho, max / alto);
      ctx.drawImage(img, (lado - ancho * k) / 2, (lado - alto * k) / 2, ancho * k, alto * k);
      textura.needsUpdate = true;
    };
    img.src = bloque.logo;
  } else {
    const palabra = bloque.titulo.split(' ')[0];
    ctx.fillStyle = paleta.texto;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let tam = 150;
    ctx.font = `800 ${tam}px Onest, system-ui, sans-serif`;
    while (ctx.measureText(palabra).width > lado * 0.78) {
      tam -= 6;
      ctx.font = `800 ${tam}px Onest, system-ui, sans-serif`;
    }
    ctx.fillText(palabra, lado / 2, lado / 2 + 6);
  }
  textura.needsUpdate = true;
  return textura;
}
