// ─────────────────────────────────────────
// AGROCALC — api/precios.js
// Vercel Serverless Function
// 
// GET /api/precios
// Retorna precios live de commodities agrícolas
// via yahoo-finance2 (sin CORS desde el servidor)
//
// Símbolos CBOT:
//   ZS=F → Soja   (cents/bushel → USD/t × 36.74)
//   ZC=F → Maíz   (cents/bushel → USD/t × 39.37)
//   ZW=F → Trigo  (cents/bushel → USD/t × 36.74)
//   SB=F → Azúcar (referencia)
// ─────────────────────────────────────────

const yahooFinance = require('yahoo-finance2').default;

// Conversión cents/bushel → USD/tonelada
const CULTIVOS = [
  { key: 'soja',    symbol: 'ZS=F', factor: 36.74, fallback: 280 },
  { key: 'maiz',    symbol: 'ZC=F', factor: 39.37, fallback: 165 },
  { key: 'trigo',   symbol: 'ZW=F', factor: 36.74, fallback: 210 },
  { key: 'girasol', symbol: null,   factor: 1,     fallback: 340 },
];

module.exports = async (req, res) => {
  // CORS headers — permite que el frontend llame este endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=300'); // cache 5 min en Vercel edge

  try {
    const simbolos = CULTIVOS.filter(c => c.symbol).map(c => c.symbol);

    // Fetch todos en paralelo
    const results = await Promise.allSettled(
      simbolos.map(s => yahooFinance.quote(s))
    );

    const precios = {};

    CULTIVOS.forEach(cultivo => {
      if (!cultivo.symbol) {
        // Girasol: no hay futuro líquido en CBOT, usamos referencia BCR
        precios[cultivo.key] = cultivo.fallback;
        return;
      }

      const idx    = simbolos.indexOf(cultivo.symbol);
      const result = results[idx];

      if (result.status === 'fulfilled' && result.value?.regularMarketPrice) {
        const raw    = result.value.regularMarketPrice;
        // Yahoo devuelve en cents/bushel para granos → ÷ 100 → × factor
        const usdTon = Math.round((raw / 100) * cultivo.factor);
        precios[cultivo.key] = usdTon;
      } else {
        console.warn(`Falló ${cultivo.symbol}:`, result.reason);
        precios[cultivo.key] = cultivo.fallback;
      }
    });

    res.status(200).json({
      ok:        true,
      precios,
      timestamp: new Date().toISOString(),
      fuente:    'Yahoo Finance CBOT',
    });

  } catch (err) {
    console.error('Error en /api/precios:', err);

    // Fallback con precios hardcodeados
    res.status(200).json({
      ok: false,
      precios: {
        soja:    280,
        maiz:    165,
        trigo:   210,
        girasol: 340,
      },
      timestamp: new Date().toISOString(),
      fuente:    'Fallback (error Yahoo Finance)',
      error:     err.message,
    });
  }
};
