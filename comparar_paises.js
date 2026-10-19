(function () {
  const tabs = document.querySelector('#chapter-2 .br-tabs');
  const tabAnio = document.getElementById('brTabAnio');
  const tabProvincia = document.getElementById('brTabProvincia');
  const panelAnio = document.getElementById('brPanelAnio');
  const srcBox = document.getElementById('brSrc');
  const srcSub = document.getElementById('brSrcSub');
  const chapter2 = document.getElementById('chapter-2');
  if (!tabs || !tabAnio || !panelAnio || !srcBox || !srcSub || !chapter2) return;

  const ARCHIVO = 'mortalidad_mama_latam.json';
  const PAIS_FIJO = 'Argentina';
  const PAIS_INICIAL = 'Uruguay'; // el que aparece elegido cada vez que se abre
  const COLOR_ARG = '#ff6f9c'; // --rose-strong
  const COLOR_OTRO = '#b9a7e0'; // lila: se distingue del rosa sobre fondo oscuro
  const ANIO_MIN = 2005;
  const ANIO_MAX = 2024;
  const PISTA =
    'Pasá el cursor o tocá el gráfico para comparar Argentina con otro país de Latinoamérica.';

  const SUB_CMP =
    'Muertes por cáncer de mama cada 100.000 mujeres, ajustadas por edad. América Latina, 2005–2024.';
  const SRC_CMP = [
    {
      autor: 'OMS (2026)',
      etiqueta: 'WHO Mortality Database',
      url: 'https://www.who.int/data/data-collection-tools/who-mortality-database',
    },
    {
      autor: 'Naciones Unidas (2024)',
      etiqueta: 'World Population Prospects 2024',
      url: 'https://population.un.org/wpp/',
    },
  ];
  /*const NOTA_CMP =
    'Tasa ajustada por edad (población estándar mundial de la OMS): así se pueden comparar países ' +
    'con poblaciones más jóvenes o más viejas. Por eso no coincide con la tasa bruta de "Por año". ' +
    'La calidad del registro de muertes varía entre países. Análisis propio.';*/

  const fmt1 = (v) =>
    v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Botón (se agrega al final de la fila de pestañas) ----------
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'br-tab-btn cp-btn';
  btn.id = 'cpBtn';
  btn.setAttribute('aria-pressed', 'false');
  btn.setAttribute('aria-controls', 'cpPanel');
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
    '<span>Comparar con otros países</span>';
  tabs.appendChild(btn);

  // ---------- Panel (va justo después del de "Por año") ----------
  // .cp-cabeza: el título y la pista rosa ocupan el MISMO lugar; vacío se ve la pista,
  // después del reveal se ve el título (igual que "Por año").
  const panel = document.createElement('div');
  panel.id = 'cpPanel';
  panel.className = 'br-hidden';
  panel.innerHTML =
    '<div class="br-panel">' +
    '<div class="cp-cabeza">' +
    '<h2 id="cpTitulo">Argentina frente a otros países de América Latina</h2>' +
    '<div class="em-prompt em-prompt-tipo cp-pista" id="cpPista">' +
    '<span class="em-prompt-dot" aria-hidden="true"></span>' +
    PISTA +
    '</div>' +
    '</div>' +
    '<div class="cp-paises">' +
    '<span class="cp-chip"><span class="cp-dot cp-dot-arg" aria-hidden="true"></span>Argentina</span>' +
    '<span>vs.</span>' +
    '<label class="cp-chip cp-chip-sel"><span class="cp-dot cp-dot-otro" aria-hidden="true"></span>' +
    '<select class="cp-select" id="cpSelect" aria-label="País para comparar con Argentina"></select></label>' +
    '</div>' +
    '<div class="cp-chart"><canvas id="cpChart"></canvas></div>' +
    '<p class="cp-dato" id="cpDato">Cargando datos…</p>' +
    '</div>';
  panelAnio.insertAdjacentElement('afterend', panel);

  const select = panel.querySelector('#cpSelect');
  const titulo = panel.querySelector('#cpTitulo');
  const pista = panel.querySelector('#cpPista');
  const dato = panel.querySelector('#cpDato');
  const subPanel = panel.querySelector('.br-panel');
  const canvas = panel.querySelector('#cpChart');
  // Lo que queda oculto (sin mover el espacio) hasta el reveal.
  const ocultosHastaReveal = [titulo, panel.querySelector('.cp-paises'), dato];

  // El botón solo tiene sentido en "Por año": se oculta en "Por provincia".
  function syncVisibilidadBoton() {
    btn.classList.toggle('br-hidden', !tabAnio.classList.contains('active'));
  }
  syncVisibilidadBoton();
  new MutationObserver(syncVisibilidadBoton).observe(tabAnio, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // ---------- Datos ----------
  let datos = null; // { pais: { serie: Map(anio → tasa ajustada), advertencia } }
  let cargando = null;

  function cargarDatos() {
    if (cargando) return cargando;
    cargando = fetch(ARCHIVO)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((json) => {
        datos = {};
        Object.keys(json.paises).forEach((nombre) => {
          const p = json.paises[nombre];
          const serie = new Map();
          p.serie.forEach((d) => {
            if (d.tasa_ajustada != null) serie.set(d.anio, d.tasa_ajustada);
          });
          if (serie.size) datos[nombre] = { serie, advertencia: p.advertencia };
        });
        // Se pueden comparar los que tienen datos y no traen advertencia (p. ej. Honduras no).
        const opciones = Object.keys(datos)
          .filter((n) => n !== PAIS_FIJO && !datos[n].advertencia)
          .sort((a, b) => a.localeCompare(b, 'es'));
        opciones.forEach((n) => {
          const o = document.createElement('option');
          o.value = n;
          o.textContent = n;
          select.appendChild(o);
        });
      })
      .catch((err) => {
        cargando = null; // se puede reintentar la próxima vez que se abra
        dato.textContent = 'No se pudieron cargar los datos de otros países.';
        dato.classList.remove('cp-vacio');
        throw err;
      });
    return cargando;
  }

  function paisInicial() {
    const opciones = [...select.options].map((o) => o.value);
    return opciones.includes(PAIS_INICIAL) ? PAIS_INICIAL : opciones[0];
  }

  // ---------- Estado de la animación (mismo criterio que "Por año") ----------
  let revelado = false; // ¿ya se dibujaron las líneas?
  let progreso = 0; // 0 = líneas ocultas, 1 = dibujadas enteras (de izquierda a derecha)
  let grilla = 0; // 0 = sin cuadrícula ni números de los ejes, 1 = completos
  let rafLineas = null,
    rafGrilla = null,
    timerGrilla = null;

  // Colores de ejes y cuadrícula: aparecen junto con la grilla.
  const colorTicks = () => `rgba(169,154,166,${Math.max(0, (grilla - 0.3) / 0.7)})`;
  const colorGrid = () => `rgba(255,255,255,${0.06 * grilla})`;

  // Recorta el dibujo de las líneas según "progreso" (como revelarPlugin de modulo2.js).
  const revelarLineas = {
    id: 'cpRevelar',
    beforeDatasetsDraw(chart) {
      if (progreso >= 1) return;
      const { left, right } = chart.chartArea;
      const c = chart.ctx;
      c.save();
      c.beginPath();
      c.rect(0, 0, left - 12 + (right - left + 24) * progreso, chart.height);
      c.clip();
      chart._cpRecorte = true;
    },
    afterDatasetsDraw(chart) {
      if (!chart._cpRecorte) return;
      chart.ctx.restore();
      chart._cpRecorte = false;
    },
  };

  // Línea punteada vertical en el año elegido (como la de "Por año"): marca qué año
  // describen el título y el dato, aunque ese año no tenga puntos.
  const lineaAnio = {
    id: 'cpLineaAnio',
    afterDatasetsDraw(chart) {
      if (!revelado) return;
      const { top, bottom } = chart.chartArea;
      const x = Math.round(chart.scales.x.getPixelForValue(anioActual)) + 0.5;
      const c = chart.ctx;
      c.save();
      c.strokeStyle = 'rgba(255, 111, 156, 0.55)';
      c.lineWidth = 1;
      c.setLineDash([4, 4]);
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x, bottom);
      c.stroke();
      c.restore();
    },
  };

  // ---------- Gráfico ----------
  let chart = null;

  function puntos(nombre) {
    const s = datos[nombre].serie;
    const out = [];
    for (let a = ANIO_MIN; a <= ANIO_MAX; a++) out.push({ x: a, y: s.has(a) ? s.get(a) : null });
    return out;
  }

  function topeEjeY(otro) {
    let max = 0;
    [PAIS_FIJO, otro].forEach((n) => datos[n].serie.forEach((v) => (max = Math.max(max, v))));
    return Math.ceil((max + 1) / 5) * 5;
  }

  function dataset(nombre, color) {
    return {
      label: nombre,
      data: puntos(nombre),
      borderColor: color,
      backgroundColor: color,
      pointBackgroundColor: color,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2,
      tension: 0,
      spanGaps: false, // si falta un año, la línea se corta (no inventa el dato)
    };
  }

  function crearGrafico(otro) {
    chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      plugins: [revelarLineas, lineaAnio],
      data: { datasets: [dataset(PAIS_FIJO, COLOR_ARG), dataset(otro, COLOR_OTRO)] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // la entrada la manejan revelarLineas y animarGrilla
        layout: { padding: { left: 10, right: 10 } },
        interaction: { mode: 'x', intersect: false },
        plugins: {
          legend: { display: false }, // la leyenda son los chips de arriba
          tooltip: {
            backgroundColor: '#160f1b',
            borderColor: 'rgba(255, 182, 206, 0.18)',
            borderWidth: 1,
            titleColor: '#f2e9ee',
            bodyColor: '#f2e9ee',
            padding: 10,
            boxPadding: 4,
            usePointStyle: true,
            // vacío (antes del reveal) no muestra nada
            filter: (item) => revelado && item.raw.y != null,
            callbacks: {
              title: (items) => (items.length ? String(items[0].raw.x) : ''),
              label: (item) => ' ' + item.dataset.label + ': ' + fmt1(item.raw.y),
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            min: 2004,
            max: 2025,
            ticks: {
              color: colorTicks,
              stepSize: 1,
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: (v) => ([2005, 2010, 2015, 2020, 2025].includes(v) ? v : ''),
            },
            grid: { color: colorGrid },
          },
          y: {
            min: 0, // arranca en 0: así la distancia entre las dos líneas es honesta
            max: topeEjeY(otro),
            ticks: { color: colorTicks, stepSize: 5, callback: (v) => fmt1(v) },
            grid: { color: colorGrid },
          },
        },
        // Pasar el cursor (o el dedo) año a año cambia el título y el dato de abajo.
        // Se toma el año más cercano al cursor, haya o no puntos ese año.
        onHover: (evt, els, ch) => {
          if (!revelado) return;
          const { left, right } = ch.chartArea;
          if (evt.x < left - 10 || evt.x > right + 10) return;
          elegirAnio(Math.round(ch.scales.x.getValueForPixel(evt.x)));
        },
      },
    });
  }

  // Último año que tienen los dos países (para el título y el dato de abajo).
  function ultimoAnioComun(otro) {
    for (let a = ANIO_MAX; a >= ANIO_MIN; a--) {
      if (datos[PAIS_FIJO].serie.has(a) && datos[otro].serie.has(a)) return a;
    }
    return null;
  }

  function avisoFaltantes(otro) {
    const anios = [...datos[otro].serie.keys()].sort((a, b) => a - b);
    const desde = anios[0],
      hasta = anios[anios.length - 1];
    const faltan = [];
    for (let a = desde; a <= hasta; a++) if (!datos[otro].serie.has(a)) faltan.push(a);
    const partes = [];
    if (desde > ANIO_MIN) partes.push(otro + ' tiene datos desde ' + desde);
    if (hasta < ANIO_MAX - 1) partes.push(otro + ' tiene datos hasta ' + hasta);
    if (faltan.length) partes.push('sin datos de ' + otro + ' en ' + faltan.join(', '));
    return partes.length ? partes.join('; ') + '.' : '';
  }

  // Número en rosa (Argentina) o celeste (el otro país) para el dato de abajo.
  function numero(v, esOtro) {
    const b = document.createElement('b');
    if (esOtro) b.className = 'cp-otro';
    b.textContent = fmt1(v);
    return b;
  }

  // Título y dato de abajo para el año "a". Si uno de los dos países (o los dos)
  // no tiene dato ese año, se aclara en vez de comparar.
  function actualizarTextos(otro, a) {
    dato.textContent = '';
    const sArg = datos[PAIS_FIJO].serie;
    const sOtro = datos[otro].serie;
    const hayArg = sArg.has(a);
    const hayOtro = sOtro.has(a);

    if (hayArg && hayOtro) {
      const vArg = sArg.get(a);
      const vOtro = sOtro.get(a);
      const dif = ((vArg - vOtro) / vOtro) * 100;
      if (Math.abs(dif) < 5) {
        titulo.textContent = 'En ' + a + ', Argentina y ' + otro + ' tuvieron una tasa parecida';
      } else {
        titulo.textContent =
          'En ' +
          a +
          ', la tasa de Argentina fue un ' +
          Math.round(Math.abs(dif)).toLocaleString('es-AR') +
          ' % ' +
          (dif > 0 ? 'más alta' : 'más baja') +
          ' que la de ' +
          otro;
      }
      dato.append(
        'En ' + a + ': ',
        numero(vArg, false),
        ' muertes cada 100.000 mujeres en Argentina y ',
        numero(vOtro, true),
        ' en ' + otro + ' (ajustadas por edad).',
      );
    } else if (hayArg) {
      titulo.textContent = 'En ' + a + ' no hay datos de ' + otro + ' para comparar';
      dato.append(
        'En ' + a + ': ',
        numero(sArg.get(a), false),
        ' muertes cada 100.000 mujeres en Argentina (ajustadas por edad). ' +
          otro +
          ' no tiene datos de ese año.',
      );
    } else if (hayOtro) {
      titulo.textContent = 'En ' + a + ' no hay datos de Argentina para comparar';
      dato.append(
        'En ' + a + ': ',
        numero(sOtro.get(a), true),
        ' muertes cada 100.000 mujeres en ' +
          otro +
          ' (ajustadas por edad). Argentina no tiene datos de ese año.',
      );
    } else {
      titulo.textContent = 'En ' + a + ' no hay datos de Argentina ni de ' + otro;
      dato.append('Ninguno de los dos países tiene datos de ' + a + '.');
    }

    // Aviso general de años faltantes (solo cuando el año elegido tiene los 2 datos;
    // si no, ya se aclara arriba y no se repite).
    const aviso = hayArg && hayOtro ? avisoFaltantes(otro) : '';
    if (aviso) {
      const s = document.createElement('span');
      s.className = 'cp-aviso';
      s.textContent = aviso.charAt(0).toUpperCase() + aviso.slice(1);
      dato.appendChild(s);
    }
  }

  // Año que muestran el título y el dato de abajo (y la línea punteada vertical).
  let anioActual = ANIO_MAX;

  function elegirAnio(a) {
    a = Math.max(ANIO_MIN, Math.min(ANIO_MAX, a));
    if (a === anioActual) return;
    anioActual = a;
    actualizarTextos(select.value, a);
    if (chart) chart.draw();
  }

  // Al elegir país se arranca en el último año que tienen los dos.
  function mostrarPais(otro) {
    if (!chart) crearGrafico(otro);
    else {
      chart.data.datasets[1] = dataset(otro, COLOR_OTRO);
      chart.options.scales.y.max = topeEjeY(otro);
      chart.update('none');
    }
    anioActual = ultimoAnioComun(otro) ?? ANIO_MAX;
    actualizarTextos(otro, anioActual);
  }

  // Cambiar de país con el gráfico ya dibujado: la línea nueva se dibuja de izquierda a derecha.
  select.addEventListener('change', () => {
    if (!chart) return;
    mostrarPais(select.value);
    if (revelado) animarLineas();
  });

  // ---------- Vacío → reveal ----------
  function cancelarAnimaciones() {
    clearTimeout(timerGrilla);
    if (rafGrilla) cancelAnimationFrame(rafGrilla);
    if (rafLineas) cancelAnimationFrame(rafLineas);
    rafGrilla = rafLineas = null;
  }

  // La cuadrícula y los números de los ejes aparecen solos al abrir (como "Por año").
  function animarGrilla() {
    grilla = 0;
    if (chart) chart.update('none');
    if (sinMovimiento()) {
      grilla = 1;
      if (chart) chart.update('none');
      return;
    }
    timerGrilla = setTimeout(() => {
      const DURACION = 1000; // ms
      const t0 = performance.now();
      const paso = (ahora) => {
        const t = Math.min(1, (ahora - t0) / DURACION);
        grilla = 1 - Math.pow(1 - t, 3);
        if (chart) chart.update('none');
        rafGrilla = t < 1 ? requestAnimationFrame(paso) : null;
      };
      rafGrilla = requestAnimationFrame(paso);
    }, 150);
  }

  // Las 2 líneas se dibujan de izquierda a derecha.
  function animarLineas() {
    if (rafLineas) cancelAnimationFrame(rafLineas);
    if (sinMovimiento()) {
      progreso = 1;
      chart.draw();
      return;
    }
    progreso = 0;
    const DURACION = 1200; // ms
    const t0 = performance.now();
    const paso = (ahora) => {
      const t = Math.min(1, (ahora - t0) / DURACION);
      progreso = 1 - Math.pow(1 - t, 3); // easeOutCubic
      chart.draw();
      rafLineas = t < 1 ? requestAnimationFrame(paso) : null;
    };
    rafLineas = requestAnimationFrame(paso);
  }

  // Estado inicial: gráfico vacío, pista rosa visible, título/países/dato ocultos.
  function vaciar() {
    cancelarAnimaciones();
    revelado = false;
    progreso = 0;
    pista.classList.remove('br-prompt-gone');
    ocultosHastaReveal.forEach((el) => el.classList.add('cp-vacio'));
    if (chart) {
      chart.setActiveElements([]);
      chart.tooltip.setActiveElements([], { x: 0, y: 0 });
    }
    animarGrilla();
  }

  // Primera interacción: se va la pista, aparecen el título/países/dato y se dibujan las líneas.
  function revelar() {
    if (revelado || !chart) return;
    revelado = true;
    pista.classList.add('br-prompt-gone');
    ocultosHastaReveal.forEach((el) => el.classList.remove('cp-vacio'));
    if (grilla < 1) {
      // si entra el cursor antes de que termine la grilla, se completa ya
      clearTimeout(timerGrilla);
      if (rafGrilla) cancelAnimationFrame(rafGrilla);
      rafGrilla = null;
      grilla = 1;
      chart.update('none');
    }
    animarLineas();
  }

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Gráfico de la tasa de mortalidad por cáncer de mama ajustada por edad: Argentina comparada con otro país de América Latina, 2005 a 2024. Con las flechas izquierda y derecha recorrés los años.',
  );
  canvas.addEventListener('pointerenter', revelar);
  canvas.addEventListener('pointerdown', revelar);
  canvas.addEventListener('focus', revelar);
  // Teclado: flechas izquierda/derecha recorren los años (como en "Por año").
  canvas.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    revelar();
    elegirAnio(anioActual + (e.key === 'ArrowRight' ? 1 : -1));
  });

  // ---------- Abrir / cerrar ----------
  let abierto = false;
  let subGuardado = '';
  let fuenteGuardada = '';

  function abrir() {
    if (abierto) return;
    abierto = true;
    // Al menos el alto de la subtarjeta de "Por año": la tarjeta no salta (y si un título
    // largo necesita más lugar, crece en vez de cortarse).
    const subAnio = panelAnio.querySelector('.br-panel');
    if (subAnio && subAnio.offsetHeight) subPanel.style.minHeight = subAnio.offsetHeight + 'px';

    subGuardado = srcSub.textContent;
    fuenteGuardada = srcBox.querySelector('p').innerHTML;

    btn.setAttribute('aria-pressed', 'true');
    panelAnio.classList.add('br-hidden');
    panel.classList.remove('br-hidden');
    panel.classList.remove('br-fade-in');
    void panel.offsetWidth; // reinicia la animación (mismo truco que modulo2.js)
    panel.classList.add('br-fade-in');

    srcSub.textContent = SUB_CMP;
    uiFuenteSalir(srcBox, function () {
      if (abierto) uiFuente(srcBox, SRC_CMP);
    });

    // Cada vez que se abre: Uruguay elegido y el gráfico vacío.
    ocultosHastaReveal.forEach((el) => el.classList.add('cp-vacio'));
    pista.classList.remove('br-prompt-gone');
    cargarDatos()
      .then(() => {
        if (!abierto) return;
        select.value = paisInicial();
        mostrarPais(select.value);
        chart.resize();
        vaciar();
      })
      .catch(() => {});
  }

  // restaurar = true: vuelve a dejar "Por año" como estaba (bajada y Fuente).
  // restaurar = false: se cerró por un clic en una pestaña; modulo2.js ya pone sus textos.
  function cerrar(restaurar) {
    if (!abierto) return;
    abierto = false;
    cancelarAnimaciones();
    btn.setAttribute('aria-pressed', 'false');
    panel.classList.add('br-hidden');
    if (!restaurar) return;

    panelAnio.classList.remove('br-hidden');
    panelAnio.classList.remove('br-fade-in');
    void panelAnio.offsetWidth;
    panelAnio.classList.add('br-fade-in');
    const scatter = Chart.getChart('brAnioScatter');
    if (scatter) scatter.resize();

    srcSub.textContent = subGuardado;
    const html = fuenteGuardada;
    uiFuenteSalir(srcBox, function () {
      srcBox.querySelector('p').innerHTML = html;
    });
  }

  btn.addEventListener('click', () => (abierto ? cerrar(true) : abrir()));

  // Clic en "Por año" o "Por provincia" con el comparador abierto: se cierra.
  // (modulo2.js ya registró antes sus propios clics, que muestran el panel y los textos de cada pestaña.)
  tabAnio.addEventListener('click', () => cerrar(false));
  if (tabProvincia) tabProvincia.addEventListener('click', () => cerrar(false));

  // Al salir del capítulo 2 se cierra, así al volver arranca en "Por año" como siempre.
  new MutationObserver(() => {
    if (!chapter2.classList.contains('active')) cerrar(true);
  }).observe(chapter2, { attributes: true, attributeFilter: ['class'] });
})();
