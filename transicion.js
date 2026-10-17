// ============ TRANSICION.JS — ARCHIVO GENERAL (compartido) ============
// Barra de capítulos, animación de entrada de cada módulo (solo la 1ª vez), efectos de sonido y música de fondo con sus botones. Si no carga, el sitio funciona igual.
(function () {
  'use strict';

  // ---------- EFECTOS DE SONIDO: archivo (carpeta sonidos/) y volumen de 0 a 1 de cada uno ----------
  const SONIDOS = {
    carga: { src: 'sonidos/carga.MP3', vol: 0.5 }, // en la intro, cuando aparece el título principal
    modulo: { src: 'sonidos/modulo.MP3', vol: 0.5 }, // al cambiar de módulo
    pestana: { src: 'sonidos/pestana.MP3', vol: 0.4 }, // al cambiar de pestaña
    final: { src: 'sonidos/final.MP3', vol: 0.6 }, // al tocar "una última cosa"
  };
  const audios = {};
  let silenciado = false;
  try {
    silenciado = sessionStorage.getItem('sfxSilencio') === '1';
  } catch (e) {}

  Object.keys(SONIDOS).forEach((nombre) => {
    // "carga" ya empezó a cargarse (y a sonar) desde el <head> de index.html: se reutiliza ese audio
    const a = (nombre === 'carga' && window.__sfxCarga) || new Audio(SONIDOS[nombre].src);
    a.preload = 'auto';
    a.volume = SONIDOS[nombre].vol;
    a.addEventListener('error', () =>
      console.warn('No se pudo cargar el sonido:', SONIDOS[nombre].src),
    );
    audios[nombre] = a;
  });

  // El sonido "modulo" suena solo la primera vez que se entra a cada módulo (se toma el círculo de la barra recién tocado, o el capítulo activo).
  const moduloSonado = new Set();
  const itemsBarra = () => Array.from(document.querySelectorAll('.side-nav .nav-item'));
  let destino = { idx: -1, t: 0 };
  document.addEventListener(
    'click',
    (e) => {
      const it = e.target.closest && e.target.closest('.side-nav .nav-item');
      if (it) destino = { idx: itemsBarra().indexOf(it), t: Date.now() };
    },
    true,
  );
  function sfx(nombre) {
    if (nombre === 'modulo') {
      const tocado = Date.now() - destino.t < 1500 ? destino.idx : -1;
      const decidir = (idx) => {
        if (idx >= 0) {
          if (moduloSonado.has(idx)) return;
          moduloSonado.add(idx);
        }
        reproducir('modulo');
      };
      if (tocado >= 0) decidir(tocado);
      else
        setTimeout(() => decidir(itemsBarra().findIndex((i) => i.classList.contains('active'))), 0);
      return;
    }
    reproducir(nombre);
  }
  function reproducir(nombre) {
    const a = audios[nombre];
    if (silenciado || !a) return;
    try {
      a.currentTime = 0;
    } catch (e) {}
    a.play().catch(() => {}); // si el navegador lo bloquea o falta el archivo, no pasa nada
  }

  // Botón de efectos (megáfono, en la barra): silencia o activa los efectos. No toca la música.
  const btnSfx = document.getElementById('navSfx');
  // Actualiza ícono, texto para lectores de pantalla y cartelito (data-tip) de un botón de sonido
  function pintarBoton(btn, apagado, nombre, tipOn, tipOff) {
    if (!btn) return;
    btn.setAttribute('aria-pressed', apagado ? 'true' : 'false');
    btn.setAttribute('aria-label', (apagado ? 'Activar ' : 'Silenciar ') + nombre);
    btn.dataset.tip = apagado ? tipOff : tipOn;
  }
  function pintarSilencio() {
    pintarBoton(btnSfx, silenciado, 'efectos de sonido', 'Efectos de sonido: activados', 'Efectos de sonido: silenciados');
  }
  if (btnSfx) {
    btnSfx.addEventListener('click', () => {
      silenciado = !silenciado;
      try {
        sessionStorage.setItem('sfxSilencio', silenciado ? '1' : '0');
      } catch (e) {}
      if (silenciado) {
        Object.keys(audios).forEach((n) => audios[n].pause());
        subirMusica(); // si estaba bajada por el sonido final, vuelve a su volumen
      }
      pintarSilencio();
    });
  }
  pintarSilencio();

  // ---------- MÚSICA DE FONDO ----------
  // Loop desde que se entra a la experiencia (script.js llama a Transicion.musica()); el botón de la nota la prende o apaga con fundido y se recuerda en la sesión.
  const MUSICA = { src: 'sonidos/musica.mp3', vol: 0.25 }; // cambiá acá el archivo y el volumen (0 a 1)
  const musica = new Audio(MUSICA.src);
  musica.loop = true;
  musica.preload = 'auto';
  musica.volume = 0;
  musica.addEventListener('error', () => console.warn('No se pudo cargar la música:', MUSICA.src));
  const btnMusica = document.getElementById('navMusica');
  let musicaOff = false;
  try {
    musicaOff = sessionStorage.getItem('musicaSilencio') === '1';
  } catch (e) {}
  let musicaLista = false; // true cuando ya se entró a la experiencia
  let volMusica = MUSICA.vol; // volumen objetivo (baja mientras suena el sonido final)
  let tFundido = null;

  function fundirMusica(destino, ms, alTerminar) {
    clearInterval(tFundido);
    const desde = musica.volume;
    const t0 = performance.now();
    tFundido = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      musica.volume = Math.max(0, Math.min(1, desde + (destino - desde) * k));
      if (k >= 1) {
        clearInterval(tFundido);
        if (alTerminar) alTerminar();
      }
    }, 40);
  }
  function arrancarMusica() {
    musicaLista = true;
    if (musicaOff || document.hidden) return;
    musica
      .play()
      .then(() => fundirMusica(volMusica, 2500))
      .catch(() => {}); // si el navegador la bloquea o falta el archivo, el sitio sigue igual
  }
  function frenarMusica(ms) {
    fundirMusica(0, ms, () => musica.pause());
  }
  function bajarMusica() {
    volMusica = MUSICA.vol * 0.3;
    if (!musica.paused) fundirMusica(volMusica, 800);
  }
  function subirMusica() {
    volMusica = MUSICA.vol;
    if (!musica.paused) fundirMusica(volMusica, 1500);
  }
  function pintarMusica() {
    pintarBoton(btnMusica, musicaOff, 'música de fondo', 'Música de fondo: activada', 'Música de fondo: silenciada');
  }
  if (btnMusica) {
    btnMusica.addEventListener('click', () => {
      musicaOff = !musicaOff;
      try {
        sessionStorage.setItem('musicaSilencio', musicaOff ? '1' : '0');
      } catch (e) {}
      if (musicaOff) frenarMusica(600);
      else if (musicaLista) arrancarMusica();
      pintarMusica();
    });
  }
  pintarMusica();
  // Con la pestaña del navegador oculta, la música se pausa; al volver, sigue.
  document.addEventListener('visibilitychange', () => {
    if (!musicaLista || musicaOff) return;
    if (document.hidden) frenarMusica(300);
    else arrancarMusica();
  });
  // Mientras suena el sonido del final, la música baja; cuando termina, vuelve.
  if (audios.final) {
    audios.final.addEventListener('ended', subirMusica);
    audios.final.addEventListener('pause', subirMusica);
  }

  // El sonido "carga" (intro, cuando aparece el título principal) arranca desde un script
  // al principio del <head> de index.html, para que no espere a los CSS ni a las fuentes.

  // Sonido de pestañas (módulos 1 y 2) y del botón Final (módulo 3), por delegación.
  // Se escucha en la fase de captura: el estado de la pestaña todavía es el de ANTES del click.
  document.addEventListener(
    'click',
    (e) => {
      const pestana = e.target.closest('.em-tab, .br-tab-btn, .ui-tab, [role="tab"]');
      if (pestana) {
        if (
          !pestana.classList.contains('active') &&
          pestana.getAttribute('aria-selected') !== 'true'
        ) {
          sfx('pestana');
        }
        return;
      }
      if (e.target.closest('#me-final')) {
        if (!silenciado) bajarMusica();
        sfx('final');
      }
    },
    true,
  );

  // ---------- BARRA DE CAPÍTULOS ----------
  const items = Array.from(document.querySelectorAll('.side-nav .nav-item'));
  const hilos = Array.from(document.querySelectorAll('.side-nav .nav-trail'));
  // Cada bolita del hilo se prende con un pequeño retraso (--k) para que parezca que "camina"
  hilos.forEach((h) => Array.from(h.children).forEach((b, k) => b.style.setProperty('--k', k)));

  function pintarBarra() {
    const idx = items.findIndex((i) => i.classList.contains('active'));
    items.forEach((it, k) => {
      it.classList.toggle('done', k < idx);
      it.classList.toggle('next', k === idx + 1);
      if (k === idx) it.setAttribute('aria-current', 'step');
      else it.removeAttribute('aria-current');
    });
    hilos.forEach((h, k) => h.classList.toggle('full', k < idx));
  }
  pintarBarra();

  // ---------- ANIMACIÓN DE ENTRADA (solo la primera vez de cada módulo) ----------
  // El número del círculo crece hasta la tarjeta, gira y se deshace en bolitas que viajan a cada elemento mientras aparece.
  const vistos = new Set(); // ids de capítulos que ya hicieron la animación
  let actual = null; // animación en curso (para poder cortarla)

  const reducirMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const suave = (t) => 1 - Math.pow(1 - t, 3);
  const suaveIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  function mezclar(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Dibuja algo en un canvas oculto y devuelve los puntos [x, y] donde hay "pintura"
  function muestrear(w, h, dibujar, paso) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    dibujar(g);
    const d = g.getImageData(0, 0, w, h).data;
    const out = [];
    for (let y = 0; y < h; y += paso) {
      for (let x = 0; x < w; x += paso) {
        if (d[(y * w + x) * 4 + 3] > 128) out.push([x, y]);
      }
    }
    return out;
  }

  // Ordena puntos de arriba hacia abajo (con un poco de azar): así la parte de
  // arriba del círculo se deshace en lo de arriba de la tarjeta, etc.
  function ordenarPorAltura(pts) {
    return pts
      .map((p) => ({ p: p, k: p[1] + (Math.random() - 0.5) * 90 }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.p);
  }

  // Zona que va a cubrir el círculo ya crecido: la tarjeta, recortada a lo que se ve
  function zonaTarjeta(capitulo, W, H, barH) {
    const tarjeta = capitulo.querySelector('.ui-panel');
    const r = tarjeta ? tarjeta.getBoundingClientRect() : null;
    let x = 0,
      y = 0,
      w = 0,
      h = 0;
    if (r) {
      x = Math.max(r.left, 0);
      y = Math.max(r.top, 0);
      w = Math.min(r.right, W) - x;
      h = Math.min(r.bottom, H - barH) - y;
    }
    if (!r || w < W * 0.3 || h < 80) {
      // la tarjeta queda casi fuera de pantalla (celular): usamos una franja del centro
      x = W * 0.1;
      y = (H - barH) * 0.3;
      w = W * 0.8;
      h = (H - barH) * 0.4;
    }
    return { x: x, y: y, w: w, h: h, tarjeta: tarjeta };
  }

  // Destinos de las bolitas: repartidos sobre el título del capítulo y lo que hay en la tarjeta (líneas de texto, gráficos, botones).
  function destinosTarjeta(capitulo, zona, N, W, H, barH) {
    const rects = [];
    const limiteY = H - barH;
    function agregar(r) {
      const x = Math.max(r.left, 0);
      const y = Math.max(r.top, 0);
      const w = Math.min(r.right, W) - x;
      const h = Math.min(r.bottom, limiteY) - y;
      if (w < 2 || h < 2) return; // fuera de pantalla o invisible
      rects.push({ x: x, y: y, w: w, h: h, p: Math.sqrt(w * h) });
    }

    const zonas = [capitulo.querySelector('.chapter-header'), zona.tarjeta].filter(Boolean);
    const rango = document.createRange();
    const areaTarjeta = zona.w * zona.h;
    zonas.forEach((z) => {
      const caminante = document.createTreeWalker(z, NodeFilter.SHOW_TEXT);
      let nodo;
      while ((nodo = caminante.nextNode())) {
        if (!nodo.nodeValue.trim()) continue;
        const padre = nodo.parentElement;
        if (!padre || padre.closest('.title-dots, script, style')) continue;
        rango.selectNodeContents(nodo);
        Array.from(rango.getClientRects()).forEach(agregar);
      }
      z.querySelectorAll('canvas, svg, input, img, video').forEach((el) => {
        if (el.parentNode && el.parentNode.closest && el.parentNode.closest('svg')) return;
        agregar(el.getBoundingClientRect());
      });
      z.querySelectorAll('*').forEach((el) => {
        if (el.children.length || el.closest('.title-dots')) return;
        if (/^(canvas|svg|input|img|video)$/i.test(el.tagName)) return;
        const bg = getComputedStyle(el).backgroundColor;
        if (!bg || bg === 'transparent' || /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) return;
        const r = el.getBoundingClientRect();
        if (r.width < 3 || r.height < 3 || r.width * r.height > areaTarjeta * 0.5) return;
        agregar(r);
      });
    });

    if (!rects.length) rects.push({ x: zona.x, y: zona.y, w: zona.w, h: zona.h, p: 1 });
    if (rects.length > 500) {
      mezclar(rects);
      rects.length = 500;
    }

    // Cada bolita elige un elemento (los más grandes reciben más) y un punto adentro
    let total = 0;
    const acum = rects.map((r) => (total += r.p));
    const pts = [];
    for (let k = 0; k < N; k++) {
      const v = Math.random() * total;
      let a = 0;
      let b = acum.length - 1;
      while (a < b) {
        const m = (a + b) >> 1;
        if (acum[m] < v) a = m + 1;
        else b = m;
      }
      const r = rects[a];
      pts.push([r.x + Math.random() * r.w, r.y + r.h * (0.15 + 0.7 * Math.random())]);
    }
    return pts;
  }

  // Reinicia la animación de los puntitos rosa del título (igual que hace script.js al cambiar de módulo)
  function reiniciarPuntitos(capitulo) {
    capitulo.querySelectorAll('.chapter-header .dot').forEach((d) => {
      d.style.animation = 'none';
      void d.offsetWidth;
      d.style.animation = '';
    });
  }

  // Tiempos (ms)
  const CRECE = 850; // el número crece hasta el centro de la tarjeta
  const GIRO = 700; // el número, ya grande en el centro, gira 360° sobre su eje Y...
  const M0 = CRECE; // ...y se deshace desde que empieza a girar
  const MORPH = 650; // duración del viaje de cada bolita
  const MORPH_DEMORA = 150; // demora máxima de cada bolita
  const FIN = M0 + MORPH + MORPH_DEMORA; // todas llegaron
  const FUNDIDO = 150; // las bolitas que quedan se apagan y queda el módulo real

  function cancelar() {
    if (actual) actual.terminar();
  }

  function correr(capitulo, item, retraso) {
    cancelar();
    const lienzo = document.getElementById('trCanvas');
    const puente = document.getElementById('trPuente');
    const num = item.querySelector('.num');
    if (!lienzo || !num) return;

    const ctx = lienzo.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth;
    const H = window.innerHeight;
    lienzo.width = W * dpr;
    lienzo.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const barra = document.querySelector('.side-nav');
    const barH = barra ? barra.offsetHeight : 60;

    // Colores de la paleta (variables de :root)
    const css = getComputedStyle(document.documentElement);
    const ROSA_FUERTE = css.getPropertyValue('--rose-strong').trim() || '#ff6f9c';
    const ROSA = css.getPropertyValue('--rose').trim() || '#f7a8c4';
    const FUENTE = '"DM Serif Display", Georgia, serif';

    // Mientras dura la animación se esconden el título y la tarjeta reales
    capitulo.classList.add('tr-h', 'tr-c');
    item.classList.add('tr-lift');

    let terminado = false;
    let raf = 0;
    const timers = [];
    const estado = { terminar: terminar };
    actual = estado;

    function terminar() {
      if (terminado) return;
      terminado = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      ctx.clearRect(0, 0, W, H);
      if (puente) puente.classList.remove('on');
      item.classList.remove('tr-lift');
      if (capitulo.classList.contains('tr-h')) reiniciarPuntitos(capitulo);
      capitulo.classList.add('tr-revela'); // el fundido de entrada del módulo real
      capitulo.classList.remove('tr-h', 'tr-c');
      document.removeEventListener('pointerdown', terminar, true);
      document.removeEventListener('keydown', alTeclado, true);
      window.removeEventListener('resize', terminar);
      setTimeout(() => capitulo.classList.remove('tr-revela'), 900);
      if (actual === estado) actual = null;
    }
    function alTeclado(e) {
      if (e.key === 'Escape') terminar();
    }

    function arrancar() {
      if (terminado) return;

      // --- el círculo de la barra (origen) y la tarjeta (destino del crecimiento)
      const zona = zonaTarjeta(capitulo, W, H, barH);
      const rc = num.getBoundingClientRect();
      const c0 = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2, r: rc.width / 2 };
      if (!c0.r) {
        terminar();
        return;
      }
      const numero = num.textContent.trim();
      const tam0 = parseFloat(getComputedStyle(num).fontSize) || c0.r; // tamaño del número en la barra
      const tam1 = Math.min(zona.h * 0.42, zona.w * 0.3, 260); // tamaño final del número
      const cx1 = zona.x + zona.w / 2;
      const cy1 = zona.y + zona.h / 2;

      // --- bolitas: todas salen del propio número (ya grande) y van a los elementos de la tarjeta
      const N = W < 700 ? 450 : 800; // menos bolitas, chiquitas y delicadas
      const destinos = ordenarPorAltura(destinosTarjeta(capitulo, zona, N, W, H, barH));
      const glifo = mezclar(
        muestrear(
          W,
          H,
          (g) => {
            g.font = '400 ' + tam1 + 'px ' + FUENTE;
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.fillText(numero, cx1, cy1);
          },
          2,
        ),
      );
      if (!glifo.length) {
        terminar();
        return;
      }
      const origenes = ordenarPorAltura(
        Array.from({ length: N }, (_, k) => {
          const g = glifo[k % glifo.length];
          return [g[0] + (Math.random() - 0.5) * 2, g[1] + (Math.random() - 0.5) * 2];
        }),
      );
      const ps = origenes.map((o, k) => {
        const r = Math.random();
        return {
          sx: o[0],
          sy: o[1], // dónde está dentro del número
          cx: destinos[k][0],
          cy: destinos[k][1], // llega a un elemento de la tarjeta
          m: Math.random() * MORPH_DEMORA, // demora al viajar
          jx: Math.random() - 0.5,
          jy: Math.random() - 0.5,
          col: r < 0.8 ? ROSA_FUERTE : r < 0.93 ? ROSA : 'rgba(255,255,255,.55)',
        };
      });

      let headerOn = false,
        tarjetaOn = false;
      document.addEventListener('pointerdown', terminar, true); // tocar la pantalla saltea
      document.addEventListener('keydown', alTeclado, true);
      window.addEventListener('resize', terminar);

      const t0 = performance.now();
      (function cuadro(ahora) {
        if (terminado) return;
        const t = ahora - t0;
        ctx.clearRect(0, 0, W, H);

        if (!headerOn && t >= M0 + 100) {
          headerOn = true;
          capitulo.classList.add('tr-revela');
          capitulo.classList.remove('tr-h'); // entra el título real, con sus puntitos
          reiniciarPuntitos(capitulo);
        }
        if (!tarjetaOn && t >= M0 + 300) {
          tarjetaOn = true;
          capitulo.classList.remove('tr-c'); // entra la tarjeta real mientras llegan las bolitas
        }

        // 1) EL NÚMERO CRECE solo (sin fondo, sin texto): de la barra al centro de la tarjeta
        const e = suaveIO(clamp(t / CRECE));
        const vive = 1 - clamp((t - M0) / 300); // 1 = entero, 0 = ya se deshizo (rápido, mientras gira)
        if (vive > 0) {
          const tam = tam0 + (tam1 - tam0) * e;
          const nx = c0.x + (cx1 - c0.x) * e;
          const ny = c0.y + (cy1 - c0.y) * e;
          // crece derecho; ya en el centro gira 360° sobre su eje Y (como una moneda: el ancho
          // se achica con el coseno del ángulo) y termina derecho justo cuando se deshace
          const giro = Math.PI * 2 * suaveIO(clamp((t - CRECE) / GIRO));
          ctx.save();
          ctx.translate(nx, ny);
          ctx.scale(Math.cos(giro), 1);
          ctx.font = '400 ' + tam + 'px ' + FUENTE;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = (1 - e) * vive;
          ctx.fillText(numero, 0, 0);
          ctx.fillStyle = ROSA_FUERTE;
          ctx.globalAlpha = e * vive;
          ctx.fillText(numero, 0, 0);
          ctx.restore();
        }

        // 2) EL NÚMERO SE DESHACE en puntitos que viajan a cada elemento de la tarjeta
        if (t >= M0) {
          const entra = clamp((t - M0) / 100);
          const apagar = 1 - clamp((t - FIN) / FUNDIDO);
          // mientras el número gira, las bolitas que todavía no salieron giran con él
          const cosG = Math.cos(Math.PI * 2 * suaveIO(clamp((t - CRECE) / GIRO)));
          for (let i = 0; i < ps.length; i++) {
            const p = ps[i];
            const k = clamp((t - M0 - p.m) / MORPH);
            const ek = suave(k);
            const ox = cx1 + (p.sx - cx1) * cosG;
            const x = ox + (p.cx - ox) * ek + Math.sin(k * Math.PI) * 40 * p.jx;
            const y = p.sy + (p.cy - p.sy) * ek + Math.sin(k * Math.PI) * 40 * p.jy;
            const r = 1.3 - 0.5 * ek;
            const vida = entra * apagar * (1 - clamp((k - 0.5) / 0.5)); // se van apagando al llegar
            if (vida <= 0) continue;
            ctx.fillStyle = p.col;
            ctx.globalAlpha = 0.16 * vida;
            ctx.beginPath();
            ctx.arc(x, y, r + 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = vida;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        if (t >= FIN + FUNDIDO) terminar();
        else raf = requestAnimationFrame(cuadro);
      })(t0);
    }

    const listo = () => timers.push(setTimeout(arrancar, retraso || 0));
    if (document.fonts && document.fonts.load)
      document.fonts.load('400 120px "DM Serif Display"').then(listo, listo);
    else listo();
  }

  // ---------- API: entrar() anima la entrada; sfx() suena un efecto; musica() arranca la música ----------
  function entrar(capitulo, item, retraso) {
    pintarBarra();
    if (!capitulo || !item || vistos.has(capitulo.id)) return false;
    vistos.add(capitulo.id);
    if (reducirMovimiento()) return false; // con "reducir movimiento" no hay animación
    correr(capitulo, item, retraso);
    return true;
  }

  window.Transicion = {
    entrar: entrar,
    sfx: sfx,
    musica: arrancarMusica,
    pintarBarra: pintarBarra,
    audio: function (nombre) {
      return audios[nombre];
    },
  };
})();
