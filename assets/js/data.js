import { isExpired, siteUrl, todayLocal } from './utils.js?v=7a113a9a';
import { validateAll } from './schema.js?v=7a113a9a';

// Carga de los JSON de datos. Ninguna función lanza: un JSON caído, inexistente o inválido es un estado más de la página
// ({ ok: false }) y no un error sin capturar, así el resto del sitio sigue funcionando.

/** Versión de los datos que `npm run build` escribe en <meta name="data-version">; vacía mientras no se haya sellado. */
const dataVersion = (document) => document.querySelector('meta[name="data-version"]')?.getAttribute('content')?.trim() ?? '';

/**
 * Pide `<base>assets/data/<name>.json`. La base sale de la ubicación del módulo (siteUrl), no de una ruta escrita:
 * el sitio puede vivir bajo un prefijo de ruta. Con versión, agrega `?v=` para saltear la caché de Cloudflare.
 * Con `fresh: true` no se usa la versión ni la caché (`cache: 'no-store'`): es para quien edita los datos (/admin/),
 * que nunca debe partir de una copia vieja. Sin `fresh` el comportamiento es el de siempre.
 * Devuelve `{ ok, items, error }`.
 */
export async function loadJson(name, { document, fetchFn = globalThis.fetch, fresh = false } = {}) {
  try {
    const url = new URL(siteUrl(`assets/data/${name}.json`));
    const version = fresh ? '' : dataVersion(document);
    if (version) url.searchParams.set('v', version);
    const response = await (fresh ? fetchFn(url.href, { cache: 'no-store' }) : fetchFn(url.href));
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

/** Carga, valida y filtra una colección: solo queda lo publicable (válido, activo y sin vencer). */
export async function loadCollection(name, validator, { document, fetchFn, now = new Date() } = {}) {
  const loaded = await loadJson(name, { document, fetchFn });
  if (!loaded.ok) return loaded;
  const valid = validateAll(loaded.items, validator, { label: name });
  return { ok: true, items: filterVisible(valid, todayLocal(now)), error: null };
}
