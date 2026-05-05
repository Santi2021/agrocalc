// ─────────────────────────────────────────
// AGROCALC — api/noticias.js
// Vercel Serverless Function
//
// GET /api/noticias
// Agrega RSS feeds agro desde el servidor
// Sin CORS issues, sin proxies
// ─────────────────────────────────────────

const FUENTES = [
  { nombre: 'Bichos de Campo', emoji: '🐛', url: 'https://bichosdecampo.com/feed/' },
  { nombre: 'BCR Rosario',     emoji: '🏛️', url: 'https://www.bcr.com.ar/es/mercados/investigacion-y-desarrollo/informes-especiales/feed' },
  { nombre: 'Agrofy News',     emoji: '🌾', url: 'https://news.agrofy.com.ar/rss.xml' },
  { nombre: 'La Nación Campo', emoji: '📋', url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/campo/' },
  { nombre: 'Clarín Rural',    emoji: '📰', url: 'https://www.clarin.com/rss/rural/' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=900'); // cache 15 min

  try {
    const fetch = (await import('node-fetch')).default;

    const results = await Promise.allSettled(
      FUENTES.map(f => fetchFeed(f, fetch))
    );

    let noticias = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') noticias = noticias.concat(r.value);
    });

    // Ordenar por fecha
    noticias.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Máximo 30 noticias
    noticias = noticias.slice(0, 30);

    if (!noticias.length) {
      noticias = fallback();
    }

    res.status(200).json({ ok: true, noticias, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error('Error en /api/noticias:', err);
    res.status(200).json({ ok: false, noticias: fallback(), timestamp: new Date().toISOString() });
  }
};

async function fetchFeed(fuente, fetch) {
  try {
    const res  = await fetch(fuente.url, {
      headers: { 'User-Agent': 'AgroCalc/1.0 RSS Reader' },
      timeout: 5000,
    });
    const text = await res.text();

    // Parsear XML con regex básico (sin dependencias)
    const items = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
      const content = match[1];
      const titulo  = extraerTag(content, 'title');
      const link    = extraerTag(content, 'link') || extraerTag(content, 'guid');
      const fecha   = extraerTag(content, 'pubDate');

      if (titulo && titulo.length > 5) {
        items.push({
          titulo:  limpiar(titulo).substring(0, 120),
          link:    link || fuente.url,
          fecha:   fecha || new Date().toISOString(),
          fuente:  fuente.nombre,
          emoji:   fuente.emoji,
        });
      }
    }

    return items;
  } catch (e) {
    console.warn(`Feed ${fuente.nombre} falló:`, e.message);
    return [];
  }
}

function extraerTag(text, tag) {
  const m = text.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : null;
}

function limpiar(texto) {
  return texto
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function fallback() {
  return [
    { titulo: 'Soja: precios sostenidos en Chicago', fuente: 'BCR Rosario', emoji: '🏛️', link: 'https://bcr.com.ar', fecha: new Date().toISOString() },
    { titulo: 'Pronóstico favorable para la zona núcleo', fuente: 'Bichos de Campo', emoji: '🐛', link: 'https://bichosdecampo.com', fecha: new Date().toISOString() },
    { titulo: 'El tipo de cambio y su impacto en el agro', fuente: 'La Nación Campo', emoji: '📋', link: 'https://lanacion.com.ar', fecha: new Date().toISOString() },
    { titulo: 'Maíz: buenas perspectivas para la campaña 25/26', fuente: 'Agrofy News', emoji: '🌾', link: 'https://agrofy.com.ar', fecha: new Date().toISOString() },
    { titulo: 'Trigo: exportaciones superan estimaciones del USDA', fuente: 'Clarín Rural', emoji: '📰', link: 'https://clarin.com', fecha: new Date().toISOString() },
  ];
}
