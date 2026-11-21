import { config } from './config.js?v=eae5bc3b';
import { buildActions, el } from './dom.js?v=eae5bc3b';
import { mountList } from './list.js?v=eae5bc3b';
import { validateProduct } from './schema.js?v=eae5bc3b';
import { productFields } from './search.js?v=eae5bc3b';
import { discountPercent, formatDate, formatPrice, siteUrl } from './utils.js?v=eae5bc3b';

// El JSON no trae las medidas de la foto: estos atributos solo reservan un recuadro cuadrado (el CSS lo recorta con
// object-fit) para que la página no se mueva al cargar la imagen.
const IMAGE_SIZE = 400;

/** Tarjeta de un producto (el CSS usa estas clases). El porcentaje de descuento se calcula acá: no está en el JSON. */
export function buildProductCard(document, product, settings = config) {
  const card = el(document, 'li', 'card product-card');
  card.id = product.id;

  const media = el(document, 'div', 'product-card__media');
  if (product.image) {
    const img = el(document, 'img');
    img.src = siteUrl(product.image);
    img.alt = product.imageAlt;
    img.width = IMAGE_SIZE;
    img.height = IMAGE_SIZE;
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    media.append(img);
  } else {
    media.classList.add('product-card__media--empty');
  }
  card.append(media);

  const percent = discountPercent(product.price, product.originalPrice);
  if (percent !== null) card.append(el(document, 'span', 'badge badge--descuento', `-${percent}%`));
  card.append(el(document, 'h3', 'product-card__title', product.name));

  const price = el(document, 'p', 'product-card__price');
  price.append(el(document, 'span', 'price', formatPrice(product.price, settings)));
  if (percent !== null) price.append(' ', el(document, 's', 'price price--old', formatPrice(product.originalPrice, settings)));
  card.append(price);

  card.append(el(document, 'p', 'product-card__checked', `Precio verificado el ${formatDate(product.priceCheckedAt)}. Puede variar en Mercado Libre.`));
  card.append(buildActions(document, { prefix: 'product-card', url: product.url, label: 'Ver oferta', linkVariant: 'primary' }));
  return card;
}

/** Llena `ul[data-products]` (opcionales `data-limit`, `data-featured` y `data-paginated` para el listado con filtros) con los productos vigentes. No rechaza nunca. */
export function initProducts(container, options) {
  const onlyFeatured = container.hasAttribute('data-featured');
  return mountList(
    container,
    {
      collection: 'products',
      validator: validateProduct,
      withCategories: true,
      select: (items) => (onlyFeatured ? items.filter((product) => product.featured) : items),
      buildCard: (document, product) => buildProductCard(document, product),
      section: 'productos',
      titleOf: (product) => product.name,
      searchFields: productFields,
      crossLinkCoupons: true,
    },
    options,
  );
}
