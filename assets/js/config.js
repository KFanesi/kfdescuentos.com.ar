import { isValidHttpsUrl } from './utils.js?v=e094531e';

// Datos de runtime del sitio. Nunca se inventa un valor: lo que falta queda en null y no se renderiza.
export const config = {
  locale: 'es-AR', // PENDIENTE: confirmar con el dueño (es el valor propuesto en el prompt maestro)
  currency: 'ARS', // PENDIENTE: confirmar con el dueño
  social: {
    whatsapp: null, // PENDIENTE: URL https (por ejemplo https://wa.me/<número>)
    x: null, // PENDIENTE: URL https del perfil
    instagram: null, // PENDIENTE: URL https del perfil
  },
  contactEmail: null, // PENDIENTE: correo de contacto
};

const SOCIAL_NAMES = { whatsapp: 'WhatsApp', x: 'X', instagram: 'Instagram' };

/** Redes listas para mostrar: solo las que tienen una URL https válida, en el orden de config.social. */
export function activeSocials(settings) {
  return Object.entries(settings?.social ?? {})
    .filter(([key, url]) => key in SOCIAL_NAMES && isValidHttpsUrl(url))
    .map(([key, url]) => ({ name: SOCIAL_NAMES[key], url }));
}
