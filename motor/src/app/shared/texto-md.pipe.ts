import { Pipe, PipeTransform } from '@angular/core';

// @Pipe: transforma un valor dentro del template, ej. {{ texto | textoMd }}.
// Es "pura" por defecto: Angular solo la vuelve a ejecutar si cambia el valor de entrada.
//
// Convierte un markdown MUY reducido a HTML: `código`, **negrita**, *cursiva* y [enlace](https://…).
// Primero escapa todo el HTML, así el contenido nunca puede inyectar etiquetas.
// Además Angular sanitiza lo que se pasa por [innerHTML].
@Pipe({ name: 'textoMd' })
export class TextoMdPipe implements PipeTransform {
  transform(md: string | null | undefined): string {
    return md ? mdEnLinea(md) : '';
  }
}

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function mdEnLinea(md: string): string {
  const codigos: string[] = [];
  // El código va primero y se "guarda aparte" para que ** o [] dentro del código no se interpreten.
  let html = escaparHtml(md).replace(/`([^`]+)`/g, (_, c: string) => {
    codigos.push(`<code>${c}</code>`);
    return `\u0000${codigos.length - 1}\u0000`;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(
      /\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1<span class="solo-lectores"> (abre en otra pestaña)</span></a>',
    )
    .replace(/\n/g, '<br>');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codigos[Number(i)]);
}
