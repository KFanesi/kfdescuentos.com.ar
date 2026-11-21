import { isCalendarDate, isValidHttpsUrl } from './utils.js?v=7a113a9a';

// Esquema de los JSON. Los validadores son puros: reciben un ítem y devuelven la lista de
// errores en texto (vacía = válido), igual que los del test estático de datos.
// `validateAll` aplica uno a toda una lista y descarta lo inválido sin romper el resto.

const LOCAL_IMAGE = /^\/?assets\/img\/.+\.(webp|avif|png|jpg|jpeg|svg)$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isFlag = (value) => typeof value === 'boolean';
const isLocalImage = (value) => typeof value === 'string' && LOCAL_IMAGE.test(value);
const isAbsent = (value) => value === null || value === undefined;
const isDateOrAbsent = (value) => isAbsent(value) || isCalendarDate(value);

// Un campo de texto opcional: puede faltar, ser null o ser texto (vacío incluido). Lo que no es texto es un error de tipeo.
const isTextOrAbsent = (value) => isAbsent(value) || typeof value === 'string';

/**
 * Cupón. Obligatorios: id, brand, url (https), publishedAt, active y code. `code: null` es un cupón que se aplica desde el enlace.
 * `discount`, `title`, `description`, `conditions` y `exclusive` son opcionales: las listas de Mercado Libre no informan el
 * descuento ni el vencimiento y no se inventan. Sin `discount`, la tarjeta muestra el `title` (ver coupons.js).
 */
export function validateCoupon(coupon) {
  const errors = [];
  if (!isText(coupon.id)) errors.push('falta id');
  if (!isText(coupon.brand)) errors.push('falta brand');
  if (!(coupon.code === null || isText(coupon.code))) errors.push('code debe ser texto no vacío o null (cupón por enlace)');
  for (const field of ['title', 'discount', 'description', 'conditions']) {
    if (!isTextOrAbsent(coupon[field])) errors.push(`${field} debe ser texto`);
  }
  if (!isAbsent(coupon.exclusive) && !isFlag(coupon.exclusive)) errors.push('exclusive debe ser true o false');
  if (!isCalendarDate(coupon.publishedAt)) errors.push('publishedAt debe ser AAAA-MM-DD');
  if (!isDateOrAbsent(coupon.expiresAt)) errors.push('expiresAt debe ser AAAA-MM-DD o null');
  if (!isValidHttpsUrl(coupon.url)) errors.push('url debe ser https');
  if (!isAbsent(coupon.logo) && !isLocalImage(coupon.logo)) errors.push('logo debe ser un archivo local de assets/img');
  if (!isFlag(coupon.active)) errors.push('active debe ser true o false');
  return errors;
}

/**
 * Valida una lista y devuelve solo los ítems válidos, con ids únicos (queda el primero).
 * Cada descarte avisa con console.warn (nunca console.error: un dato malo no es un fallo del sitio) y la lista sigue.
 */
export function validateAll(list, validator, { label = 'datos' } = {}) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const valid = [];
  for (const item of list) {
    const isRecord = item !== null && typeof item === 'object' && !Array.isArray(item);
    const errors = isRecord ? validator(item) : ['no es un objeto'];
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
