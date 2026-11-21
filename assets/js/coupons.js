import { buildActions, el } from './dom.js?v=bde872c9';
import { mountList } from './list.js?v=bde872c9';
import { validateCoupon } from './schema.js?v=bde872c9';
import { COUPON_FIELDS } from './search.js?v=bde872c9';
import { formatDate } from './utils.js?v=bde872c9';

// Texto del título grande y del título al compartir, con respaldo para los cupones que no traen `discount` o `title`.
// El código del cupón no se lee en ningún lado: se ve en la lista de Mercado Libre, no en el sitio.
const text = (value) => (typeof value === 'string' ? value.trim() : '');
const FALLBACK_HEADING = 'Cupón de Mercado Libre';
export const headingOf = (coupon) => text(coupon.discount) || text(coupon.title) || FALLBACK_HEADING;
export const shareTitleOf = (coupon) => text(coupon.title) || text(coupon.discount) || coupon.brand;

/**
 * Tarjeta de un cupón (el CSS usa estas clases): insignias ("Cupón diario" y "Exclusivo", solo si corresponden), marca,
 * título grande, descripción, condiciones y vencimiento (solo si hay texto) y un botón principal que lleva a la lista de
 * Mercado Libre con el enlace de afiliado, junto a "Compartir". No muestra ni ofrece copiar ningún código.
 * El título grande es el `discount`; si el cupón no lo trae (las listas de Mercado Libre no informan el descuento), se usa
 * el `title`, y si tampoco, "Cupón de Mercado Libre": nunca queda un `h3` vacío.
 */
export function buildCouponCard(document, coupon) {
  const card = el(document, 'li', 'card coupon-card');
  card.id = coupon.id;

  if (coupon.diario === true) card.append(el(document, 'span', 'badge', 'Cupón diario'));
  if (coupon.exclusive) card.append(el(document, 'span', 'badge', 'Exclusivo'));
  card.append(el(document, 'p', 'coupon-card__brand', coupon.brand), el(document, 'h3', 'coupon-card__discount', headingOf(coupon)));
  if (text(coupon.description)) card.append(el(document, 'p', 'coupon-card__description', coupon.description));
  if (text(coupon.conditions)) card.append(el(document, 'p', 'coupon-card__conditions', coupon.conditions));
  if (coupon.expiresAt) card.append(el(document, 'p', 'coupon-card__expires', `Vence el ${formatDate(coupon.expiresAt)}`));
  card.append(buildActions(document, { prefix: 'coupon-card', url: coupon.url, label: 'Ver cupón en Mercado Libre', linkVariant: 'primary' }));
  return card;
}

/** Llena `ul[data-coupons]` con los cupones vigentes: `data-limit` (home) o `data-paginated` (listado con filtros). No rechaza nunca. */
export const initCoupons = (container, options) =>
  mountList(
    container,
    { collection: 'coupons', validator: validateCoupon, buildCard: buildCouponCard, section: 'cupones', titleOf: shareTitleOf, searchFields: COUPON_FIELDS },
    options,
  );
