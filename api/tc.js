// ─────────────────────────────────────────
// AGROCALC — api/tc.js
// Vercel Serverless Function
//
// GET /api/tc
// Retorna tipo de cambio USD/ARS
//   - Oficial: Yahoo Finance ARS=X
//   - Blue: Bluelytics API
// ─────────────────────────────────────────

const yahooFinance = require('yahoo-finance2').default;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300');

  const resultado = {
    ok:        true,
    oficial:   null,
    blue:      null,
    timestamp: new Date().toISOString(),
  };

  // ── TC OFICIAL via Yahoo Finance ──
  try {
    const quote      = await yahooFinance.quote('ARS=X');
    resultado.oficial = Math.round(quote.regularMarketPrice);
  } catch (e) {
    console.warn('Yahoo TC falló:', e.message);
    resultado.oficial = 1500; // fallback
  }

  // ── TC BLUE via Bluelytics ──
  try {
    const fetch = (await import('node-fetch')).default;
    const res2  = await fetch('https://api.bluelytics.com.ar/v2/latest');
    const data  = await res2.json();
    resultado.blue = Math.round(data.blue?.value_sell || 0);
  } catch (e) {
    console.warn('Bluelytics falló:', e.message);
    resultado.blue = null;
  }

  res.status(200).json(resultado);
};
