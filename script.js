// ============ SCRIPT.JS — ARCHIVO GENERAL (compartido) ============
// Intro, audio, entrada a la experiencia (arranca video, sonido y música), navegación entre capítulos y componentes ui-*.

// ---------- Referencias a elementos del DOM ----------
const intro = document.getElementById('intro');
const introVideo = document.getElementById('introVideo');
const audio = document.getElementById('bgAudio');
const audioBtn = document.getElementById('audioBtn');
let audioHasEnded = false; // se pone en true cuando termina el audio; a partir de ahí el audioBtn cambia de rol (ver más abajo)
const navItems = document.querySelectorAll('.nav-item');
const chapters = document.querySelectorAll('.chapter');
const chapterVideos = document.querySelectorAll('.chapter-video'); // los 3 videos de la columna de velas

// Todos los videos arrancan quietos en el frame 0: cada uno se reproduce recién al entrar a su módulo.
chapterVideos.forEach((v) => {
  v.pause();
  v.currentTime = 0;
});

// ---------- Intro: el video aparece cuando el audio llega al segundo 22 ----------
const INTRO_VIDEO_START = 22; // segundo del audio en el que entra el video
let introVideoStarted = false;

function startIntroVideo() {
  if (introVideoStarted) return; // que arranque una sola vez
  if (intro.classList.contains('hidden')) return; // si ya saltó la intro, no lo arrancamos
  introVideoStarted = true;
  introVideo.currentTime = 0;
  introVideo.play().catch((err) => console.warn('No se pudo reproducir el video de intro:', err));
  introVideo.classList.add('visible');
}

// Devuelve el video de la intro a su estado inicial (oculto, en el frame 0) cuando el audio vuelve antes de los 22 s.
function resetIntroVideo() {
  introVideoStarted = false;
  introVideo.classList.remove('visible'); // se desvanece (el fade dura 1,6 s)
  setTimeout(() => {
    if (introVideoStarted) return; // si ya se volvió a disparar, no tocarlo
    introVideo.pause();
    introVideo.currentTime = 0;
  }, 1700);
}

// 'timeupdate' se dispara varias veces por segundo mientras suena el audio
audio.addEventListener('timeupdate', () => {
  if (audio.currentTime >= INTRO_VIDEO_START) startIntroVideo();
  else if (introVideoStarted) resetIntroVideo(); // el audio volvió antes del seg. 22
});

// ---------- Entrar a la experiencia ----------
// Cierra la intro y arranca el video del capítulo activo, el sonido de módulo, la música de fondo y la animación de entrada.
function enterExperience() {
  clearInterval(fadeId); // corta el fade-in de volumen si seguía en curso
  audio.pause();
  audio.currentTime = 0;
  introVideo.pause();
  // Sacar "started"/"ended": si no, los controles de la intro siguen recibiendo clicks por encima de los módulos.
  intro.classList.remove('started', 'ended', 'failed');
  intro.classList.add('hidden');
  intro.setAttribute('inert', ''); // nada del intro recibe clicks ni foco
  intro.setAttribute('aria-hidden', 'true');
  introCaption.hidden = true;

  // Arranca el video del capítulo activo (los otros arrancan al navegar a ellos).
  const activeVideo = document.querySelector('.chapter-video.active');
  if (activeVideo) {
    activeVideo.currentTime = 0;
    activeVideo
      .play()
      .catch((err) => console.warn('No se pudo reproducir el video del capítulo activo:', err));
  }

  // Sonido de módulo, música de fondo (transicion.js) y animación de entrada; la animación espera 700 ms al fundido de la intro.
  if (window.Transicion) {
    window.Transicion.sfx('modulo');
    if (window.Transicion.musica) window.Transicion.musica();
    window.Transicion.entrar(
      document.querySelector('.chapter.active'),
      document.querySelector('.nav-item.active'),
      700,
    );
  }
}

const AUDIO_FAIL_TEXT = 'Continuar →';
// true cuando ya se entró a la experiencia (la intro quedó desactivada)
function introClosed() {
  return intro.classList.contains('hidden');
}
// Si el audio no carga, no dejamos la intro trabada: se puede entrar igual.
function audioFailed() {
  if (introClosed()) return; // si ya se salteó la intro, no la "revivimos"
  audioHasEnded = true;
  audioBtn.textContent = AUDIO_FAIL_TEXT;
  intro.classList.remove('started');
  intro.classList.add('ended', 'failed'); // vuelve a mostrar el botón para poder entrar igual
}
audio.addEventListener('error', audioFailed);
const audioSrc = audio.querySelector('source');
if (audioSrc) audioSrc.addEventListener('error', audioFailed);

