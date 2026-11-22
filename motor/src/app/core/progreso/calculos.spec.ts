import { actualizarCaja, calcularRacha, elegirRepaso, estaDesbloqueada } from './calculos';

describe('calcularRacha', () => {
  it('cuenta días seguidos terminando hoy', () => {
    expect(calcularRacha(['2026-11-20', '2026-11-21', '2026-11-22'], '2026-11-22')).toBe(3);
  });

  it('sigue viva si la última práctica fue ayer', () => {
    expect(calcularRacha(['2026-11-20', '2026-11-21'], '2026-11-22')).toBe(2);
  });

  it('se corta si faltó un día', () => {
    expect(calcularRacha(['2026-11-19', '2026-11-20'], '2026-11-22')).toBe(0);
  });

  it('cruza cambios de mes', () => {
    expect(calcularRacha(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2);
  });
});

describe('estaDesbloqueada', () => {
  const orden = ['a', 'b', 'c'];

  it('la primera siempre está disponible', () => {
    expect(estaDesbloqueada(orden, 'a', new Set())).toBe(true);
  });

  it('las siguientes necesitan la anterior completa', () => {
    expect(estaDesbloqueada(orden, 'b', new Set())).toBe(false);
    expect(estaDesbloqueada(orden, 'b', new Set(['a']))).toBe(true);
    expect(estaDesbloqueada(orden, 'c', new Set(['a']))).toBe(false);
  });

  it('una lección que no está en el recorrido no se desbloquea', () => {
    expect(estaDesbloqueada(orden, 'z', new Set(['a', 'b', 'c']))).toBe(false);
  });
});

describe('repaso espaciado', () => {
  it('acertar sube de caja y errar vuelve a 0', () => {
    expect(actualizarCaja(undefined, true, '2026-11-22').caja).toBe(1);
    expect(actualizarCaja({ caja: 3, ultima: '2026-11-01' }, false, '2026-11-22').caja).toBe(0);
  });

  it('prioriza preguntas nuevas y vencidas sobre las recién repasadas', () => {
    const estados = {
      sabida: { caja: 4, ultima: '2026-11-22' },
      errada: { caja: 0, ultima: '2026-11-21' },
    };
    const r = elegirRepaso(['sabida', 'errada', 'nueva'], estados, 2, '2026-11-22');
    expect(r).toEqual(['errada', 'nueva']);
  });

  it('devuelve menos si no hay suficientes', () => {
    expect(elegirRepaso(['x'], {}, 3)).toEqual(['x']);
  });
});
