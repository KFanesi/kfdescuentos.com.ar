import { activeSocials, config } from './config.js?v=6e67dc66';
import { initCoupons } from './coupons.js?v=6e67dc66';
import { el } from './dom.js?v=6e67dc66';
import { siteUrl } from './utils.js?v=6e67dc66';

/** Menú móvil: el botón nace visible y la nav colapsada (así el header no cambia de alto al cargar el JS); abre y cierra la nav. Sin JS, `sin-js.css` (dentro de <noscript>) deja la nav siempre visible. */
export function initMenu(document) {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#menu-principal');
  if (!toggle || !nav) return;

  // Una sola función cambia clase y aria-expanded juntos, para que nunca queden inconsistentes.
  const setOpen = (open, { restoreFocus = false } = {}) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) toggle.focus();
  };

  setOpen(false);
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a') && nav.classList.contains('is-open')) setOpen(false, { restoreFocus: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false, { restoreFocus: true });
  });
}

function buildSocialItem(document, { key, name, url }) {
  const link = el(document, 'a', 'social-link');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${name} (se abre en una pestaña nueva)`);
  const icon = el(document, 'img', 'social-link__icon');
  icon.alt = '';
  icon.src = siteUrl(`assets/icons/${key}.svg`);
  link.append(icon);
  const item = document.createElement('li');
  item.append(link);
  return item;
}

/**
 * Rellena todos los `[data-social]` (pie, panel de la home y página de contacto) con nodos creados, nunca HTML,
 * y los muestra solo si hay alguna red. Si el contenedor no trae su `ul.social-list`, la crea.
 */
export function initSocial(document, socials) {
  if (socials.length === 0) return;
  for (const container of document.querySelectorAll('[data-social]')) {
    let list = container.querySelector('.social-list');
    if (!list) {
      list = el(document, 'ul', 'social-list');
      container.append(list);
    }
    list.replaceChildren(...socials.map((social) => buildSocialItem(document, social)));
    container.hidden = false;
  }
}

export function initYear(document, now = new Date()) {
  const year = document.querySelector('.copyright [data-year]');
  if (year) year.textContent = String(now.getFullYear());
}

/**
 * Corre una inicialización aislada: un error (síncrono o de una promesa) se informa con console.warn y no frena a las
 * demás, así un módulo roto no deja sin menú o sin redes al resto de la página.
 */
export async function safeInit(name, init) {
  try {
    await init();
  } catch (error) {
    console.warn(`[${name}] no se pudo iniciar: ${error.message}`);
  }
}

/** Arranca todo lo que la página tenga: menú, redes, año y, si existen sus contenedores, cupones. */
export async function initPage(document, { fetchFn, now = new Date() } = {}) {
  const options = { fetchFn, now };
  const jobs = [
    safeInit('menú', () => initMenu(document)),
    safeInit('redes', () => initSocial(document, activeSocials(config))),
    safeInit('año', () => initYear(document, now)),
    ...[...document.querySelectorAll('[data-coupons]')].map((container) => safeInit('cupones', () => initCoupons(container, options))),
  ];
  await Promise.all(jobs);
}

// El guard permite importar el módulo en tests (Node) sin DOM global.
if (typeof document !== 'undefined') initPage(document);
