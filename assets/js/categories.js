import { loadCollection } from './data.js?v=ccd82370';
import { el } from './dom.js?v=ccd82370';
import { validateProduct } from './schema.js?v=ccd82370';

// Cantidad de productos por categoría en `ul[data-categories]`: cada `li[data-category="<id>"]` con un `[data-count]`.
// Cuenta solo lo publicable (activo y sin vencer). Si la carga falla, queda el texto estático del HTML.

const EMPTY_MESSAGE = 'Todavía no hay productos en esta categoría';

const countLabel = (count) => (count === 1 ? '1 producto' : `${count} productos`);

export async function initCategories(list, { fetchFn, now } = {}) {
  const { ownerDocument: document } = list;
  const result = await loadCollection('products', validateProduct, { document, fetchFn, now, withCategories: true });
  if (!result.ok) return;

  const counts = new Map();
  for (const product of result.items) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);

  for (const item of list.querySelectorAll('li[data-category]')) {
    const count = counts.get(item.dataset.category) ?? 0;
    const label = item.querySelector('[data-count]');
    if (label) label.textContent = countLabel(count);
    if (count === 0) {
      item.classList.add('is-empty');
      item.append(el(document, 'p', 'category-empty', EMPTY_MESSAGE));
    }
  }
}
