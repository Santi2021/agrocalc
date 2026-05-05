/* ─────────────────────────────────────────
   AGROCALC — js/noticias.js
   Módulo: Ticker de noticias agro en vivo
   
   Fuentes RSS:
   - Bichos de Campo
   - BCR (Bolsa de Comercio de Rosario)
   - Infobae Campo
   - Agrofy News
   - El Cronista Agro
   
   Usa rss2json.com como proxy CORS gratuito
   Expone: window.Noticias
───────────────────────────────────────── */

const Noticias = (() => {

  const CORS = 'https://corsproxy.io/?';

  const FUENTES = [
    {
      nombre: 'Bichos de Campo',
      emoji:  '🐛',
      url:    'https://bichosdecampo.com/feed/',
    },
    {
      nombre: 'BCR Rosario',
      emoji:  '🏛️',
      url:    'https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/informes-especiales/feed',
    },
    {
      nombre: 'Agrofy News',
      emoji:  '🌾',
      url:    'https://news.agrofy.com.ar/rss.xml',
    },
    {
      nombre: 'La Nación Campo',
      emoji:  '📋',
      url:    'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/campo/',
    },
    {
      nombre: 'Clarín Rural',
      emoji:  '📰',
      url:    'https://www.clarin.com/rss/rural/',
    },
  ];

  let noticias  = [];
  let animFrame = null;
  let posX      = 0;
  let velocidad = 0.4; // px por frame

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📰 Noticias: cargando feeds...');

    // Fetch todas las fuentes en paralelo
    const results = await Promise.allSettled(
      FUENTES.map(f => fetchFeed(f))
    );

    // Juntar y mezclar noticias
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value?.length) {
        noticias = noticias.concat(r.value);
      }
    });

    // Ordenar por fecha descendente
    noticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Si no hay noticias, usar placeholders
    if (!noticias.length) {
      noticias = fallbackNoticias();
    }

    console.log(`✅ Noticias: ${noticias.length} artículos cargados`);
    renderTicker();
    iniciarAnimacion();

    // Actualizar cada 15 minutos
    setInterval(async () => {
      await init();
    }, 15 * 60 * 1000);
  }

  // ── FETCH FEED ───────────────────────────
  async function fetchFeed(fuente) {
    try {
      const url  = `${CORS}${encodeURIComponent(fuente.url)}`;
      const res  = await fetch(url);
      const text = await res.text();

      // Parsear XML del RSS directo
      const parser = new DOMParser();
      const xml    = parser.parseFromString(text, 'text/xml');
      const items  = Array.from(xml.querySelectorAll('item')).slice(0, 5);

      if (!items.length) return [];

      return items.map(item => ({
        titulo: limpiarTexto(item.querySelector('title')?.textContent || ''),
        link:   item.querySelector('link')?.textContent || fuente.url,
        fecha:  item.querySelector('pubDate')?.textContent || '',
        fuente: fuente.nombre,
        emoji:  fuente.emoji,
      })).filter(n => n.titulo.length > 5);

    } catch (e) {
      console.warn(`Feed ${fuente.nombre} falló:`, e);
      return [];
    }
  }

  // ── RENDER TICKER ────────────────────────
  function renderTicker() {
    const contenedor = document.getElementById('ticker-contenido');
    if (!contenedor) return;

    // Duplicar noticias para loop infinito
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
    const track = document.getElementById('ticker-contenido');
    if (!track) return;

    // Reset posición
    posX = 0;
    track.style.transform = `translateX(0px)`;

    let pausado = false;

    // Pausar al hover
    const ticker = document.getElementById('ticker-wrap');
    if (ticker) {
      ticker.addEventListener('mouseenter', () => pausado = true);
      ticker.addEventListener('mouseleave', () => pausado = false);
    }

    function animar() {
      if (!pausado) {
        posX -= velocidad;
        const mitad = track.scrollWidth / 2;
        if (Math.abs(posX) >= mitad) posX = 0;
        track.style.transform = `translateX(${posX}px)`;
      }
      animFrame = requestAnimationFrame(animar);
    }

    if (animFrame) cancelAnimationFrame(animFrame);
    animar();
  }

  // ── HELPERS ──────────────────────────────
  function limpiarTexto(texto) {
    return texto
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
      .substring(0, 100);
  }

  function fallbackNoticias() {
    return [
      { titulo: 'Soja: precios sostenidos en el mercado de Chicago', fuente: 'BCR', emoji: '🏛️', link: 'https://bcr.com.ar' },
      { titulo: 'Pronóstico favorable para la zona núcleo esta semana', fuente: 'Bichos de Campo', emoji: '🐛', link: 'https://bichosdecampo.com' },
      { titulo: 'El campo mira de cerca la evolución del tipo de cambio', fuente: 'Infobae Campo', emoji: '📰', link: 'https://infobae.com' },
      { titulo: 'Maíz: buenas perspectivas para la campaña 2025/26', fuente: 'Agrofy', emoji: '🌾', link: 'https://agrofy.com.ar' },
      { titulo: 'Trigo: exportaciones superan las estimaciones del USDA', fuente: 'La Nación Campo', emoji: '📋', link: 'https://lanacion.com.ar' },
    ];
  }

  return { init };

})();

window.Noticias = Noticias;
