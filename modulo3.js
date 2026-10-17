// ============ MODULO3.JS — "El futuro" (capítulo 3) — Meli — prefijo me- ============
// 1) Cierre: video final, frase y créditos ("¡Muchas gracias!" escrito por un trazo de luz). 2) Buscador de mamógrafos (necesita buscador-datos.js antes).
(function () {
  const bFinal = document.getElementById('me-final');
  const video3 = document.querySelector('.chapter-video[data-chapter="3"]');
  const video4 = document.getElementById('me-video4');
  if (!bFinal || !video3 || !video4) return;

  // Cierre: la tarjeta se desvanece y aparece la frase final (misma animación que el título de la intro)
  const card = bFinal.closest('.me-card');
  const cierre = document.getElementById('me-cierre');
  const creditos = document.getElementById('me-creditos');
  const frase = document.getElementById('me-cierre-frase');
  const gracias = document.getElementById('me-gracias');
  const linea = creditos ? creditos.querySelector('.me-creditos-linea') : null;
  const gOn = creditos ? creditos.querySelector('.me-gracias-on') : null;
  const gOff = creditos ? creditos.querySelector('.me-gracias-off') : null;
  const TEXTO_GRACIAS = gracias ? gracias.dataset.texto || '' : '';
  const audioFinal =
    window.Transicion && window.Transicion.audio ? window.Transicion.audio('final') : null;

  const SIN_SONIDO_MS = 3000; // con la música apagada, los créditos salen a los 3 s de tocar "una última cosa"
  const REDUCIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navBack = document.getElementById('navBack');
  const capitulo = card ? card.closest('.chapter') : null;
  let tBoton = null;

  const partes = card
    ? card.querySelectorAll(
        ':scope > .ui-card-title, :scope > .ui-sub, :scope > .me-prompt-donde, :scope > .me-body, :scope > .me-final, :scope > .ui-src',
      )
    : [];

  // ---------- "¡Muchas gracias!" ----------
  // Un trazo de luz escribe cada letra (SVG, una tras otra) y después la letra se rellena de rosa (CSS .me-letra).
  const SVG_NS = 'http://www.w3.org/2000/svg';
  function escribirGracias() {
    frenarGracias();
    if (!gOn || !gOff || !gracias) return;
    gOn.textContent = '';
    gOff.textContent = TEXTO_GRACIAS; // invisible: le da al párrafo el tamaño exacto del texto
    const cs = getComputedStyle(gracias);
    const px = parseFloat(cs.fontSize);
    const fuente = cs.fontStyle + ' ' + cs.fontWeight + ' ' + px + 'px ' + cs.fontFamily;
    const med = document.createElement('canvas').getContext('2d');
    med.font = fuente;
    const ancho = med.measureText(TEXTO_GRACIAS).width;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'me-gracias-trazo');
    svg.setAttribute('viewBox', '0 0 ' + Math.ceil(ancho + px * 0.4) + ' ' + Math.ceil(px * 1.4));
    let n = 0;
    for (let i = 0; i < TEXTO_GRACIAS.length; i++) {
      const letra = TEXTO_GRACIAS[i];
      if (letra === ' ') continue;
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', (px * 0.2 + med.measureText(TEXTO_GRACIAS.slice(0, i)).width).toFixed(1));
      t.setAttribute('y', (px * 1.02).toFixed(1));
      t.setAttribute('class', 'me-letra');
      t.style.setProperty('--i', n++);
      t.style.setProperty('--l', Math.round(px * 6) + 'px'); // largo del trazo, alcanza para cualquier letra
      t.textContent = letra;
      svg.appendChild(t);
    }
    gOff.parentNode.appendChild(svg);
    void svg.getBoundingClientRect(); // para que la animación arranque desde el principio
    gracias.classList.add('revela');
  }
  function frenarGracias() {
    if (!gracias) return;
    gracias.classList.remove('revela');
    gracias.querySelectorAll('.me-gracias-trazo').forEach((el) => el.remove());
  }

  // "¡Muchas gracias!" queda centrado entre la frase final y la línea de abajo
  function posicionarCreditos() {
    if (!creditos || !frase || !linea || !gracias) return;
    const cr = creditos.getBoundingClientRect();
    const fr = frase.getBoundingClientRect();
    const lr = linea.getBoundingClientRect();
    gracias.style.top = (fr.bottom + lr.top) / 2 - cr.top + 'px';
  }
  function mostrarCreditos() {
    if (!creditos || creditos.classList.contains('on')) return; // ya se están mostrando
    creditos.hidden = false;
    posicionarCreditos();
    void creditos.offsetWidth; // para que la transición arranque
    creditos.classList.add('on');
    escribirGracias();
  }
  function ocultarCreditos() {
    frenarGracias();
    if (!creditos) return;
    creditos.classList.remove('on');
    creditos.hidden = true;
    if (gOn) gOn.textContent = '';
    if (gOff) gOff.textContent = '';
  }
  window.addEventListener('resize', () => {
    if (!creditos || creditos.hidden) return;
    posicionarCreditos();
  });

  function mostrarCierre() {
    if (!card || !cierre) return;
    clearTimeout(tBoton);
    ocultarCreditos(); // si se vuelve a tocar "Final", los créditos esperan de nuevo
    card.classList.add('me-cierre-on');
    if (capitulo) capitulo.classList.add('me-cierre-on');
    partes.forEach((el) => {
      el.inert = true;
    });
    cierre.hidden = false;
    void cierre.offsetWidth;
    cierre.classList.add('on');
    if (navBack) navBack.classList.add('nav-back--glow');
  }

  function ocultarCierre() {
    if (!card || !cierre) return;
    clearTimeout(tBoton);
    ocultarCreditos();
    if (audioFinal) {
      audioFinal.pause();
      audioFinal.currentTime = 0;
    }
    cierre.classList.remove('on');
    cierre.hidden = true;
    card.classList.remove('me-cierre-on');
    if (capitulo) capitulo.classList.remove('me-cierre-on');
    if (navBack) navBack.classList.remove('nav-back--glow');
    partes.forEach((el) => {
      el.inert = false;
    });
  }

  bFinal.onclick = () => {
    video3.pause();
    video3.classList.remove('active');
    video4.classList.add('active');
    video4.currentTime = 0;
    video4.play().catch((err) => console.warn('No se pudo reproducir 04_FINAL:', err));
    mostrarCierre();
    // Con la música apagada (o si el sonido final no suena), los créditos salen a los 3 s
    tBoton = setTimeout(() => {
      if (!musicaActiva() || !audioFinal || audioFinal.paused) mostrarCreditos();
    }, SIN_SONIDO_MS);
  };

  // Con la música activada, los créditos salen cuando termina el sonido final
  function musicaActiva() {
    return !window.Transicion || !window.Transicion.musicaActiva || window.Transicion.musicaActiva();
  }
  if (audioFinal) audioFinal.addEventListener('ended', mostrarCreditos);

  // Al cambiar de capítulo, script.js oculta el video 4: se restaura la tarjeta
  new MutationObserver(() => {
    if (!video4.classList.contains('active')) ocultarCierre();
  }).observe(video4, { attributes: true, attributeFilter: ['class'] });
})();

