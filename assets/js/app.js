import { activeSocials, config } from './config.js?v=e094531e';

/** Menú móvil: sin JS el botón queda oculto y la nav visible; con JS se muestra el botón y la nav se alterna. */
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

  toggle.hidden = false;
  setOpen(false);
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a') && nav.classList.contains('is-open')) setOpen(false, { restoreFocus: true });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) setOpen(false, { restoreFocus: true });
  });
}

/** Rellena las redes del pie con nodos creados (nunca HTML) y muestra el bloque solo si hay alguna. */
export function initSocial(document, socials) {
  const container = document.querySelector('[data-social]');
  const list = container?.querySelector('.social-list');
  if (!container || !list || socials.length === 0) return;

  for (const { name, url } of socials) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = name;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.setAttribute('aria-label', `${name} (se abre en una pestaña nueva)`);
    const item = document.createElement('li');
    item.append(link);
    list.append(item);
  }
  container.hidden = false;
}

export function initYear(document, now = new Date()) {
  const year = document.querySelector('.copyright [data-year]');
  if (year) year.textContent = String(now.getFullYear());
}

// El guard permite importar el módulo en tests (Node) sin DOM global.
if (typeof document !== 'undefined') {
  document.documentElement.classList.add('js');
  initMenu(document);
  initSocial(document, activeSocials(config));
  initYear(document);
}
