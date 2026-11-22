// Tests de la corrección automática. El objetivo principal: que una respuesta
// incorrecta NUNCA se apruebe (un falso "¡bien!" enseña algo equivocado).
import {
  mezclar,
  normalizarCodigo,
  quitarComentarios,
  validarHuecos,
  validarOrden,
  verificarArchivos,
} from './validacion';

describe('normalizarCodigo', () => {
  it('ignora espacios alrededor de símbolos y el punto y coma final', () => {
    expect(normalizarCodigo(' count = signal( 0 ); ')).toBe(normalizarCodigo('count=signal(0)'));
  });

  it('unifica comillas simples, dobles y tipográficas', () => {
    expect(normalizarCodigo('"hola"')).toBe(normalizarCodigo("'hola'"));
    expect(normalizarCodigo('“hola”')).toBe(normalizarCodigo("'hola'"));
  });

  it('no confunde valores distintos', () => {
    expect(normalizarCodigo('signal(1)')).not.toBe(normalizarCodigo('signal(0)'));
    expect(normalizarCodigo('input()')).not.toBe(normalizarCodigo('output()'));
  });

  it('distingue mayúsculas (Angular es sensible a ellas)', () => {
    expect(normalizarCodigo('@If')).not.toBe(normalizarCodigo('@if'));
  });
});

describe('validarHuecos', () => {
  const huecos = [{ respuestas: ['signal'] }, { respuestas: ['set', 'update'] }];

  it('acepta cualquiera de las respuestas válidas', () => {
    expect(validarHuecos(huecos, ['signal', 'update'])).toEqual([true, true]);
  });

  it('marca cada hueco por separado', () => {
    expect(validarHuecos(huecos, ['computed', 'set'])).toEqual([false, true]);
  });

  it('un hueco vacío o solo con espacios nunca es correcto', () => {
    expect(validarHuecos(huecos, ['', '   '])).toEqual([false, false]);
  });

  it('no acepta respuestas que solo contienen la correcta', () => {
    expect(validarHuecos(huecos, ['signals', 'set()'])).toEqual([false, false]);
  });
});

describe('validarOrden', () => {
  it('aprueba solo el orden exacto', () => {
    expect(validarOrden(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    expect(validarOrden(['a', 'b', 'c'], ['b', 'a', 'c'])).toBe(false);
  });

  it('rechaza listas incompletas', () => {
    expect(validarOrden(['a', 'b'], ['a'])).toBe(false);
  });
});

describe('mezclar', () => {
  it('nunca devuelve el orden original y conserva los elementos', () => {
    const items = ['1', '2', '3', '4'];
    for (const semilla of ['x', 'y', 'leccion-1', 'otra']) {
      const r = mezclar(items, semilla);
      expect(r).not.toEqual(items);
      expect([...r].sort()).toEqual(items);
    }
  });

  it('es determinística con la misma semilla', () => {
    expect(mezclar(['a', 'b', 'c'], 's')).toEqual(mezclar(['a', 'b', 'c'], 's'));
  });
});

describe('quitarComentarios', () => {
  it('saca comentarios de línea, de bloque y HTML', () => {
    const r = quitarComentarios('a // b\n/* c */ d <!-- e --> f');
    expect(r).not.toMatch(/[bce]/);
    expect(r).toMatch(/a[\s\S]*d[\s\S]*f/);
  });

  it('no rompe URLs dentro de strings', () => {
    expect(quitarComentarios("url = 'http://x.com'")).toContain('http://x.com');
  });
});

describe('verificarArchivos', () => {
  const verificaciones = [
    { archivo: 'src/app/app.ts', patron: 'signal\\(0\\)', mensaje: 'Creá un signal en 0' },
    { archivo: 'src/app/app.html', patron: '\\*ngIf', debeCoincidir: false, mensaje: 'Usá @if, no *ngIf' },
  ];

  it('aprueba cuando todo coincide', () => {
    const r = verificarArchivos(verificaciones, {
      'src/app/app.ts': 'count = signal(0);',
      'src/app/app.html': '@if (x) {}',
    });
    expect(r.every((x) => x.ok)).toBe(true);
  });

  it('no aprueba si la respuesta está comentada', () => {
    const r = verificarArchivos(verificaciones, {
      'src/app/app.ts': '// count = signal(0);',
      'src/app/app.html': '',
    });
    expect(r[0].ok).toBe(false);
  });

  it('falla si aparece algo prohibido', () => {
    const r = verificarArchivos(verificaciones, {
      'src/app/app.ts': 'signal(0)',
      'src/app/app.html': '<p *ngIf="x"></p>',
    });
    expect(r[1].ok).toBe(false);
  });

  it('avisa si falta el archivo', () => {
    const r = verificarArchivos(verificaciones, {});
    expect(r[0].ok).toBe(false);
    expect(r[0].mensaje).toContain('No encuentro');
  });
});
