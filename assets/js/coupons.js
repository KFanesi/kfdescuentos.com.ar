import { buildActions, el } from './dom.js?v=ccd82370';
import { mountList } from './list.js?v=ccd82370';
import { validateCoupon } from './schema.js?v=ccd82370';
import { COUPON_FIELDS } from './search.js?v=ccd82370';
import { formatDate } from './utils.js?v=ccd82370';

/**
 * Tarjeta de un cupón (el CSS usa estas clases). Con código: muestra el código y "Copiar código".
 * Sin código (`code: null`) el cupón se aplica desde el enlace: se indica y no hay botón de copiar.
 * El `title` del JSON no se dibuja: identifica el cupón al compartirlo.
 */
export function buildCouponCard(document, coupon) {
  const card = el(document, 'li', 'card coupon-card');
  card.id = coupon.id;

  if (coupon.exclusive) card.append(el(document, 'span', 'badge', 'Exclusivo'));
  card.append(el(document, 'p', 'coupon-card__brand', coupon.brand), el(document, 'h3', 'coupon-card__discount', coupon.discount));
  if (coupon.description) card.append(el(document, 'p', 'coupon-card__description', coupon.description));
  if (coupon.conditions) card.append(el(document, 'p', 'coupon-card__conditions', coupon.conditions));
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
    { collection: 'coupons', validator: validateCoupon, buildCard: buildCouponCard, section: 'cupones', titleOf: (coupon) => coupon.title, searchFields: () => COUPON_FIELDS },
    options,
  );
