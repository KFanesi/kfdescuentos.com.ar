import { isExpired, siteUrl, todayLocal } from './utils.js?v=ccd82370';
import { validateAll, validateCategory } from './schema.js?v=ccd82370';

// Carga de los JSON de datos. Ninguna función lanza: un JSON caído, inexistente o inválido es un estado más de la página
// ({ ok: false }) y no un error sin capturar, así el resto del sitio sigue funcionando.

/** Versión de los datos que `npm run build` escribe en <meta name="data-version">; vacía mientras no se haya sellado. */
const dataVersion = (document) => document.querySelector('meta[name="data-version"]')?.getAttribute('content')?.trim() ?? '';

/**
 * Pide `<base>assets/data/<name>.json`. La base sale de la ubicación del módulo (siteUrl), no de una ruta escrita:
 * el sitio puede vivir bajo un prefijo de ruta. Con versión, agrega `?v=` para saltear la caché de Cloudflare.
 * Devuelve `{ ok, items, error }`.
 */
export async function loadJson(name, { document, fetchFn = globalThis.fetch } = {}) {
  try {
    const url = new URL(siteUrl(`assets/data/${name}.json`));
    const version = dataVersion(document);
    if (version) url.searchParams.set('v', version);
    const response = await fetchFn(url.href);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error('el JSON debe ser una lista');
    return { ok: true, items, error: null };
  } catch (error) {
    console.warn(`[datos] no se pudo cargar ${name}.json: ${error.message}`);
    return { ok: false, items: [], error: error.message };
  }
}

/** Solo lo publicable: activo y sin vencer. `today` es AAAA-MM-DD local; `expiresAt` es inclusivo (ver isExpired). */
export const filterVisible = (items, today) => items.filter((item) => item.active && !isExpired(item.expiresAt, today));

/**
 * Carga, valida y filtra una colección. Con `withCategories` también pide categories.json, que hace falta para validar
 * la categoría de cada producto: sin ella no se puede garantizar nada y se informa como fallo de carga.
 */
export async function loadCollection(name, validator, { document, fetchFn, now = new Date(), withCategories = false } = {}) {
  const options = { document, fetchFn };
  let categories = [];
  if (withCategories) {
    const loaded = await loadJson('categories', options);
    if (!loaded.ok) return loaded;
    categories = validateAll(loaded.items, validateCategory, { label: 'categories' });
  }
  const loaded = await loadJson(name, options);
  if (!loaded.ok) return loaded;
  const valid = validateAll(loaded.items, validator, { categories, label: name });
  const result = { ok: true, items: filterVisible(valid, todayLocal(now)), error: null };
  // Los listados de productos necesitan las categorías (filtro y nombre visible) sin pedir el JSON dos veces.
  return withCategories ? { ...result, categories } : result;
}
