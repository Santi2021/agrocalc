/* ─────────────────────────────────────────
   AGROCALC — js/mercado.js
   Módulo: Precios live via GitHub Actions
   
   Lee data/precios.json que GitHub Actions
   actualiza cada 30 min con yfinance.
   
   Sin proxies, sin APIs externas, sin CORS.
───────────────────────────────────────── */

const Mercado = (() => {

  let precios   = { soja: 280, maiz: 165, trigo: 210, girasol: 340 };
  let tcOficial = 1500;
  let timestamp = null;

  // ── INIT ─────────────────────────────────
  async function init() {
    console.log('📈 Mercado: leyendo precios.json...');
    actualizarHeader();
    actualizarTCDisplay();

    await fetchPrecios();

    // Refresh cada 5 minutos (el JSON se actualiza cada 30)
    setInterval(fetchPrecios, 5 * 60 * 1000);
  }

  // ── FETCH JSON ───────────────────────────
  async function fetchPrecios() {
    try {
      // Cache-busting para que no sirva versión vieja
      const url  = `/data/precios.json?t=${Date.now()}`;
      const res  = await fetch(url);
      const data = await res.json();

      if (data.precios) {
        precios   = data.precios;
        tcOficial = data.tc?.oficial || 1500;
        timestamp = data.timestamp;

        actualizarHeader();
        actualizarTCDisplay();
        actualizarCalculadora();

        console.log('✅ Precios actualizados:', precios, '| TC:', tcOficial);
        console.log('⏰ Último update:', new Date(timestamp).toLocaleString('es-AR'));
      }
    } catch (e) {
      console.warn('⚠️ No se pudo leer precios.json:', e);
    }
  }

  // ── UI ───────────────────────────────────
  function actualizarHeader() {
    ['soja', 'maiz', 'trigo', 'girasol'].forEach(key => {
      const el = document.getElementById(`h-${key}`);
      if (el && precios[key]) {
        el.textContent = `$${precios[key]}`;
        if (timestamp) {
          // Flash verde si el dato es reciente (< 1 hora)
          const age = Date.now() - new Date(timestamp).getTime();
          if (age < 60 * 60 * 1000) {
            el.style.transition = 'color 0.4s';
            el.style.color = '#69f0ae';
            setTimeout(() => el.style.color = '', 2000);
          }
        }
      }
    });
  }

  function actualizarTCDisplay() {
    const el = document.getElementById('tc-display');
    if (!el) return;
    el.textContent = `TC $${tcOficial.toLocaleString('es-AR')}`;
    if (timestamp) {
      const mins = Math.round((Date.now() - new Date(timestamp).getTime()) / 60000);
      el.title = `Actualizado hace ${mins} min · Yahoo Finance`;
    }
  }

  function actualizarCalculadora() {
    if (!window.Rindes) return;
    const cultivo = window.App?.state?.cultivoActual || 'soja';
    const precio  = precios[cultivo];
    if (!precio) return;
    const slider = document.getElementById('precio-slider');
    if (!slider) return;
    slider.value = precio;
    Rindes.updateSlider(slider);
    Rindes.calcular();
  }

  function getPrecio(cultivo) { return precios[cultivo] || 0; }
  function getTC()            { return tcOficial; }

  return { init, getPrecio, getTC, precios: () => precios };

})();

window.Mercado = Mercado;
