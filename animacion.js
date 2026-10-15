// ============================================================
// ANIMACION.JS — ARCHIVO GENERAL (compartido). Usa GSAP.
// Anima el "marco" de cada capítulo (título, bajada, pestañas, leyendas) y el
// popover de "Fuente". NO toca los gráficos ni el contenido de cada módulo
// (esos siguen con sus propias animaciones).
//
// Reglas para no mover el tamaño de las tarjetas (nada de scroll vertical):
//   - solo se animan opacity y transform (no cambian el alto/ancho de nada);
//   - los desplazamientos son chicos (8 a 14 px) y .chapter ya recorta con overflow:hidden;
//   - al terminar cada animación se limpian los estilos en línea (clearProps),
//     así el CSS de cada módulo queda como estaba.
//
// Se activa cuando un capítulo pasa a estar visible. La PRIMERA vez de cada módulo
// la maneja transicion.js (bolitas); acá se anima desde la segunda vez en adelante.
// Si GSAP no carga, o el sistema pide "reducir movimiento", no hace nada y el sitio
// funciona igual que antes.
// ============================================================
(function () {
  'use strict';
  if (!window.gsap) return;

  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
  const puede = () => !reducir.matches;

  // Qué se anima en cada capítulo (el marco, no el contenido)
  const ENCABEZADO = '.chapter-eyebrow, .chapter-title';
  const TARJETA = [
    '.ui-card-title',
    '.ui-sub',
    '.ui-tabs .ui-tab',
    '.em-tabs .em-tab',
    '.ui-seg',
    '.ui-field',
    '.ui-legend',
    '.ui-note',
  ].join(', ');
  const LIMPIAR = 'opacity,transform,transition';

  // Elementos de un panel que no se ve (pestaña inactiva) no se animan
  function visibles(lista) {
    return Array.from(lista).filter((el) => !el.closest('.ui-tabpanel:not(.active)'));
  }

  // Varios de estos elementos tienen "transition: all" en el CSS: si no se apaga mientras
  // GSAP los mueve, el CSS "suaviza" cada cuadro y la animación se siente pesada.
  function sinTransicion(els) {
    els.forEach((el) => (el.style.transition = 'none'));
  }
  function limpiar(els) {
    gsap.set(els, { clearProps: LIMPIAR });
  }

  const corriendo = new WeakMap(); // capítulo -> animación en curso

  function parar(cap) {
    const anim = corriendo.get(cap);
    if (!anim) return;
    anim.tl.kill();
    limpiar(anim.els);
    corriendo.delete(cap);
  }

  function entrarCapitulo(cap) {
    parar(cap);
    // Primera vez del módulo: la hace transicion.js (esconde título y tarjeta mientras corre)
    if (cap.classList.contains('tr-h') || cap.classList.contains('tr-c')) return;
    if (!puede()) return;

    const cab = visibles(cap.querySelectorAll(ENCABEZADO));
    const tar = visibles(cap.querySelectorAll(TARJETA));
    const todos = cab.concat(tar);
    if (!todos.length) return;

    sinTransicion(todos);
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        limpiar(todos);
        corriendo.delete(cap);
      },
    });
    if (cab.length) tl.from(cab, { opacity: 0, y: 14, duration: 0.6, stagger: 0.09 });
    if (tar.length) {
      tl.from(tar, { opacity: 0, y: 10, duration: 0.5, stagger: 0.05 }, cab.length ? '-=0.4' : 0);
    }
    corriendo.set(cap, { tl: tl, els: todos });
  }

  // Detecta cuándo un capítulo pasa de oculto a visible (script.js le pone la clase "active")
  const obs = new MutationObserver((muts) => {
    muts.forEach((m) => {
      const cap = m.target;
      const antes = /(^|\s)active(\s|$)/.test(m.oldValue || '');
      const ahora = cap.classList.contains('active');
      if (!antes && ahora) entrarCapitulo(cap);
      else if (antes && !ahora) parar(cap);
    });
  });
  document.querySelectorAll('.chapter').forEach((cap) => {
    obs.observe(cap, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });

  // Popover de "Fuente": aparece con un fundido corto + un pequeño desliz.
  // (El <p> está en position:absolute, así que no empuja nada ni cambia el tamaño de la tarjeta.)
  // "toggle" no burbujea: se escucha en la fase de captura.
  document.addEventListener(
    'toggle',
    (e) => {
      const d = e.target;
      if (!d.classList || !d.classList.contains('ui-src') || !d.open || !puede()) return;
      const p = d.querySelector('p');
      if (!p) return;
      gsap.fromTo(
        p,
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.28,
          ease: 'power2.out',
          overwrite: true,
          clearProps: 'opacity,transform',
        },
      );
    },
    true,
  );
})();
