// Escena 3D del home con Three.js puro (sin Angular): un carrusel tipo "coverflow" con los logos
// oficiales de los cursos en relieve: el del frente grande y centrado, los vecinos a los costados. Se importa con import() dinámico desde el componente, así Three.js queda en un
// chunk aparte que solo se descarga en el home y después de dibujar la página.
import {
  BufferAttribute,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type Material,
  type Shape,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

/** Lo que la escena necesita saber de cada curso: uno por logo del carrusel. */
export interface LogoCurso {
  /** Texto del SVG del logo (ya descargado por el componente). */
  svg: string;
  disponible: boolean;
}

/** Colores del tema del sitio: la luz de contorno y los cursos que todavía no están. */
export interface Paleta {
  acento: string;
  apagado: string;
}

export interface OpcionesEscena {
  canvas: HTMLCanvasElement;
  logos: LogoCurso[];
  paleta: Paleta;
  movimientoReducido: boolean;
  /** Avisa qué curso quedó al frente (por arrastre, clic o flechas). */
  alCambiar: (indice: number) => void;
  /** Clic en el logo que ya está al frente. */
  alElegir: (indice: number) => void;
}

export interface EscenaHero {
  /** Gira el carrusel hasta dejar ese curso al frente. */
  irA(indice: number): void;
  cambiarPaleta(paleta: Paleta): void;
  reanudar(): void;
  pausar(): void;
  destruir(): void;
}

/** Tamaño de cada logo (su lado más largo) y separación entre logos, en unidades de la escena. */
const TAMANO = 1.6;
const SEPARACION = 1.95;

export function crearEscena(op: OpcionesEscena): EscenaHero {
  const renderer = new WebGLRenderer({ canvas: op.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  // Más de 2x de densidad no se nota y multiplica el trabajo de la GPU.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;

  const escena = new Scene();
  // Reflejos de "estudio" generados por código: no se descarga ningún archivo HDR.
  const pmrem = new PMREMGenerator(renderer);
  const ambiente = new RoomEnvironment();
  escena.environment = pmrem.fromScene(ambiente, 0.04).texture;
  escena.environmentIntensity = 0.75;
  ambiente.dispose();

  // Luz principal arriba a la izquierda, y una de contorno con el color de acento del sitio desde atrás:
  // le da al relieve el mismo brillo índigo que los focos de luz del fondo de la página.
  const principal = new DirectionalLight('#ffffff', 1.6);
  principal.position.set(-3, 4, 5);
  const contorno = new DirectionalLight(op.paleta.acento, 3);
  contorno.position.set(2, 1.5, -4);
  escena.add(principal, contorno);

  const camara = new PerspectiveCamera(30, 1, 0.1, 50);
  camara.position.set(0, 0.6, 8.4);
  camara.lookAt(0, -0.15, 0);

  const n = op.logos.length;
  const piezas = op.logos.map((logo, i) => {
    const pieza = crearLogo(logo, op.paleta);
    pieza.userData['indice'] = i;
    escena.add(pieza);
    return pieza;
  });

  // ---- Posición: "objetivo" es el índice al que va el carrusel; "giro" es dónde está ahora ----
  // Son números con decimales (2,4 = entre el logo 2 y el 3) y no tienen tope: el carrusel da vueltas.
  let giro = 0;
  let objetivo = 0;
  let frente = 0;
  const avisarFrente = () => {
    const i = ((Math.round(giro) % n) + n) % n;
    if (i !== frente) {
      frente = i;
      op.alCambiar(i);
    }
  };
  /** Distancia del logo i al frente, entre -n/2 y n/2 (negativo = a la izquierda). */
  const distancia = (i: number) => {
    const d = (((i - giro) % n) + n) % n;
    return d > n / 2 ? d - n : d;
  };

  /** Va por el camino más corto hasta dejar el logo i al frente. */
  function irA(i: number) {
    objetivo = Math.round(giro + distancia(i));
    if (op.movimientoReducido) giro = objetivo;
    pedirCuadro();
  }

  // ---- Interacción: arrastrar gira; al soltar se acomoda en el logo más cercano; clic elige ----
  const raycaster = new Raycaster();
  const puntero = new Vector2(2, 2);
  const inclinacion = new Vector2();
  let arrastrando = false;
  let movio = 0;
  let ultimoX = 0;

  const canvas = op.canvas;
  const alBajar = (e: PointerEvent) => {
    arrastrando = true;
    movio = 0;
    ultimoX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const alMover = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    inclinacion.copy(puntero);
    if (arrastrando) {
      const dx = e.clientX - ultimoX;
      movio += Math.abs(dx);
      objetivo -= dx * 0.006;
      giro = objetivo;
      ultimoX = e.clientX;
    }
    pedirCuadro();
  };
  const alSoltar = (e: PointerEvent) => {
    if (!arrastrando) return;
    arrastrando = false;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (movio < 6) {
      // Fue un clic: si tocó un logo lo trae al frente; si ya estaba al frente, lo abre.
      raycaster.setFromCamera(puntero, camara);
      const toque = raycaster.intersectObjects(piezas, true)[0];
      if (toque) {
        let o = toque.object;
        while (o.parent && o.userData['indice'] === undefined) o = o.parent;
        const i = o.userData['indice'] as number;
        if (i === frente) op.alElegir(i);
        else irA(i);
      }
    } else {
      objetivo = Math.round(objetivo);
    }
    pedirCuadro();
  };
  const alSalir = () => {
    inclinacion.set(0, 0);
    pedirCuadro();
  };
  canvas.addEventListener('pointerdown', alBajar);
  canvas.addEventListener('pointermove', alMover);
  canvas.addEventListener('pointerup', alSoltar);
  canvas.addEventListener('pointercancel', alSoltar);
  canvas.addEventListener('pointerleave', alSalir);

  // ---- Tamaño: el canvas sigue al contenedor ----
  const ajustar = () => {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.position.z = ancho / alto < 0.9 ? 10.5 : 8.4;
    camara.updateProjectionMatrix();
    pedirCuadro();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(canvas);

  // ---- Bucle de dibujo: solo corre mientras está en pantalla ----
  let activa = false;
  let idCuadro = 0;
  const inicio = performance.now();

  function pedirCuadro() {
    if (activa && !idCuadro) idCuadro = requestAnimationFrame(cuadro);
  }

  function cuadro(ahora: number) {
    idCuadro = 0;
    const t = (ahora - inicio) / 1000;

    // ease-out: se acerca rápido al principio y se frena al llegar, sin librerías de animación.
    if (!arrastrando) giro += (objetivo - giro) * 0.12;
    avisarFrente();

    piezas.forEach((pieza, i) => {
      const d = distancia(i);
      const lejos = Math.abs(d);
      // Los que se alejan del centro van hacia atrás, se achican y giran mirando un poco al centro.
      pieza.visible = lejos < 2.3;
      pieza.position.set(d * SEPARACION, op.movimientoReducido ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.06, -lejos * 1.2);
      pieza.scale.setScalar(Math.max(0, 1 - lejos * 0.3));
      const balanceo = op.movimientoReducido ? 0 : Math.sin(t * 0.8 + i) * 0.12;
      // El del frente además se inclina hacia el puntero.
      const alFrente = Math.max(0, 1 - lejos);
      pieza.rotation.y = -d * 0.55 + balanceo + inclinacion.x * 0.35 * alFrente;
      pieza.rotation.x = -inclinacion.y * 0.2 * alFrente;
    });

    renderer.render(escena, camara);

    // Con movimiento reducido, cuando el carrusel llegó a destino deja de dibujar hasta el próximo evento.
    const quieto = Math.abs(objetivo - giro) < 0.0005 && !arrastrando;
    if (!(op.movimientoReducido && quieto)) pedirCuadro();
  }

  ajustar();

  return {
    irA,
    cambiarPaleta(paleta: Paleta) {
      contorno.color.set(paleta.acento);
      piezas.forEach((pieza, i) => {
        if (op.logos[i].disponible) return;
        pieza.traverse((o) => {
          if (o instanceof Mesh) (o.material as MeshPhysicalMaterial).color.set(paleta.apagado);
        });
      });
      pedirCuadro();
    },
    reanudar() {
      if (activa) return;
      activa = true;
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
      canvas.removeEventListener('pointercancel', alSoltar);
      canvas.removeEventListener('pointerleave', alSalir);
      // La GPU no libera sola: hay que descartar geometrías y materiales.
      escena.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (o.material as Material).dispose();
        }
      });
      escena.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

interface Degrade {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  paradas: { offset: number; color: Color }[];
  /** Si algún tramo es transparente, es un brillo dibujado encima del logo. */
  transparente: boolean;
}

/**
 * Convierte el SVG de un logo en un objeto 3D: cada trazo se extruye (se le da profundidad) con un
 * borde redondeado (bevel). Respeta los colores del SVG, incluidos los degradés como el de Angular.
 */
function crearLogo(logo: LogoCurso, paleta: Paleta): Group {
  const datos = new SVGLoader().parse(logo.svg);
  const degrades = leerDegrades(datos.xml as unknown as Document);

  // 1) Los trazos con relleno, como formas 2D.
  const trazos: { formas: Shape[]; color: string; degrade?: Degrade }[] = [];
  for (const trazo of datos.paths) {
    const relleno = (trazo.userData?.['style'] as { fill?: string } | undefined)?.fill ?? '#000';
    if (relleno === 'none') continue;
    const id = relleno.match(/url\(#(.+)\)/)?.[1];
    const degrade = id ? degrades.get(id) : undefined;
    // El brillo semitransparente de encima lo reemplaza la luz de la escena.
    if (id && (!degrade || degrade.transparente)) continue;
    const formas = SVGLoader.createShapes(trazo);
    if (formas.length) trazos.push({ formas, color: relleno, degrade });
  }

  // 2) La caja de todo el logo: los SVG vienen en escalas distintas (24×24, 223×236…).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { formas } of trazos) {
    for (const forma of formas) {
      for (const p of forma.getPoints()) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }
  const lado = Math.max(maxX - minX, maxY - minY) || 1;
  const escala = TAMANO / lado;

  // 3) Extrusión proporcional al tamaño, centrada y dada vuelta (en SVG el eje Y va hacia abajo).
  const grupo = new Group();
  for (const { formas, color, degrade } of trazos) {
    const geo = new ExtrudeGeometry(formas, {
      depth: lado * 0.1,
      bevelEnabled: true,
      bevelThickness: lado * 0.025,
      bevelSize: lado * 0.012,
      bevelSegments: 4,
      curveSegments: 14,
    });
    if (degrade && logo.disponible) pintarDegrade(geo, degrade);
    geo.translate(-(minX + maxX) / 2, -(minY + maxY) / 2, -lado * 0.05);
    geo.rotateX(Math.PI); // una rotación (no un espejo): así las normales siguen bien orientadas
    geo.scale(escala, escala, escala);

    const material = new MeshPhysicalMaterial({
      color: logo.disponible ? (degrade ? '#ffffff' : color) : paleta.apagado,
      vertexColors: !!degrade && logo.disponible,
      roughness: logo.disponible ? 0.3 : 0.65,
      metalness: 0.05,
      clearcoat: logo.disponible ? 0.8 : 0,
      clearcoatRoughness: 0.25,
    });
    grupo.add(new Mesh(geo, material));
  }
  return grupo;
}

/** Lee los linearGradient del SVG (en coordenadas del dibujo, userSpaceOnUse). */
function leerDegrades(xml: Document): Map<string, Degrade> {
  const mapa = new Map<string, Degrade>();
  xml.querySelectorAll('linearGradient').forEach((g) => {
    const n = (a: string) => parseFloat(g.getAttribute(a) ?? '0');
    const paradas = [...g.querySelectorAll('stop')].map((s) => ({
      offset: parseFloat(s.getAttribute('offset') ?? '0'),
      color: new Color(s.getAttribute('stop-color') ?? '#000'),
      opacidad: parseFloat(s.getAttribute('stop-opacity') ?? '1'),
    }));
    mapa.set(g.id, {
      x1: n('x1'),
      y1: n('y1'),
      x2: n('x2'),
      y2: n('y2'),
      paradas,
      transparente: paradas.some((p) => p.opacidad < 1),
    });
  });
  return mapa;
}

/** Colorea cada vértice según su posición a lo largo del degradé (antes de mover la geometría). */
function pintarDegrade(geo: ExtrudeGeometry, d: Degrade) {
  const pos = geo.getAttribute('position');
  const colores = new Float32Array(pos.count * 3);
  const dx = d.x2 - d.x1;
  const dy = d.y2 - d.y1;
  const largo = dx * dx + dy * dy || 1;
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, ((pos.getX(i) - d.x1) * dx + (pos.getY(i) - d.y1) * dy) / largo));
    let j = 0;
    while (j < d.paradas.length - 2 && t > d.paradas[j + 1].offset) j++;
    const a = d.paradas[j];
    const b = d.paradas[Math.min(j + 1, d.paradas.length - 1)];
    const tramo = b.offset - a.offset || 1;
    c.copy(a.color).lerp(b.color, Math.min(1, Math.max(0, (t - a.offset) / tramo)));
    colores.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new BufferAttribute(colores, 3));
}
