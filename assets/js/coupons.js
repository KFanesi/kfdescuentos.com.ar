import { buildActions, el } from './dom.js?v=6e67dc66';
import { mountList } from './list.js?v=6e67dc66';
import { validateCoupon } from './schema.js?v=6e67dc66';
import { COUPON_FIELDS } from './search.js?v=6e67dc66';
import { formatDate } from './utils.js?v=6e67dc66';

// Texto del título grande y del título al compartir, con respaldo para los cupones que no traen `discount` o `title`.
const text = (value) => (typeof value === 'string' ? value.trim() : '');
export const headingOf = (coupon) => text(coupon.discount) || text(coupon.title) || text(coupon.code) || coupon.brand;
export const shareTitleOf = (coupon) => text(coupon.title) || text(coupon.discount) || text(coupon.code) || coupon.brand;

/**
 * Tarjeta de un cupón (el CSS usa estas clases). Con código: muestra el código y "Copiar código".
 * Sin código (`code: null`) el cupón se aplica desde el enlace: se indica y no hay botón de copiar.
 * El título grande es el `discount`; si el cupón no lo trae (las listas de Mercado Libre no informan el descuento), se usa el
 * `title`, y si tampoco, el código o la marca: nunca queda un `h3` vacío. `description` y `conditions` son opcionales.
 */
export function buildCouponCard(document, coupon) {
  const card = el(document, 'li', 'card coupon-card');
  card.id = coupon.id;

  if (coupon.exclusive) card.append(el(document, 'span', 'badge', 'Exclusivo'));
  card.append(el(document, 'p', 'coupon-card__brand', coupon.brand), el(document, 'h3', 'coupon-card__discount', headingOf(coupon)));
  if (text(coupon.description)) card.append(el(document, 'p', 'coupon-card__description', coupon.description));
  if (text(coupon.conditions)) card.append(el(document, 'p', 'coupon-card__conditions', coupon.conditions));
  if (coupon.expiresAt) card.append(el(document, 'p', 'coupon-card__expires', `Vence el ${formatDate(coupon.expiresAt)}`));

  if (coupon.code === null) {
    card.append(el(document, 'p', 'coupon-card__via-link', 'Se aplica desde el enlace'));
  } else {
    const code = el(document, 'p', 'coupon-card__code');
    code.append(el(document, 'code', '', coupon.code));
    const copy = el(document, 'button', 'btn btn--primary', 'Copiar código');
    copy.type = 'button';
    copy.setAttribute('data-copy', '');
    card.append(code, copy);
  }

  card.append(buildActions(document, { prefix: 'coupon-card', url: coupon.url, label: 'Ver lista en Mercado Libre', linkVariant: 'ghost' }));
  return card;
}

/** Llena `ul[data-coupons]` con los cupones vigentes: `data-limit` (home) o `data-paginated` (listado con filtros). No rechaza nunca. */
export const initCoupons = (container, options) =>
  mountList(
    container,
    { collection: 'coupons', validator: validateCoupon, buildCard: buildCouponCard, section: 'cupones', titleOf: shareTitleOf, searchFields: COUPON_FIELDS },
    options,
  );
