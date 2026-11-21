// Funciones puras (sin DOM) para fechas, vencimientos, URLs, búsqueda y parámetros de la página.

const PARAM_KEYS = ['q', 'id'];

const pad = (number) => String(number).padStart(2, '0');

/** Fecha calendario LOCAL como AAAA-MM-DD (getters locales, no toISOString, que da la fecha UTC). */
export function todayLocal(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// Valida el calendario sin `new Date("AAAA-MM-DD")`, que se interpreta como UTC y corre el día en UTC-3.
/** ¿Es una fecha AAAA-MM-DD que existe en el calendario? */
export function isCalendarDate(value) {
  const match = typeof value === 'string' ? DATE_PATTERN.exec(value) : null;
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const probe = new Date(year, month - 1, day);
  return probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day;
}

/** AAAA-MM-DD → DD/MM/AAAA, cortando el texto (sin Date, que correría el día en UTC-3). Una fecha inválida da ''. */
export function formatDate(value) {
  if (!isCalendarDate(value)) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * ¿Venció? `expiresAt` es AAAA-MM-DD, inclusivo: durante todo ese día sigue vigente. `today` es AAAA-MM-DD (ver todayLocal).
 * null/undefined = no vence. Una fecha inválida cuenta como vencida: ante la duda no se publica un cupón sin garantía de vigencia.
 * Como AAAA-MM-DD ordena igual que el calendario, se comparan los strings directamente.
 */
export function isExpired(expiresAt, today) {
  if (!isCalendarDate(today)) throw new TypeError(`today debe ser AAAA-MM-DD: ${String(today)}`);
  if (expiresAt === null || expiresAt === undefined) return false;
  if (!isCalendarDate(expiresAt)) return true;
  return expiresAt < today;
}

/** Solo URLs https absolutas y válidas (rechaza javascript:, http:, relativas, vacías y no strings). */
export function isValidHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Minúsculas, sin tildes ni diacríticos (también la ñ pasa a n) y espacios colapsados: para comparar búsquedas. */
export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Entero mayor a 0 leído de un atributo (`data-limit`, `data-page-size`); cualquier otra cosa da null. */
export function positiveInt(value) {
  const number = Number.parseInt(value, 10);
  return number > 0 ? number : null;
}

const cleanValue = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

/** Lee ?q=&id= (solo esas claves; los vacíos se omiten; gana el primer valor repetido). */
export function readParams(search) {
  const source = new URLSearchParams(typeof search === 'string' ? search : '');
  const result = {};
  for (const key of PARAM_KEYS) {
    const value = cleanValue(source.get(key));
    if (value !== null) result[key] = value;
  }
  return result;
}

/** Construye la query ('?q=…' o '' si no queda nada) con el mismo criterio que readParams y en orden estable. */
export function writeParams(params) {
  const target = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = cleanValue(params?.[key]);
    if (value !== null) target.set(key, value);
  }
  const query = target.toString();
  return query ? `?${query}` : '';
}

/**
 * URL absoluta de una ruta del sitio, calculada desde la ubicación de este módulo (`assets/js/`): sirve igual en la raíz
 * de un dominio que bajo un prefijo de ruta (GitHub Pages de proyecto), sin escribir el prefijo en el código.
 * Una barra inicial se ignora: la ruta es relativa a la raíz del sitio, no a la del origen.
 */
export function siteUrl(path, from = import.meta.url) {
  return new URL(path.replace(/^\//, ''), new URL('../../', from)).href;
}
