import { isValidHttpsUrl } from './utils.js?v=689f9192';

// Datos de runtime del sitio. Nunca se inventa un valor: lo que falta queda en null y no se renderiza.
export const config = {
  locale: 'es-AR', // PENDIENTE: confirmar con el dueño (es el valor propuesto en el prompt maestro)
  currency: 'ARS', // PENDIENTE: confirmar con el dueño
  social: {
    whatsapp: 'https://whatsapp.com/channel/0029VbDdL6aATRSxLotGXr2l', // canal de WhatsApp (no un chat)
    x: 'https://x.com/KFDescuentos',
    instagram: 'https://www.instagram.com/kfdescuentos/',
  },
  contactEmail: null, // PENDIENTE: correo de contacto
};

// Nombre visible y descripción corta de cada red. WhatsApp es un canal: decir "WhatsApp" a secas prometería un chat.
const SOCIALS = {
  whatsapp: { name: 'Canal de WhatsApp', description: 'Novedades de cupones en nuestro canal' },
  x: { name: 'X', description: 'Novedades del sitio en X' },
  instagram: { name: 'Instagram', description: 'Novedades del sitio en Instagram' },
};

/** Redes listas para mostrar: solo las que tienen una URL https válida, en el orden de config.social. */
export function activeSocials(settings) {
  return Object.entries(settings?.social ?? {})
    .filter(([key, url]) => key in SOCIALS && isValidHttpsUrl(url))
    .map(([key, url]) => ({ key, ...SOCIALS[key], url }));
}
