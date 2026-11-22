import { mdEnLinea } from './texto-md.pipe';

describe('mdEnLinea', () => {
  it('escapa HTML del contenido', () => {
    expect(mdEnLinea('<script>alert(1)</script>')).not.toContain('<script>');
  });

  it('formatea código, negrita y enlaces https', () => {
    const html = mdEnLinea('Usá `signal()` y **no** [docs](https://angular.dev)');
    expect(html).toContain('<code>signal()</code>');
    expect(html).toContain('<strong>no</strong>');
    expect(html).toContain('href="https://angular.dev"');
  });

  it('no interpreta markdown dentro del código', () => {
    expect(mdEnLinea('`a **b** c`')).toBe('<code>a **b** c</code>');
  });

  it('ignora enlaces que no son https', () => {
    expect(mdEnLinea('[x](javascript:alert(1))')).not.toContain('href');
  });

  it('muestra etiquetas de Angular como texto dentro del código', () => {
    expect(mdEnLinea('`<app-card>`')).toBe('<code>&lt;app-card&gt;</code>');
  });
});
