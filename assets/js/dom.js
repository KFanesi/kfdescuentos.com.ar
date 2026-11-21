// Piezas de DOM compartidas por las tarjetas. Todo se arma con createElement/textContent: los datos vienen de JSON editable
// y nunca se concatenan como HTML.

/** Crea un elemento con clases y texto opcionales. */
export function el(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Bloque de acciones de una tarjeta: enlace de afiliado a Mercado Libre y botón Compartir.
 * El enlace es siempre de afiliado (`rel="sponsored noopener"` + `data-afiliado`) y abre en pestaña nueva, lo cual se
 * indica en su nombre accesible con un texto oculto visualmente.
 */
export function buildActions(document, { prefix, url, label, linkVariant }) {
  const link = el(document, 'a', `btn btn--${linkVariant}`);
  link.href = url;
  link.target = '_blank';
  link.rel = 'sponsored noopener';
  link.setAttribute('data-afiliado', '');
  link.append(label, el(document, 'span', 'visually-hidden', ' (se abre en una pestaña nueva)'));

  const share = el(document, 'button', 'btn btn--ghost', 'Compartir');
  share.type = 'button';
  share.setAttribute('data-share', '');

  const actions = el(document, 'div', `${prefix}__actions`);
  actions.append(link, share);
  return actions;
}
