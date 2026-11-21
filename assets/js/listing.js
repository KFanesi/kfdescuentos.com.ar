import { announce, bindActions } from './actions.js?v=bde872c9';
import { loadCollection } from './data.js?v=bde872c9';
import { filterItems, paginate, sortCoupons } from './search.js?v=bde872c9';
import { positiveInt, readParams, writeParams } from './utils.js?v=bde872c9';

// Listado de cupones con búsqueda y "Cargar más" (`ul[data-paginated]`), los diarios primero y de más reciente a más antiguo (sortCoupons). Contrato con el HTML:
//  - `form[data-filters]` con el campo `q` (búsqueda) y `a[data-clear]`.
//  - `[data-results]` (cantidad), `[data-noresults]`, `[data-empty]` y `[data-error]` (hermanos, `hidden` de entrada)
//    y `button[data-load-more]` (`hidden` de entrada). `data-page-size` en la lista (por defecto 24).
// El estado vive en la URL (`?q=`): se lee al cargar y se escribe con replaceState al filtrar.
// Sin JS el formulario es un GET normal, así que nada de esto es imprescindible para llegar a los datos.

const DEBOUNCE_MS = 250;

const countMessage = (count) => (count === 0 ? 'Sin resultados' : count === 1 ? '1 resultado' : `${count} resultados`);

/**
 * `spec`: { collection, validator, buildCard, section, titleOf, searchFields }. `searchFields` son las claves donde buscar.
 * No rechaza nunca: el fallo de carga es un estado más.
 */
export async function mountListing(container, spec, { fetchFn, now } = {}) {
  const { ownerDocument: document } = container;
  const view = document.defaultView;
  const scope = container.closest('section') ?? container.parentElement;
  const find = (selector) => scope.querySelector(selector) ?? document.querySelector(selector);
  const form = document.querySelector('form[data-filters]');
  const [results, noresults, empty, failure, loadMore] = ['[data-results]', '[data-noresults]', '[data-empty]', '[data-error]', '[data-load-more]'].map(find);
  const pageSize = positiveInt(container.dataset.pageSize);
  const liveRegion = document.getElementById('aviso');

  container.setAttribute('aria-busy', 'true');
  try {
    const options = { document, fetchFn, now };
    const result = await loadCollection(spec.collection, spec.validator, options);
    const { items } = result;
    if (empty) empty.hidden = !(result.ok && items.length === 0);
    if (failure) failure.hidden = result.ok;
    if (!result.ok) return;

    const fields = spec.searchFields;
    bindActions(container, { liveRegion, section: spec.section, titles: new Map(items.map((item) => [item.id, spec.titleOf(item)])) });

    const searchBox = form?.elements.namedItem('q') ?? null;
    const readControls = () => ({ q: searchBox?.value.trim() ?? '' });

    // El campo de búsqueda refleja la URL.
    const fromUrl = readParams(view.location.search);
    if (searchBox && fromUrl.q) searchBox.value = fromUrl.q;

    let state = readControls();
    let filtered = [];
    let page = 0;
    let hasMore = false;

    const showNextPage = ({ focus = false } = {}) => {
      page += 1;
      const next = paginate(filtered, page, pageSize);
      const cards = next.items.map((item) => spec.buildCard(document, item));
      container.append(...cards);
      hasMore = next.hasMore;
      if (loadMore) loadMore.hidden = !hasMore;
      if (focus && cards.length > 0) {
        cards[0].tabIndex = -1; // no entra en el orden de tabulación, pero puede recibir el foco por código
        cards[0].focus();
      }
      return cards.length;
    };

    const render = ({ announceCount }) => {
      filtered = sortCoupons(filterItems(items, state, { fields }));
      container.replaceChildren();
      page = 0;
      showNextPage();
      const message = countMessage(filtered.length);
      if (results) results.textContent = items.length > 0 ? message : '';
      if (noresults) noresults.hidden = !(items.length > 0 && filtered.length === 0);
      if (announceCount && items.length > 0) announce(liveRegion, message);
    };

    // `search` explícito solo en "Limpiar": deja la URL sin parámetros.
    let timer = null;
    const update = (search = writeParams(readControls())) => {
      clearTimeout(timer);
      state = readControls();
      view.history.replaceState(null, '', `${view.location.pathname}${search}${view.location.hash}`);
      render({ announceCount: true });
    };

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        update();
      });
      searchBox?.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(update, DEBOUNCE_MS);
      });
      form.querySelector('[data-clear]')?.addEventListener('click', (event) => {
        event.preventDefault();
        form.reset();
        update('');
      });
    }

    loadMore?.addEventListener('click', () => {
      const added = showNextPage({ focus: true });
      announce(liveRegion, `Se cargaron ${added} más`);
    });

    render({ announceCount: Boolean(state.q) });

    // ?id=<id> (enlace compartido): si la tarjeta está en una página posterior, se dibujan las páginas que hagan falta.
    const { id } = fromUrl;
    if (id && filtered.some((item) => item.id === id)) {
      const cardOf = () => [...container.children].find((child) => child.id === id);
      while (!cardOf() && hasMore) showNextPage();
      const card = cardOf();
      card?.classList.add('is-highlighted');
      card?.scrollIntoView({ block: 'center' });
    }
  } finally {
    container.removeAttribute('aria-busy');
  }
}
