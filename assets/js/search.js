import { normalizeText } from './utils.js?v=bde872c9';

// Búsqueda, orden y paginación de los listados. Todo es puro (sin DOM) y nunca modifica las listas que recibe.

const DEFAULT_PAGE_SIZE = 24;

/** Campos donde se busca en un cupón (el código del cupón no existe en el sitio, así que no se busca). */
export const COUPON_FIELDS = ['title', 'brand', 'description', 'discount', 'conditions'];

/**
 * ¿Coinciden todas las palabras de la consulta? Se compara sin mayúsculas ni tildes (normalizeText) y las palabras pueden
 * estar en campos distintos. `fields` son claves del ítem. Sin palabras, coincide todo.
 */
export function matchesQuery(item, query, fields) {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map((field) => normalizeText(item[field])).join(' ');
  return words.every((word) => haystack.includes(word));
}

/** Filtra por texto (`q`). Devuelve siempre una lista nueva. */
export function filterItems(items, { q } = {}, { fields = [] } = {}) {
  return items.filter((item) => matchesQuery(item, q, fields));
}

const text = (value) => (typeof value === 'string' ? value : '');

/**
 * Orden de todo listado de cupones (home y /cupones/): primero los `diario: true` y, dentro de cada grupo, `publishedAt`
 * descendente (el más reciente primero). A igual grupo y fecha se conserva el orden del archivo: `Array.prototype.sort` es
 * estable, así que no hace falta desempatar por id. Devuelve una copia; la lista original no se toca.
 */
export function sortCoupons(items) {
  const rank = (item) => (item.diario === true ? 0 : 1);
  return [...items].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    const [x, y] = [text(a.publishedAt), text(b.publishedAt)];
    return x === y ? 0 : x < y ? 1 : -1;
  });
}

/** Una página (desde 1) de la lista, con el total y si quedan más. Una página fuera de rango da `items` vacío. */
export function paginate(items, page, pageSize) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const current = Number.isInteger(page) && page > 0 ? page : 1;
  const pages = Math.ceil(items.length / size);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length, hasMore: current < pages };
}
