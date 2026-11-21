import { bindActions } from './actions.js?v=689f9192';
import { loadCollection } from './data.js?v=689f9192';
import { readParams } from './utils.js?v=689f9192';

// Ciclo común de los listados de cupones y productos: cargar, dibujar y mostrar el estado (cargando, vacío, error).
// Contrato con el HTML: el contenedor es un <ul> dentro de una <section> que puede traer `[data-empty]` y `[data-error]`
// (hermanos, con `hidden` de entrada). Si el contenedor está dentro de `[data-featured-section]`, esa sección se oculta
// cuando no hay nada que mostrar.

const positiveInt = (value) => {
  const number = Number.parseInt(value, 10);
  return number > 0 ? number : null;
};

// ?id=<id>: lo que abre un enlace compartido. Resalta la tarjeta y lleva hasta ella.
function highlightFromUrl(container, view) {
  const { id } = readParams(view.location.search);
  const card = [...container.children].find((child) => child.id === id);
  if (!card) return;
  card.classList.add('is-highlighted');
  card.scrollIntoView({ block: 'center' });
}

/**
 * `spec`: { collection, validator, withCategories, select, buildCard, section, titleOf }.
 * `options`: { fetchFn, now } (inyectables para probar). No rechaza nunca: el fallo de carga es un estado más.
 */
export async function mountList(container, spec, { fetchFn, now } = {}) {
  const { ownerDocument: document } = container;
  const scope = container.closest('section') ?? container.parentElement;
  const featuredSection = container.closest('[data-featured-section]');
  const empty = scope.querySelector('[data-empty]');
  const failure = scope.querySelector('[data-error]');

  container.setAttribute('aria-busy', 'true');
  try {
    const result = await loadCollection(spec.collection, spec.validator, { document, fetchFn, now, withCategories: spec.withCategories });
    const limit = positiveInt(container.dataset.limit);
    const selected = spec.select ? spec.select(result.items) : result.items;
    const items = limit ? selected.slice(0, limit) : selected;

    container.replaceChildren(...items.map((item) => spec.buildCard(document, item)));
    bindActions(container, { liveRegion: document.getElementById('aviso'), section: spec.section, titles: new Map(items.map((item) => [item.id, spec.titleOf(item)])) });
    highlightFromUrl(container, document.defaultView);

    if (empty) empty.hidden = !(result.ok && items.length === 0);
    if (failure) failure.hidden = result.ok;
    if (featuredSection) featuredSection.hidden = result.ok && items.length === 0;
  } finally {
    container.removeAttribute('aria-busy');
  }
}
