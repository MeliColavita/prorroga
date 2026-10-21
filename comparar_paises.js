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
  const COLOR_ARG = '#ff6f9c'; // --rose-strong
  const COLOR_OTRO = '#b9a7e0'; // lila: se distingue del rosa sobre fondo oscuro
  const ANIO_MIN = 2005;
  const ANIO_MAX = 2023;
  const TITULO_INICIAL = 'Argentina frente a otros países de América Latina';
  const SIN_PAIS = 'Elegí un país'; // lo que dice el botón antes de elegir

  const SUB_CMP =
    'Muertes por cáncer de mama cada 100.000 mujeres, ajustadas por edad. América Latina, 2005–2023.';
  const SRC_CMP = [
    {
      autor: 'OMS(2001)',
      etiqueta: 'Población estándar mundial',
      url: 'https://cdn.who.int/media/docs/default-source/gho-documents/global-health-estimates/gpe_discussion_paper_series_paper31_2001_age_standardization_rates.pdf',
    },
    {
      autor: 'Naciones Unidas (2024)',
      etiqueta: 'Perspectivas de la Población Mundial',
      url: 'https://population.un.org/wpp/downloads?folder=Standard%20Projections&group=Population',
    },
    {
      autor: 'OMS (2026)',
      etiqueta: 'Datasets de mortalidad',
      url: 'https://www.who.int/data/data-collection-tools/who-mortality-database',
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
  // Al abrir se ve el gráfico con Argentina sola y el botón del país dice "Elegí un país".
  const panel = document.createElement('div');
  panel.id = 'cpPanel';
  panel.className = 'br-hidden';
  panel.innerHTML =
    '<div class="br-panel">' +
    '<h2 id="cpTitulo"></h2>' +
    '<div class="cp-paises">' +
    '<span class="cp-chip"><span class="cp-dot cp-dot-arg" aria-hidden="true"></span>Argentina</span>' +
    '<span>vs.</span>' +
    '<div class="cp-chip cp-chip-sel">' +
    '<button type="button" class="cp-select" id="cpSelBtn" aria-haspopup="listbox" aria-expanded="false" aria-controls="cpLista" aria-label="País para comparar con Argentina">' +
    '<span class="cp-dot cp-dot-otro" aria-hidden="true"></span><span id="cpSelTxt"></span></button>' +
    '<ul class="cp-lista" id="cpLista" role="listbox" aria-label="Países de América Latina" tabindex="-1" hidden></ul>' +
    '<select id="cpSelect" hidden></select>' +
    '</div>' +
    '<button type="button" class="br-tab-btn cp-todos-btn" id="cpTodosBtn" aria-pressed="false">Ver todos</button>' +
    '</div>' +
    '<div class="cp-chart"><canvas id="cpChart"></canvas></div>' +
    '<div class="cp-todos" id="cpTodos" hidden>' +
    '<div class="cp-ranking" id="cpRanking" role="list" aria-label="Países ordenados por tasa ajustada"></div>' +
    '<div class="br-year-ctl cp-todos-anio">' +
    '<label class="br-year-lbl" for="cpTodosAnio">Año: <b id="cpTodosAnioLbl"></b></label>' +
    '<input type="range" id="cpTodosAnio" min="' +
    ANIO_MIN +
    '" max="' +
    ANIO_MAX +
    '" step="1" />' +
    '</div>' +
    '</div>' +
    '<div class="br-axis-note">' +
    '<span class="br-tasa-tipo">Tasa ajustada por edad</span>' +
    '<button class="br-info-btn" id="cpInfoBtn" type="button" aria-label="Cómo leer este gráfico" aria-expanded="false" aria-controls="cpInfoPop">i</button>' +
    '<div class="br-info-pop" id="cpInfoPop" role="note" hidden><p>Tasa ajustada por edad. El eje empieza en 0.</p></div>' +
    '</div>' +
    '<p class="cp-dato" id="cpDato">Cargando datos…</p>' +
    '</div>';
  panelAnio.insertAdjacentElement('afterend', panel);

  const select = panel.querySelector('#cpSelect');
  const titulo = panel.querySelector('#cpTitulo');
  const dato = panel.querySelector('#cpDato');
  const subPanel = panel.querySelector('.br-panel');
  const canvas = panel.querySelector('#cpChart');

  // El botón solo tiene sentido en "Por año": se oculta en "Por provincia".
  function syncVisibilidadBoton() {
    btn.classList.toggle('br-hidden', !tabAnio.classList.contains('active'));
  }
  syncVisibilidadBoton();
  new MutationObserver(syncVisibilidadBoton).observe(tabAnio, {
    attributes: true,
    attributeFilter: ['class'],
  });

  // ---------- El botón titila cuando se descubren los datos de "Por año" ----------

  const statsAnio = panelAnio.querySelector('.br-stats');
  if (statsAnio) {
    new MutationObserver(() => {
      btn.classList.toggle('cp-btn-blink', !statsAnio.classList.contains('br-vacio'));
    }).observe(statsAnio, { attributes: true, attributeFilter: ['class'] });
  }
  btn.addEventListener('click', () => btn.classList.remove('cp-btn-blink'));

  // ---------- Botón "i" (cómo leer el gráfico), igual al de "Por año" ----------
  // Usa las mismas clases que el de "Por año" (.br-axis-note, .br-info-btn, .br-info-pop en modulo2.css).
  const infoBtn = panel.querySelector('#cpInfoBtn');
  const infoPop = panel.querySelector('#cpInfoPop');
  function cerrarInfo() {
    infoPop.hidden = true;
    infoBtn.setAttribute('aria-expanded', 'false');
  }
  infoBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // si no, el clic en el documento lo cerraría al instante
    const abrirPop = infoPop.hidden;
    infoPop.hidden = !abrirPop;
    infoBtn.setAttribute('aria-expanded', String(abrirPop));
  });
  // Clic afuera o Escape: se cierra.
  document.addEventListener('click', (e) => {
    if (!infoPop.hidden && !infoPop.contains(e.target)) cerrarInfo();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !infoPop.hidden) {
      cerrarInfo();
      infoBtn.focus();
    }
  });
  // ---------- Lista de países (misma estructura que la lista del buscador del módulo 3) ----------

  const selBtn = panel.querySelector('#cpSelBtn');
  const selTxt = panel.querySelector('#cpSelTxt');
  const selDot = panel.querySelector('#cpSelBtn .cp-dot');
  const lista = panel.querySelector('#cpLista');
  let activo = -1; // opción marcada con el teclado

  function opcionesLista() {
    return [...lista.querySelectorAll('[role="option"]')];
  }

  function marcar(i) {
    const ops = opcionesLista();
    activo = Math.max(0, Math.min(ops.length - 1, i));
    ops.forEach((o, j) => o.setAttribute('aria-selected', j === activo ? 'true' : 'false'));
    if (ops[activo]) {
      lista.setAttribute('aria-activedescendant', ops[activo].id);
      ops[activo].scrollIntoView({ block: 'nearest' });
    }
  }

  function abrirLista() {
    // Se arma la primera vez, con los países que cargó cargarDatos() en el <select>.
    if (!lista.children.length) {
      [...select.options].forEach((o, i) => {
        const li = document.createElement('li');
        li.id = 'cpOp' + i;
        li.setAttribute('role', 'option');
        li.dataset.valor = o.value;
        li.textContent = o.textContent;
        lista.appendChild(li);
      });
    }
    lista.hidden = false;
    selBtn.setAttribute('aria-expanded', 'true');
    // Sin país elegido todavía, arranca marcado el primero de la lista.
    marcar(
      Math.max(
        0,
        opcionesLista().findIndex((li) => li.dataset.valor === select.value),
      ),
    );
  }

  function cerrarLista() {
    if (lista.hidden) return;
    lista.hidden = true;
    selBtn.setAttribute('aria-expanded', 'false');
  }

  function elegirPais(valor) {
    cerrarLista();
    if (valor === select.value) return;
    select.value = valor;
    select.dispatchEvent(new Event('change')); // lo escucha el listener de "change" de más abajo
  }

  selBtn.addEventListener('click', () => (lista.hidden ? abrirLista() : cerrarLista()));
  lista.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (!li) return;
    elegirPais(li.dataset.valor);
    selBtn.focus();
  });
  // Teclado: flechas para moverse, Enter para elegir, Escape para cerrar.
  selBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (lista.hidden) abrirLista();
      else marcar(activo + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter' && !lista.hidden) {
      e.preventDefault();
      const li = opcionesLista()[activo];
      if (li) elegirPais(li.dataset.valor);
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      cerrarLista();
    }
  });
  // Tocar afuera de la lista la cierra.
  document.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.cp-chip-sel')) cerrarLista();
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
        throw err;
      });
    return cargando;
  }

  // ---------- Animación de la línea del otro país ----------
  let progreso = 1; // 0 = línea del otro país oculta, 1 = dibujada entera (de izquierda a derecha)
  let rafLinea = null;

  // Recorta SOLO la línea del otro país (dataset 1) según "progreso": Argentina queda fija.
  const revelarLinea = {
    id: 'cpRevelar',
    beforeDatasetDraw(chart, args) {
      if (args.index !== 1 || progreso >= 1) return;
      const { left, right } = chart.chartArea;
      const c = chart.ctx;
      c.save();
      c.beginPath();
      c.rect(0, 0, left - 12 + (right - left + 24) * progreso, chart.height);
      c.clip();
      chart._cpRecorte = true;
    },
    afterDatasetDraw(chart, args) {
      if (args.index !== 1 || !chart._cpRecorte) return;
      chart.ctx.restore();
      chart._cpRecorte = false;
    },
  };

  // Línea punteada vertical en el año elegido (como la de "Por año"): marca qué año
  // describen el título y el dato, aunque ese año no tenga puntos.
  const lineaAnio = {
    id: 'cpLineaAnio',
    afterDatasetsDraw(chart) {
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

  // Sin país (nombre vacío) devuelve todos los años sin dato: la línea no se dibuja.
  function puntos(nombre) {
    const s = nombre ? datos[nombre].serie : new Map();
    const out = [];
    for (let a = ANIO_MIN; a <= ANIO_MAX; a++) out.push({ x: a, y: s.has(a) ? s.get(a) : null });
    return out;
  }

  function topeEjeY(otro) {
    let max = 0;
    [PAIS_FIJO, otro]
      .filter(Boolean)
      .forEach((n) => datos[n].serie.forEach((v) => (max = Math.max(max, v))));
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
      plugins: [revelarLinea, lineaAnio],
      data: { datasets: [dataset(PAIS_FIJO, COLOR_ARG), dataset(otro, COLOR_OTRO)] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, // la entrada de la línea nueva la maneja revelarLinea
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
        // Pasar el cursor (o el dedo) año a año cambia el título y el dato de abajo.
        // Se toma el año más cercano al cursor, haya o no puntos ese año.
        onHover: (evt, els, ch) => {
          const { left, right } = ch.chartArea;
          if (evt.x < left - 10 || evt.x > right + 10) return;
          elegirAnio(Math.round(ch.scales.x.getValueForPixel(evt.x)));
        },
      },
    });
  }

  // Último año con dato de Argentina y (si hay país elegido) también del otro país.
  function ultimoAnioComun(otro) {
    for (let a = ANIO_MAX; a >= ANIO_MIN; a--) {
      if (datos[PAIS_FIJO].serie.has(a) && (!otro || datos[otro].serie.has(a))) return a;
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
    if (hasta < ANIO_MAX) partes.push(otro + ' tiene datos hasta ' + hasta);
    if (faltan.length) partes.push('sin datos de ' + otro + ' en ' + faltan.join(', '));
    return partes.length ? partes.join('; ') + '.' : '';
  }

  // Número en rosa (Argentina) o lila (el otro país) para el dato de abajo.
  function numero(v, esOtro) {
    const b = document.createElement('b');
    if (esOtro) b.className = 'cp-otro';
    b.textContent = fmt1(v);
    return b;
  }

  // Título y dato de abajo para el año "a". Sin país elegido muestra solo Argentina.
  // Si uno de los dos países (o los dos) no tiene dato ese año, se aclara en vez de comparar.
  function actualizarTextos(otro, a) {
    dato.textContent = '';
    const sArg = datos[PAIS_FIJO].serie;
    const hayArg = sArg.has(a);

    if (!otro) {
      titulo.textContent = TITULO_INICIAL;
      if (hayArg) {
        dato.append(
          'En ' + a + ': ',
          numero(sArg.get(a), false),
          ' muertes cada 100.000 mujeres en Argentina.',
        );
      } else {
        dato.append('Argentina no tiene datos de ' + a + '.');
      }
      return;
    }

    const sOtro = datos[otro].serie;
    const hayOtro = sOtro.has(a);

    if (hayArg && hayOtro) {
      const vArg = sArg.get(a);
      const vOtro = sOtro.get(a);
      const dif = vArg - vOtro; // Diferencia en puntos de tasa (tasa de Argentina menos la del otro país), con 1 decimal.
      if (fmt1(Math.abs(dif)) === '0,0') {
        titulo.textContent = 'En ' + a + ', Argentina y ' + otro + ' tuvieron la misma tasa';
      } else {
        titulo.textContent =
          'En ' +
          a +
          ', Argentina tuvo ' +
          fmt1(Math.abs(dif)) +
          ' muertes cada 100.000 mujeres ' +
          (dif > 0 ? 'más' : 'menos') +
          ' que ' +
          otro;
      }
      dato.append(
        'En ' + a + ': ',
        numero(vArg, false),
        ' muertes cada 100.000 mujeres en Argentina y ',
        numero(vOtro, true),
        ' en ' + otro + '.',
      );
    } else if (hayArg) {
      titulo.textContent = 'En ' + a + ' no hay datos de ' + otro + ' para comparar';
      dato.append(
        'En ' + a + ': ',
        numero(sArg.get(a), false),
        ' muertes cada 100.000 mujeres en Argentina. ' + otro + ' no tiene datos de ese año.',
      );
    } else if (hayOtro) {
      titulo.textContent = 'En ' + a + ' no hay datos de Argentina para comparar';
      dato.append(
        'En ' + a + ': ',
        numero(sOtro.get(a), true),
        ' muertes cada 100.000 mujeres en ' + otro + '. Argentina no tiene datos de ese año.',
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

  // Muestra el país "otro" (o ninguno, con otro = ''). Arranca en el último año con datos.
  function mostrarPais(otro) {
    if (!chart) crearGrafico(otro);
    else {
      chart.data.datasets[1] = dataset(otro, COLOR_OTRO);
      chart.options.scales.y.max = topeEjeY(otro);
      chart.update('none');
    }
    anioActual = ultimoAnioComun(otro) ?? ANIO_MAX;
    actualizarTextos(otro, anioActual);
    selTxt.textContent = otro || SIN_PAIS; // lo que se ve en el botón del país
    selDot.hidden = !otro; // el puntito lila aparece recién con un país elegido
    selBtn.parentElement.classList.toggle('cp-chip-blink', !otro); // titila hasta que se elige un país
    chart.draw(); // la línea punteada pasa al año nuevo
  }

  // La línea del otro país se dibuja de izquierda a derecha.
  function animarLinea() {
    if (rafLinea) cancelAnimationFrame(rafLinea);
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
      rafLinea = t < 1 ? requestAnimationFrame(paso) : null;
    };
    rafLinea = requestAnimationFrame(paso);
  }

  // Elegir país: se dibuja la línea nueva.
  select.addEventListener('change', () => {
    if (!chart) return;
    mostrarPais(select.value);
    animarLinea();
    if (!todosVisto) todosBtn.classList.add('cp-todos-blink');
  });

  canvas.setAttribute('tabindex', '0');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute(
    'aria-label',
    'Gráfico de la tasa de mortalidad por cáncer de mama ajustada por edad: Argentina comparada con otro país de América Latina, 2005 a 2023. Con las flechas izquierda y derecha recorrés los años.',
  );
  // Teclado: flechas izquierda/derecha recorren los años (como en "Por año").
  canvas.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    elegirAnio(anioActual + (e.key === 'ArrowRight' ? 1 : -1));
  });
  // ---------- "Ver todos": todos los países a la vez (ranking de barras) ----------
  const todosBtn = panel.querySelector('#cpTodosBtn');
  const todos = panel.querySelector('#cpTodos');
  const ranking = panel.querySelector('#cpRanking');
  const todosAnio = panel.querySelector('#cpTodosAnio');
  const todosAnioLbl = panel.querySelector('#cpTodosAnioLbl');
  const ALTO_FILA = 14; // px por país
  const ROSA_ALTO = [194, 87, 127]; // #c2577f: tasa más alta
  const ROSA_BAJO = [92, 45, 69]; // #5c2d45: tasa más baja (Argentina siempre va en --rose-strong)
  let modoTodos = false;
  let todosVisto = false; // ya se tocó "Ver todos" desde que se abrió el comparador
  let filas = null; // { país: fila }
  let topeRanking = 0;

  // Argentina y los mismos países que la lista (sin los que tienen advertencia).
  function paisesRanking() {
    return [PAIS_FIJO, ...[...select.options].map((o) => o.value)];
  }

  function armarFilas() {
    if (filas) return;
    filas = {};
    paisesRanking().forEach((n) => {
      const fila = document.createElement('div');
      fila.className = 'cp-fila' + (n === PAIS_FIJO ? ' cp-fila-arg' : '');
      fila.setAttribute('role', 'listitem');
      fila.innerHTML =
        '<span class="cp-fila-nombre"></span>' +
        '<span class="cp-fila-barra"><span class="cp-fila-relleno"></span><span class="cp-fila-valor"></span></span>';
      fila.querySelector('.cp-fila-nombre').textContent = n;
      ranking.appendChild(fila);
      filas[n] = fila;
    });
    // Escala fija para todos los años: así el largo de las barras se puede comparar entre años.
    paisesRanking().forEach((n) =>
      datos[n].serie.forEach((v) => (topeRanking = Math.max(topeRanking, v))),
    );
    topeRanking = Math.ceil(topeRanking / 5) * 5;
  }

  // t = 0 para la tasa más alta, 1 para la más baja: de rosa intenso a rosa oscuro.
  function colorRanking(t) {
    return 'rgb(' + ROSA_ALTO.map((v, i) => Math.round(v + (ROSA_BAJO[i] - v) * t)).join(',') + ')';
  }

  function mostrarRanking(a) {
    armarFilas();
    todosAnioLbl.textContent = a;
    todosAnio.style.setProperty('--br-fill', ((a - ANIO_MIN) / (ANIO_MAX - ANIO_MIN)) * 100 + '%');
    const conDato = paisesRanking()
      .filter((n) => datos[n].serie.has(a))
      .sort((x, y) => datos[y].serie.get(a) - datos[x].serie.get(a));
    const sinDato = paisesRanking().filter((n) => !datos[n].serie.has(a));

    ranking.style.height = conDato.length * ALTO_FILA + 'px';
    conDato.forEach((n, i) => {
      const fila = filas[n];
      const v = datos[n].serie.get(a);
      fila.hidden = false;
      fila.style.top = i * ALTO_FILA + 'px';
      const barra = fila.querySelector('.cp-fila-relleno');
      // El número va pegado a la punta de la barra: se le reservan 40px.
      barra.style.width = 'calc((100% - 40px) * ' + v / topeRanking + ')';
      if (n !== PAIS_FIJO) {
        barra.style.background = colorRanking(conDato.length > 1 ? i / (conDato.length - 1) : 0);
      }
      fila.querySelector('.cp-fila-valor').textContent = fmt1(v);
    });
    sinDato.forEach((n) => (filas[n].hidden = true));

    // Título y dato de abajo: el puesto de Argentina ese año.
    dato.textContent = '';
    const puesto = conDato.indexOf(PAIS_FIJO) + 1;
    if (!puesto) {
      titulo.textContent = 'En ' + a + ' no hay datos de Argentina';
    } else {
      titulo.textContent =
        'En ' +
        a +
        ', Argentina tuvo ' +
        (puesto === 1 ? 'la tasa más alta' : 'la ' + puesto + '.ª tasa más alta') +
        ' de ' +
        conDato.length +
        ' países';
      dato.append(
        'En ' + a + ': ',
        numero(datos[PAIS_FIJO].serie.get(a), false),
        ' muertes cada 100.000 mujeres en Argentina.',
      );
    }
    if (sinDato.length) {
      const s = document.createElement('span');
      s.className = 'cp-aviso';
      s.textContent = 'Sin datos de ' + a + ': ' + sinDato.join(', ') + '.';
      dato.appendChild(s);
    }
  }

  // Cambia entre el gráfico de a un país y el ranking de todos.
  function cambiarModo(enTodos) {
    modoTodos = enTodos;
    panel.classList.toggle('cp-modo-todos', enTodos);
    todosBtn.setAttribute('aria-pressed', String(enTodos));
    todosBtn.textContent = enTodos ? 'Ver de a un país' : 'Ver todos';
    todos.hidden = !enTodos;
    cerrarLista();
    if (!datos) return;
    if (enTodos) {
      todosAnio.value = ANIO_MAX;
      todosAnio.classList.remove('br-year-used'); // el circulito vuelve a latir
      mostrarRanking(ANIO_MAX);
    } else {
      actualizarTextos(select.value, anioActual);
      if (chart) chart.resize();
    }
  }

  todosBtn.addEventListener('click', () => {
    todosVisto = true;
    todosBtn.classList.remove('cp-todos-blink'); // ya se tocó: deja de titilar
    cambiarModo(!modoTodos);
    subPanel.classList.remove('br-fade-in');
    void subPanel.offsetWidth; // reinicia la animación (mismo truco que modulo2.js)
    subPanel.classList.add('br-fade-in');
  });
  todosAnio.addEventListener('input', () => {
    todosAnio.classList.add('br-year-used');
    mostrarRanking(Number(todosAnio.value));
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

    // Cada vez que se abre: solo Argentina y el botón vuelve a "Elegí un país" (sin puntito).
    cambiarModo(false); // siempre arranca de a un país
    todosVisto = false; // "Ver todos" vuelve a titilar con el primer país que se elija
    todosBtn.classList.remove('cp-todos-blink');
    cargarDatos()
      .then(() => {
        if (!abierto) return;
        if (rafLinea) cancelAnimationFrame(rafLinea);
        progreso = 1;
        select.value = '';
        mostrarPais('');
        chart.resize();
      })
      .catch(() => {});
  }

  // restaurar = true: vuelve a dejar "Por año" como estaba (bajada y Fuente).
  // restaurar = false: se cerró por un clic en una pestaña; modulo2.js ya pone sus textos.
  function cerrar(restaurar) {
    if (!abierto) return;
    abierto = false;
    if (rafLinea) cancelAnimationFrame(rafLinea);
    rafLinea = null;
    cerrarLista();
    cerrarInfo();
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
