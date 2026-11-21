import { siteUrl } from './utils.js?v=689f9192';

// Copiar código y compartir. Los mensajes se anuncian en la región `aria-live` (#aviso) que ya existe en el HTML:
// una región insertada junto con su mensaje no se anuncia en los lectores de pantalla.

const COPIED_LABEL = '¡Cupón copiado!';
const COPY_FAILED = 'No se pudo copiar, el código quedó seleccionado';
const LINK_COPIED = 'Enlace copiado';
const LINK_FAILED = 'No se pudo copiar el enlace';
const FEEDBACK_MS = 2500;

// Etiqueta original y temporizador de cada botón: si se copia dos veces seguidas, no se toma "¡Cupón copiado!" como etiqueta.
const buttonState = new WeakMap();

function announce(liveRegion, message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  liveRegion.textContent = message;
}

function showCopied(button) {
  const state = buttonState.get(button) ?? { label: button.textContent, timer: null };
  clearTimeout(state.timer);
  button.classList.add('is-copied');
  button.textContent = COPIED_LABEL;
  state.timer = setTimeout(() => {
    button.classList.remove('is-copied');
    button.textContent = state.label;
  }, FEEDBACK_MS);
  buttonState.set(button, state);
}

// Plan B si el portapapeles no está disponible: deja el código seleccionado para que la persona lo copie a mano.
function selectCode(button) {
  const code = button.closest('li')?.querySelector('code');
  const view = button.ownerDocument.defaultView;
  if (!code || !view) return;
  const range = button.ownerDocument.createRange();
  range.selectNodeContents(code);
  const selection = view.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Copia el código. `writeText` se llama de forma síncrona (antes de cualquier await) para conservar la activación
 * del usuario que exige el navegador. Nunca rechaza: si falla, selecciona el código y lo avisa.
 */
export async function copyCode(code, button, liveRegion) {
  try {
    await button.ownerDocument.defaultView.navigator.clipboard.writeText(code);
    showCopied(button);
    announce(liveRegion, COPIED_LABEL);
  } catch {
    selectCode(button);
    announce(liveRegion, COPY_FAILED);
  }
}

async function copyLink(url, view, liveRegion) {
  try {
    await view.navigator.clipboard.writeText(url);
    announce(liveRegion, LINK_COPIED);
  } catch {
    announce(liveRegion, LINK_FAILED);
  }
}

/**
 * Comparte un ítem con la Web Share API; sin ella (o si falla por otro motivo que cancelar) copia el enlace.
 * El enlace apunta a KFDescuentos (`cupones/?id=…`, `productos/?id=…`), no a Mercado Libre, para que quien lo recibe conozca el sitio.
 * `item` = { id, title, section }. Cancelar el diálogo (AbortError) no es un error: no se muestra nada.
 */
export async function shareItem({ id, title, section }, liveRegion, view = globalThis) {
  const url = siteUrl(`${section}/?id=${encodeURIComponent(id)}`);
  if (typeof view.navigator.share === 'function') {
    try {
      await view.navigator.share({ title, url });
      return;
    } catch (error) {
      if (error?.name === 'AbortError') return;
    }
  }
  await copyLink(url, view, liveRegion);
}

/** Un solo oyente en el contenedor sirve a todas las tarjetas, también a las que se agreguen después. `titles`: id → título para compartir. */
export function bindActions(container, { liveRegion, section, titles }) {
  const view = container.ownerDocument.defaultView;
  container.addEventListener('click', (event) => {
    const copy = event.target.closest('[data-copy]');
    if (copy) {
      copyCode(copy.closest('li').querySelector('code').textContent, copy, liveRegion);
      return;
    }
    const share = event.target.closest('[data-share]');
    if (share) {
      const { id } = share.closest('li');
      shareItem({ id, title: titles.get(id), section }, liveRegion, view);
    }
  });
}
