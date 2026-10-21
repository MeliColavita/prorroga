// MODULO1.JS — Capítulo 1 "Argentina hoy" (Emi, prefijo em-): dibuja los gráficos de barras de la tarjeta y maneja las 2 pestañas.
(function () {
  // root = el contenedor raíz de TODO el módulo.
  const root = document.querySelector('.em-wrap');
  if (!root) return; // el módulo no está en la página

  // panel1 = el <div id="em-chart-panel"> vacío donde se dibuja el gráfico que corresponda según la pestaña activa.
  const panel1 = root.querySelector('#em-chart-panel');
  if (!panel1) return;

  // emSrc = el acordeón "Fuente" (.ui-src), hijo directo de .em-card.
  const emSrc = panel1.parentElement.querySelector('.ui-src');
  const emTabsRow = root.querySelector('.em-tabs');

  // ===== 2. REDUCIR MOVIMIENTO: se lee una sola vez la preferencia del sistema para saltear las animaciones =====
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ===== 3. HERRAMIENTAS GENÉRICAS =====

  // formatNumber(n): 20750 -> "20.750" (separador de miles argentino).
  function formatNumber(n) {
    return new Intl.NumberFormat('es-AR').format(n);
  }

  // pctLabel(x): 0.602 -> "60,2" (1 decimal, coma argentina).
  function pctLabel(x) {
    return (Math.round(x * 1000) / 10).toLocaleString('es-AR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  // countUp(el, to): escribe en "el" los números de 0 a "to", en unos 600ms, dando la sensación de un contador sumando en vivo.
  function countUp(el, to) {
    if (reduceMotion) {
      el.textContent = formatNumber(to);
      return;
    }
    const t0 = performance.now();
    (function tick(t) {
      const p = Math.min(1, (t - t0) / 600);
      el.textContent = formatNumber(Math.round(to * p));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  // countUpPct(el): cuenta de 0 al valor final de un porcentaje ("29,9%") en 900ms, con decimales y coma argentina.
  function countUpPct(el) {
    if (reduceMotion || el.textContent.indexOf('%') === -1) return;
    const fin = parseFloat(el.textContent.replace(',', '.'));
    const t0 = performance.now();
    (function tick(t) {
      const p = Math.min(1, (t - t0) / 900);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent =
        (fin * e).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) +
        '%';
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  // animateIn se sacó: se pisaba con .em-fade-in al cambiar de pestaña y el panel pegaba un salto.

  // ===== 4. TOOLTIP COMPARTIDO: un único globo flotante (en <body>) que reusan los 2 gráficos =====
  const tip = document.createElement('div');
  tip.className = 'em-tip';
  tip.hidden = true;
  document.body.appendChild(tip);

  function showTip(e, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    // Math.min(...): recorta la posición para que el globo no se salga de la pantalla por el borde derecho.
    const x = Math.max(8, Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8));
    tip.style.left = x + window.scrollX + 'px';
    tip.style.top = e.clientY + window.scrollY - 10 + 'px';
  }
  function hideTip() {
    tip.hidden = true;
  }
  // ===== 5. DATOS: fuente de todos los números (GLOBOCAN 2024, IARC/OMS); si cambia alguno, se cambia acá =====

  // MAMA_MUJERES / CASOS_TOTALES_AMBOS_SEXOS: los 2 números del dato "14,9%" de abajo.
  const MAMA_MUJERES = 20750;
  const CASOS_TOTALES_AMBOS_SEXOS = 139470;
  const CASOS_TOTALES_MUJERES = 69449;

  // chapter1Stats: los 2 datos sueltos que acompañan al gráfico "Casos por tipo de cáncer" (no cambian con la interacción).
  const chapter1Stats = [
    { valor: '1°', label: 'Cáncer más frecuente en mujeres', clase: 'em-stat-primero' },
    {
      valor: pctLabel(MAMA_MUJERES / CASOS_TOTALES_MUJERES) + '%',
      label: 'de todos los cánceres en mujeres',
      clase: 'em-stat-pct-mujeres',
    },
    {
      valor: pctLabel(MAMA_MUJERES / CASOS_TOTALES_AMBOS_SEXOS) + '%',
      label: 'de todos los casos de cáncer en mujeres y hombres',
    },
  ];

  // TIPO_MAX / EDAD_MAX: techo del eje (en casos) que usa cada gráfico de barras para calcular la altura.
  const TIPO_MAX = 25000;
  // SUM_LABEL: texto del botón que junta los otros 4 cánceres en una sola pila.
  const SUM_LABEL = '¿Y si sumamos los otros 4?';
  // EDAD_MAX: valor más alto de casosPorEdad (6.278), calculado más abajo, para que la barra más alta llegue al techo del gráfico.

  const chapter1Data = {
    casosPorTipo: [
      { categoria: 'Mama', valor: 20750, tasa: 66.2 },
      { categoria: 'Colorrectal', valor: 7698, tasa: 20.5 },
      { categoria: 'Cuello uterino', valor: 4679, tasa: 16.5 },
      { categoria: 'Pulmón', valor: 4469, tasa: 12.5 },
      { categoria: 'Tiroides', valor: 3370, tasa: 12.4 },
    ],
    casosPorEdad: [
      { categoria: '15-29', valor: 549, desde: 15, hasta: 29 },
      { categoria: '30-44', valor: 3984, desde: 30, hasta: 44 },
      { categoria: '45-59', valor: 6213, desde: 45, hasta: 59 },
      { categoria: '60-74', valor: 6278, desde: 60, hasta: 74 },
      { categoria: '75 o más', valor: 3726, desde: 75, hasta: null },
    ],
  };

  // Techo del eje de "Casos por edad" = la barra más alta; se recalcula solo si cambian los datos.
  const EDAD_MAX = Math.max.apply(
    null,
    chapter1Data.casosPorEdad.map(function (d) {
      return d.valor;
    }),
  );

  // tipoState / edadState: el estado de cada gráfico interactivo.
  let tipoState = { revealed: false, guess: null, merged: false };

  // Animación de entrada de "Casos por tipo": los guiones del borde de la barra de Mama vuelan y arman el contorno.
  let tipoIntroHecha = reduceMotion;
  let tipoIntroPendiente = null;
  const introEl = document.getElementById('intro');
  const chapterEl = root.closest('.chapter');
  function tipoVisible() {
    return (
      (!introEl || introEl.classList.contains('hidden')) &&
      (!chapterEl || chapterEl.classList.contains('active'))
    );
  }
  function revisarIntroTipo() {
    if (tipoIntroHecha || !tipoIntroPendiente || !tipoVisible()) return;
    const arrancar = tipoIntroPendiente;
    tipoIntroPendiente = null;
    tipoIntroHecha = true;
    arrancar();
  }

  // armarBarraConGuiones(host, barra, ocultar): arma la barra punteada de Mama con SUS PROPIOS guiones.
  function armarBarraConGuiones(host, barra, ocultar) {
    const hr = host.getBoundingClientRect();
    const br = barra.getBoundingClientRect();
    const W = hr.width;
    const H = hr.height;
    if (!W || !H || !br.width || !br.height) return;
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.className = 'em-intro-puntos';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    host.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Guiones del contorno: mismo trazo y esquinas redondeadas que .em-guess-bar, recorridos como un solo trazo.
    const LARGO = 6; // largo de cada guión (px)
    const PASO = 10; // guión + espacio
    const RA = 7; // radio de las esquinas de arriba
    const RB = 3; // radio de las esquinas de abajo
    const x0 = br.left - hr.left + 1;
    const y0 = br.top - hr.top + 1;
    const x1 = br.right - hr.left - 1;
    const y1 = br.bottom - hr.top - 1;
    // Tramos del contorno, en orden del trazo; cada uno sabe su largo y da el punto y la dirección a una distancia "d".
    function recta(xa, ya, xb, yb) {
      const L = Math.hypot(xb - xa, yb - ya);
      const ang = Math.atan2(yb - ya, xb - xa);
      return {
        L: L,
        en: function (d) {
          return { x: xa + ((xb - xa) * d) / L, y: ya + ((yb - ya) * d) / L, ang: ang };
        },
      };
    }
    function arco(cx, cy, r, a0, a1) {
      return {
        L: Math.abs(a1 - a0) * r,
        en: function (d) {
          const a = a0 + (a1 - a0) * (d / (Math.abs(a1 - a0) * r));
          return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, ang: a + Math.PI / 2 };
        },
      };
    }
    const tramos = [
      recta(x0, y1 - RB, x0, y0 + RA), // izquierda, subiendo
      arco(x0 + RA, y0 + RA, RA, Math.PI, Math.PI * 1.5), // esquina arriba-izq.
      recta(x0 + RA, y0, x1 - RA, y0), // arriba
      arco(x1 - RA, y0 + RA, RA, Math.PI * 1.5, Math.PI * 2), // esquina arriba-der.
      recta(x1, y0 + RA, x1, y1 - RB), // derecha, bajando
      arco(x1 - RB, y1 - RB, RB, 0, Math.PI * 0.5), // esquina abajo-der.
      recta(x1 - RB, y1, x0 + RB, y1), // abajo
      arco(x0 + RB, y1 - RB, RB, Math.PI * 0.5, Math.PI), // esquina abajo-izq.
    ];
    const total = tramos.reduce(function (acc, t) {
      return acc + t.L;
    }, 0);
    const n = Math.max(8, Math.round(total / PASO));
    const guiones = [];
    for (let k = 0; k < n; k++) {
      let d = ((k + 0.5) * total) / n;
      let i = 0;
      while (i < tramos.length - 1 && d > tramos[i].L) {
        d -= tramos[i].L;
        i++;
      }
      const p = tramos[i].en(d);
      guiones.push({ tx: p.x, ty: p.y, tang: p.ang });
    }
    // Salida: los guiones aparecen desde la base de la barra y suben a su lugar en el orden del trazo.
    const cx = (x0 + x1) / 2;
    const anchoSalida = (x1 - x0) * 0.9;
    const t0 = performance.now();
    guiones.forEach(function (g, orden) {
      g.x = cx + (Math.random() - 0.5) * anchoSalida;
      g.y = y1 + 4 + Math.random() * 10;
      g.ang = Math.random() * Math.PI;
      g.vx = 0;
      g.vy = 0;
      g.va = 0;
      g.a = 0;
      g.at = t0 + (orden / guiones.length) * 650 + Math.random() * 80;
    });
    const DURACION = 1400; // tiempo hasta que la barra real toma el relevo (ms)
    const COL = '255,111,156'; // --rose-strong

    ocultar.forEach(function (el) {
      el.style.opacity = '0';
    });
    let ultimo = t0;
    let terminando = false;
    (function tick(t) {
      if (!canvas.isConnected) return; // se cambió de pestaña: se corta
      const dt = Math.min(0.033, (t - ultimo) / 1000 || 0.016);
      ultimo = t;
      const e = 1 - Math.exp(-dt * 7);
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'butt';
      for (let i = 0; i < guiones.length; i++) {
        const g = guiones[i];
        const activo = t >= g.at;
        if (activo) {
          // Resorte hacia su lugar y su ángulo en el contorno.
          g.vx += ((g.tx - g.x) * 90 - g.vx * 14) * dt;
          g.vy += ((g.ty - g.y) * 90 - g.vy * 14) * dt;
          // El ángulo va por el camino más corto (un guión es igual girado 180°).
          let da = (g.tang - g.ang) % Math.PI;
          if (da > Math.PI / 2) da -= Math.PI;
          if (da < -Math.PI / 2) da += Math.PI;
          g.va += (da * 90 - g.va * 14) * dt;
        }
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.ang += g.va * dt;
        g.a += ((activo ? 1 : 0) - g.a) * e;
        const ux = (Math.cos(g.ang) * LARGO) / 2;
        const uy = (Math.sin(g.ang) * LARGO) / 2;
        ctx.beginPath();
        ctx.moveTo(g.x - ux, g.y - uy);
        ctx.lineTo(g.x + ux, g.y + uy);
        ctx.strokeStyle = 'rgba(' + COL + ',' + (g.a * 0.15).toFixed(3) + ')'; // resplandor suave
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(' + COL + ',' + g.a.toFixed(3) + ')'; // el guión
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (!terminando && t - t0 >= DURACION) {
        // Con el contorno armado, la barra real toma el relevo sin corte: el borde se enciende, el relleno sube y aparece la manija.
        terminando = true;
        canvas.classList.add('em-intro-fin');
        ocultar.forEach(function (el) {
          el.style.opacity = '';
          el.classList.add('em-intro-entrada');
        });
        setTimeout(function () {
          canvas.remove();
          ocultar.forEach(function (el) {
            el.classList.remove('em-intro-entrada');
          });
        }, 1200);
      }
      requestAnimationFrame(tick);
    })(t0);
  }
  // edadState: sel = índice de la barra elegida (o null), revealed = índices de las barras ya tocadas.
  let edadState = { sel: null, revealed: [] };

  // ===== 6. RENDERIZADO DE GRÁFICOS =====

  // renderInlineStats(container, stats): la fila de "datos sueltos" al pie de un gráfico.
  function renderInlineStats(container, stats) {
    const wrap = document.createElement('div');
    wrap.className = 'em-inline-stats';
    stats.forEach(function (stat) {
      const item = document.createElement('div');
      item.className = 'em-stat';
      const value = document.createElement('span');
      value.className = 'em-stat-value';
      value.textContent = stat.valor;
      const label = document.createElement('span');
      label.className = 'em-stat-label';
      label.textContent = stat.label;
      item.appendChild(value);
      item.appendChild(label);
      wrap.appendChild(item);
    });
    container.appendChild(wrap);
    return wrap;
  }

  // fly(from, to, opts): anima "clones volando" de una posición a otra.
  function fly(chartEl, from, to, opts) {
    opts = opts || {};
    const duration = opts.duration != null ? opts.duration : 750;
    const stagger = opts.stagger != null ? opts.stagger : 110;
    const easing = opts.easing || 'cubic-bezier(.3,.7,.2,1)';
    const onLand = opts.onLand || function () {};
    return Promise.all(
      from.map(function (f, k) {
        const d = document.createElement('div');
        d.className = 'em-fly';
        Object.assign(d.style, f);
        chartEl.appendChild(d);
        const anim = d.animate([f, to[k]], {
          duration: reduceMotion ? 0 : duration,
          delay: reduceMotion ? 0 : k * stagger,
          easing: easing,
          fill: 'forwards',
        });
        return anim.finished.then(function () {
          onLand(k);
          d.remove();
        });
      }),
    );
  }

  // slide(el, dx): técnica FLIP para que un elemento que saltó de lugar por un cambio de layout se vea deslizarse hasta ahí.
  function slide(el, dx) {
    if (!dx || reduceMotion) return;
    el.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'translateX(0)' }], {
      duration: 800,
      easing: 'cubic-bezier(.3,.7,.2,1)',
    });
  }

  // rel(el, relativeTo): posición/tamaño de "el" en píxeles RELATIVOS al contenedor "relativeTo" (no a la pantalla)
  function rel(el, relativeTo) {
    const r = el.getBoundingClientRect();
    const c = relativeTo.getBoundingClientRect();
    return {
      left: r.left - c.left + 'px',
      top: r.top - c.top + 'px',
      width: r.width + 'px',
      height: r.height + 'px',
    };
  }

  // renderCasosPorTipo(container): arma el gráfico "Casos por tipo" desde cero según tipoState (adivinando, revelado o fusionado).
  function renderCasosPorTipo(container) {
    const data = chapter1Data.casosPorTipo;
    const real = data[0].valor; // 20.750, el valor real de Mama
    const otherTotal = data.slice(1).reduce(function (s, d) {
      return s + d.valor;
    }, 0); // 20.216

    // Devuelve "Fuente" a su lugar antes de vaciar el contenedor, para no perderla con el innerHTML.
    if (emSrc.parentElement !== panel1.parentElement) {
      panel1.parentElement.appendChild(emSrc);
    }
    // Saca el bloque de arriba que quedó en la fila de pestañas de un render anterior.
    const topViejo = emTabsRow.querySelector('.em-tipo-top');
    if (topViejo) topViejo.remove();
    container.innerHTML = '';
    const top = document.createElement('div');
    top.className = 'em-tipo-top';

    const prompt = document.createElement('div');
    prompt.className =
      'em-prompt em-prompt-tipo em-reveal-fade' + (tipoState.revealed ? '' : ' em-shown');
    prompt.innerHTML =
      '<span class="em-prompt-dot" aria-hidden="true"></span>Arrastrá la barra para descubrir.'; // en 2 renglones: en uno solo quedaba muy larga
    top.appendChild(prompt);

    const feedback = document.createElement('div');
    feedback.className = 'em-feedback em-reveal-fade' + (tipoState.revealed ? ' em-shown' : '');
    top.appendChild(feedback);
    // setFeedback(html): escribe el mensaje de resultado envuelto en un <span>.
    function setFeedback(html, animar) {
      feedback.innerHTML = '<span>' + html + '</span>';
      const span = feedback.firstChild;
      if (animar && !reduceMotion) {
        span.style.display = 'inline-block';
        span.style.animationDelay = '0s'; // ahora el texto es lo PRIMERO que aparece
        span.style.animationFillMode = 'backwards';
        span.classList.add('em-fade-in');
      }
    }
    emTabsRow.appendChild(top);

    const chart = document.createElement('div');
    chart.className = 'em-chart-tipo';
    container.appendChild(chart);

    // tipoTipHTML(d): contenido del tooltip de una barra/segmento.
    function tipoTipHTML(d) {
      return (
        '<strong>' +
        d.categoria +
        '</strong>' +
        '<div><span>Casos</span><span>' +
        formatNumber(d.valor) +
        '</span></div>' +
        '<div><span>Por día</span><span>' +
        Math.round(d.valor / 365) +
        '</span></div>'
      );
    }

    const cols = data.map(function (d, i) {
      const isMama = i === 0;
      const showReal = tipoState.revealed;
      const pct = showReal ? (d.valor / TIPO_MAX) * 100 : 0;
      const col = document.createElement('div');
      col.className = 'em-col' + (!isMama && !showReal ? ' em-col-pending' : '');
      // em-val-q: solo mientras Mama muestra "?" (antes de arrastrar), para agrandar ese signo e invitar a jugar.
      const valHTML = isMama
        ? '<div class="em-val' +
          (showReal ? '' : ' em-val-q') +
          '">' +
          (showReal ? formatNumber(d.valor) : '?') +
          '</div>'
        : '<div class="em-val">' + (showReal ? formatNumber(d.valor) : '') + '</div>';
      const barStyle = 'height:' + pct + '%'; // 0% hasta revelar (Mama: la maneja setupDrag; las otras 4 están ocultas)
      // El nombre de Mama se ve siempre; el de las otras 4 solo aparece junto con sus datos, al revelar.
      const lblText = isMama
        ? showReal
          ? d.categoria
          : 'Cáncer de mama'
        : showReal
          ? d.categoria
          : '';
      // .em-plot: el área de dibujo de la barra (todo lo de la columna MENOS la etiqueta).
      col.innerHTML =
        '<div class="em-plot">' +
        '<div class="em-bar' +
        (isMama ? ' em-bar-mama' : '') +
        '" style="' +
        barStyle +
        '">' +
        valHTML +
        '</div>' +
        '</div>' +
        '<div class="em-lbl">' +
        lblText +
        '</div>';
      const bar = col.querySelector('.em-bar');
      // El tooltip con el detalle (casos/día/tasa) solo tiene sentido una vez que la columna ya muestra su dato real.
      bar.addEventListener('pointermove', function (e) {
        if (tipoState.revealed) showTip(e, tipoTipHTML(d));
      });
      bar.addEventListener('pointerleave', hideTip);
      chart.appendChild(col);
      return col;
    });
    const mama = cols[0];

    // Columna de la suma ("Los otros 4 cánceres"), oculta hasta que se aprieta "¿Y si sumamos los otros 4?".
    const sumCol = document.createElement('div');
    sumCol.className = 'em-col';
    sumCol.id = 'em-sum-col';
    sumCol.hidden = true;
    // Misma estructura que las otras columnas (.em-plot + número adentro de la pila, ver arriba).
    sumCol.innerHTML =
      '<div class="em-plot">' +
      '<div class="em-stack" style="height:' +
      (otherTotal / TIPO_MAX) * 100 +
      '%">' +
      [1, 2, 3, 4]
        .map(function (i) {
          return (
            '<div data-i="' +
            i +
            '" style="flex:' +
            data[i].valor +
            '">' +
            data[i].categoria +
            '</div>'
          );
        })
        .join('') +
      '<div class="em-val">' +
      formatNumber(otherTotal) +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="em-lbl">Los otros 4 cánceres</div>';
    sumCol.querySelectorAll('.em-stack > [data-i]').forEach(function (seg) {
      const d = data[+seg.dataset.i];
      seg.addEventListener('pointermove', function (e) {
        showTip(e, tipoTipHTML(d));
      });
      seg.addEventListener('pointerleave', hideTip);
    });
    mama.after(sumCol);

    // El eje "Los 5 cánceres más frecuentes" no se muestra al principio.
    const axisNote = document.createElement('div');
    axisNote.className = 'em-axis-note em-reveal-fade' + (tipoState.revealed ? ' em-shown' : '');
    axisNote.textContent = 'Los 5 cánceres más frecuentes en mujeres'; // leyenda debajo de las barras
    container.appendChild(axisNote);

    // Botones "Probar de nuevo" y "¿Y si sumamos los otros 4?", centrados; el reinicio llama a render1() para devolver "Fuente" a su lugar.
    const actions = document.createElement('div');
    actions.className = 'em-tipo-actions em-reveal-fade' + (tipoState.revealed ? ' em-shown' : '');
    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    // "Probar de nuevo" con el mismo formato que el otro botón (antes era más apagado, .em-btn-ghost).
    btnReset.className = 'em-btn';
    btnReset.textContent = 'Probar de nuevo';
    const btnSum = document.createElement('button');
    btnSum.type = 'button';
    // em-btn-sum: ancho fijo, así su texto cambiante no corre de lugar a "Probar de nuevo".
    btnSum.className = 'em-btn em-btn-sum';
    btnSum.textContent = tipoState.merged ? 'Ver por separado' : SUM_LABEL;
    actions.appendChild(btnReset);
    actions.appendChild(btnSum);

    container.appendChild(actions);

    // Botón "Confirmar resultado": arranca oculto, aparece titilando al mover la barra y recién ahí se revela el resultado.
    const btnConfirm = document.createElement('button');
    btnConfirm.type = 'button';
    btnConfirm.className = 'em-btn em-btn-confirm em-reveal-fade';
    btnConfirm.textContent = 'Confirmar resultado';
    btnConfirm.disabled = true;

    // Fila con los datos fijos, que no dependen del juego y aparecen recién al revelar.
    const resultRow = document.createElement('div');
    resultRow.className = 'em-tipo-result';

    const statsCol = document.createElement('div');
    statsCol.className =
      'em-tipo-result-stats em-reveal-fade' + (tipoState.revealed ? ' em-shown' : '');
    const statsLead = document.createElement('div');
    statsLead.className = 'em-stats-lead';
    statsLead.textContent = 'El cáncer de mama es:';
    statsCol.appendChild(statsLead);
    chapter1Stats.forEach(function (s) {
      const item = document.createElement('div');
      item.className = 'em-stat' + (s.clase ? ' ' + s.clase : '');
      item.innerHTML =
        '<div class="em-stat-value">' +
        s.valor +
        '</div>' +
        '<div class="em-stat-label">' +
        s.label +
        '</div>';
      statsCol.appendChild(item);
    });
    resultRow.appendChild(statsCol);
    container.appendChild(resultRow);

    // Pie de la tarjeta: la bajada ("Casos nuevos estimados...") + "Fuente" (.ui-src, se mueve acá adentro), en la misma fila.
    const footRow = document.createElement('div');
    footRow.className = 'em-foot';
    const footSub = document.createElement('p');
    // em-foot-sub-lg: clase propia para que la bajada iguale el tamaño de los datos fijos ("Casos por edad" conserva .ui-sub).
    footSub.className = 'ui-sub em-foot-sub-lg';
    footSub.textContent = 'Casos nuevos estimados en mujeres, por tipo de cáncer. Argentina, 2024.';
    footRow.appendChild(footSub);
    footRow.appendChild(emSrc);
    container.appendChild(footRow);

    // Texto del resultado ("Dijiste 14.400. Se estiman 20.750: un 44% más."). Lo usan el foco inicial y reveal().
    function mensajeResultado() {
      const guess = tipoState.guess;
      const ratio = real / guess;
      const dijiste = 'Dijiste <b>' + formatNumber(guess) + '</b>. ';
      const seEstiman = 'Se estiman <b>' + formatNumber(real) + '</b>';
      if (guess === real) {
        return 'Acertaste: se estiman <b>' + formatNumber(real) + '</b> casos por año.';
      } else if (Math.abs(ratio - 1) < 0.1) {
        return (
          'Estuviste cerca: dijiste <b>' +
          formatNumber(guess) +
          '</b> y se estiman <b>' +
          formatNumber(real) +
          '</b>.'
        );
      } else if (ratio >= 3) {
        return dijiste + seEstiman + ': más del triple.';
      } else if (ratio >= 2) {
        return dijiste + seEstiman + ': más del doble.';
      } else if (ratio > 1) {
        return dijiste + seEstiman + ': un ' + Math.round((ratio - 1) * 100) + '% más.';
      }
      return dijiste + seEstiman + ': un ' + Math.round((1 - ratio) * 100) + '% menos.';
    }

    // Las otras 4 columnas ocupan su lugar (así Mama ya queda a la izquierda) pero invisibles.
    const otras = cols.slice(1);
    function prepararOtras() {
      otras.forEach(function (col) {
        col.classList.remove('em-col-pending');
        col.style.opacity = '0';
      });
    }

    // FASE 1: solo la barra de Mama con su valor real y "Tu respuesta".
    function revealMama(doAnimate) {
      const plot = mama.querySelector('.em-plot');
      const bar = mama.querySelector('.em-bar');
      const valEl = mama.querySelector('.em-val');
      // Deja de seguir a la manija: vuelve a la punta de la barra real, con su tamaño de siempre.
      valEl.style.bottom = '';
      valEl.style.fontSize = '';
      valEl.style.marginBottom = '';
      valEl.classList.remove('em-val-live');
      const guess = tipoState.guess;
      const pct = (real / TIPO_MAX) * 100;

      // Barra "Tu respuesta": superpuesta a la barra real, con la misma escala.
      const oldGhost = mama.querySelector('.em-guess-ghost');
      if (oldGhost) oldGhost.remove();
      const ghost = document.createElement('div');
      ghost.className = 'em-guess-ghost';
      ghost.style.height = (guess / TIPO_MAX) * 100 + '%';
      ghost.innerHTML = '<span>Tu respuesta</span>';
      plot.appendChild(ghost);

      if (guess >= real) {
        ghost.style.zIndex = '1';
        bar.style.zIndex = '2';
      } else {
        ghost.style.zIndex = '3';
        bar.style.zIndex = '';
      }

      valEl.classList.add('em-val-sobre');

      function acomodarNumero() {
        if (!valEl.isConnected) return;
        const H = plot.clientHeight;
        const T = (real / TIPO_MAX) * H;
        const L = (guess / TIPO_MAX) * H;
        const h = valEl.offsetHeight;
        const choca = L > T + 3 && L - 2 < T + 6 + h + 3;
        if (choca) {
          valEl.style.setProperty('--em-val-baja', h + 10 + 'px');
          valEl.classList.add('em-val-dentro');
        } else {
          valEl.classList.remove('em-val-dentro');
        }
      }
      acomodarNumero();
      if (window.ResizeObserver) {
        const roNum = new ResizeObserver(function () {
          if (!plot.isConnected) {
            roNum.disconnect();
            return;
          }
          acomodarNumero();
        });
        roNum.observe(plot);
      }

      if (doAnimate && !reduceMotion) {
        bar.style.transition = 'none';
        bar.style.height = '0%';
        void bar.offsetWidth;
        requestAnimationFrame(function () {
          bar.style.transition = 'height .9s cubic-bezier(.2,.8,.2,1)';
          bar.style.height = pct + '%';
        });
        countUp(valEl, real);
      } else {
        bar.style.height = pct + '%';
        valEl.textContent = formatNumber(real);
      }
    }

    // FASE 2: todo lo demás (otras 4 barras, datos fijos, botones, eje).
    function revealResto(doAnimate) {
      if (doAnimate) {
        btnSum.classList.add('em-btn-blink');
        btnReset.classList.add('em-btn-quiet');
      }
      actions.classList.add('em-shown');
      axisNote.classList.add('em-shown');
      statsCol.classList.add('em-shown');
      if (doAnimate) {
        statsCol.querySelectorAll('.em-stat-value').forEach(function (el) {
          // Fija el ancho FINAL antes de contar: así el texto de al lado no cambia de renglones y el gráfico no cambia de alto.
          el.style.minWidth = el.getBoundingClientRect().width + 'px';
          countUpPct(el);
        });
      }

      mama.querySelector('.em-lbl').textContent = data[0].categoria; // "Cáncer de mama" -> "Mama"
      prepararOtras(); // no hace nada si la fase 1 ya las acomodó
      otras.forEach(function (col, idx) {
        const d = data[idx + 1];
        col.querySelector('.em-val').textContent = formatNumber(d.valor);
        col.querySelector('.em-lbl').textContent = d.categoria;
        const b = col.querySelector('.em-bar');
        const pctOther = (d.valor / TIPO_MAX) * 100;
        if (!doAnimate || reduceMotion) {
          col.style.opacity = '';
          b.style.height = pctOther + '%';
          return;
        }
        const delay = 350 + idx * 140;
        col.animate(
          [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 450, delay: delay, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
        );
        col.style.opacity = '';
        b.style.height = '0%';
        setTimeout(function () {
          b.style.height = pctOther + '%';
        }, delay);
      });
    }

    // reveal(): las dos fases juntas, sin pausa (al volver de otra pestaña o con "reducir movimiento").
    function reveal(doAnimate) {
      tipoState.revealed = true;
      prompt.classList.remove('em-shown');
      feedback.classList.add('em-shown');
      prepararOtras();
      revealMama(doAnimate);
      revealResto(doAnimate);
      if (!doAnimate) setFeedback(mensajeResultado(), false);
    }
    // setupDrag(): arma la zona de arrastre sobre la columna de Mama (.em-plot) con la barra punteada y la manija "↕" (Pointer Events para mouse y touch).
    function setupDrag() {
      const valEl = mama.querySelector('.em-val');
      const zone = document.createElement('div');
      zone.className = 'em-guess-zone';
      // La manija dice "↕ Arrastrá" y tiene role="slider" y tabindex para poder moverla también con el teclado.
      zone.innerHTML =
        '<div class="em-guess-bar">' +
        '<div class="em-handle" tabindex="0" role="slider" aria-label="Estimación de casos de cáncer de mama por año"' +
        ' aria-valuemin="0" aria-valuemax="' +
        TIPO_MAX +
        '">↕ Arrastrá</div>' +
        '</div>';
      mama.querySelector('.em-plot').appendChild(zone);
      // Al costado derecho de la barra de Mama, alineado con su BASE: va adentro de .em-plot.
      mama.querySelector('.em-plot').appendChild(btnConfirm);
      const gb = zone.querySelector('.em-guess-bar');
      const handle = zone.querySelector('.em-handle');

      // placeQ(px): antes de arrastrar, el "?" va dentro de la barra punteada, con un tamaño que entra en la barra de esta pantalla.
      function placeQ(px) {
        const free = px - 7 - 2 * 2; // alto libre adentro de la barra, debajo de la manija
        const fs = Math.max(10, Math.min(34, free * 0.8, (gb.clientWidth - 4) * 0.6));
        valEl.style.fontSize = fs + 'px';
        valEl.style.marginBottom = '0';
        valEl.style.bottom = 2 + (free - fs) / 2 + 'px';
      }
      // placeVal(px): después de empezar a arrastrar, el número adivinado flota encima de la manija siguiéndola.
      function placeVal(px) {
        valEl.style.fontSize = '';
        valEl.style.marginBottom = '';
        const valH = valEl.offsetHeight;
        // Techo del número: puede subir por encima del gráfico, hasta 4px antes de la instrucción rosa (se mide en vivo).
        const roomTop = prompt.getBoundingClientRect().bottom + 4;
        const maxBottom = zone.getBoundingClientRect().bottom - roomTop - valH - 6; // 6 = margin-bottom de .em-val
        // Cerca del máximo en pantallas bajas el número se achica lo justo (mínimo 14px) para no pisar la instrucción; siempre va arriba de la manija.
        const short = px + 13 - maxBottom;
        if (short > 0) {
          const fs = parseFloat(getComputedStyle(valEl).fontSize);
          const fit = Math.max(14, (fs * (valH - short)) / valH);
          valEl.style.fontSize = fit + 'px';
          valEl.style.bottom = Math.max(0, px + 13) + 'px';
          return;
        }
        valEl.style.bottom = Math.max(0, px + 13) + 'px';
      }
      // setFromPx(px): redondea a múltiplos de 50 -- con 50 SÍ se puede caer justo en 20.750, el valor real de Mama.
      let curPx = 0; // alto actual de la barra punteada (lo usa el arrastre relativo, ver pointerdown)
      function setFromPx(px) {
        px = Math.max(6, Math.min(zone.clientHeight, px));
        curPx = px;
        gb.style.height = px + 'px';
        tipoState.guess = Math.max(50, Math.round(((px / zone.clientHeight) * TIPO_MAX) / 50) * 50);
        valEl.classList.remove('em-val-q'); // ya hay un número real adivinado: el "?" grande deja de aplicar
        // em-val-live: el número que se va eligiendo se ve más grande que los de las barras.
        valEl.classList.add('em-val-live');
        valEl.textContent = formatNumber(tipoState.guess);
        handle.setAttribute('aria-valuenow', tipoState.guess);
        handle.setAttribute('aria-valuetext', formatNumber(tipoState.guess) + ' casos');
        placeVal(px);
      }
      // showQ(): estado inicial (todavía no arrastró).
      function showQ() {
        const h = zone.clientHeight;
        // Arranca en el 42% del gráfico, nunca menos de 60px ni más del 80%.
        const startPx = Math.min(h * 0.8, Math.max(h * 0.42, 60));
        setFromPx(startPx);
        valEl.classList.remove('em-val-live');
        valEl.classList.add('em-val-q'); // vuelve a mostrarse "?" -- re-agrega la clase que setFromPx sacó
        valEl.textContent = '?'; // el valor arranca oculto -- recién se ve al mover el dedo/mouse
        handle.setAttribute('aria-valuetext', 'Sin estimación todavía');
        placeQ(startPx);
      }
      requestAnimationFrame(function () {
        showQ();
        // La PRIMERA vez que se ve la pestaña, la barra punteada se arma con sus propios guiones (armarBarraConGuiones, más arriba).
        if (!tipoIntroHecha) {
          tipoIntroPendiente = function () {
            armarBarraConGuiones(chart, gb, [zone, valEl]);
          };
          revisarIntroTipo();
        }
      });
      // Si cambia el alto del gráfico antes de arrastrar (zoom, ventana), reacomoda la barra punteada y el "?"; se desconecta al empezar a arrastrar.
      let ro = null;
      if (window.ResizeObserver) {
        ro = new ResizeObserver(function () {
          if (valEl.classList.contains('em-val-q')) showQ();
        });
        ro.observe(zone);
      }

      // Solo la manija (.em-handle) inicia el arrastre; soltarla no confirma, la respuesta se revela con "Confirmar resultado".
      let dragging = false;
      let moved = false;
      let startY = 0;
      let startPx = 0;

      // markMoved(): en el primer movimiento activa "Confirmar resultado" y apaga el llamado de atención de la manija.
      function markMoved() {
        if (moved) return;
        moved = true;
        btnConfirm.disabled = false;
        btnConfirm.classList.add('em-shown'); // aparece (titilando, ver modulo1.css) recién ahora
        handle.classList.add('em-handle-used');
        // La barra punteada deja de brillar: desde acá solo titila "Confirmar resultado", que es lo que hay que tocar.
        zone.classList.add('em-guess-quiet');
        if (ro) ro.disconnect();
      }

      handle.addEventListener('pointerdown', function (e) {
        dragging = true;
        startY = e.clientY;
        startPx = curPx;
        // setPointerCapture: sigue recibiendo pointermove/pointerup aunque el cursor se salga de la manija (algunos navegadores lo rechazan).
        try {
          handle.setPointerCapture(e.pointerId);
        } catch (err) {}
        e.preventDefault();
        e.stopPropagation();
      });
      handle.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        const dy = startY - e.clientY; // hacia arriba = positivo
        if (!moved && Math.abs(dy) < 3) return; // un temblor del clic no cuenta como mover
        markMoved();
        setFromPx(startPx + dy);
      });
      function endDrag() {
        dragging = false;
      }
      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);
      handle.addEventListener('lostpointercapture', endDrag);

      // Teclado (accesibilidad): con la manija enfocada (Tab), las flechas suben/bajan la estimación de a 250 casos.
      handle.addEventListener('keydown', function (e) {
        const steps = {
          ArrowUp: 250,
          ArrowRight: 250,
          ArrowDown: -250,
          ArrowLeft: -250,
          PageUp: 1000,
          PageDown: -1000,
        };
        let target = null;
        if (e.key in steps) target = tipoState.guess + steps[e.key];
        else if (e.key === 'Home') target = 0;
        else if (e.key === 'End') target = TIPO_MAX;
        else if (e.key === 'Enter') {
          if (moved) btnConfirm.click();
          e.preventDefault();
          return;
        } else return;
        markMoved();
        target = Math.max(0, Math.min(TIPO_MAX, target));
        setFromPx((target / TIPO_MAX) * zone.clientHeight);
        e.preventDefault();
      });

      // Cuánto (ms) queda el texto al lado de Mama antes de volver a su lugar.
      const HOLD_MS = 1000;
      const VUELO_MS = 900;
      const ESCALA_GRANDE = 1.35; // cuánto más grande se ve junto a la barra de Mama (1 = tamaño normal)

      btnConfirm.addEventListener('click', function () {
        if (!moved) return;
        dragging = false;
        if (ro) ro.disconnect();
        zone.remove();
        btnConfirm.remove();

        tipoState.revealed = true;
               if (window.Transicion) window.Transicion.sfx('resultado'); // efecto de sonido del resultado 
        prompt.classList.remove('em-shown');
        setFeedback(mensajeResultado(), false); // el texto real queda oculto en la fila de pestañas

        if (reduceMotion) {
          reveal(true);
          return;
        }

        // FASE 1: Mama se desliza a su lugar y sube su barra con "Tu respuesta".
        const x0 = mama.getBoundingClientRect().left;
        prepararOtras();
        slide(mama, x0 - mama.getBoundingClientRect().left);
        revealMama(true);

        // Se mide TODO ahora (una sola vez), así durante el viaje no hay lecturas de layout.
        const cr = chart.getBoundingClientRect();
        const fr = feedback.getBoundingClientRect(); // destino final: el texto real
        const c1 = cols[1].getBoundingClientRect();
        const c4 = cols[4].getBoundingClientRect();
        const plotR = cols[1].querySelector('.em-plot').getBoundingClientRect();

        // El texto flotante vive en su posición FINAL y con su tamaño normal;
        // transform lo ubica (y agranda) en el hueco de las otras 4 barras.
        const flota = document.createElement('div');
        flota.className = 'em-feedback';
        flota.innerHTML = '<span>' + mensajeResultado() + '</span>';
        Object.assign(flota.style, {
          position: 'absolute',
          left: fr.left - cr.left + 'px',
          width: fr.width + 'px',
          margin: '0',
          minHeight: '0',
          textAlign: 'center',
          zIndex: '5',
          pointerEvents: 'none',
          transformOrigin: '50% 50%',
        });
        chart.appendChild(flota);
        const topFinal = fr.top - cr.top + (fr.height - flota.offsetHeight) / 2;
        flota.style.top = topFinal + 'px';

        // Escala: la pedida, pero sin que el texto se salga del hueco.
        const huecoW = c4.right - c1.left;
        const textoW = Math.min(flota.firstChild.getBoundingClientRect().width, fr.width);
        const escala = Math.max(1, Math.min(ESCALA_GRANDE, (huecoW * 0.95) / textoW));

        // Desplazamiento del centro final al centro del hueco.
        const centroFinalX = fr.left - cr.left + fr.width / 2;
        const centroFinalY = topFinal + flota.offsetHeight / 2;
        const huecoX = (c1.left + c4.right) / 2 - cr.left;
        const huecoY = plotR.top - cr.top + plotR.height / 2;
        const inicio =
          'translate(' +
          (huecoX - centroFinalX) +
          'px,' +
          (huecoY - centroFinalY) +
          'px) scale(' +
          escala +
          ')';
        flota.style.transform = inicio;
        flota.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 500,
          delay: 350,
          fill: 'backwards',
        });

        // FASE 2: el texto vuelve a su lugar PRIMERO; lo pesado (barras, contadores) arranca un poco después.
        setTimeout(function () {
          if (!chart.isConnected) return; // cambió de pestaña o reinició durante la pausa

          // Relevo: el texto real aparece exactamente donde termina el flotante.
          function relevo() {
            feedback.style.transition = 'none';
            feedback.classList.add('em-shown');
            void feedback.offsetWidth;
            feedback.style.transition = '';
            flota.remove();
          }

          let vuelo = null;
          try {
            vuelo = flota.animate(
              [{ transform: inicio }, { transform: 'translate(0px,0px) scale(1)' }],
              {
                duration: VUELO_MS,
                easing: 'cubic-bezier(.3,.7,.2,1)',
                fill: 'forwards',
              },
            );
          } catch (err) {
            console.error('Animación del texto:', err);
          }

          // El relevo depende de que la animación TERMINE, no de un timer.
          if (vuelo) vuelo.finished.then(relevo, relevo);
          else relevo();

          // Lo pesado arranca después de que el vuelo ya está en marcha (no compite por el primer frame).
          setTimeout(function () {
            if (chart.isConnected) revealResto(true);
          }, 120);
        }, HOLD_MS);
      });
    }

    // applyMergeState(doAnimate): hace que el DOM coincida con tipoState.merged (el valor YA actualizado por quien llama).
    async function applyMergeState(doAnimate) {
      btnSum.disabled = true;
      hideTip();
      const others = [1, 2, 3, 4].map(function (i) {
        return cols[i];
      });
      const stackEl = sumCol.querySelector('.em-stack');
      const sumValEl = sumCol.querySelector('.em-val');

      // La línea "Tu respuesta" (si todavía está, de cuando se reveló) se borra apenas se toca cualquiera de los dos botones.
      const guessGhost = mama.querySelector('.em-guess-ghost');
      if (guessGhost) guessGhost.remove();

      // Sin la línea de respuesta, el número real vuelve arriba de su barra.
      const numMama = mama.querySelector('.em-val');
      if (numMama) numMama.classList.remove('em-val-dentro');

      if (tipoState.merged) {
        const x0 = mama.getBoundingClientRect().left;
        chart.style.setProperty('--em-colw', mama.getBoundingClientRect().width + 'px');

        // "src" (origen de cada clon) se mide antes de ocultar las columnas: una columna oculta mide 0x0 y los clones no se verían volar.
        const src =
          doAnimate && !reduceMotion
            ? others.map(function (c) {
                return rel(c.querySelector('.em-bar'), chart);
              })
            : null;

        chart.classList.add('em-merged');
        others.forEach(function (c) {
          c.hidden = true;
        });
        sumCol.hidden = false;
        slide(mama, x0 - mama.getBoundingClientRect().left);

        if (doAnimate && !reduceMotion) {
          // Los clones (.em-fly) vuelan sin texto: son solo el rectángulo de color viajando.
          const segs = Array.prototype.slice.call(stackEl.querySelectorAll('[data-i]'));
          const tgt = segs.map(function (seg) {
            return rel(seg, chart);
          });
          segs.forEach(function (s) {
            s.style.visibility = 'hidden';
          });
          sumValEl.style.visibility = 'hidden';
          await fly(chart, src, tgt, {
            onLand: function (k) {
              segs[k].style.visibility = '';
            },
          });
          sumValEl.style.visibility = '';
          countUp(sumValEl, otherTotal);
        } else {
          sumValEl.textContent = formatNumber(otherTotal);
        }
        setFeedback(
          // El total de los otros 4 va en blanco (.em-fb-neutral) y solo el de mama en rosa.
          'Los otros 4 cánceres suman <b class="em-fb-neutral">' +
            formatNumber(otherTotal) +
            '</b> casos: menos que los <b>' +
            formatNumber(real) +
            '</b> de mama.',
        );
        btnSum.textContent = 'Ver por separado';
      } else {
        const x0 = mama.getBoundingClientRect().left;
        if (doAnimate && !reduceMotion) {
          const segs = Array.prototype.slice.call(stackEl.querySelectorAll('[data-i]'));
          const src = segs.map(function (seg) {
            return rel(seg, chart);
          });
          sumValEl.style.visibility = 'hidden';
          chart.classList.remove('em-merged');
          sumCol.hidden = true;
          others.forEach(function (c) {
            c.hidden = false;
            c.classList.add('em-ghost');
          });
          slide(mama, x0 - mama.getBoundingClientRect().left);
          const bars = others.map(function (c) {
            return c.querySelector('.em-bar');
          });
          bars.forEach(function (b) {
            b.style.visibility = 'hidden';
          });
          const srcRev = src.slice().reverse();
          const tgtRev = bars
            .map(function (b) {
              return rel(b, chart);
            })
            .reverse();
          await fly(chart, srcRev, tgtRev, {
            duration: 650,
            stagger: 90,
            easing: 'cubic-bezier(.45,.05,.25,1)',
            onLand: function (k) {
              const realIdx = others.length - 1 - k; // deshace el reverse
              bars[realIdx].style.visibility = '';
              others[realIdx].classList.remove('em-ghost');
            },
          });
        } else {
          chart.classList.remove('em-merged');
          sumCol.hidden = true;
          others.forEach(function (c) {
            c.hidden = false;
            c.classList.remove('em-ghost');
          });
          slide(mama, x0 - mama.getBoundingClientRect().left);
        }
        setFeedback('Tocá <b>' + SUM_LABEL + '</b> para compararlos con Mama.');
        btnSum.textContent = SUM_LABEL;
      }
      btnSum.disabled = false;
    }

    btnSum.addEventListener('click', function () {
      if (btnSum.disabled) return;
      // Tocar "¿Y si sumamos los otros 4?" cierra la guía: el botón deja de titilar y "Ver por separado" no titila.
      btnSum.classList.remove('em-btn-blink');
      btnReset.classList.remove('em-btn-quiet'); // desde acá los 2 botones con el borde rosa
      tipoState.merged = !tipoState.merged;
      applyMergeState(true);
    });
    btnReset.addEventListener('click', function () {
      tipoState = { revealed: false, guess: null, merged: false };
      render1();
      animarEntrada(); // misma entrada que al cambiar de pestaña
    });

    // Reconstruye el estado actual (si lo había).
    if (tipoState.revealed) reveal(false);
    else setupDrag();
    if (tipoState.merged) applyMergeState(false);
  }

  // ----- "Casos por edad" -----
  function renderCasosPorEdad(container) {
    const data = chapter1Data.casosPorEdad;
    const total = data.reduce(function (s, d) {
      return s + d.valor;
    }, 0); // 20.750

    // Devuelve "Fuente" a su lugar antes de vaciar el contenedor, para no perderla con el innerHTML.
    if (emSrc.parentElement !== panel1.parentElement) {
      panel1.parentElement.appendChild(emSrc);
    }
    // Saca el bloque de arriba que quedó en la fila de pestañas de un render anterior.
    const topViejo = emTabsRow.querySelector('.em-tipo-top');
    if (topViejo) topViejo.remove();
    container.innerHTML = '';
    const prompt = document.createElement('div');
    prompt.className = 'em-prompt em-prompt-tipo';
    prompt.innerHTML =
      '<span class="em-prompt-dot" aria-hidden="true"></span>Presioná una barra para ver la cantidad en un rango de edad.';
    container.appendChild(prompt);

    const chart = document.createElement('div');
    chart.className = 'em-chart-edad';
    container.appendChild(chart);

    // edadTipHTML(d): contenido del tooltip de una barra de edad.
    function edadTipHTML(d) {
      return (
        '<strong>' +
        d.categoria +
        ' años</strong>' +
        '<div><span>Casos</span><span>' +
        formatNumber(d.valor) +
        '</span></div>' +
        '<div><span>Del total</span><span>' +
        pctLabel(d.valor / total) +
        '%</span></div>'
      );
    }

    const EDAD_START = 3000;
    const isRevealed = function (i) {
      return edadState.revealed.indexOf(i) !== -1;
    };

    const cols = data.map(function (d, i) {
      const col = document.createElement('div');
      col.className = 'em-col em-col-age';
      // Misma estructura que "Casos por tipo" (.em-plot + número adentro de la barra); el número está oculto hasta que se toca.
      const shown = isRevealed(i);
      col.innerHTML =
        '<div class="em-plot">' +
        '<div class="em-bar' +
        (shown ? '' : ' em-bar-pending') +
        '" style="height:' +
        ((shown ? d.valor : EDAD_START) / EDAD_MAX) * 100 +
        '%">' +
        '<div class="em-val">' +
        formatNumber(d.valor) +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div class="em-lbl">' +
        d.categoria +
        '</div>';
      col.addEventListener('pointerdown', function (e) {
        setSel(i);
        e.preventDefault();
      });
      const bar = col.querySelector('.em-bar');
      // El globo con el detalle, solo en barras ya tocadas: en las grises adelantaría el dato antes de tocarlas.
      bar.addEventListener('pointermove', function (e) {
        if (isRevealed(i)) showTip(e, edadTipHTML(d));
      });
      bar.addEventListener('pointerleave', hideTip);
      chart.appendChild(col);
      return col;
    });

    // Los 2 datos sueltos: se arman una vez con renderInlineStats y después se actualiza el texto directo.
    const statsWrap = renderInlineStats(container, [
      { valor: '', label: '' },
      { valor: '', label: '' },
    ]);
    const stats = statsWrap.querySelectorAll('.em-stat');
    const selPctEl = stats[0].querySelector('.em-stat-value');
    const selTxtEl = stats[0].querySelector('.em-stat-label');
    const selDiaEl = stats[1].querySelector('.em-stat-value');
    const selDiaTxtEl = stats[1].querySelector('.em-stat-label');

    const footRow = document.createElement('div');
    footRow.className = 'em-foot';
    const footSub = document.createElement('p');
    footSub.className = 'ui-sub';
    footSub.textContent = 'Casos nuevos estimados en mujeres, por edad. Argentina, 2024.';
    footRow.appendChild(footSub);
    footRow.appendChild(emSrc);
    container.appendChild(footRow);

    function setSel(i) {
      if (!isRevealed(i)) {
        edadState.revealed.push(i);
        const bar = cols[i].querySelector('.em-bar');
        bar.classList.remove('em-bar-pending');
        bar.style.height = (data[i].valor / EDAD_MAX) * 100 + '%';
      }
      edadState.sel = i;
      paint();
    }

    // fillStats(d): escribe los 2 datos de abajo para la edad "d".
    function fillStats(d) {
      const share = d.valor / total;
      // Última barra ("75 o más", sin "hasta"): "a partir de los X años"; el resto: "entre los X y Y años".
      const rango =
        d.hasta == null
          ? 'a partir de los ' + d.desde + ' años'
          : 'entre los ' + d.desde + ' y ' + d.hasta + ' años';
      // Siempre "X de cada 100".
      selPctEl.textContent = Math.round(share * 100) + ' de cada 100';
      selTxtEl.textContent = 'casos ocurren ' + rango + '.';
      selDiaEl.textContent = String(Math.round(d.valor / 365));
      selDiaTxtEl.textContent = 'diagnósticos por día ' + rango + '.';
    }

    // paint(): pinta de rosa la barra elegida y actualiza los datos de abajo.
    function paint() {
      const sel = edadState.sel;
      cols.forEach(function (col, i) {
        col.querySelector('.em-bar').classList.toggle('em-bar-sel', i === sel);
      });
      statsWrap.classList.toggle('em-stats-empty', sel === null);
      fillStats(data[sel === null ? 3 : sel]);
    }

    paint(); // estado inicial (o el que haya quedado de un render anterior)
  }
  // FUENTES: lo que muestra "Fuente" en cada pestaña (lo arma uiFuente, en script.js).
  const FUENTES = {
    casosPorTipo: [
      {
        autor: 'GLOBOCAN (2026)',
        etiqueta: 'Casos por tipo de cáncer',
        url: 'https://gco.iarc.who.int/media/globocan/factsheets/populations/32-argentina-fact-sheet.pdf',
      },
    ],
    casosPorEdad: [
      {
        autor: 'GLOBOCAN (2026)',
        etiqueta: 'Casos por edad',
        url: 'https://gco.iarc.who.int/today/en/dataviz/pie?mode=cancer&cancers=20&types=0&sexes=2&populations=32&age_start=3&age_end=5&group_populations=1&multiple_populations=0',
      },
    ],
  };
  const NOTAS_FUENTE = {
    casosPorEdad: 'Carga sujeta a demora.',
  };

  const TITULOS = {
    casosPorTipo: '¿Cuántos casos de cáncer de mama hay por año?',
    casosPorEdad: '¿Cuántos casos de cáncer de mama hay por edad?',
  };
  const cardTitle = panel1.parentElement.querySelector('.ui-card-title');

  const chartRenderers = {
    casosPorTipo: function (container) {
      renderCasosPorTipo(container);
    },
    casosPorEdad: function (container) {
      renderCasosPorEdad(container);
    },
  };

  // ===== 8. ARRANQUE =====
  const tabs1 = root.querySelectorAll('.em-tab');
  let activeKey =
    (root.querySelector('.em-tab.active') && root.querySelector('.em-tab.active').dataset.chart) ||
    'casosPorTipo';

  function render1() {
    // Devuelve "Fuente" a su lugar antes de vaciar el contenedor, para no perderla con el innerHTML.
    if (emSrc.parentElement !== panel1.parentElement) {
      panel1.parentElement.appendChild(emSrc);
    }
    if (cardTitle && TITULOS[activeKey]) cardTitle.textContent = TITULOS[activeKey];
    if (FUENTES[activeKey]) uiFuente(emSrc, FUENTES[activeKey], NOTAS_FUENTE[activeKey]);
    const renderFn = chartRenderers[activeKey];
    if (renderFn) renderFn(panel1);
  }

  function animarEntrada() {
    if (reduceMotion) return;
    panel1.classList.remove('em-fade-in');
    void panel1.offsetWidth;
    panel1.classList.add('em-fade-in');
  }

  tabs1.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs1.forEach(function (t) {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      // La fuente desaparece y recién ahí se cambia el gráfico; cada pestaña conserva lo que ya se jugó.
      uiFuenteSalir(emSrc, function () {
        activeKey = tab.dataset.chart;
        render1();
        animarEntrada();
      });
    });
  });

  render1(); // primer dibujo, apenas carga la página

  // Al volver a este módulo desde otro, los dos juegos arrancan de cero (y se repite la entrada de "Casos por tipo").
  let capituloActivo = chapterEl ? chapterEl.classList.contains('active') : true;
  function revisarCambioDeModulo() {
    const activo = chapterEl.classList.contains('active');
    if (activo && !capituloActivo) {
      tipoState = { revealed: false, guess: null, merged: false };
      edadState = { sel: null, revealed: [] };
      tipoIntroHecha = reduceMotion;
      render1();
    }
    capituloActivo = activo;
  }

  // La animación de entrada de "Casos por tipo" espera a que la pestaña se vea de verdad.
  if (window.MutationObserver) {
    const mo = new MutationObserver(revisarIntroTipo);
    if (introEl) mo.observe(introEl, { attributes: true, attributeFilter: ['class'] });
    if (chapterEl) {
      mo.observe(chapterEl, { attributes: true, attributeFilter: ['class'] });
      new MutationObserver(revisarCambioDeModulo).observe(chapterEl, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }
})();
