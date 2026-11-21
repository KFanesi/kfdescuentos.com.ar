import { siteUrl } from './utils.js?v=bde872c9';

// Compartir. Los mensajes se anuncian en la región `aria-live` (#aviso) que ya existe en el HTML:
// una región insertada junto con su mensaje no se anuncia en los lectores de pantalla.
// El cupón no se puede copiar desde el sitio: se ve en la lista de Mercado Libre.

const LINK_COPIED = 'Enlace copiado';
const LINK_FAILED = 'No se pudo copiar el enlace';

export function announce(liveRegion, message) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  liveRegion.textContent = message;
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
 * El enlace apunta a KFDescuentos (`cupones/?id=…`), no a Mercado Libre, para que quien lo recibe conozca el sitio.
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
    const share = event.target.closest('[data-share]');
    if (share) {
      const { id } = share.closest('li');
      shareItem({ id, title: titles.get(id), section }, liveRegion, view);
    }
  });
}
