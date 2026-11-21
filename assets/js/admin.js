import { announce } from './actions.js?v=7a113a9a';
import { config } from './config.js?v=7a113a9a';
import { loadJson } from './data.js?v=7a113a9a';
import { el } from './dom.js?v=7a113a9a';
import { validateCoupon } from './schema.js?v=7a113a9a';
import { formatDate, isCalendarDate, isValidHttpsUrl, todayLocal } from './utils.js?v=7a113a9a';

// Página de administración (/admin/): arma el texto de assets/data/coupons.json para pegarlo en GitHub.
// Quien la usa no sabe de informática, así que todo mensaje está en español claro y el texto generado siempre es un
// JSON válido. Las funciones puras (slugify … serializeCoupons) no tocan el DOM; initAdmin las conecta con la página.
// No guarda nada en el navegador y no pide nada fuera del propio sitio (solo lee coupons.json).

const BRAND = 'Mercado Libre';
const DEFAULT_CONDITIONS = 'Revisá las condiciones y el vencimiento en Mercado Libre antes de usarlo.';
const DEBOUNCE_MS = 300;
const MAX_PROBLEMS_SHOWN = 3;

const EMPTY_TEXT = 'El texto está vacío. Si no querés ningún cupón, escribí solamente [] (dos corchetes).';
const CUT_TEXT = 'El texto parece estar cortado: falta cerrar una llave } o un corchete ] al final.';
const NOT_A_LIST = 'El texto tiene que ser una lista de cupones: tiene que empezar con [ y terminar con ].';
const NOT_A_COUPON = 'Este elemento no es un cupón: cada cupón tiene que ir entre llaves { }.';
const FORMAT_HINT = 'suele ser una coma, una comilla o una llave de más o de menos.';
const COPY_FAILED = 'No se pudo copiar: el texto quedó seleccionado, copialo con Cmd+C o Ctrl+C';
const COPY_BLOCKED = 'No se copió: el texto tiene un error de formato. Arreglalo (el aviso de arriba dice dónde) y volvé a copiar.';
const LOAD_FAILED =
  'No se pudieron cargar los cupones que ya están publicados. No pegues este texto en GitHub: perderías los cupones actuales. Recargá la página e intentá de nuevo.';

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const clean = (value) => (typeof value === 'string' ? value.trim() : '');
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