// ============ BUSCADOR DE MAMÓGRAFOS (pestaña 3) ============
// Al elegir una localidad, el lazo de puntos se rearma y queda un punto por mamógrafo (lleno = público, anillo = privado), enlazado con la lista; sin mamógrafo, muestra la localidad más cercana. Datos en buscador-datos.js y buscador-sin-mamografo.js; textos siempre con textContent.
(function () {
  const input = document.getElementById('me-search-input');
  const stage = document.getElementById('me-stage');
  const canvas = document.getElementById('me-canvas');
  const panel = document.getElementById('me-tabpanel-3');
  if (!input || !stage || !canvas || !panel || typeof MAMOGRAFOS === 'undefined') return;

  const lista = document.getElementById('me-suggest');
  const clear = document.getElementById('me-search-clear');
  const result = document.getElementById('me-result');
  const prompt = document.getElementById('me-finder-prompt');
  const tip = document.getElementById('me-tip');
  const ctx = canvas.getContext('2d');
  const REDUCIDO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAX_SUGERENCIAS = 8;

  // ============ 1) BÚSQUEDA CON PREDICCIÓN ============
  // "Córdoba" -> "cordoba": compara sin tildes ni mayúsculas.
  function norm(s) {
    return String(s)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  const localidades = MAMOGRAFOS.map((g) => ({
    localidad: g.localidad,
    provincia: g.provincia,
    items: g.items,
    claves: [norm(g.localidad)].concat((g.alias || []).map(norm)),
  }));

  // Localidades SIN mamógrafo: se cargan aparte (archivo grande) y se suman a la búsqueda
  function incorporarSin() {
    if (typeof SIN_MAMOGRAFO === 'undefined') return;
    const provs = SIN_MAMOGRAFO.provincias;
    // Una localidad que ya tiene mamógrafos (igual o con "Capital", ej. Córdoba -> Córdoba Capital) no se suma como "sin"
    const conMamografo = new Set(localidades.map((l) => norm(l.localidad) + '|' + norm(l.provincia)));
    SIN_MAMOGRAFO.filas.forEach((f) => {
      const prov = norm(provs[f[2]]);
      const loc = norm(f[0]);
      if (conMamografo.has(loc + '|' + prov) || conMamografo.has(loc + ' capital|' + prov)) return;
      localidades.push({
        sin: true,
        localidad: f[0],
        depto: f[1],
        provincia: provs[f[2]],
        cercana: f[3],
        cercanaProv: provs[f[4]],
        km: f[5],
        destino: f[6] === 1 ? f[3] : f[6], // nombre de la localidad cercana en la base (0 = no se encontró)
        claves: [norm(f[0])],
      });
    });
    // si ya estaba escribiendo, se actualizan las sugerencias con lo nuevo
    if (document.activeElement === input && input.value && !actual) mostrarLista(input.value);
  }
  function cargarSin() {
    if (typeof SIN_MAMOGRAFO !== 'undefined') {
      incorporarSin();
      return;
    }
    const sc = document.createElement('script');
    sc.src = 'buscador-sin-mamografo.js';
    sc.onload = incorporarSin;
    sc.onerror = () => {}; // sin ese archivo el buscador sigue andando
    document.head.appendChild(sc);
  }

  // Hasta MAX_SUGERENCIAS: exactas, después las que empiezan igual y las que contienen; primero las que tienen mamógrafo, después alfabético.
  function buscar(texto) {
    const q = norm(texto);
    if (!q) return [];
    const hallados = [];
    localidades.forEach((l) => {
      const pos = l.claves.map((c) => c.indexOf(q)).filter((p) => p >= 0);
      if (!pos.length) return;
      const exacta = l.claves.some((c) => c === q);
      hallados.push({ l, grupo: exacta ? 0 : Math.min(...pos) === 0 ? 1 : 2 });
    });
    hallados.sort(
      (a, b) =>
        a.grupo - b.grupo ||
        (a.l.sin ? 1 : 0) - (b.l.sin ? 1 : 0) ||
        a.l.localidad.localeCompare(b.l.localidad, 'es') ||
        a.l.provincia.localeCompare(b.l.provincia, 'es'),
    );
    return hallados.slice(0, MAX_SUGERENCIAS).map((h) => h.l);
  }

  let sugeridas = [];
  let activo = -1; // posición resaltada con el teclado

  // Mueve el scroll de una lista para que "li" quede visible, SIN usar
  // scrollIntoView (que podría mover contenedores de afuera, como .chapter)
  function verEnLista(ul, li) {
    const arriba = li.offsetTop;
    const abajo = arriba + li.offsetHeight;
    if (arriba < ul.scrollTop) ul.scrollTop = Math.max(0, arriba - 4);
    else if (abajo > ul.scrollTop + ul.clientHeight) ul.scrollTop = abajo - ul.clientHeight + 4;
  }

  function cerrarLista() {
    lista.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activo = -1;
  }

  // Escribe el nombre de la localidad resaltando lo que se tipeó
  function nombreResaltado(el, nombre, q) {
    const i = norm(nombre).indexOf(norm(q));
    if (i < 0 || !q.trim()) {
      el.textContent = nombre;
      return;
    }
    const fin = i + q.trim().length;
    el.appendChild(document.createTextNode(nombre.slice(0, i)));
    const s = document.createElement('strong');
    s.textContent = nombre.slice(i, fin);
    el.appendChild(s);
    el.appendChild(document.createTextNode(nombre.slice(fin)));
  }

  function mostrarLista(texto) {
    sugeridas = buscar(texto);
    lista.textContent = '';
    if (!texto.trim()) {
      cerrarLista();
      return;
    }
    if (sugeridas.length === 0) {
      const li = document.createElement('li');
      li.className = 'me-suggest-empty';
      li.textContent = 'No encontramos esa localidad en la base.';
      lista.appendChild(li);
    } else {
      sugeridas.forEach((l, i) => {
        const li = document.createElement('li');
        li.id = 'me-opt-' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        const nombre = document.createElement('span');
        nombreResaltado(nombre, l.localidad, texto);
        const prov = document.createElement('small');
        prov.textContent = l.sin ? l.depto + ' · ' + l.provincia : l.provincia;
        li.appendChild(nombre);
        li.appendChild(prov);
        // mousedown (no click): se dispara antes de que el input pierda el foco
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          elegir(l);
        });
        lista.appendChild(li);
      });
    }
    activo = -1;
    lista.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function resaltar(pos) {
    const opts = lista.querySelectorAll('[role="option"]');
    if (!opts.length) return;
    activo = (pos + opts.length) % opts.length; // da la vuelta al llegar al borde
    opts.forEach((o, i) => o.setAttribute('aria-selected', i === activo));
    input.setAttribute('aria-activedescendant', opts[activo].id);
    verEnLista(lista, opts[activo]);
  }

  // ============ 2) LAZO DE PUNTOS: geometría ============
  // Curvas de Bézier en un espacio de ~100 x 118; los puntos se siembran en 3 filas paralelas para darle grosor.
  const LAZO_CX = 50; // centro del lazo en ese espacio (para centrarlo en el canvas)
  const LAZO_CY = 59;
  const LAZO_ALTO = 106; // alto real del dibujo (de y=6 a y=112)
  const LAZO_ANCHO = 58;
  const TRAZOS = [
    // el óvalo de arriba (dos mitades que se cruzan en el centro)
    [
      [
        [50, 62],
        [20, 46],
        [18, 6],
        [50, 6],
      ],
      [
        [50, 6],
        [82, 6],
        [80, 46],
        [50, 62],
      ],
    ],
    // las dos "colitas"
    [
      [
        [50, 62],
        [44, 78],
        [30, 92],
        [22, 112],
      ],
    ],
    [
      [
        [50, 62],
        [56, 78],
        [70, 92],
        [78, 112],
      ],
    ],
  ];

  function puntoBezier(c, t) {
    const u = 1 - t;
    const a = u * u * u,
      b = 3 * u * u * t,
      d = 3 * u * t * t,
      e = t * t * t;
    return [
      a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0],
      a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1],
    ];
  }

  // Devuelve [{ux, uy}] (posiciones del lazo, centradas en 0,0, en unidades)
  function generarLazo() {
    const PASO = 4.2; // distancia entre puntos a lo largo del trazo
    const FILAS = [-3.4, 0, 3.4]; // desplazamientos laterales (grosor)
    const out = [];
    TRAZOS.forEach((curvas) => {
      const pts = [];
      curvas.forEach((c) => {
        for (let i = 0; i <= 40; i++) pts.push(puntoBezier(c, i / 40));
      });
      let largo = 0;
      const acum = [0];
      for (let i = 1; i < pts.length; i++) {
        largo += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        acum.push(largo);
      }
      let seg = 1;
      for (let s = 0; s <= largo; s += PASO) {
        while (seg < pts.length - 1 && acum[seg] < s) seg++;
        const a = pts[seg - 1],
          b = pts[seg];
        const f = (s - acum[seg - 1]) / (acum[seg] - acum[seg - 1] || 1);
        const x = a[0] + (b[0] - a[0]) * f;
        const y = a[1] + (b[1] - a[1]) * f;
        const tx = b[0] - a[0],
          ty = b[1] - a[1];
        const m = Math.hypot(tx, ty) || 1;
        const nx = -ty / m,
          ny = tx / m; // normal del trazo
        FILAS.forEach((off) => {
          const px = x + nx * off,
            py = y + ny * off;
          // sin puntos pegados (donde los trazos se cruzan)
          if (out.some((o) => Math.hypot(o.ux - (px - LAZO_CX), o.uy - (py - LAZO_CY)) < 2.8))
            return;
          out.push({ ux: px - LAZO_CX, uy: py - LAZO_CY });
        });
      }
    });
    return out;
  }

  // ============ 3) PARTÍCULAS ============
  // Colores tomados de las variables de :root (style.css), con respaldo.
  function leerColor(variable, respaldo) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    let m = /^#([0-9a-f]{6})$/i.exec(v);
    if (m)
      return [
        parseInt(m[1].slice(0, 2), 16),
        parseInt(m[1].slice(2, 4), 16),
        parseInt(m[1].slice(4, 6), 16),
      ];
    m = /^rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(v);
    if (m) return [+m[1], +m[2], +m[3]];
    return respaldo;
  }
  const COL_PUBLICO = leerColor('--rose-strong', [255, 111, 156]);
  const COL_PRIVADO = leerColor('--text-dim', [169, 154, 166]);
  const parts = generarLazo().map((u) => ({
    ux: u.ux,
    uy: u.uy, // posición en el lazo (unidades)
    x: 0,
    y: 0,
    vx: 0,
    vy: 0, // posición y velocidad actuales (px)
    rx: 0,
    ry: 0, // posición en el lazo (px, se recalcula al cambiar el tamaño)
    cx: 0,
    cy: 0, // posición en la constelación (px)
    tx: 0,
    ty: 0, // destino actual
    a: 0,
    ta: 0, // opacidad actual / destino
    r: 2,
    tr: 2, // radio actual / destino
    col: COL_PUBLICO.slice(),
    tcol: COL_PUBLICO.slice(),
    ring: 0,
    tring: 0, // 0 = punto lleno (público), 1 = anillo (privado)
    k: -1, // índice del mamógrafo que representa (-1 = ninguno)
    pend: null,
    at: 0, // destino programado y cuándo se aplica (escalonado)
    fase: Math.random() * 6.28, // para el titileo
  }));
  const ordenArriba = parts.map((p, i) => i).sort((a, b) => parts[a].uy - parts[b].uy);

  let W = 0,
    H = 0; // tamaño del canvas en px CSS
  let escala = 1; // unidades -> px del lazo
  let rLazo = 2; // radio de cada punto en el lazo
  let modo = 'lazo'; // 'lazo' o 'const' (constelación de mamógrafos)
  let actual = null; // localidad elegida
  let vivos = []; // partículas que representan mamógrafos (en orden de la lista)
  let hoverK = -1; // mamógrafo resaltado
  let mx = null,
    my = null; // puntero sobre el canvas
  let plan = []; // acciones programadas [{at, fn}]
  let entro = false; // ¿ya hizo la entrada inicial?
  let cerca = null; // modo 'cerca': {a: punto "tu localidad", b: punto "la más cercana", l}
  let tCerca = 0; // cuándo se armó (para que la línea aparezca después de los puntos)
  const FUENTE = getComputedStyle(stage).fontFamily || 'system-ui, sans-serif';

  // ---------- Mapa real (Leaflet): si los mamógrafos tienen lat/lon, se muestra su ubicación en vez de la constelación ----------
  const HAY_LEAFLET = typeof L !== 'undefined';
  const mapaDiv = document.createElement('div');
  mapaDiv.className = 'me-mapa';
  stage.appendChild(mapaDiv);
  let mapa = null; // se crea la primera vez que se usa (Leaflet necesita el contenedor visible)
  let capa = null; // grupo con los puntos de la localidad elegida
  let marcas = []; // un punto por mamógrafo, en el mismo orden que la lista
  let zonaMapa = null; // vista con todos los puntos (para volver después de acercarse a uno)
  let enfocado = -1; // mamógrafo al que se acercó el mapa (-1 = vista general)

  function tieneCoords(items) {
    return items.some((m) => m.lat != null && m.lon != null); // con uno ya hay mapa
  }
  function crearMapa() {
    mapa = L.map(mapaDiv, { zoomControl: true, attributionControl: true });
    mapa.attributionControl.setPrefix(false);
    // Mapa base oscuro de Esri (gratis, sin clave) + capa con los nombres; el CSS lo tiñe
    const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
    const opcionesEsri = { maxZoom: 19, maxNativeZoom: 16 };
    L.tileLayer(ESRI + 'World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      ...opcionesEsri,
      attribution: 'Mapa &copy; <a href="https://www.esri.com">Esri</a>, HERE, OpenStreetMap',
    }).addTo(mapa);
    L.tileLayer(ESRI + 'World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', opcionesEsri).addTo(mapa);
    capa = L.layerGroup().addTo(mapa);
  }
  const BORDE_PUNTO = 'rgb(' + leerColor('--bg', [7, 5, 10]).join(',') + ')';
  function mostrarMapa(l) {
    if (!mapa) crearMapa();
    capa.clearLayers();
    marcas = [];
    const repetidos = {}; // misma dirección: se separan apenas para que se vean todos
    l.items.forEach((m, k) => {
      if (m.lat == null || m.lon == null) {
        marcas.push(null); // sin coordenadas: queda en la lista pero no en el mapa
        return;
      }
      let lat = m.lat,
        lon = m.lon;
      const n = (repetidos[lat + ',' + lon] = (repetidos[lat + ',' + lon] || 0) + 1);
      if (n > 1) {
        lat += Math.sin(n * 2.4) * 0.00018 * Math.sqrt(n);
        lon += Math.cos(n * 2.4) * 0.00018 * Math.sqrt(n);
      }
      const privado = norm(m.tipo || '') === 'privado';
      const col = 'rgb(' + (privado ? COL_PRIVADO : COL_PUBLICO).join(',') + ')';
      const marca = L.circleMarker([lat, lon], {
        radius: 7,
        color: BORDE_PUNTO, // contorno oscuro: separa el punto del mapa
        weight: 1.5,
        fillColor: col,
        fillOpacity: 1,
        className: 'me-mapa-punto' + (privado ? ' me-mapa-privado' : ''),
      });
      marca.bindTooltip(m.establecimiento + (m.aprox ? ' (ubicación aproximada)' : ''), {
        direction: 'top',
        offset: [0, -8],
        className: 'me-mapa-tip',
      });
      marca.on('mouseover', () => setHover(k, true));
      marca.on('click', () => {
        setHover(k, true);
        enfocar(k);
      });
      marca.on('mouseout', () => setHover(-1));
      marca.addTo(capa);
      marcas.push(marca);
    });
    mapaDiv.classList.add('on');
    result.classList.add('me-con-mapa'); // las tarjetas pasan a ser clickeables (ver modulo3.css)
    enfocado = -1;
    mapa.invalidateSize();
    const puestas = marcas.filter(Boolean);
    const zona = L.latLngBounds(puestas.map((x) => x.getLatLng()));
    zonaMapa = zona;
    if (puestas.length === 1) mapa.setView(zona.getCenter(), 15, { animate: false });
    else mapa.fitBounds(zona, { padding: [28, 28], maxZoom: 16, animate: false });
    modo = 'mapa';
  }
  function ocultarMapa() {
    mapaDiv.classList.remove('on');
    result.classList.remove('me-con-mapa');
  }
  // Seleccionar un mamógrafo (tarjeta o punto): el mapa se acerca y se desplaza hasta él.
  // Si se vuelve a seleccionar el mismo, el mapa vuelve a mostrar todos.
  function enfocar(k) {
    if (modo !== 'mapa' || !marcas[k]) return;
    const opciones = { duration: 0.8, animate: !REDUCIDO };
    if (enfocado === k) {
      enfocado = -1;
      const puestas = marcas.filter(Boolean);
      if (puestas.length === 1) mapa.flyTo(zonaMapa.getCenter(), 15, opciones);
      else mapa.flyToBounds(zonaMapa, { ...opciones, padding: [28, 28], maxZoom: 16 });
    } else {
      enfocado = k;
      mapa.flyTo(marcas[k].getLatLng(), 17, opciones);
    }
  }
  // Resalta en el mapa el punto k (y apaga un poco los demás); -1 = ninguno
  function marcarEnMapa(k) {
    marcas.forEach((marca, i) => {
      if (!marca) return;
      const on = i === k;
      marca.setStyle({
        radius: on ? 11 : 7,
        weight: on ? 2 : 1.5,
        opacity: k < 0 || on ? 1 : 0.4,
        fillOpacity: k < 0 || on ? 1 : 0.35,
      });
      if (on) {
        marca.bringToFront();
        marca.openTooltip();
      } else marca.closeTooltip();
    });
  }

  function despues(ms, fn) {
    plan.push({ at: performance.now() + ms, fn });
  }

  function programar(p, d, demora) {
    p.pend = d;
    p.at = performance.now() + (REDUCIDO ? 0 : demora);
    if (REDUCIDO) aplicar(p, true);
  }
  function aplicar(p, snap) {
    const d = p.pend;
    if (!d) return;
    p.tx = d.x;
    p.ty = d.y;
    p.ta = d.a;
    p.tr = d.r;
    p.tcol = d.col;
    p.tring = d.ring;
    p.pend = null;
    if (snap) {
      p.x = d.x;
      p.y = d.y;
      p.a = d.a;
      p.r = d.r;
      p.col = d.col.slice();
      p.ring = d.ring;
      p.vx = p.vy = 0;
    }
  }

  // Calcula tamaño del lazo según el canvas
  function medirLazo() {
    escala = Math.min((H * 0.9) / LAZO_ALTO, (W * 0.72) / LAZO_ANCHO);
    rLazo = Math.max(1.6, Math.min(3.4, escala * 1.25));
    parts.forEach((p) => {
      p.rx = W / 2 + p.ux * escala;
      p.ry = H / 2 + p.uy * escala;
    });
  }

  // Posiciones de la constelación: girasol (espiral áurea), un poco achatado
  // para aprovechar un canvas más ancho que alto. Devuelve también el radio de punto.
  function medirConstelacion() {
    const n = vivos.length;
    if (!n) return;
    const ryMax = H / 2 - 18,
      rxMax = W / 2 - 18;
    const base = 28 * Math.sqrt(n) * 0.72; // más mamógrafos => más grande, hasta el borde
    const ry = Math.min(base, ryMax),
      rx = Math.min(base * 1.25, rxMax);
    const sep = (1.77 * Math.min(rx, ry)) / Math.sqrt(n);
    const radio = n === 1 ? 9 : Math.max(3.2, Math.min(7.5, sep * 0.26));
    vivos.forEach((p, k) => {
      const f = Math.sqrt((k + 0.5) / n);
      const ang = k * 2.399963;
      p.cx = W / 2 + Math.cos(ang) * f * rx;
      p.cy = H / 2 + Math.sin(ang) * f * ry;
      p.cr = radio;
    });
  }

  // ----- Las tres "escenas" de la animación -----
  // a) dispersar: cada punto sale volando a un lugar al azar
  function dispersar() {
    parts.forEach((p) =>
      programar(
        p,
        {
          x: Math.random() * W,
          y: Math.random() * H,
          a: 0.95,
          r: rLazo * 1.2,
          col: COL_PUBLICO,
          ring: 0,
        },
        Math.random() * 90,
      ),
    );
  }
  // b) lazo: vuelven a armarse (de arriba hacia abajo, como si se dibujara)
  function armarLazo(brillo, escalonado) {
    ordenArriba.forEach((i, orden) => {
      const p = parts[i];
      p.k = -1;
      programar(
        p,
        { x: p.rx, y: p.ry, a: brillo, r: rLazo, col: COL_PUBLICO, ring: 0 },
        escalonado ? (orden / parts.length) * 420 + Math.random() * 100 : Math.random() * 150,
      );
    });
  }
  // c) constelación: quedan N puntos (los demás se desvanecen hacia el centro)
  function armarConstelacion(items) {
    const n = Math.min(items.length, parts.length);
    const elegidos = new Set();
    vivos = [];
    for (let k = 0; k < n; k++) {
      const i = Math.floor(((k + 0.5) * parts.length) / n); // repartidos por todo el lazo
      elegidos.add(i);
      parts[i].k = k;
      vivos.push(parts[i]);
    }
    medirConstelacion();
    parts.forEach((p, i) => {
      if (elegidos.has(i)) {
        const privado = norm(items[p.k].tipo || '') === 'privado';
        programar(
          p,
          {
            x: p.cx,
            y: p.cy,
            a: 1,
            r: p.cr,
            col: privado ? COL_PRIVADO : COL_PUBLICO,
            ring: 0,
          },
          Math.random() * 260,
        );
      } else {
        p.k = -1;
        programar(
          p,
          {
            x: W / 2 + (Math.random() - 0.5) * 24,
            y: H / 2 + (Math.random() - 0.5) * 24,
            a: 0,
            r: 0,
            col: COL_PUBLICO,
            ring: 0,
          },
          Math.random() * 200,
        );
      }
    });
    modo = 'const';
  }

  // d) cerca: sin mamógrafo, quedan 2 puntos (tu localidad y la más cercana) unidos por una línea con la distancia real escrita.
  function armarCerca(l, rapido) {
    const i1 = Math.floor(parts.length * 0.3),
      i2 = Math.floor(parts.length * 0.7);
    const y = H * 0.44;
    parts.forEach((p, i) => {
      p.k = -1;
      if (i === i1)
        programar(
          p,
          { x: W * 0.24, y, a: 0.6, r: 8, col: COL_PRIVADO, ring: 0 },
          rapido ? 0 : Math.random() * 120,
        );
      else if (i === i2)
        programar(
          p,
          { x: W * 0.76, y, a: 1, r: 9, col: COL_PUBLICO, ring: 0 },
          rapido ? 0 : Math.random() * 120,
        );
      else
        programar(
          p,
          {
            x: W / 2 + (Math.random() - 0.5) * 24,
            y: y + (Math.random() - 0.5) * 24,
            a: 0,
            r: 0,
            col: COL_PUBLICO,
            ring: 0,
          },
          rapido ? 0 : Math.random() * 200,
        );
    });
    vivos = [];
    cerca = { a: parts[i1], b: parts[i2], l };
    if (!rapido) tCerca = performance.now();
    modo = 'cerca';
  }

  // ============ 4) ELEGIR / LIMPIAR ============
  function elegir(l) {
    if (l.sin) elegirSin(l);
    else elegirConMamografo(l);
  }

  // Botón "Ver mamógrafos en X" (de una localidad sin mamógrafo)
  function irADestino(l) {
    const nombre = norm(l.destino);
    const prov = l.cercanaProv;
    const dest = localidades.find(
      (x) => !x.sin && x.provincia === prov && x.claves.some((c) => c === nombre),
    );
    if (dest) elegirConMamografo(dest);
  }

  function elegirSin(l) {
    ocultarMapa();
    input.value = l.localidad;
    clear.hidden = false;
    cerrarLista();
    actual = l;
    cerca = null;
    setHover(-1);
    dibujarSin(l);
    stage.setAttribute(
      'aria-label',
      l.localidad +
        ' no tiene mamógrafo en la base. El más cercano está en ' +
        l.cercana +
        ', a unos ' +
        fmtKm(l.km) +
        ' km.',
    );
    plan = [];
    modo = 'lazo';
    vivos = [];
    if (W > 0) {
      dispersar();
      despues(REDUCIDO ? 0 : 420, () => armarLazo(1, true));
      despues(REDUCIDO ? 0 : 1450, () => armarCerca(l, false));
      if (REDUCIDO) {
        plan.forEach((a) => a.fn());
        plan = [];
        dibujar(performance.now());
      }
    }
  }

  function elegirConMamografo(l) {
    ocultarMapa();
    input.value = l.localidad;
    clear.hidden = false;
    cerrarLista();
    actual = l;
    cerca = null;
    setHover(-1);
    dibujarResultado(l);
    stage.setAttribute(
      'aria-label',
      l.items.length +
        (l.items.length === 1 ? ' mamógrafo' : ' mamógrafos') +
        ' en ' +
        l.localidad +
        ': un punto por cada uno.',
    );

    plan = [];
    modo = 'lazo';
    vivos = [];
    if (W > 0) {
      dispersar();
      despues(REDUCIDO ? 0 : 420, () => armarLazo(1, true));
      // con coordenadas: el lazo se apaga y aparece el mapa; sin ellas, la constelación de siempre
      const conMapa = HAY_LEAFLET && tieneCoords(l.items);
      despues(REDUCIDO ? 0 : 1450, () => {
        if (conMapa) {
          armarConstelacion([]);
          mostrarMapa(l);
        } else armarConstelacion(l.items);
      });
      if (REDUCIDO) {
        plan.forEach((a) => a.fn());
        plan = [];
        dibujar(performance.now());
      }
    }
  }

  function limpiar() {
    ocultarMapa();
    input.value = '';
    clear.hidden = true;
    actual = null;
    cerca = null;
    result.hidden = true;
    result.textContent = '';
    prompt.hidden = false;
    cerrarLista();
    setHover(-1);
    plan = [];
    modo = 'lazo';
    vivos = [];
    stage.setAttribute(
      'aria-label',
      'Lazo rosa hecho de puntos. Elegí una localidad para ver sus mamógrafos.',
    );
    if (W > 0) {
      armarLazo(0.6, true);
      if (REDUCIDO) dibujar(performance.now());
    }
    input.focus();
  }

  function fmtKm(km) {
    return km >= 10 ? String(Math.round(km)) : km.toFixed(1).replace('.', ',');
  }

  // ----- Resultado de una localidad SIN mamógrafo (a la derecha) -----
  function dibujarSin(l) {
    prompt.hidden = true;
    result.textContent = '';

    const t = document.createElement('h3');
    t.className = 'me-result-title';
    t.appendChild(document.createTextNode('Sin mamógrafo en ' + l.localidad));
    const prov = document.createElement('span');
    prov.textContent = ' · ' + l.provincia;
    t.appendChild(prov);
    result.appendChild(t);

    const p = document.createElement('p');
    p.className = 'me-sin-texto';
    p.appendChild(document.createTextNode('El mamógrafo más cercano está en '));
    const b = document.createElement('b');
    b.textContent = l.cercana;
    p.appendChild(b);
    p.appendChild(
      document.createTextNode(l.cercanaProv !== l.provincia ? ' (' + l.cercanaProv + ')' : ''),
    );
    p.appendChild(document.createTextNode(', a unos ' + fmtKm(l.km) + ' km en línea recta.'));
    result.appendChild(p);

    if (l.destino) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'me-btn me-sin-btn';
      btn.textContent = 'Ver mamógrafos en ' + l.cercana;
      btn.addEventListener('click', () => irADestino(l));
      result.appendChild(btn);
    }

    const nota = document.createElement('p');
    nota.className = 'ui-note me-sin-nota';
    nota.textContent =
      'Distancia aproximada entre los centros de las dos localidades; no refleja el tiempo de viaje.';
    result.appendChild(nota);
    result.hidden = false;
  }

  // ----- Lista de resultados (a la derecha) -----
  function dibujarResultado(l) {
    prompt.hidden = true;
    result.textContent = '';
    const n = l.items.length;

    const t = document.createElement('h3');
    t.className = 'me-result-title';
    t.appendChild(
      document.createTextNode(
        n === 1 ? 'Mamógrafo en ' + l.localidad : n + ' mamógrafos en ' + l.localidad,
      ),
    );
    const prov = document.createElement('span');
    prov.textContent = ' · ' + l.provincia;
    t.appendChild(prov);
    result.appendChild(t);

    const ul = document.createElement('ul');
    ul.className = 'me-result-list';
    l.items.forEach((m, k) => {
      const li = document.createElement('li');
      li.className = 'me-result-item';
      li.tabIndex = 0;
      li.dataset.k = k;
      const privado = norm(m.tipo || '') === 'privado';
      li.dataset.tipo = privado ? 'privado' : 'publico';
      li.style.animationDelay = Math.min(k, 14) * 45 + 'ms'; // entran en cascada

      const b = document.createElement('b');
      const pip = document.createElement('i'); // mismo símbolo que el punto: lleno = público, punto gris = privado
      pip.className = 'me-pip' + (privado ? ' me-ring' : '');
      pip.setAttribute('aria-hidden', 'true');
      b.appendChild(pip);
      b.appendChild(document.createTextNode(m.establecimiento));
      li.appendChild(b);
      // una línea por dato (si falta, no se muestra): dirección / tipo y detalle / teléfono
      [
        m.direccion,
        [m.tipo, m.detalle].filter(Boolean).join(' · '),
        m.telefono && 'Tel: ' + m.telefono,
      ]
        .filter(Boolean)
        .forEach((txt) => {
          const s = document.createElement('span');
          s.textContent = txt;
          li.appendChild(s);
        });

      li.addEventListener('mouseenter', () => setHover(k, false));
      li.addEventListener('click', () => enfocar(k));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enfocar(k);
        }
      });
      li.addEventListener('focus', () => setHover(k, false));
      li.addEventListener('mouseleave', () => setHover(-1));
      li.addEventListener('blur', () => setHover(-1));
      ul.appendChild(li);
    });
    result.appendChild(ul);

    result.hidden = false;
  }

  // ============ 5) INTERACCIÓN punto <-> tarjeta ============
  function setHover(k, desdeCanvas) {
    if (k === hoverK) return;
    hoverK = k;
    const items = result.querySelectorAll('.me-result-item');
    items.forEach((li) => li.classList.toggle('me-hl', +li.dataset.k === k));
    if (k >= 0 && desdeCanvas && items[k]) verEnLista(items[k].parentNode, items[k]);
    if (k < 0) tip.hidden = true;
    else if (actual && modo !== 'mapa') {
      const m = actual.items[k];
      tip.textContent = m.establecimiento;
      tip.hidden = false;
    }
    if (modo === 'mapa') marcarEnMapa(k);
    if (REDUCIDO) dibujar(performance.now());
  }

  // Punto más cercano al puntero (solo con la constelación armada)
  function puntoCerca(x, y) {
    if (modo !== 'const') return -1;
    let mejor = -1,
      dMejor = 1e9;
    vivos.forEach((p) => {
      if (p.a < 0.5) return;
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < Math.max(p.r + 9, 14) && d < dMejor) {
        dMejor = d;
        mejor = p.k;
      }
    });
    return mejor;
  }
  function posPuntero(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }
  canvas.addEventListener('pointermove', (e) => {
    [mx, my] = posPuntero(e);
    setHover(puntoCerca(mx, my), true);
    canvas.style.cursor = hoverK >= 0 ? 'pointer' : '';
  });
  canvas.addEventListener('pointerdown', (e) => {
    // táctil: tocar un punto lo resalta
    [mx, my] = posPuntero(e);
    setHover(puntoCerca(mx, my), true);
  });
  canvas.addEventListener('pointerleave', (e) => {
    mx = my = null;
    if (e.pointerType === 'mouse') setHover(-1);
  });

  // ============ 6) ANIMACIÓN (resortes) Y DIBUJO ============
  const K = 90; // rigidez del resorte
  const C = 14; // amortiguación
  let ultimo = performance.now();

  function visible() {
    return W > 0 && H > 0 && panel.classList.contains('active');
  }

  function tick(t) {
    requestAnimationFrame(tick);
    if (!visible()) {
      ultimo = t;
      return;
    }
    if (REDUCIDO) return; // sin animación: se dibuja solo cuando cambia algo (ver dibujar())
    const dt = Math.min(0.033, (t - ultimo) / 1000 || 0.016);
    ultimo = t;

    // acciones programadas
    if (plan.length) {
      const ahora = performance.now();
      const listas = plan.filter((a) => a.at <= ahora);
      if (listas.length) {
        plan = plan.filter((a) => a.at > ahora);
        listas.forEach((a) => a.fn());
      }
    }

    const e = 1 - Math.exp(-dt * 7);
    const ahora = performance.now();
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.pend && ahora >= p.at) aplicar(p, false);
      // resorte hacia el destino
      p.vx += ((p.tx - p.x) * K - p.vx * C) * dt;
      p.vy += ((p.ty - p.y) * K - p.vy * C) * dt;
      // el puntero "empuja" los puntos del lazo (en la constelación no, para poder tocarlos)
      if (modo === 'lazo' && mx !== null) {
        const dx = p.x - mx,
          dy = p.y - my,
          d = Math.hypot(dx, dy);
        if (d < 56 && d > 0.1) {
          const f = 1 - d / 56;
          p.vx += (dx / d) * f * f * 1100 * dt;
          p.vy += (dy / d) * f * f * 1100 * dt;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += (p.ta - p.a) * e;
      p.r += (p.tr - p.r) * e;
      p.ring += (p.tring - p.ring) * e;
      p.col[0] += (p.tcol[0] - p.col[0]) * e;
      p.col[1] += (p.tcol[1] - p.col[1]) * e;
      p.col[2] += (p.tcol[2] - p.col[2]) * e;
    }
    dibujar(t);
  }

  // Acorta un texto con "…" para que entre en "max" px (con la fuente actual del canvas)
  function recortar(txt, max) {
    if (ctx.measureText(txt).width <= max) return txt;
    while (txt.length > 1 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1);
    return txt + '…';
  }

  function dibujar(t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.a < 0.02 || p.r < 0.2) continue;
      let a = p.a,
        r = p.r;
      if (modo === 'lazo') a *= 0.86 + 0.14 * Math.sin(t / 650 + p.fase); // titileo suave
      const resalta = modo === 'const' && hoverK >= 0;
      if (resalta) {
        if (p.k === hoverK) r *= 1.6;
        else if (p.k >= 0) a *= 0.45;
      }
      const c = Math.round(p.col[0]) + ',' + Math.round(p.col[1]) + ',' + Math.round(p.col[2]);

      ctx.fillStyle = 'rgba(' + c + ',' + (a * 0.12).toFixed(3) + ')'; // resplandor
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.9, 0, 6.2832);
      ctx.fill();

      ctx.fillStyle = 'rgba(' + c + ',' + (a * (1 - p.ring * 0.82)).toFixed(3) + ')'; // cuerpo
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 6.2832);
      ctx.fill();
      if (p.ring > 0.02) {
        // anillo (privado)
        ctx.lineWidth = Math.max(1.4, r * 0.28);
        ctx.strokeStyle = 'rgba(' + c + ',' + (a * p.ring).toFixed(3) + ')';
        ctx.stroke();
      }
      if (resalta && p.k === hoverK) {
        // aro que late alrededor del punto resaltado
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(' + c + ',' + (0.55 + 0.3 * Math.sin(t / 180)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 6, 0, 6.2832);
        ctx.stroke();
      }
    }
    // modo "cerca": línea punteada con la distancia y el nombre de cada punto
    if (modo === 'cerca' && cerca) {
      const lt = REDUCIDO ? 1 : Math.max(0, Math.min(1, (t - tCerca - 800) / 500));
      const A = cerca.a,
        B = cerca.b;
      if (lt > 0 && A.a > 0.2 && B.a > 0.2) {
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(255,182,206,' + (0.55 * lt).toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(A.x + A.r + 7, A.y);
        ctx.lineTo(B.x - B.r - 7, B.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(242,233,238,' + (0.95 * lt).toFixed(3) + ')';
        ctx.font = '600 13px ' + FUENTE;
        ctx.fillText('≈ ' + fmtKm(cerca.l.km) + ' km', (A.x + B.x) / 2, A.y - 10);
        ctx.font = '12px ' + FUENTE;
        ctx.fillStyle = 'rgba(169,154,166,' + lt.toFixed(3) + ')';
        ctx.fillText(recortar(cerca.l.localidad, W * 0.42), A.x, A.y + A.r + 22);
        ctx.fillStyle = 'rgba(242,233,238,' + lt.toFixed(3) + ')';
        ctx.fillText(recortar(cerca.l.cercana, W * 0.42), B.x, B.y + B.r + 22);
        ctx.restore();
      }
    }
    // etiqueta con el nombre del punto resaltado
    if (hoverK >= 0 && modo === 'const') {
      const p = vivos[hoverK];
      if (p) {
        const w = tip.offsetWidth;
        const x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, p.x));
        const arriba = p.y - p.r * 1.6 - 12 > tip.offsetHeight + 4;
        tip.style.left = x + 'px';
        tip.style.top = (arriba ? p.y - p.r * 1.6 - 12 : p.y + p.r * 1.6 + 12) + 'px';
        tip.style.transform = arriba ? 'translate(-50%,-100%)' : 'translate(-50%,0)';
      }
    }
  }

  // ============ 7) TAMAÑO DEL CANVAS ============
  function ajustar() {
    const w = stage.clientWidth,
      h = stage.clientHeight;
    if (!w || !h) return; // el capítulo está oculto: se reintenta cuando se muestre
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const primera = W === 0;
    W = w;
    H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    medirLazo();
    if (modo === 'const') {
      medirConstelacion();
      vivos.forEach((p) => {
        const d = actualDestino(p);
        programar(p, d, 0);
      });
    } else if (modo === 'cerca' && cerca) {
      armarCerca(cerca.l, true);
    } else if (modo === 'mapa') {
      if (mapa) mapa.invalidateSize();
    } else if (!primera) {
      armarLazo(0.6, false);
    }
    if (REDUCIDO) dibujar(performance.now());
  }
  // destino de un punto vivo (mantiene su color/anillo, solo cambia la posición)
  function actualDestino(p) {
    return { x: p.cx, y: p.cy, a: 1, r: p.cr, col: p.tcol, ring: p.tring };
  }

  // Entrada: la primera vez que se ve la pestaña, el lazo se arma desde puntos sueltos
  function entrada() {
    parts.forEach((p) => {
      p.x = Math.random() * W;
      p.y = Math.random() * H;
      p.vx = p.vy = 0;
      p.a = 0;
      p.r = rLazo;
      p.tx = p.x;
      p.ty = p.y;
    });
    armarLazo(0.6, true);
    entro = true;
    if (REDUCIDO) dibujar(performance.now());
  }
  function revisarEntrada() {
    if (!entro && visible()) entrada();
  }

  new ResizeObserver(() => {
    ajustar();
    revisarEntrada();
  }).observe(stage);
  // la pestaña pasa a .active por script.js: se detecta el cambio de clase
  new MutationObserver(revisarEntrada).observe(panel, {
    attributes: true,
    attributeFilter: ['class'],
  });
  window.addEventListener('resize', ajustar);
  ajustar();
  revisarEntrada();
  requestAnimationFrame(tick);
  cargarSin();

  // ============ 8) EVENTOS DEL BUSCADOR ============
  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    mostrarLista(input.value);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (lista.hidden) mostrarLista(input.value);
      resaltar(activo + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      resaltar(activo - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter elige la resaltada; si no hay ninguna, la primera sugerencia
      const l = sugeridas[activo >= 0 ? activo : 0];
      if (!lista.hidden && l) elegir(l);
    } else if (e.key === 'Escape') cerrarLista();
  });
  input.addEventListener('blur', cerrarLista);
  input.addEventListener('focus', () => {
    if (input.value && !actual) mostrarLista(input.value);
  });
  clear.addEventListener('click', limpiar);
})();

