import { normalizeText } from './utils.js?v=6e67dc66';

// Búsqueda, orden y paginación de los listados. Todo es puro (sin DOM) y nunca modifica las listas que recibe.

const DEFAULT_PAGE_SIZE = 24;

/** Campos donde se busca en un cupón. */
export const COUPON_FIELDS = ['brand', 'title', 'code', 'discount', 'description'];

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
 * Los cupones se ordenan siempre por más recientes: `publishedAt` descendente y, a igual fecha, por id (así el orden es
 * estable). Devuelve una copia; la lista original no se toca.
 */
export function sortByRecent(items) {
  return [...items].sort((a, b) => {
    const [x, y] = [text(a.publishedAt), text(b.publishedAt)];
    if (x !== y) return x < y ? 1 : -1;
    return text(a.id) < text(b.id) ? -1 : text(a.id) > text(b.id) ? 1 : 0;
  });
}

/** Una página (desde 1) de la lista, con el total y si quedan más. Una página fuera de rango da `items` vacío. */
export function paginate(items, page, pageSize) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const current = Number.isInteger(page) && page > 0 ? page : 1;
  const pages = Math.ceil(items.length / size);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length, hasMore: current < pages };
}
