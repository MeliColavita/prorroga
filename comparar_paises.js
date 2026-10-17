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
  const PAIS_INICIAL = 'Uruguay'; // el que aparece elegido al abrir
  const COLOR_ARG = '#ff6f9c'; // --rose-strong
  const COLOR_OTRO = '#8fd3e8'; // celeste: se distingue del rosa sobre fondo oscuro
  const ANIO_MIN = 2005;
  const ANIO_MAX = 2024;

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
  const NOTA_CMP =
    'Tasa ajustada por edad (población estándar mundial de la OMS): así se pueden comparar países ' +
    'con poblaciones más jóvenes o más viejas. Por eso no coincide con la tasa bruta de "Por año". ' +
    'La calidad del registro de muertes varía entre países. Análisis propio.';

  const fmt1 = (v) =>
    v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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
  const panel = document.createElement('div');
  panel.id = 'cpPanel';
  panel.className = 'br-hidden';
  panel.innerHTML =
    '<div class="br-panel">' +
    '<h2 id="cpTitulo">Argentina frente a otros países de América Latina</h2>' +
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
  const dato = panel.querySelector('#cpDato');
  const subPanel = panel.querySelector('.br-panel');

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
  let datos = null; // { pais: { serie: Map(anio → tasa), advertencia } }
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
        select.value = opciones.includes(PAIS_INICIAL) ? PAIS_INICIAL : opciones[0];
      })
      .catch((err) => {
        cargando = null; // se puede reintentar la próxima vez que se abra
        dato.textContent = 'No se pudieron cargar los datos de otros países.';
        throw err;
      });
    return cargando;
  }

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
    const ctx = document.getElementById('cpChart').getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: { datasets: [dataset(PAIS_FIJO, COLOR_ARG), dataset(otro, COLOR_OTRO)] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
            filter: (item) => item.raw.y != null,
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
              color: '#a99aa6',
              stepSize: 1,
              autoSkip: false,
              maxRotation: 0,
              minRotation: 0,
              callback: (v) => ([2005, 2010, 2015, 2020, 2025].includes(v) ? v : ''),
            },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          y: {
            min: 0, // arranca en 0: así la distancia entre las dos líneas es honesta
            max: topeEjeY(otro),
            ticks: { color: '#a99aa6', stepSize: 5, callback: (v) => fmt1(v) },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
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

  function actualizarTextos(otro) {
    const a = ultimoAnioComun(otro);
    dato.textContent = '';
    if (a == null) {
      titulo.textContent = 'Argentina y ' + otro + ' no tienen años en común para comparar';
      return;
    }
    const vArg = datos[PAIS_FIJO].serie.get(a);
    const vOtro = datos[otro].serie.get(a);
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
    const bArg = document.createElement('b');
    bArg.textContent = fmt1(vArg);
    const bOtro = document.createElement('b');
    bOtro.className = 'cp-otro';
    bOtro.textContent = fmt1(vOtro);
    dato.append(
      'En ' + a + ': ',
      bArg,
      ' muertes cada 100.000 mujeres en Argentina y ',
      bOtro,
      ' en ' + otro + ' (ajustadas por edad).',
    );
    const aviso = avisoFaltantes(otro);
    if (aviso) {
      const s = document.createElement('span');
      s.className = 'cp-aviso';
      s.textContent = aviso.charAt(0).toUpperCase() + aviso.slice(1);
      dato.appendChild(s);
    }
  }

  function mostrarPais(otro) {
    if (!chart) crearGrafico(otro);
    else {
      chart.data.datasets[1] = dataset(otro, COLOR_OTRO);
      chart.options.scales.y.max = topeEjeY(otro);
      chart.update();
    }
    actualizarTextos(otro);
  }

  select.addEventListener('change', () => mostrarPais(select.value));

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
      if (abierto) uiFuente(srcBox, SRC_CMP, NOTA_CMP);
    });

    cargarDatos()
      .then(() => {
        if (!abierto) return;
        mostrarPais(select.value);
        if (chart) chart.resize();
      })
      .catch(() => {});
  }

  // restaurar = true: vuelve a dejar "Por año" como estaba (bajada y Fuente).
  // restaurar = false: se cerró por un clic en una pestaña; modulo2.js ya pone sus textos.
  function cerrar(restaurar) {
    if (!abierto) return;
    abierto = false;
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