// Botón "Saltear intro" (abajo a la derecha): entra directo a la experiencia
// sin esperar a que termine el audio.
const skipBtn = document.getElementById('skipBtn');
skipBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  enterExperience();
});

// Botón "Apretá acá para comenzar": arranca el audio y se convierte en la barra de reproducción; al terminar pasa a "Continuar →".
audioBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (introClosed()) return;

  if (audioHasEnded) {
    enterExperience();
    return;
  }

  audio.volume = 0;
  intro.classList.add('started'); // la barra responde al toque al instante, sin esperar a que cargue el audio
  audio
    .play()
    .then(() => {
      if (introClosed()) return audio.pause(); // se salteó mientras cargaba
      fadeVolume(0.45); // sube el volumen gradualmente hasta 0.45
    })
    .catch((err) => {
      // Si se saltea la intro mientras play() está pendiente, pause()
      // rechaza la promesa: no es un error real, no hay que hacer nada.
      if (introClosed()) return;
      console.warn('No se pudo reproducir el audio:', err);
      audioFailed();
    });
});

// ---------- Barra de reproducción de la intro ----------
// Subtítulos del audio: start/end en segundos. Si la lista queda vacía, el botón CC se oculta.

const CAPTIONS = [
  { start: 2.14, end: 4.0, text: 'Hola, doctor.' },
  { start: 5.2, end: 6.0, text: 'Hola, Mariana.' },
  { start: 6.1, end: 7.5, text: 'Tomá asiento.' },
  { start: 8.2, end: 12.3, text: 'Bueno, Mari, llegaron los resultados de la biopsia.' },
  { start: 12.25, end: 15.2, text: 'En la muestra que tomamos de la mama,' },
  { start: 15.1, end: 18.05, text: 'aparecieron células anormales.' },
  { start: 18.3, end: 20.12, text: '¿Tengo cáncer?' },
  { start: 20.5, end: 22.0, text: 'Sí.' },
  { start: 23.5, end: 25.28, text: 'Sé que es muy difícil escuchar esto,' },
  { start: 26.3, end: 29.9, text: 'pero lo encontramos a tiempo y tiene tratamiento.' },
];

const pFill = document.getElementById('pFill');
const pTrack = document.getElementById('pTrack');
const pTime = document.getElementById('pTime');
const pPlay = document.getElementById('pPlay');
const pRestart = document.getElementById('pRestart');
const pMute = document.getElementById('pMute');
const pCC = document.getElementById('pCC');
const introCaption = document.getElementById('introCaption');
let captionsOn = true; // los subtítulos arrancan activados: con CC se pueden apagar
if (CAPTIONS.length === 0) pCC.hidden = true;

function fmtTime(s) {
  if (!isFinite(s)) s = 0;
  return Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
}

function updateCaption(t) {
  const cue =
    captionsOn && !audio.ended && !intro.classList.contains('ended')
      ? CAPTIONS.find((c) => t >= c.start && t < c.end)
      : null;
  if (cue) {
    if (introCaption.textContent !== cue.text) introCaption.textContent = cue.text;
    introCaption.hidden = false;
  } else {
    introCaption.hidden = true;
  }
}

// Avance (relleno de la barra), tiempo "0:12 / 1:05" y subtítulo actual
function updatePlayer() {
  const d = audio.duration || 0;
  const t = audio.currentTime || 0;
  pFill.style.width = (d ? (t / d) * 100 : 0) + '%';
  pTime.textContent = fmtTime(t) + ' / ' + fmtTime(d);
  updateCaption(t);
}
['timeupdate', 'loadedmetadata', 'durationchange', 'seeked'].forEach((ev) =>
  audio.addEventListener(ev, updatePlayer),
);

function updatePlayState() {
  pPlay.dataset.state = audio.paused ? 'paused' : 'playing';
  pPlay.setAttribute('aria-label', audio.paused ? 'Reproducir' : 'Pausar');
}
audio.addEventListener('play', updatePlayState);
audio.addEventListener('pause', updatePlayState);

