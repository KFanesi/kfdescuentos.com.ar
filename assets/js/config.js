import { isValidHttpsUrl } from './utils.js?v=7a113a9a';

// Datos de runtime del sitio. Nunca se inventa un valor: lo que falta queda en null y no se renderiza.
export const config = {
  social: {
    whatsapp: 'https://whatsapp.com/channel/0029VbDdL6aATRSxLotGXr2l', // canal de WhatsApp (no un chat)
    x: 'https://x.com/KFDescuentos',
    instagram: 'https://www.instagram.com/kfdescuentos/',
  },
  affiliate: {
    // Enlace de afiliado de las listas de cupones, tal como lo entrega Mercado Libre. NO se modifica ni se le agregan
    // parámetros: cualquier cambio puede hacer que la comisión no se registre. Lo usa la página de administración (/admin/).
    listsUrl: 'https://meli.la/1hVcei8',
  },
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