/** Minúsculas, sin tildes y con guiones: 'Corazón Ñandú' → 'corazon-nandu'. Caracteres como < o & se descartan. */
export function slugify(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** `cupon-<slug>`; si ese id ya existe agrega -2, -3… Un código sin letras ni números da `cupon`. */
export function newCouponId(code, existingIds = []) {
  const taken = new Set([...existingIds].filter((id) => typeof id === 'string'));
  const slug = slugify(code);
  const base = slug ? `cupon-${slug}` : 'cupon';
  if (!taken.has(base)) return base;
  for (let number = 2; ; number += 1) if (!taken.has(`${base}-${number}`)) return `${base}-${number}`;
}

const normalizeCode = (code) => clean(code).replace(/\s+/g, '').toUpperCase();

/**
 * Cupón completo a partir de lo que carga la persona. Se asume que `values` ya pasó validateInput.
 * El descuento se omite si viene vacío (las listas de Mercado Libre no lo informan) y el vencimiento queda en null.
 */
export function buildCoupon({ code, url, discount, conditions, expiresAt } = {}, { today, existingIds = [] } = {}) {
  const normalized = normalizeCode(code);
  const coupon = {
    id: newCouponId(normalized, existingIds),
    brand: BRAND,
    title: `Cupón ${normalized}`,
    code: normalized,
  };
  if (clean(discount)) coupon.discount = clean(discount);
  return {
    ...coupon,
    description: `Lista de productos de ${BRAND} para usar con el cupón ${normalized}.`,
    conditions: clean(conditions) || DEFAULT_CONDITIONS,
    exclusive: false,
    publishedAt: today,
    expiresAt: clean(expiresAt) || null,
    url: clean(url),
    active: true,
  };
}

/** Problemas de lo que se cargó en el formulario, en español claro y en el orden de los campos. Lista vacía = todo bien. */
export function validateInput(values = {}, { today } = {}) {
  const messages = [];
  const code = clean(values.code);
  if (!code) messages.push('Escribí el código del cupón.');
  else if (/\s/.test(code)) messages.push(`El código no puede tener espacios: escribilo todo junto, por ejemplo ${normalizeCode(code)}.`);

  const url = clean(values.url);
  if (!url) messages.push('Pegá el enlace de la lista de Mercado Libre.');
  else if (!isValidHttpsUrl(url)) messages.push('El enlace tiene que ser una dirección completa que empiece con https:// (copiala otra vez desde Mercado Libre).');

  const expiresAt = clean(values.expiresAt);
  if (expiresAt) {
    if (!isCalendarDate(expiresAt)) messages.push('La fecha de vencimiento no es válida: elegila desde el calendario o dejala vacía si no la sabés.');
    else if (isCalendarDate(today) && expiresAt < today) messages.push('La fecha de vencimiento ya pasó: elegí hoy o una fecha futura, o dejala vacía.');
  }
  return messages;
}

const lineOf = (text, position) => text.slice(0, position).split('\n').length;

// Chrome y Safari a veces no dan posición: dan un fragmento del texto cerca del error (`..."trozo" is not valid JSON`).
// El token ofensivo está más o menos a 10 caracteres del inicio del fragmento; se busca ese fragmento en el texto.
function lineFromSnippet(text, message) {
  const snippet = /, (?:\.\.\.)?"([\s\S]*)"(?:\.\.\.)? is not valid JSON$/.exec(message)?.[1];
  const token = /Unexpected token '([\s\S])'/.exec(message)?.[1];
  if (!snippet || !token) return null;
  const start = text.indexOf(snippet);
  if (start < 0) return null;
  const candidates = [...snippet].flatMap((char, index) => (char === token ? [index] : []));
  if (candidates.length === 0) return null;
  const closest = candidates.reduce((best, index) => (Math.abs(index - 10) < Math.abs(best - 10) ? index : best));
  return lineOf(text, start + closest);
}

/** Traduce el error de JSON.parse a un mensaje claro, con la línea aproximada cuando el navegador la informa. */
export function explainJsonError(text, error) {
  if (typeof text !== 'string' || text.trim() === '') return EMPTY_TEXT;
  const message = String(error?.message ?? '');
  if (/end of JSON|end of data|unexpected eof/i.test(message)) return CUT_TEXT;

  const position = /position (\d+)/.exec(message)?.[1];
  if (position !== undefined && Number(position) >= text.trimEnd().length) return CUT_TEXT;

  const explicit = /\bline (\d+)/.exec(message)?.[1];
  let line = explicit ? Number(explicit) : null;
  if (line === null && position !== undefined) line = lineOf(text, Number(position));
  if (line === null) line = lineFromSnippet(text, message);
  return line === null ? `Hay un error de formato en el texto: ${FORMAT_HINT}` : `Hay un error de formato cerca de la línea ${line}: ${FORMAT_HINT}`;
}

/** JSON con 2 espacios y un salto de línea final: así queda prolijo en GitHub y las diferencias se leen mejor. */
export const serializeCoupons = (items) => `${JSON.stringify(items, null, 2)}\n`;

// Traducción de los mensajes técnicos de schema.js a lo que entiende quien edita el archivo, con el nombre del campo entre comillas.
const DATE_HINT = 'una fecha real escrita año-mes-día, por ejemplo 2026-11-21';
const PLAIN_MESSAGES = [
  [/^falta id$/, 'Falta el campo "id" (el identificador del cupón, por ejemplo "cupon-corazon").'],
  [/^falta brand$/, 'Falta el campo "brand" (la marca, por ejemplo "Mercado Libre").'],
  [/^code debe ser/, 'El campo "code" tiene que ser el código entre comillas, por ejemplo "CORAZON", o null (sin comillas) si el cupón se aplica desde el enlace.'],
  [/^(\w+) debe ser texto$/, 'El campo "$1" tiene que ser un texto entre comillas.'],
  [/^exclusive debe ser/, 'El campo "exclusive" tiene que ser true o false, sin comillas.'],
  [/^publishedAt debe ser/, `El campo "publishedAt" tiene que ser ${DATE_HINT}.`],
  [/^expiresAt debe ser/, `El campo "expiresAt" tiene que ser ${DATE_HINT}, o null (sin comillas) si no vence.`],
  [/^url debe ser https$/, 'El campo "url" tiene que ser un enlace completo que empiece con "https://".'],
  [/^logo debe ser/, 'El campo "logo" tiene que ser un archivo de la carpeta assets/img.'],
  [/^active debe ser/, 'El campo "active" tiene que ser true o false, sin comillas.'],
];

function plainMessage(technical) {
  for (const [pattern, text] of PLAIN_MESSAGES) {
    const match = pattern.exec(technical);
    if (match) return text.replace('$1', match[1] ?? '');
  }
  return technical;
}

/**
 * Revisa el texto de coupons.json con las mismas reglas que usa el sitio (validateCoupon). Devuelve:
 * `{ ok, total, valid, problems: [{ index, id, messages }], items, error }`. `items` son TODOS los elementos de la lista (también los
 * que tienen problemas, para poder quitarlos), `index` empieza en 0 y `error` es el problema de formato de todo el texto (o null).
 * Un cupón vencido cuenta como problema: el sitio no lo muestra y conviene sacarlo de la lista.
 */
export function reviewCouponsText(text, { today } = {}) {
  const failure = (error) => ({ ok: false, total: 0, valid: 0, problems: [], items: [], error });
  if (typeof text !== 'string' || text.trim() === '') return failure(EMPTY_TEXT);
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return failure(explainJsonError(text, error));
  }
  if (!Array.isArray(data)) return failure(NOT_A_LIST);

  const seen = new Set();
  const problems = [];
  data.forEach((item, index) => {
    const record = isRecord(item);
    const messages = record ? validateCoupon(item).map(plainMessage) : [NOT_A_COUPON];
    if (messages.length === 0) {
      if (seen.has(item.id)) messages.push(`El id "${item.id}" está repetido: cada cupón necesita un id distinto.`);
      else seen.add(item.id);
    }
    if (messages.length === 0 && item.expiresAt && isCalendarDate(today) && item.expiresAt < today) {
      messages.push(`Venció el ${formatDate(item.expiresAt)}: el sitio ya no lo muestra. Quitalo de la lista.`);
    }
    if (messages.length > 0) problems.push({ index, id: record && isText(item.id) ? item.id : null, messages });
  });
  return { ok: problems.length === 0, total: data.length, valid: data.length - problems.length, problems, items: data, error: null };
}

