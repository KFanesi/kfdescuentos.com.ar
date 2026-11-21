import { bindActions } from './actions.js?v=bde872c9';
import { loadCollection } from './data.js?v=bde872c9';
import { mountListing } from './listing.js?v=bde872c9';
import { sortCoupons } from './search.js?v=bde872c9';
import { positiveInt, readParams } from './utils.js?v=bde872c9';

// Ciclo común de los listados de cupones (home y /cupones/): cargar, dibujar y mostrar el estado (cargando, vacío, error).
// Contrato con el HTML: el contenedor es un <ul> dentro de una <section> que puede traer `[data-empty]` y `[data-error]`
// (hermanos, con `hidden` de entrada).

// ?id=<id>: lo que abre un enlace compartido. Resalta la tarjeta y lleva hasta ella.
function highlightFromUrl(container, view) {
  const { id } = readParams(view.location.search);
  const card = [...container.children].find((child) => child.id === id);
  if (!card) return;
  card.classList.add('is-highlighted');
  card.scrollIntoView({ block: 'center' });
}

/**
 * `spec`: { collection, validator, buildCard, section, titleOf, searchFields }.
 * Con `data-paginated` en el contenedor es un listado con filtros y "Cargar más" (listing.js); sin él, el de la home
 * (`data-limit`). `options`: { fetchFn, now } (inyectables para probar). No rechaza nunca: el fallo de carga es un estado más.
 */
export async function mountList(container, spec, options = {}) {
  if (container.hasAttribute('data-paginated')) return mountListing(container, spec, options);
  const { fetchFn, now } = options;
  const { ownerDocument: document } = container;
  const scope = container.closest('section') ?? container.parentElement;
  const empty = scope.querySelector('[data-empty]');
  const failure = scope.querySelector('[data-error]');

  container.setAttribute('aria-busy', 'true');
  try {
    const result = await loadCollection(spec.collection, spec.validator, { document, fetchFn, now });
    const limit = positiveInt(container.dataset.limit);
    // El mismo orden que el listado, aplicado ANTES de recortar: si no, el límite dejaría afuera a los diarios.
    const sorted = sortCoupons(result.items);
    const items = limit ? sorted.slice(0, limit) : sorted;

    container.replaceChildren(...items.map((item) => spec.buildCard(document, item)));
    bindActions(container, { liveRegion: document.getElementById('aviso'), section: spec.section, titles: new Map(items.map((item) => [item.id, spec.titleOf(item)])) });
    highlightFromUrl(container, document.defaultView);

    if (empty) empty.hidden = !(result.ok && items.length === 0);
    if (failure) failure.hidden = result.ok;
  } finally {
    container.removeAttribute('aria-busy');
  }
}
