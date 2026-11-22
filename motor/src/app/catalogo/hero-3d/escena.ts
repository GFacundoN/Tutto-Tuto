// Escena 3D del home con Three.js puro (sin Angular): los logos oficiales de los cursos, en relieve,
// flotando dispersos en el aire entre partículas de luz, como en una atmósfera. Al pasar el mouse
// por uno, se agranda un poco; con un clic se entra al curso.
// Se importa con import() dinámico desde el componente: así Three.js queda en un chunk aparte que
// solo se descarga en el home y después de dibujar la página.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  Points,
  PointsMaterial,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
  type Shape,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';

/** Lo que la escena necesita saber de cada curso: uno por logo. */
export interface LogoCurso {
  /** Texto del SVG del logo (ya descargado por el componente). */
  svg: string;
  disponible: boolean;
}

/** Colores del tema del sitio: la luz de contorno, las partículas y los cursos que todavía no están. */
export interface Paleta {
  acento: string;
  apagado: string;
}

export interface OpcionesEscena {
  /** El canvas es más grande que su caja (para que los logos no se corten al girar)... */
  canvas: HTMLCanvasElement;
  /** ...por eso los eventos del puntero se escuchan en la caja, que es lo que se ve como "el hero". */
  superficie: HTMLElement;
  logos: LogoCurso[];
  paleta: Paleta;
  movimientoReducido: boolean;
  /** El logo bajo el puntero (o null) y su posición en pantalla, para mostrar la etiqueta. */
  alResaltar: (indice: number | null, x: number, y: number) => void;
  /** Clic en un logo. */
  alElegir: (indice: number) => void;
}

export interface EscenaHero {
  cambiarPaleta(paleta: Paleta): void;
  reanudar(): void;
  pausar(): void;
  destruir(): void;
}

/** Tamaño de cada logo (su lado más largo), en unidades de la escena. */
const TAMANO = 1.3;

/**
 * Dónde flota cada logo: en una espiral alrededor del eje vertical. Cada uno queda a otra altura y a
 * 144° del anterior, así al girar la atmósfera dos logos nunca quedan uno encima del otro.
 * El primero (el primer curso de la lista) arranca al frente.
 */
