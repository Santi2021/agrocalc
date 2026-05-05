/* ─────────────────────────────────────────
   AGROCALC — js/mercado.js
   Módulo: Precios live de commodities + TC
   
   Fuentes:
   - Alpha Vantage (CBOT: soja, maíz, trigo)
   - Frankfurter.app (USD/ARS tipo de cambio)
   - Fallback a precios hardcodeados si falla
   
   Expone: window.Mercado
───────────────────────────────────────── */

const Mercado = (() => {

  // Alpha Vantage key gratuita (500 calls/día)
  const AV_KEY = 'demo'; // Reemplazar con key propia de alphavantage.co

  // Símbolos CBOT
  const SIMBOLOS = {
    soja:    { symbol: 'SOYBEAN',    label: 'Soja',    emoji: '🌱', fallback: 280 },
    maiz:    { symbol: 'CORN',       label: 'Maíz',    emoji: '🌽', fallback: 165 },
    trigo:   { symbol: 'WHEAT',      label: 'Trigo',   emoji: '🌾', fallback: 210 },
    girasol: { symbol: 'SUNFLOWER',  label: 'Girasol', emoji: '🌻', fallback: 340 },
  };

  let precios = {};
  let tcUsdArs = null;
  let ultimaActualizacion = null;

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📈 Mercado: iniciando...');
    await Promise.all([
      fetchTipoCambio(),
      fetchPrecios(),
    ]);
    actualizarHeader();
    actualizarCalculadora();
    console.log('✅ Mercado: datos cargados');

    // Actualizar cada 5 minutos
    setInterval(async () => {
      await Promise.all([fetchTipoCambio(), fetchPrecios()]);
      actualizarHeader();
      actualizarCalculadora();
    }, 5 * 60 * 1000);
  }

  // ── TIPO DE CAMBIO ───────────────────────
  async function fetchTipoCambio() {
    try {
      // Frankfurter.app — gratis, sin key
      const res  = await fetch('https://api.frankfurter.app/latest?from=USD&to=ARS');
      const data = await res.json();
      tcUsdArs = data.rates?.ARS || null;

      // Si no hay ARS en Frankfurter (no siempre lo tiene), usar bluelytics
      if (!tcUsdArs) {
        const res2  = await fetch('https://api.bluelytics.com.ar/v2/latest');
        const data2 = await res2.json();
        tcUsdArs = data2.oficial?.value_sell || 1500;
      }

      actualizarTCDisplay();
    } catch (e) {
      console.warn('TC fallback:', e);
      tcUsdArs = 1500; // fallback
      actualizarTCDisplay();
    }
  }

  // ── PRECIOS COMMODITIES ──────────────────
  async function fetchPrecios() {
    // Intentar Alpha Vantage primero
    // Si falla (demo key o límite) → usar precios hardcodeados actualizados
    try {
      const res = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SOYB&apikey=${AV_KEY}`
      );
      const data = await res.json();

      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        // Tenemos datos reales de Alpha Vantage
        const precioETF = parseFloat(data['Global Quote']['05. price']);
        // SOYB ETF ≈ proxy de soja. Ajustamos a USD/t
        precios.soja = Math.round(precioETF * 3.8); // factor de conversión aproximado
      } else {
        throw new Error('Sin datos AV');
      }
    } catch {
      // Fallback: precios de referencia MATBA actualizados manualmente
      // Se pueden actualizar acá periódicamente
      usarPreciosFallback();
    }
  }

  function usarPreciosFallback() {
    precios = {
      soja:    280,
      maiz:    165,
      trigo:   210,
      girasol: 340,
    };
  }

  // ── ACTUALIZAR UI ────────────────────────
  function actualizarHeader() {
    Object.entries(SIMBOLOS).forEach(([key, d]) => {
      const el = document.getElementById(`h-${key}`);
      if (el && precios[key]) {
        el.textContent = `$${precios[key]}`;
      }
    });
  }

  function actualizarTCDisplay() {
    const el = document.getElementById('tc-display');
    if (el && tcUsdArs) {
      el.textContent = `TC: $${Math.round(tcUsdArs).toLocaleString('es-AR')}`;
    }
  }

  function actualizarCalculadora() {
    // Si el módulo Rindes está activo, actualizar su slider de precio
    // según el cultivo seleccionado actualmente
    if (!window.Rindes) return;
    const cultivoActual = window.App?.state?.cultivoActual || 'soja';
    const precio = precios[cultivoActual];
    if (!precio) return;
    const slider = document.getElementById('precio-slider');
    if (slider) {
      slider.value = precio;
      Rindes.updateSlider(slider);
      Rindes.calcular();
    }
  }

  // ── API PÚBLICA ──────────────────────────
  function getPrecio(cultivo) { return precios[cultivo] || SIMBOLOS[cultivo]?.fallback || 0; }
  function getTC()            { return tcUsdArs || 1500; }

  return { init, getPrecio, getTC, precios: () => precios };

})();

window.Mercado = Mercado;
