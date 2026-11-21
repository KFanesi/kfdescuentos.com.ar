// Carrusel con desplazamiento nativo: la lista (`ul`) es la que scrollea y los botones solo la empujan una tarjeta.
// Los botones son <button>, así que Enter y Espacio funcionan sin código extra. Sin JS o sin desborde quedan ocultos.

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Distancia de una tarjeta, separación incluida: lo que separa el inicio de la primera del de la segunda. */
function cardStep(track) {
  const [first, second] = track.children;
  if (!first) return 0;
  return second ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
}

export function initCarousel(root) {
  const track = root.querySelector('ul');
  const prev = root.querySelector('.carousel__btn--prev');
  const next = root.querySelector('.carousel__btn--next');
  if (!track || !prev || !next) return;
  const view = root.ownerDocument.defaultView;

  const refresh = () => {
    const overflows = track.scrollWidth > track.clientWidth;
    prev.hidden = !overflows;
    next.hidden = !overflows;
  };
  const scroll = (direction) => {
    // Se consulta en cada clic: la preferencia puede cambiar mientras la página está abierta.
    const behavior = view.matchMedia(REDUCED_MOTION).matches ? 'auto' : 'smooth';
    track.scrollBy({ left: direction * cardStep(track), behavior });
  };

  prev.addEventListener('click', () => scroll(-1));
  next.addEventListener('click', () => scroll(1));
  view.addEventListener('resize', refresh);
  new view.MutationObserver(refresh).observe(track, { childList: true });
  refresh();
}