// ---------------------------------------------------------------- Página

// Nombre con el que se muestra un cupón en la lista y en el botón "Quitar".
function labelOf(item, index) {
  if (!isRecord(item)) return `Cupón ${index + 1}`;
  if (isText(item.code)) return item.code;
  return isText(item.id) ? `Sin código (${item.id})` : `Cupón ${index + 1}`;
}

function buildItem(document, item, index, problem) {
  const label = labelOf(item, index);
  const li = document.createElement('li');
  li.append(el(document, 'span', 'admin-item__code', label));
  li.firstChild.setAttribute('data-admin-code', '');
  if (isRecord(item) && isCalendarDate(item.expiresAt)) li.append(' ', el(document, 'span', 'admin-item__expires', `Vence el ${formatDate(item.expiresAt)}`));
  const remove = el(document, 'button', 'btn btn--ghost', 'Quitar');
  remove.type = 'button';
  remove.setAttribute('data-admin-remove', '');
  remove.setAttribute('aria-label', `Quitar el cupón ${label}`);
  li.append(' ', remove);
  if (problem) li.setAttribute('data-admin-problem', '');
  return li;
}

function statusText(review) {
  if (review.error) return review.error;
  if (review.ok) return `Todo en orden: ${plural(review.valid, 'cupón válido', 'cupones válidos')}.`;
  const shown = review.problems.slice(0, MAX_PROBLEMS_SHOWN).map(({ index, id, messages }) => `Cupón ${index + 1}${id ? ` (${id})` : ''}: ${messages.join(' ')}`);
  const rest = review.problems.length - shown.length;
  return [`Hay ${plural(review.problems.length, 'cupón con problemas', 'cupones con problemas')}.`, ...shown, ...(rest > 0 ? [`y ${rest} más.`] : [])].join(' ');
}

/**
 * Conecta la página de administración. Contrato de markup (dentro de `root`, el `[data-admin]`): `form[data-admin-form]` con
 * `#a-code`, `#a-url`, `#a-discount`, `#a-conditions` y `#a-expires`; `[data-admin-errors]`, `[data-admin-status]`,
 * `ul[data-admin-list]`, `textarea[data-admin-json]` y `button[data-admin-copy]`; el aviso `#aviso` está en el documento.
 * `options`: { fetchFn, now, debounceMs } (inyectables para probar). Todo se arma con createElement/textContent.
 */
