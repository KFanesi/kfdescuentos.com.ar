import { bindActions } from './actions.js?v=eae5bc3b';
import { loadCollection } from './data.js?v=eae5bc3b';
import { el } from './dom.js?v=eae5bc3b';
import { validateCoupon } from './schema.js?v=eae5bc3b';
import { COUPON_FIELDS, filterItems, paginate, sortItems } from './search.js?v=eae5bc3b';
import { positiveInt, readParams, siteUrl, writeParams } from './utils.js?v=eae5bc3b';

// Listados con búsqueda, filtros, orden y "Cargar más" (`ul[data-paginated]`). Contrato con el HTML:
//  - `form[data-filters]` con campos `q` (búsqueda), `categoria` (solo productos) y `orden`, y `a[data-clear]`.
//  - `[data-results]` (cantidad), `[data-noresults]`, `[data-empty]` y `[data-error]` (hermanos, `hidden` de entrada)
//    y `button[data-load-more]` (`hidden` de entrada). `data-page-size` en la lista (por defecto 24).
//  - Solo productos: `p[data-coupon-matches][hidden]` con un `a` hacia los cupones que coinciden con la búsqueda.
// El estado vive en la URL (`?q=&categoria=&orden=`): se lee al cargar y se escribe con replaceState al filtrar.
// Sin JS el formulario es un GET normal, así que nada de esto es imprescindible para llegar a los datos.

const DEBOUNCE_MS = 250;

const countMessage = (count) => (count === 0 ? 'Sin resultados' : count === 1 ? '1 resultado' : `${count} resultados`);

/** Un select solo puede tomar un valor que exista entre sus opciones: si no, queda en blanco y pisaría el filtro. */
const hasOption = (select, value) => [...select.options].some((option) => option.value === value);

/**
 * `spec`: { collection, validator, withCategories, select, buildCard, section, titleOf, searchFields, crossLinkCoupons }.
 * `searchFields(categories)` devuelve los campos donde buscar. No rechaza nunca: el fallo de carga es un estado más.
 */
export async function mountListing(container, spec, { fetchFn, now } = {}) {
  const { ownerDocument: document } = container;
  const view = document.defaultView;
  const scope = container.closest('section') ?? container.parentElement;
  const find = (selector) => scope.querySelector(selector) ?? document.querySelector(selector);
  const form = document.querySelector('form[data-filters]');
  const [results, noresults, empty, failure, loadMore] = ['[data-results]', '[data-noresults]', '[data-empty]', '[data-error]', '[data-load-more]'].map(find);
  const couponBox = spec.crossLinkCoupons ? find('[data-coupon-matches]') : null;
  const pageSize = positiveInt(container.dataset.pageSize);
  const liveRegion = document.getElementById('aviso');
  const announce = (message) => {
    if (!liveRegion) return;
    liveRegion.textContent = '';
    liveRegion.textContent = message;
  };

  container.setAttribute('aria-busy', 'true');
  try {
    const options = { document, fetchFn, now };
    const [result, couponResult] = await Promise.all([
      loadCollection(spec.collection, spec.validator, { ...options, withCategories: spec.withCategories }),
      couponBox ? loadCollection('coupons', validateCoupon, options) : null,
    ]);

    const items = result.ok && spec.select ? spec.select(result.items) : result.items;
    if (empty) empty.hidden = !(result.ok && items.length === 0);
    if (failure) failure.hidden = result.ok;
    if (!result.ok) return;

    const categories = result.categories ?? [];
    const fields = spec.searchFields(categories);
    const coupons = couponResult?.items ?? []; // si coupons.json falla, el aviso de cupones simplemente no aparece
    bindActions(container, { liveRegion, section: spec.section, titles: new Map(items.map((item) => [item.id, spec.titleOf(item)])) });

    const controls = {
      q: form?.elements.namedItem('q') ?? null,
      categoria: form?.elements.namedItem('categoria') ?? null,
      orden: form?.elements.namedItem('orden') ?? null,
    };
    const readControls = () => ({
      q: controls.q?.value.trim() ?? '',
      categoria: controls.categoria?.value ?? '',
      orden: controls.orden?.value ?? '',
    });

    // El select de categoría trae las suyas en el HTML (funciona sin JS); si falta alguna de categories.json, se agrega.
    if (controls.categoria) {
      for (const { id, name } of categories) {
        if (hasOption(controls.categoria, id)) continue;
        const option = el(document, 'option', '', name);
        option.value = id;
        controls.categoria.append(option);
      }
    }

    // Los controles reflejan la URL; un `orden` o una `categoria` que no existan entre las opciones se ignoran.
    const fromUrl = readParams(view.location.search);
    if (controls.q && fromUrl.q) controls.q.value = fromUrl.q;
    for (const key of ['categoria', 'orden']) {
      if (controls[key] && fromUrl[key] && hasOption(controls[key], fromUrl[key])) controls[key].value = fromUrl[key];
    }

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

    const updateCouponLink = () => {
      if (!couponBox) return;
      const matches = state.q ? filterItems(coupons, { q: state.q }, { fields: COUPON_FIELDS }).length : 0;
      couponBox.hidden = matches === 0;
      if (matches === 0) return;
      const link = couponBox.querySelector('a');
      link.textContent = `Encontramos ${matches} ${matches === 1 ? 'cupón' : 'cupones'} para «${state.q}»`;
      link.href = siteUrl(`cupones/?q=${encodeURIComponent(state.q)}`);
    };

    const render = ({ announceCount }) => {
      filtered = sortItems(filterItems(items, state, { fields }), state.orden);
      container.replaceChildren();
      page = 0;
      showNextPage();
      const message = countMessage(filtered.length);
      if (results) results.textContent = items.length > 0 ? message : '';
      if (noresults) noresults.hidden = !(items.length > 0 && filtered.length === 0);
      updateCouponLink();
      if (announceCount && items.length > 0) announce(message);
    };

    // `search` explícito solo en "Limpiar", que deja la URL sin parámetros aunque el select de orden tenga un valor.
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
      form.addEventListener('change', (event) => {
        if (event.target.matches('select')) update();
      });
      controls.q?.addEventListener('input', () => {
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
      announce(`Se cargaron ${added} más`);
    });

    render({ announceCount: Boolean(state.q || state.categoria) });

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