function lugar(i: number, total: number): Vector3 {
  const angulo = i * ((Math.PI * 4) / 5);
  const radio = i % 2 ? 1.7 : 1.3;
  const alto = total > 1 ? 1.3 - (i * 2.6) / (total - 1) : 0;
  return new Vector3(Math.sin(angulo) * radio, alto, Math.cos(angulo) * radio);
}

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

  const camara = new PerspectiveCamera(32, 1, 0.1, 50);
  camara.position.set(0, 0, 11);

  // Todo lo que flota va en un grupo: así el parallax con el puntero mueve la "atmósfera" entera.
  const mundo = new Group();
  escena.add(mundo);

  const piezas = op.logos.map((logo, i) => {
    const pieza = crearLogo(logo, op.paleta);
    const base = lugar(i, op.logos.length);
    pieza.position.copy(base);
    pieza.userData['indice'] = i;
    pieza.userData['base'] = base;
    pieza.userData['foco'] = 0;
    pieza.userData['giro'] = (i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.1);
    mundo.add(pieza);
    return pieza;
  });

  // ---- Partículas: polvo de luz del color de acento, a distintas profundidades ----
  const cantidad = 220;
  const posiciones = new Float32Array(cantidad * 3);
  for (let i = 0; i < cantidad; i++) {
    posiciones.set([(Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, -Math.random() * 6 + 1.5], i * 3);
  }
  const geoPolvo = new BufferGeometry();
  geoPolvo.setAttribute('position', new BufferAttribute(posiciones, 3));
  const matPolvo = new PointsMaterial({
    color: op.paleta.acento,
    size: 0.09,
    map: texturaPunto(),
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const polvo = new Points(geoPolvo, matPolvo);
  mundo.add(polvo);

  // Partículas enanas: muchas, chiquitas y tenues, en una caja más grande. Se mueven más lento que el
  // resto: esa diferencia de velocidad es la que da sensación de profundidad, como polvo en el aire.
  const cantidadEnanas = 700;
  const posEnanas = new Float32Array(cantidadEnanas * 3);
  for (let i = 0; i < cantidadEnanas; i++) {
    posEnanas.set([(Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, -Math.random() * 9 + 2.5], i * 3);
  }
  const geoEnanas = new BufferGeometry();
  geoEnanas.setAttribute('position', new BufferAttribute(posEnanas, 3));
  const matEnanas = new PointsMaterial({
    color: op.paleta.acento,
    size: 0.028,
    map: matPolvo.map,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const enanas = new Points(geoEnanas, matEnanas);
  mundo.add(enanas);

  // ---- Interacción ----
  // Arrastrar gira toda la atmósfera (con inercia al soltar); pasar el mouse por un logo lo agranda;
  // un clic sin arrastrar lo elige; además el puntero inclina apenas la escena (parallax).
  const raycaster = new Raycaster();
  const puntero = new Vector2(2, 2);
  const inclinacion = new Vector2();
  const parallax = new Vector2();
  let resaltado = -1;
  let arrastrando = false;
  let movio = 0;
  let ultimoX = 0;
  let ultimoY = 0;
  let giroY = anguloInicial();
  let giroX = 0;
  let velocidadY = 0;
  let velocidadX = 0;

  const canvas = op.canvas;
  const superficie = op.superficie;
  const alBajar = (e: PointerEvent) => {
    arrastrando = true;
    movio = 0;
    ultimoX = e.clientX;
    ultimoY = e.clientY;
    superficie.setPointerCapture(e.pointerId);
    superficie.style.cursor = 'grabbing';
  };
  const alMover = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    inclinacion.copy(puntero);
    if (arrastrando) {
      const dx = e.clientX - ultimoX;
      const dy = e.clientY - ultimoY;
      movio += Math.abs(dx) + Math.abs(dy);
      velocidadY = dx * 0.006;
      velocidadX = dy * 0.004;
      giroY += velocidadY;
      giroX = limitar(giroX + velocidadX, -0.45, 0.45);
      ultimoX = e.clientX;
      ultimoY = e.clientY;
    }
    pedirCuadro();
  };
  const alSoltar = (e: PointerEvent) => {
    if (!arrastrando) return;
    arrastrando = false;
    if (superficie.hasPointerCapture(e.pointerId)) superficie.releasePointerCapture(e.pointerId);
    // Casi sin movimiento = fue un clic: abre el curso que estaba bajo el puntero.
    if (movio < 6) {
      velocidadY = velocidadX = 0;
      const i = tocado();
      if (i >= 0) op.alElegir(i);
    }
    resaltado = -2; // fuerza a recalcular el cursor en el próximo cuadro
    pedirCuadro();
  };
  const alSalir = () => {
    if (arrastrando) return;
    puntero.set(2, 2);
    inclinacion.set(0, 0);
    pedirCuadro();
  };
  superficie.addEventListener('pointerdown', alBajar);
  superficie.addEventListener('pointermove', alMover);
  superficie.addEventListener('pointerup', alSoltar);
  superficie.addEventListener('pointercancel', alSoltar);
  superficie.addEventListener('pointerleave', alSalir);

  /**
   * Ángulo de arranque: prueba 72 giros y se queda con el que deja los logos más separados entre sí
   * en pantalla (la menor distancia entre dos logos, lo más grande posible). Así al cargar la página
   * ningún logo tapa a otro.
   */
  function anguloInicial(): number {
    let mejor = 0;
    let mejorSeparacion = -1;
    const distancia = 11;
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const puntos = piezas.map((p) => {
        const b = p.userData['base'] as Vector3;
        const x = b.x * Math.cos(a) + b.z * Math.sin(a);
        const z = -b.x * Math.sin(a) + b.z * Math.cos(a);
        const k2 = distancia / (distancia - z); // perspectiva: lo cercano se ve más grande y más afuera
        return { x: x * k2, y: b.y * k2 };
      });
      let separacion = Infinity;
      for (let i = 0; i < puntos.length; i++) {
        for (let j = i + 1; j < puntos.length; j++) {
          separacion = Math.min(separacion, Math.hypot(puntos[i].x - puntos[j].x, puntos[i].y - puntos[j].y));
        }
      }
      if (separacion > mejorSeparacion) {
        mejorSeparacion = separacion;
        mejor = a;
      }
    }
    return mejor;
  }

  /** Qué logo está bajo el puntero (o -1). */
  function tocado(): number {
    raycaster.setFromCamera(puntero, camara);
    const toque = raycaster.intersectObjects(piezas, true)[0];
    if (!toque) return -1;
    let o = toque.object;
    while (o.parent && o.userData['indice'] === undefined) o = o.parent;
    return o.userData['indice'] as number;
  }

  // ---- Tamaño: el canvas sigue al contenedor ----
  const ajustar = () => {
    const { clientWidth: ancho, clientHeight: alto } = canvas;
    if (!ancho || !alto) return;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // En pantallas angostas alejamos la cámara para que entren todos.
    camara.position.z = ancho / alto < 0.9 ? 14 : 11;
    camara.updateProjectionMatrix();
    pedirCuadro();
  };
  const observador = new ResizeObserver(ajustar);
  observador.observe(canvas);

  // ---- Bucle de dibujo: solo corre mientras está en pantalla ----
  let activa = false;
  let idCuadro = 0;
  const inicio = performance.now();
  const proyectada = new Vector3();

  function pedirCuadro() {
    if (activa && !idCuadro) idCuadro = requestAnimationFrame(cuadro);
  }

  function cuadro(ahora: number) {
    idCuadro = 0;
    const t = (ahora - inicio) / 1000;
    const quieto = op.movimientoReducido;
    let animando = false;

    // Mientras se arrastra no se resalta nada: el foco está en girar.
    const nuevo = arrastrando ? -1 : tocado();
    if (nuevo !== resaltado) {
      resaltado = nuevo;
      if (!arrastrando) superficie.style.cursor = nuevo >= 0 && op.logos[nuevo].disponible ? 'pointer' : 'grab';
    }

    // Giro de la atmósfera: inercia después de soltar y, en reposo, una vuelta muy lenta.
    if (!arrastrando) {
      velocidadY *= 0.94;
      velocidadX *= 0.9;
      giroY += velocidadY + (quieto ? 0 : 0.0012);
      giroX = limitar(giroX + velocidadX, -0.45, 0.45);
      // Al soltar, la inclinación vertical vuelve despacio a su lugar.
      if (Math.abs(velocidadX) < 0.0005) giroX *= 0.97;
      if (Math.abs(velocidadY) > 0.0002 || Math.abs(giroX) > 0.001) animando = true;
    }
    parallax.x += (inclinacion.x * 0.12 - parallax.x) * 0.05;
    parallax.y += (-inclinacion.y * 0.08 - parallax.y) * 0.05;
    mundo.rotation.y = giroY + parallax.x;
    mundo.rotation.x = giroX + parallax.y;

    piezas.forEach((pieza, i) => {
      const base = pieza.userData['base'] as Vector3;
      // foco va de 0 a 1 con una transición suave (ease-out por interpolación), sin librerías.
      const objetivo = i === resaltado ? 1 : 0;
      const foco = (pieza.userData['foco'] as number) + (objetivo - (pieza.userData['foco'] as number)) * 0.14;
      pieza.userData['foco'] = foco;
      if (Math.abs(objetivo - foco) > 0.002) animando = true;

      // Flotan: cada uno con su ritmo, como suspendidos en el aire.
      const flotarY = quieto ? 0 : Math.sin(t * 0.7 + i * 1.9) * 0.12;
      const flotarX = quieto ? 0 : Math.cos(t * 0.5 + i * 1.3) * 0.06;
      pieza.position.set(base.x + flotarX, base.y + flotarY, base.z + foco * 0.35);
      pieza.scale.setScalar(1 + foco * 0.18);
      // Aunque la atmósfera gire, cada logo compensa ese giro y te sigue mirando de frente,
      // con un balanceo propio; el resaltado se endereza del todo.
      const giro = quieto ? (pieza.userData['giro'] as number) : Math.sin(t * 0.35 + i) * 0.45;
      pieza.rotation.y = -mundo.rotation.y + giro * (1 - foco);
      pieza.rotation.x = -mundo.rotation.x + (quieto ? 0 : Math.sin(t * 0.45 + i * 2.1) * 0.12 * (1 - foco));
    });

    if (!quieto) {
      polvo.rotation.y = t * 0.02;
      polvo.position.y = Math.sin(t * 0.3) * 0.1;
      // Las enanas van más lento y en otra dirección: parallax entre capas.
      enanas.rotation.y = -t * 0.008;
      enanas.position.y = Math.sin(t * 0.18 + 1) * 0.06;
    }
    if (Math.abs(inclinacion.x * 0.12 - parallax.x) > 0.0005) animando = true;

    renderer.render(escena, camara);

    if (resaltado >= 0) {
      const p = piezas[resaltado];
      proyectada.set(0, TAMANO * 0.62, 0).applyMatrix4(p.matrixWorld).project(camara);
      // Coordenadas relativas a la caja (el canvas está corrido hacia afuera de ella).
      op.alResaltar(
        resaltado,
        canvas.offsetLeft + ((proyectada.x + 1) / 2) * canvas.clientWidth,
        canvas.offsetTop + ((1 - proyectada.y) / 2) * canvas.clientHeight,
      );
    } else {
      op.alResaltar(null, 0, 0);
    }

    // Con movimiento reducido, cuando no queda nada por animar deja de dibujar hasta el próximo evento.
    if (!quieto || animando) pedirCuadro();
  }

  ajustar();

  return {
    cambiarPaleta(paleta: Paleta) {
      contorno.color.set(paleta.acento);
      matPolvo.color.set(paleta.acento);
      matEnanas.color.set(paleta.acento);
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
      superficie.removeEventListener('pointerdown', alBajar);
      superficie.removeEventListener('pointermove', alMover);
      superficie.removeEventListener('pointerup', alSoltar);
      superficie.removeEventListener('pointercancel', alSoltar);
      superficie.removeEventListener('pointerleave', alSalir);
      // La GPU no libera sola: hay que descartar geometrías, materiales y texturas.
      escena.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          (o.material as Material).dispose();
        }
      });
      geoPolvo.dispose();
      geoEnanas.dispose();
      matEnanas.dispose();
      matPolvo.map?.dispose();
      matPolvo.dispose();
      escena.environment?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}

function limitar(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Un punto redondo y difuso para las partículas (sin textura, serían cuadrados). */
function texturaPunto(): CanvasTexture {
  const lado = 64;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = lado;
  const ctx = lienzo.getContext('2d')!;
  const g = ctx.createRadialGradient(lado / 2, lado / 2, 0, lado / 2, lado / 2, lado / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, lado, lado);
  return new CanvasTexture(lienzo);
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
