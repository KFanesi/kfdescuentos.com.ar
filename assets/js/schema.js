import { isCalendarDate, isValidHttpsUrl } from './utils.js?v=ccd82370';

// Esquema de los JSON. Los validadores son puros: reciben un ítem y devuelven la lista de
// errores en texto (vacía = válido), igual que los del test estático de datos.
// `validateAll` aplica uno a toda una lista y descarta lo inválido sin romper el resto.

const SLUG = /^[a-z0-9-]+$/;
const LOCAL_IMAGE = /^\/?assets\/img\/.+\.(webp|avif|png|jpg|jpeg|svg)$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isFlag = (value) => typeof value === 'boolean';
const isLocalImage = (value) => typeof value === 'string' && LOCAL_IMAGE.test(value);
const isAbsent = (value) => value === null || value === undefined;
const isDateOrAbsent = (value) => isAbsent(value) || isCalendarDate(value);

/** Producto. `categoryIds` son los ids de categories.json: una categoría que no existe deja un producto sin filtro posible. */
export function validateProduct(product, { categoryIds = [] } = {}) {
  const errors = [];
  if (!isText(product.id)) errors.push('falta id');
  if (!isText(product.name)) errors.push('falta name');
  if (!categoryIds.includes(product.category)) errors.push(`categoría inexistente: ${product.category}`);
  const hasPrice = typeof product.price === 'number' && Number.isFinite(product.price) && product.price > 0;
  if (!hasPrice) errors.push('price debe ser un número mayor a 0');
  if (!isAbsent(product.originalPrice) && !(typeof product.originalPrice === 'number' && product.originalPrice > product.price)) {
    errors.push('originalPrice debe ser mayor que price (o no estar)');
  }
  if (!isValidHttpsUrl(product.url)) errors.push('url debe ser https');
  if (!isAbsent(product.image)) {
    if (!isLocalImage(product.image)) errors.push('image debe ser un archivo local de assets/img');
    if (!isText(product.imageAlt)) errors.push('falta imageAlt');
  }
  if (!isCalendarDate(product.publishedAt)) errors.push('publishedAt debe ser AAAA-MM-DD');
  if (!isCalendarDate(product.priceCheckedAt)) errors.push('priceCheckedAt debe ser AAAA-MM-DD');
  if (!isDateOrAbsent(product.expiresAt)) errors.push('expiresAt debe ser AAAA-MM-DD o null');
  if (!isFlag(product.featured)) errors.push('featured debe ser true o false');
  if (!isFlag(product.active)) errors.push('active debe ser true o false');
  if ('discount' in product || 'discountPercent' in product) errors.push('el porcentaje no se guarda: se calcula de price y originalPrice');
  return errors;
}

/** Cupón. `code: null` es un cupón que se aplica desde el enlace. */
export function validateCoupon(coupon) {
  const errors = [];
  if (!isText(coupon.id)) errors.push('falta id');
  if (!isText(coupon.brand)) errors.push('falta brand');
  if (!isText(coupon.title)) errors.push('falta title');
  if (!(coupon.code === null || isText(coupon.code))) errors.push('code debe ser texto no vacío o null (cupón por enlace)');
  if (!isText(coupon.discount)) errors.push('falta discount');
  if (typeof coupon.description !== 'string') errors.push('description debe ser texto');
  if (typeof coupon.conditions !== 'string') errors.push('conditions debe ser texto');
  if (!isFlag(coupon.exclusive)) errors.push('exclusive debe ser true o false');
  if (!isCalendarDate(coupon.publishedAt)) errors.push('publishedAt debe ser AAAA-MM-DD');
  if (!isDateOrAbsent(coupon.expiresAt)) errors.push('expiresAt debe ser AAAA-MM-DD o null');
  if (!isValidHttpsUrl(coupon.url)) errors.push('url debe ser https');
  if (!isAbsent(coupon.logo) && !isLocalImage(coupon.logo)) errors.push('logo debe ser un archivo local de assets/img');
  if (!isFlag(coupon.active)) errors.push('active debe ser true o false');
  return errors;
}

/** Categoría: el `id` es el slug estable que usan los productos y la URL (`?categoria=`). */
export function validateCategory(category) {
  const errors = [];
  if (!(isText(category.id) && SLUG.test(category.id))) errors.push('id debe ser un slug en minúsculas');
  if (!isText(category.name)) errors.push('falta name');
  if (!isText(category.description)) errors.push('falta description');
  return errors;
}

/**
 * Valida una lista y devuelve solo los ítems válidos, con ids únicos (queda el primero).
 * Cada descarte avisa con console.warn (nunca console.error: un dato malo no es un fallo del sitio) y la lista sigue.
 */
export function validateAll(list, validator, { categories = [], label = 'datos' } = {}) {
  if (!Array.isArray(list)) return [];
  const context = { categoryIds: categories.map((category) => category.id) };
  const seen = new Set();
  const valid = [];
  for (const item of list) {
    const isRecord = item !== null && typeof item === 'object' && !Array.isArray(item);
    const errors = isRecord ? validator(item, context) : ['no es un objeto'];
    if (errors.length === 0 && seen.has(item.id)) errors.push(`id repetido: ${item.id}`);
    if (errors.length > 0) {
      console.warn(`[${label}] ítem descartado (${isRecord ? item.id : String(item)}): ${errors.join('; ')}`);
      continue;
    }
    seen.add(item.id);
    valid.push(item);
  }
  return valid;
}