pPlay.addEventListener('click', () => {
  if (introClosed()) return;
  if (audio.paused) audio.play().catch(() => {});
  else audio.pause();
});
pRestart.addEventListener('click', () => {
  if (introClosed()) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
});
pMute.addEventListener('click', () => {
  if (introClosed()) return;
  audio.muted = !audio.muted;
  pMute.dataset.state = audio.muted ? 'muted' : 'on';
  pMute.setAttribute('aria-label', audio.muted ? 'Activar sonido' : 'Silenciar');
});
pCC.addEventListener('click', () => {
  if (introClosed()) return;
  captionsOn = !captionsOn;
  pCC.setAttribute('aria-pressed', captionsOn);
  updateCaption(audio.currentTime);
});
// "Volver a escuchar" (solo se ve con el audio terminado): reinicia el audio
// y la barra de reproducción vuelve a aparecer, junto con "Saltear intro".
const pReplay = document.getElementById('pReplay');
pReplay.addEventListener('click', () => {
  if (introClosed()) return;
  audioHasEnded = false;
  intro.classList.remove('ended');
  intro.classList.add('started');
  audio.currentTime = 0;
  audio.play().catch((err) => {
    console.warn('No se pudo reproducir el audio:', err);
    audioFailed();
  });
});
// Tocar la barra lleva el audio a ese momento (solo con la barra activa)
pTrack.addEventListener('click', (e) => {
  if (introClosed() || !intro.classList.contains('started') || !audio.duration) return;
  const r = pTrack.getBoundingClientRect();
  audio.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * audio.duration;
});

// Al terminar el audio, el botón pasa a "entrar a la experiencia".
audio.addEventListener('ended', () => {
  if (introClosed()) return;
  audioHasEnded = true;
  audioBtn.textContent = AUDIO_FAIL_TEXT; // "Continuar →"
  intro.classList.remove('started');
  intro.classList.add('ended'); // la barra vuelve a ser el botón "Continuar" (+ volver a escuchar)
  introCaption.hidden = true;
});

// Sube el volumen del audio de a poco (en "steps" pasos) para que no entre
// de golpe apenas se aprieta play. target = volumen final (0 a 1).
let fadeId = null; // guardamos el intervalo para poder cortarlo al saltear la intro
function fadeVolume(target, ms = 1500) {
  clearInterval(fadeId);
  const steps = 30;
  const stepSize = target / steps;
  let i = 0;
  fadeId = setInterval(() => {
    i++;
    audio.volume = Math.min(target, stepSize * i);
    if (i >= steps) clearInterval(fadeId);
  }, ms / steps);
}

// ---------- Navegación entre capítulos ----------
// Cada botón de la barra activa su capítulo y su video (data-target = número del capítulo).
navItems.forEach((item) => {
  item.addEventListener('click', () => {
    // Efecto de sonido de cambio de módulo (solo si se toca un capítulo distinto del actual)
    if (!item.classList.contains('active') && window.Transicion) window.Transicion.sfx('modulo');
    const actual = document.querySelector('.chapter.active');
    const fuentesQueSalen = actual ? actual.querySelectorAll('.ui-src') : [];
    uiFuenteSalir(fuentesQueSalen, () => {
      // Desactiva todos los nav-items, todos los capítulos y todos los videos...
      navItems.forEach((n) => n.classList.remove('active'));
      chapters.forEach((c) => c.classList.remove('active'));
      chapterVideos.forEach((v) => v.classList.remove('active'));

      // Activa el botón, el capítulo y el video que corresponden a data-target.
      item.classList.add('active');
      const target = item.dataset.target;
      const chapter = document.getElementById('chapter-' + target);
      chapter.classList.add('active');

      const video = document.querySelector('.chapter-video[data-chapter="' + target + '"]');
      if (video) {
        video.classList.add('active');
        video.currentTime = 0; // reinicia el video al frame 0 cada vez que se muestra
        video
          .play()
          .catch((err) => console.warn('No se pudo reproducir el video del capítulo:', err)); // arranca recién ahora, al entrar al módulo
      }

      // Pausa los videos ocultos (ahorra CPU y batería).
      chapterVideos.forEach((v) => {
        if (v !== video) v.pause();
      });

      // Reinicia la animación de los puntitos del título (sin esto solo correría la primera vez).
      const dots = chapter.querySelectorAll('.dot');
      dots.forEach((dot) => {
        dot.style.animation = 'none'; // saca la animación
        void dot.offsetWidth; // fuerza un reflow (lee una propiedad de layout)
        dot.style.animation = ''; // se la devuelve: ahora arranca desde cero
      });

      // Barra de abajo + animación de entrada de bolas (SOLO la primera vez de cada módulo).
      // Ver transicion.js. Si ese archivo no carga, el cambio de módulo funciona igual.
      if (window.Transicion) window.Transicion.entrar(chapter, item);
    });
  });
});