// ---------- Fuente ----------
// Lo que muestra "Fuente" en este módulo (lo arma uiFuente, en script.js).
(function () {
  const src = document.querySelector('.me-card > .ui-src');
  if (!src) return;
  const FUENTES_ME = [
    {
      autor: 'INDEC (2022)',
      etiqueta: 'Localidades censales',
      url: 'https://datos.gob.ar/dataset/codigos-geograficos-del-indec-2022',
    },
    {
      autor: 'Surcos y Fundación Instituto Natura (2026)',
      etiqueta: 'Mapa mamográfico',
      url: 'https://surcos.org/web/mira/',
    },
    {
      autor: 'Georef AR API (s.f.)',
      etiqueta: 'Ubicación de las direcciones',
      url: 'https://datosgobar.github.io/georef-ar-api/',
    },
  ];
  uiFuente(src, FUENTES_ME);
})();

// ============ "Una última cosa" a la altura de "Fuente" ============
// En pantallas > 680px el CSS lo saca de la fila y acá se calcula su altura (se recalcula si cambia la tarjeta).
(function () {
  const b = document.getElementById('me-final');
  const card = b ? b.closest('.me-card') : null;
  const src = card ? card.querySelector(':scope > .ui-src') : null;
  if (!b || !card || !src) return;
  const chico = window.matchMedia('(max-width: 680px)');

  function alinear() {
    if (chico.matches) {
      b.style.top = b.style.left = b.style.right = '';
      return;
    }
    const c = card.getBoundingClientRect();
    const s = src.getBoundingClientRect();
    if (!c.height || !s.height) return; // tarjeta oculta (otro capítulo)
    b.style.top = s.top - c.top + s.height / 2 - b.offsetHeight / 2 + 'px';
    // siempre centrado horizontalmente en la tarjeta (lo hace el CSS: left/right:0 + margin:auto)
    b.style.left = b.style.right = '';
    b.style.margin = '';
  }

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(alinear);
    ro.observe(card);
    ro.observe(src);
  }
  window.addEventListener('resize', alinear);
  if (chico.addEventListener) chico.addEventListener('change', alinear);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alinear);
  alinear();
})();
