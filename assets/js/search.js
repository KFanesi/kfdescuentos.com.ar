import { discountPercent, normalizeText } from './utils.js?v=eae5bc3b';

// Búsqueda, filtro, orden y paginación de los listados. Todo es puro (sin DOM) y nunca modifica las listas que recibe.

const DEFAULT_PAGE_SIZE = 24;

/** Campos donde se busca en un cupón. */
export const COUPON_FIELDS = ['brand', 'title', 'code', 'discount', 'description'];

/** Campos donde se busca en un producto: el nombre y el nombre visible de su categoría (el JSON solo guarda el id). */
export function productFields(categories) {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  return ['name', (product) => names.get(product.category)];
}

const fieldText = (item, field) => normalizeText(typeof field === 'function' ? field(item) : item[field]);

/**
 * ¿Coinciden todas las palabras de la consulta? Se compara sin mayúsculas ni tildes (normalizeText) y las palabras pueden
 * estar en campos distintos. Un campo es una clave del ítem o una función `(item) => texto`. Sin palabras, coincide todo.
 */
export function matchesQuery(item, query, fields) {
  const words = normalizeText(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fields.map((field) => fieldText(item, field)).join(' ');
  return words.every((word) => haystack.includes(word));
}

/** Filtra por texto (`q`) y por id de categoría (`categoria`). Devuelve siempre una lista nueva. */
export function filterItems(items, { q, categoria } = {}, { fields = [] } = {}) {
  return items.filter((item) => (!categoria || item.category === categoria) && matchesQuery(item, q, fields));
}

const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// Comparador que deja al final lo que no tiene valor (sin descuento, sin precio) y respeta el orden de lo demás.
const byValue = (valueOf, direction) => (a, b) => {
  const [x, y] = [valueOf(a), valueOf(b)];
  if (x === null || y === null) return (x === null) - (y === null);
  return direction * (x - y);
};

const price = (item) => (isNumber(item.price) ? item.price : null);
const discount = (item) => discountPercent(item.price, item.originalPrice);
const text = (value) => (typeof value === 'string' ? value : '');
const byRecent = (a, b) => {
  const [x, y] = [text(a.publishedAt), text(b.publishedAt)];
  if (x !== y) return x < y ? 1 : -1;
  return text(a.id) < text(b.id) ? -1 : text(a.id) > text(b.id) ? 1 : 0;
};

const COMPARATORS = {
  descuento: byValue(discount, -1),
  'precio-asc': byValue(price, 1),
  'precio-desc': byValue(price, -1),
  recientes: byRecent,
};

/**
 * Ordena una copia. `descuento`: mayor porcentaje primero y sin descuento al final; `precio-asc` / `precio-desc`: los
 * ítems sin precio (cupones) van al final; `recientes`: `publishedAt` descendente y, a igual fecha, por id.
 * El orden es estable (empates conservan el original) y un orden desconocido no cambia nada.
 */
export function sortItems(items, orden) {
  const copy = [...items];
  const compare = COMPARATORS[orden || 'recientes'];
  return compare ? copy.sort(compare) : copy;
}

/** Una página (desde 1) de la lista, con el total y si quedan más. Una página fuera de rango da `items` vacío. */
export function paginate(items, page, pageSize) {
  const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const current = Number.isInteger(page) && page > 0 ? page : 1;
  const pages = Math.ceil(items.length / size);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages, total: items.length, hasMore: current < pages };
}
