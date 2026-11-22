// Tipos del contenido de un curso. Son el "contrato" entre los JSON de contenido/
// y el motor: si un curso nuevo respeta estos tipos, el motor lo muestra sin cambios.

/** Entrada del índice general contenido/cursos.json */
export interface CursoResumen {
  id: string;
  titulo: string;
  descripcion: string;
  /** Color de marca del curso (hex): tiñe el fondo del logo en el catálogo. */
  color: string;
  /** Logo del curso, ruta relativa a contenido/ (ej. "angular/logo.svg"). */
  logo?: string;
}

/** contenido/<curso>/curso.json */
export interface Curso extends CursoResumen {
  /** Versión de la herramienta que se enseña, ej. "Angular 22". */
  versionHerramienta: string;
  versiones: VersionCurso[];
  /** Guía de instalación para el camino local. */
  instalacion: Bloque[];
  proyectoFinal: ProyectoFinal;
  referencia: SeccionReferencia[];
  /** Tarjetas destacadas para el home (lo que vas a poder hacer). Si falta, se usan los niveles. */
  destacados?: Destacado[];
  /** JSON con los archivos base del proyecto StackBlitz (ruta relativa a la carpeta del curso). */
  plantillaProyecto?: string;
}

/** Tarjeta del home: agrupa módulos en algo que vas a poder hacer. */
export interface Destacado {
  titulo: string;
  descripcion: string;
  /** Herramientas o conceptos que vas a usar (chips). */
  usas: string[];
  /** Lo que vas a poder hacer, en frases cortas. */
  logros: string[];
}

/** Un mismo curso puede tener recorridos distintos (ej. "en una semana" y "desde cero"). */
export interface VersionCurso {
  id: string;
  titulo: string;
  descripcion: string;
  niveles: Nivel[];
}

export interface Nivel {
  id: string;
  titulo: string;
  descripcion: string;
  /** Sugerencia de calendario, ej. "Día 1". Opcional. */
  dia?: string;
  /** Ids de lección, en orden. Cada id es un archivo lecciones/<id>.json */
  lecciones: string[];
}

/** contenido/<curso>/lecciones/<id>.json */
export interface Leccion {
  id: string;
  titulo: string;
  minutos: number;
  /** Termina la frase "Al terminar vas a poder…" */
  objetivo: string;
  explicacion: Bloque[];
  recursos: Recursos;
  ejercicio: Ejercicio;
  quiz: PreguntaQuiz[];
  /** Reemplazos por versión: permite explicar distinto a un principiante sin duplicar la lección. */
  variantes?: Record<string, Partial<Pick<Leccion, 'objetivo' | 'explicacion' | 'ejercicio' | 'quiz'>>>;
}

export type Bloque = (
  | { tipo: 'texto'; md: string }
  | { tipo: 'codigo'; lenguaje: string; codigo: string; archivo?: string }
  | { tipo: 'nota'; variante: 'version' | 'error-comun' | 'comparacion' | 'dato'; md: string }
  | { tipo: 'lista'; items: string[]; ordenada?: boolean }
  | { tipo: 'comando'; comando: string; salida?: string }
) & {
  /** Si se indica, el bloque solo se muestra en esas versiones (ej. comparaciones con React). */
  soloVersiones?: string[];
};

export interface Recursos {
  video?: Video;
  docs: Enlace[];
}

export interface Video {
  /** Id de YouTube (11 caracteres). */
  id: string;
  titulo: string;
  canal: string;
  /** Segundos donde empieza y termina el tramo útil. */
  inicio: number;
  fin: number;
  idioma: 'es' | 'en';
}

export interface Enlace {
  titulo: string;
  url: string;
}

export interface PreguntaQuiz {
  pregunta: string;
  codigo?: string;
  opciones: OpcionQuiz[];
}

export interface OpcionQuiz {
  texto: string;
  correcta: boolean;
  /** Por qué esta opción está bien o mal. */
  explicacion: string;
}

// ---------- Ejercicios ----------

interface EjercicioBase {
  enunciado: string;
  /** Pistas progresivas: se muestran de a una antes de la solución. */
  pistas: string[];
  /** Cómo hacer el mismo ejercicio en tu PC (camino local). */
  local?: PracticaLocal;
}

/** Completar huecos en un fragmento de código. En la plantilla, cada hueco es {{0}}, {{1}}, … */
export interface EjercicioCompletar extends EjercicioBase {
  tipo: 'completar';
  lenguaje: string;
  archivo?: string;
  plantilla: string;
  huecos: Hueco[];
}

export interface Hueco {
  /** Respuestas aceptadas (se comparan normalizando espacios y comillas). */
  respuestas: string[];
  /** Ancho sugerido del campo, en caracteres. */
  ancho?: number;
}

/** Ordenar líneas de código o pasos. */
export interface EjercicioOrdenar extends EjercicioBase {
  tipo: 'ordenar';
  lenguaje: string;
  /** Líneas en el orden correcto (el motor las mezcla). */
  lineas: string[];
}

/** Proyecto Angular real dentro de StackBlitz, validado leyendo los archivos. */
export interface EjercicioProyecto extends EjercicioBase {
  tipo: 'proyecto';
  /** Archivos que se agregan o pisan sobre la plantilla base del curso. */
  archivos: Record<string, string>;
  abrirArchivo: string;
  verificaciones: Verificacion[];
  /** Archivos con la solución (se muestran al final de las pistas). */
  solucion: Record<string, string>;
}

export type Ejercicio = EjercicioCompletar | EjercicioOrdenar | EjercicioProyecto;

export interface Verificacion {
  archivo: string;
  /** Expresión regular que se busca en el archivo (sin comentarios). */
  patron: string;
  /** false = el patrón NO tiene que aparecer. Por defecto true. */
  debeCoincidir?: boolean;
  /** Qué se le dice a la persona si la verificación falla. */
  mensaje: string;
}

export interface PracticaLocal {
  pasos: Bloque[];
  /** Lo que tendrías que ver si salió bien. */
  resultadoEsperado: string;
}

// ---------- Proyecto final y referencia ----------

export interface ProyectoFinal {
  titulo: string;
  descripcion: Bloque[];
  criterios: CriterioProyecto[];
}

export interface CriterioProyecto {
  id: string;
  texto: string;
  /** Lección donde se aprende, para repasar. */
  leccion?: string;
  /** Si se indica, el criterio solo aplica a esas versiones. */
  versiones?: string[];
}

export interface SeccionReferencia {
  titulo: string;
  items: { titulo: string; codigo: string; nota?: string }[];
}