// ============ HELPERS Y COMPONENTES COMPARTIDOS ============
// UI.el(tag, attrs): crea un elemento SVG · UI.rng(seed): aleatorio reproducible · UI.fmt(n): 1234 -> "1.234".
const UI = {
  NS: 'http://www.w3.org/2000/svg',
  rng: function (seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  },
  el: function (t, a) {
    let e = document.createElementNS(UI.NS, t);
    for (let k in a) e.setAttribute(k, a[k]);
    return e;
  },
  fmt: function (v) {
    return Math.round(v).toLocaleString('es-AR');
  },
};

// Pestañas .ui-tab / .ui-tabpanel: cada botón muestra el panel de su aria-controls, solo dentro de su .ui-wrap.
document.querySelectorAll('.ui-tab').forEach(function (btn) {
  btn.addEventListener('click', function () {
    let wrap = btn.closest('.ui-wrap');
    wrap.querySelectorAll('.ui-tab').forEach(function (b) {
      b.setAttribute('aria-selected', 'false');
    });
    wrap.querySelectorAll('.ui-tabpanel').forEach(function (p) {
      p.classList.remove('active');
    });
    btn.setAttribute('aria-selected', 'true');
    document.getElementById(btn.getAttribute('aria-controls')).classList.add('active');
  });
});

// ---------- Volver a la presentación: recarga la página (intro, audio y videos como al inicio) ----------
const navBack = document.getElementById('navBack');
if (navBack) navBack.addEventListener('click', () => location.reload());

// ---------- Fuente con links (compartido) ---------- la usan los tres modulos
//   fuentes: [{ autor, etiqueta, url }]
function uiFuente(details, fuentes, nota) {
  const p = details.querySelector('p');
  p.textContent = '';
  fuentes.forEach(function (f) {
    const linea = document.createElement('span');
    linea.className = 'ui-src-item';
    linea.append(f.autor + '. ');
    const a = document.createElement('a');
    a.href = f.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = f.etiqueta;
    linea.appendChild(a);
    p.appendChild(linea);
  });
  if (nota) {
    const n = document.createElement('span');
    n.className = 'ui-src-nota';
    n.textContent = nota;
    p.appendChild(n);
  }
  details.removeAttribute('open'); // al cambiar de pestaña se cierra
}

// ---------- Salida de "Fuente" (compartida por los 3 módulos) ----------
// Desvanece una o varias etiquetas y después ejecuta alAcabar; con "reducir movimiento", directo.
function uiFuenteSalir(fuentes, alAcabar) {
  const lista = fuentes && fuentes.nodeType ? [fuentes] : Array.from(fuentes || []);
  // Si el desplegable estaba abierto, se cierra enseguida (también con teclado).
  lista.forEach(function (f) {
    f.removeAttribute('open');
  });
  if (!lista.length || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (alAcabar) alAcabar();
    return;
  }
  lista.forEach(function (f) {
    f.classList.add('ui-src-out');
  });
  setTimeout(function () {
    if (alAcabar) alAcabar();
    lista.forEach(function (f) {
      f.classList.remove('ui-src-out');
    });
  }, 350);
}

// ---------- "Fuente" abierta: se cierra al tocar cualquier otro lugar o con Escape ----------
document.addEventListener('pointerdown', function (e) {
  document.querySelectorAll('.ui-src[open]').forEach(function (d) {
    if (!d.contains(e.target)) d.removeAttribute('open');
  });
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.ui-src[open]').forEach(function (d) {
    d.removeAttribute('open');
  });
});