/* ─────────────────────────────────────────
   AGROCALC — js/noticias.js
   Módulo: Ticker de noticias agro
   
   Llama a GET /api/noticias (Vercel serverless)
   que agrega RSS feeds desde el servidor.
───────────────────────────────────────── */

const Noticias = (() => {

  let noticias  = [];
  let animFrame = null;
  let posX      = 0;

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📰 Noticias: cargando...');
    await fetchNoticias();
    renderTicker();
    iniciarAnimacion();

    // Refresh cada 15 minutos
    setInterval(async () => {
      await fetchNoticias();
      renderTicker();
    }, 15 * 60 * 1000);

    console.log(`✅ Noticias: ${noticias.length} artículos`);
  }

  // ── FETCH ────────────────────────────────
  async function fetchNoticias() {
    try {
      const res  = await fetch('/api/noticias');
      const data = await res.json();
      if (data.noticias?.length) {
        noticias = data.noticias;
      }
    } catch (e) {
      console.warn('Noticias API falló:', e);
      noticias = fallback();
    }
  }

  // ── RENDER ───────────────────────────────
  function renderTicker() {
    const contenedor = document.getElementById('ticker-contenido');
    if (!contenedor || !noticias.length) return;

    // Duplicar para loop infinito
    const todas = [...noticias, ...noticias];
    contenedor.innerHTML = todas.map(n => `
      <a class="ticker-item" href="${n.link}" target="_blank" rel="noopener">
        <span class="ticker-fuente">${n.emoji} ${n.fuente}</span>
        <span class="ticker-titulo">${n.titulo}</span>
      </a>
      <span class="ticker-sep">·</span>
    `).join('');
  }

  // ── ANIMACIÓN ────────────────────────────
  function iniciarAnimacion() {
    const track  = document.getElementById('ticker-contenido');
    const ticker = document.getElementById('ticker-wrap');
    if (!track) return;

    posX = 0;
    let pausado = false;

    if (ticker) {
      ticker.addEventListener('mouseenter', () => pausado = true);
      ticker.addEventListener('mouseleave', () => pausado = false);
    }

    function animar() {
      if (!pausado) {
        posX -= 0.45;
        const mitad = track.scrollWidth / 2;
        if (Math.abs(posX) >= mitad) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      animFrame = requestAnimationFrame(animar);
    }

    if (animFrame) cancelAnimationFrame(animFrame);
    animar();
  }

  // ── FALLBACK ─────────────────────────────
  function fallback() {
    return [
      { titulo: 'Soja: precios sostenidos en Chicago', fuente: 'BCR Rosario', emoji: '🏛️', link: 'https://bcr.com.ar' },
      { titulo: 'Pronóstico favorable para la zona núcleo', fuente: 'Bichos de Campo', emoji: '🐛', link: 'https://bichosdecampo.com' },
      { titulo: 'Maíz: buenas perspectivas para la campaña 25/26', fuente: 'Agrofy News', emoji: '🌾', link: 'https://agrofy.com.ar' },
      { titulo: 'El tipo de cambio y su impacto en el agro argentino', fuente: 'La Nación Campo', emoji: '📋', link: 'https://lanacion.com.ar' },
      { titulo: 'Trigo: exportaciones superan estimaciones del USDA', fuente: 'Clarín Rural', emoji: '📰', link: 'https://clarin.com' },
    ];
  }

  return { init };

})();

window.Noticias = Noticias;