export async function initAdmin(root, { fetchFn, now, debounceMs = DEBOUNCE_MS } = {}) {
  const document = root.ownerDocument ?? root;
  const view = document.defaultView;
  const find = (selector) => root.querySelector(selector);
  const textarea = find('textarea[data-admin-json]');
  if (!textarea) return;
  const form = find('form[data-admin-form]');
  const errorsBox = find('[data-admin-errors]');
  const status = find('[data-admin-status]');
  const list = find('ul[data-admin-list]');
  const liveRegion = document.getElementById('aviso');
  const today = () => todayLocal(now ?? new Date());
  // El enlace de afiliado de las listas viene completo (el texto de ayuda lo promete) y se repone tras cada cupón agregado.
  const urlInput = find('#a-url');
  const fillUrl = () => { if (urlInput && !urlInput.value) urlInput.value = config.affiliate.listsUrl; };
  fillUrl();

  let loadFailed = false;
  let timer = null;

  const review = () => reviewCouponsText(textarea.value, { today: today() });

  function refresh() {
    clearTimeout(timer);
    const result = review();
    if (status) {
      const text = statusText(result);
      status.textContent = loadFailed ? `${LOAD_FAILED}${result.ok ? '' : ` ${text}`}` : text;
    }
    if (list) {
      const flagged = new Set(result.problems.map(({ index }) => index));
      list.replaceChildren(...result.items.map((item, index) => buildItem(document, item, index, flagged.has(index))));
    }
    return result;
  }

  function showErrors(messages) {
    if (!errorsBox) return;
    const tag = /^(UL|OL)$/.test(errorsBox.tagName) ? 'li' : 'p';
    errorsBox.replaceChildren(...messages.map((message) => el(document, tag, '', message)));
    errorsBox.hidden = messages.length === 0;
  }

  function setText(items) {
    textarea.value = serializeCoupons(items);
    return refresh();
  }

  textarea.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, debounceMs);
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = (id) => find(`#a-${id}`)?.value ?? '';
    const values = { code: value('code'), url: clean(value('url')) || config.affiliate.listsUrl, discount: value('discount'), conditions: value('conditions'), expiresAt: value('expires') };
    const messages = validateInput(values, { today: today() });
    // Un texto en blanco se toma como lista vacía; uno con error de formato no se toca: se pisaría a ciegas.
    const current = textarea.value.trim() === '' ? { items: [], error: null } : review();
    if (current.error && messages.length === 0) messages.push(`Antes de agregar un cupón, arreglá el texto de abajo: ${current.error}`);
    showErrors(messages);
    if (messages.length > 0) return;

    const existingIds = current.items.map((item) => (isRecord(item) ? item.id : undefined));
    const coupon = buildCoupon(values, { today: today(), existingIds });
    // Los cupones nuevos van primero: la home muestra los primeros del archivo.
    setText([coupon, ...current.items]);
    form.reset();
    fillUrl();
    announce(liveRegion, 'Cupón agregado');
    find('#a-code')?.focus();
  });

  list?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-admin-remove]');
    if (!button) return;
    const index = [...list.children].indexOf(button.closest('li'));
    const current = review();
    if (index < 0 || current.error) return;
    setText(current.items.filter((_, position) => position !== index));
    announce(liveRegion, 'Cupón quitado');
    const buttons = list.querySelectorAll('[data-admin-remove]');
    (buttons[Math.min(index, buttons.length - 1)] ?? textarea).focus();
  });

  find('button[data-admin-copy]')?.addEventListener('click', async () => {
    if (review().error) {
      announce(liveRegion, COPY_BLOCKED);
      return;
    }
    try {
      // writeText se llama antes de cualquier await: conserva la activación del clic que exige el navegador.
      await view.navigator.clipboard.writeText(textarea.value);
      announce(liveRegion, 'Texto copiado');
    } catch {
      textarea.focus();
      textarea.select();
      announce(liveRegion, COPY_FAILED);
    }
  });

  // Carga del archivo actual. Mientras tanto el texto no se puede editar: lo escrito se perdería al llegar la respuesta.
  // `fresh`: sin ?v= y con cache: no-store. Una lista vieja (la del hash sellado o la de la caché de Cloudflare) haría
  // que quien administra pegue un archivo sin los cupones que se publicaron después y los pise.
  textarea.readOnly = true;
  const loaded = await loadJson('coupons', { document, fetchFn, fresh: true });
  loadFailed = !loaded.ok;
  textarea.value = serializeCoupons(loaded.items);
  textarea.readOnly = false;
  refresh();
}
